package com.courtconnect;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.HttpMethod;
import org.springframework.http.MediaType;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.ResultActions;
import java.time.Instant;
import java.time.LocalDate;
import java.time.LocalTime;
import java.time.ZoneId;
import java.util.*;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.request;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

/** Step (c): booking a slot (FR-015, FR-017), double-booking protection (FR-016) and the fee (FR-021). */
@SpringBootTest @AutoConfigureMockMvc
class BookingRulesTest {
  @MockBean Geocoder geocoder;
  @Autowired MockMvc mvc; @Autowired ObjectMapper json; @Autowired UserRepository users; @Autowired PasswordEncoder encoder;
  @Autowired JwtService jwt; @Autowired TimeSlotRepository slots; @Autowired CourtRepository courts;

  String admin, player, player2; long fac, courtId;
  final LocalDate tomorrow = LocalDate.now(ZoneId.of("Asia/Manila")).plusDays(1);

  @BeforeEach void setUp() throws Exception {
    when(geocoder.locate(anyString(), anyString())).thenReturn(new Geocoder.Position(10.3157, 123.8854));
    String n = UUID.randomUUID().toString().substring(0, 8);
    admin = jwt.generate(user("ra-" + n, Role.FACILITY_ADMIN));
    player = jwt.generate(user("rp-" + n, Role.PLAYER));
    player2 = jwt.generate(user("rq-" + n, Role.PLAYER));
    fac = body(call("POST", "/api/facilities", admin, Map.of("name", "Rules Hub " + n, "phone", "09171234567", "address", "1 Rule St", "city", "Cebu City"))).get("facility_id").asLong();
    courtId = body(call("POST", "/api/facilities/" + fac + "/courts", admin, Map.of("court_name", "R1", "sport_type", "Pickleball", "rental_rate", 250))).get("court_id").asLong();
  }

  @Test void feeIsRateTimesHoursComputedByTheServer() throws Exception {
    // 30-minute slots, 3 of them = 1.5 hours × ₱250 = ₱375
    List<Map<String,Object>> week = new ArrayList<>();
    for (int d = 0; d < 7; d++) week.add(Map.of("day_of_week", d, "is_open", true, "open_time", "08:00:00", "close_time", "12:00:00"));
    call("PUT", "/api/courts/" + courtId + "/hours", admin, Map.of("slot_minutes", 30, "payment_hold_minutes", 10, "operating_hours", week)).andExpect(status().isOk());
    JsonNode s = slotsOn(tomorrow);
    Instant before = Instant.now();
    JsonNode b = body(call("POST", "/api/bookings", player, Map.of("courtId", courtId, "slotIds", ids(s, 0, 1, 2), "totalFee", 1)).andExpect(status().isCreated()));
    assertThat(b.get("hours").decimalValue()).isEqualByComparingTo("1.5");
    assertThat(b.get("total_fee").decimalValue()).isEqualByComparingTo("375");   // the client's "totalFee" is ignored
    assertThat(b.get("end_time").asText()).isEqualTo("09:30:00");
    // FR-017: Pending, slots Pending, hold = the court's payment time limit (10 min)
    assertThat(b.get("status").asText()).isEqualTo("PENDING");
    Instant deadline = Instant.parse(b.get("payment_deadline").asText());
    assertThat(deadline).isBetween(before.plusSeconds(10 * 60 - 5), Instant.now().plusSeconds(10 * 60 + 5));
    assertThat(slotsOn(tomorrow)).extracting(x -> x.get("status").asText()).startsWith("PENDING", "PENDING", "PENDING", "AVAILABLE");
  }

  @Test void selectionRules() throws Exception {
    JsonNode s = slotsOn(tomorrow);
    call("POST", "/api/bookings", player, Map.of("courtId", courtId, "slotIds", List.of()))
      .andExpect(status().isBadRequest()).andExpect(jsonPath("$.fieldErrors.slotIds").exists());
    call("POST", "/api/bookings", player, Map.of("courtId", courtId, "slotIds", ids(s, 0, 1, 2, 3, 4)))
      .andExpect(status().isBadRequest()).andExpect(jsonPath("$.message").value("You can book up to 4 slots at a time."));
    call("POST", "/api/bookings", player, Map.of("courtId", courtId, "slotIds", ids(s, 0, 2)))
      .andExpect(status().isBadRequest()).andExpect(jsonPath("$.message").value("Pick time slots that are next to each other on the same day."));
    JsonNode dayAfter = slotsOn(tomorrow.plusDays(1));
    call("POST", "/api/bookings", player, Map.of("courtId", courtId, "slotIds", List.of(s.get(15).get("slot_id").asLong(), dayAfter.get(0).get("slot_id").asLong())))
      .andExpect(status().isBadRequest());
    // A slot of another court sent with this court's id
    long other = body(call("POST", "/api/facilities/" + fac + "/courts", admin, Map.of("court_name", "R2", "sport_type", "Pickleball", "rental_rate", 250))).get("court_id").asLong();
    long otherSlot = body(call("GET", "/api/courts/" + other + "/slots?date=" + tomorrow, player, null)).get(0).get("slot_id").asLong();
    call("POST", "/api/bookings", player, Map.of("courtId", courtId, "slotIds", List.of(otherSlot))).andExpect(status().isConflict());
    call("POST", "/api/bookings", player, Map.of("courtId", courtId, "slotIds", List.of(999999999L))).andExpect(status().isConflict());
    call("POST", "/api/bookings", player, Map.of("courtId", 999999999L, "slotIds", ids(s, 0))).andExpect(status().isNotFound());
    // Nothing was held by any of these
    assertThat(slotsOn(tomorrow)).allMatch(x -> x.get("status").asText().equals("AVAILABLE"));
  }

  @Test void slotThatAlreadyStartedCannotBeBooked() throws Exception {
    Court court = courts.findById(courtId).orElseThrow();
    TimeSlot past = slots.save(new TimeSlot(court, LocalDate.now(ZoneId.of("Asia/Manila")).minusDays(1), LocalTime.of(10, 0), LocalTime.of(11, 0)));
    call("POST", "/api/bookings", player, Map.of("courtId", courtId, "slotIds", List.of(past.getId())))
      .andExpect(status().isConflict()).andExpect(jsonPath("$.message").value("That time has already started. Pick a later slot."));
  }

  @Test void doubleBookingIsRefusedWithAClearMessage() throws Exception {
    JsonNode s = slotsOn(tomorrow);
    call("POST", "/api/bookings", player, Map.of("courtId", courtId, "slotIds", ids(s, 4, 5))).andExpect(status().isCreated());
    // Overlapping selection by someone else, and the same player again
    call("POST", "/api/bookings", player2, Map.of("courtId", courtId, "slotIds", ids(s, 5, 6)))
      .andExpect(status().isConflict()).andExpect(jsonPath("$.message").value("Sorry, the 11:00 AM slot was just taken or isn't available. Pick another time."));
    call("POST", "/api/bookings", player, Map.of("courtId", courtId, "slotIds", ids(s, 4))).andExpect(status().isConflict());
    // Blocked slots can't be booked either
    call("POST", "/api/slots/" + s.get(8).get("slot_id").asLong() + "/block", admin, Map.of("reason", "Private event")).andExpect(status().isOk());
    call("POST", "/api/bookings", player2, Map.of("courtId", courtId, "slotIds", ids(s, 8))).andExpect(status().isConflict());
    // The neighbouring free slot is still bookable
    call("POST", "/api/bookings", player2, Map.of("courtId", courtId, "slotIds", ids(s, 6))).andExpect(status().isCreated());
  }

  @Test void databaseRefusesAHeldSlotWithoutABooking() {
    // FR-016 at the database level: Pending/Booked requires booking_id (check constraint ck_time_slot_holder)
    Court court = courts.findById(courtId).orElseThrow();
    TimeSlot s = slots.findByCourtAndSlotDateOrderByStartTimeAsc(court, tomorrow).get(0);
    s.book();   // BOOKED but no booking
    assertThatThrownBy(() -> slots.saveAndFlush(s)).isInstanceOf(DataIntegrityViolationException.class);
  }

  @Test void unpaidLimitRolesAndPrivacy() throws Exception {
    JsonNode s = slotsOn(tomorrow);
    long first = body(call("POST", "/api/bookings", player, Map.of("courtId", courtId, "slotIds", ids(s, 0)))).get("booking_id").asLong();
    call("POST", "/api/bookings", player, Map.of("courtId", courtId, "slotIds", ids(s, 2))).andExpect(status().isCreated());
    call("POST", "/api/bookings", player, Map.of("courtId", courtId, "slotIds", ids(s, 4))).andExpect(status().isCreated());
    call("POST", "/api/bookings", player, Map.of("courtId", courtId, "slotIds", ids(s, 6)))
      .andExpect(status().isBadRequest()).andExpect(jsonPath("$.message").value("You have 3 unpaid bookings. Pay for or cancel one before booking another."));
    // Roles
    call("POST", "/api/bookings", admin, Map.of("courtId", courtId, "slotIds", ids(s, 6))).andExpect(status().isForbidden());
    call("POST", "/api/bookings", null, Map.of("courtId", courtId, "slotIds", ids(s, 6))).andExpect(status().isUnauthorized());
    // Players see slot status but never who holds it, and can't open someone else's booking
    assertThat(slotsOn(tomorrow).get(0).get("booking").isNull()).isTrue();
    call("GET", "/api/bookings/" + first, player2, null).andExpect(status().isNotFound());
    call("GET", "/api/bookings/" + first, player, null).andExpect(status().isOk()).andExpect(jsonPath("$.court.court_name").value("R1"));
  }

  @Test void paymentConfigSaysOnlinePaymentIsOff() throws Exception {
    call("GET", "/api/payments/config", player, null).andExpect(status().isOk()).andExpect(jsonPath("$.online_payment").value(false));
  }

  // ---------- helpers ----------
  private static List<Long> ids(JsonNode slots, int... idx){ List<Long> l = new ArrayList<>(); for (int i : idx) l.add(slots.get(i).get("slot_id").asLong()); return l; }
  private JsonNode slotsOn(LocalDate d) throws Exception { return body(call("GET", "/api/courts/" + courtId + "/slots?date=" + d, player, null)); }
  private User user(String name, Role role){
    User u = new User(); u.setFullName("User " + name); u.setEmail(name + "@test.local");
    u.setPasswordHash(encoder.encode("Password1")); u.setRole(role); return users.save(u);
  }
  private ResultActions call(String method, String url, String token, Object body) throws Exception {
    var req = request(HttpMethod.valueOf(method), url).contentType(MediaType.APPLICATION_JSON);
    if (token != null) req.header("Authorization", "Bearer " + token);
    if (body != null) req.content(json.writeValueAsString(body));
    return mvc.perform(req);
  }
  private JsonNode body(ResultActions r) throws Exception {
    String s = r.andReturn().getResponse().getContentAsString();
    return s.isEmpty() ? json.nullNode() : json.readTree(s);
  }
}
