package com.courtconnect;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.http.MediaType;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.ResultActions;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneId;
import java.util.*;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.request;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

/**
 * Increment 3 step (e), through the REST API (H2):
 *  FR-052 my bookings (current and previous) · FR-053 player cancels eligible bookings · FR-054 cancelled slots are freed
 *  FR-059 / FR-060 facility booking records with search and status filter, own facilities only.
 *  (In the SRS document these are FR-046, FR-047, FR-048 and FR-051.)
 */
@SpringBootTest @AutoConfigureMockMvc
class BookingHistoryCancelTest {
  @MockBean Geocoder geocoder;
  @Autowired MockMvc mvc; @Autowired ObjectMapper json; @Autowired UserRepository users; @Autowired PasswordEncoder encoder;
  @Autowired JwtService jwt; @Autowired BookingRepository bookings; @Autowired BookingExpiry expiry;

  final String tomorrow = LocalDate.now(ZoneId.of("Asia/Manila")).plusDays(1).toString();
  String adminA, adminB, player, player2; User playerUser;
  long courtA, courtB, facilityA, facilityB; JsonNode slotsA, slotsB;

  @BeforeEach void setUp() throws Exception {
    org.mockito.Mockito.when(geocoder.locate(org.mockito.ArgumentMatchers.anyString(), org.mockito.ArgumentMatchers.anyString()))
      .thenReturn(new Geocoder.Position(10.3157, 123.8854));
    String n = UUID.randomUUID().toString().substring(0, 8);
    adminA = token(user("Admin A " + n, "fa-a-" + n, Role.FACILITY_ADMIN));
    adminB = token(user("Admin B " + n, "fa-b-" + n, Role.FACILITY_ADMIN));
    playerUser = user("Juana Player " + n, "p1-" + n, Role.PLAYER); player = token(playerUser);
    player2 = token(user("Pedro Other " + n, "p2-" + n, Role.PLAYER));
    facilityA = facility(adminA, "Hub A " + n); courtA = court(adminA, facilityA);
    facilityB = facility(adminB, "Hub B " + n); courtB = court(adminB, facilityB);
    slotsA = slots(courtA); slotsB = slots(courtB);
  }

  // ---------- FR-052: my bookings, current and previous ----------

  @Test void historyKeepsCurrentAndPreviousBookingsAndIsPrivate() throws Exception {
    long pending = hold(player, courtA, slot(slotsA, 0));
    long cancelled = hold(player, courtA, slot(slotsA, 2));
    long expired = hold(player, courtA, slot(slotsA, 4));
    call("POST", "/api/bookings/" + cancelled + "/cancel", player).andExpect(status().isOk());
    Booking e = bookings.findById(expired).orElseThrow();
    e.setPaymentDeadline(Instant.now().minusSeconds(60)); bookings.save(e);   // payment time ran out
    expiry.run();

    JsonNode mine = body(call("GET", "/api/bookings/mine", player).andExpect(status().isOk()));
    assertThat(mine).extracting(b -> b.get("booking_id").asLong() + " " + b.get("status").asText())
      .containsExactly(pending + " PENDING", cancelled + " CANCELLED", expired + " EXPIRED");   // date/time order
    JsonNode c = mine.get(1);
    assertThat(c.get("cancelled_by").asText()).isEqualTo("PLAYER");
    assertThat(c.get("cancelled_at").isNull()).isFalse();
    assertThat(c.get("court").get("court_name").asText()).isEqualTo("Court 1");
    assertThat(c.get("facility").get("name").asText()).startsWith("Hub A");

    // Another player sees none of them, and can't open one directly
    assertThat(body(call("GET", "/api/bookings/mine", player2))).isEmpty();
    call("GET", "/api/bookings/" + pending, player2).andExpect(status().isNotFound());
    call("GET", "/api/bookings/mine", adminA).andExpect(status().isForbidden());
  }

  // ---------- FR-053 / FR-054: cancelling ----------

  @Test void playerCancelsEligibleBookingAndTheSlotIsFreedForOthers() throws Exception {
    long sid = slot(slotsA, 6);
    long id = hold(player, courtA, sid);
    call("POST", "/api/facility-bookings/" + id + "/confirm", adminA).andExpect(status().isOk());
    assertThat(slotStatus(courtA, sid)).isEqualTo("BOOKED");
    long unreadBefore = body(call("GET", "/api/notifications/unread-count", adminA)).get("count").asLong();

    JsonNode c = body(call("POST", "/api/bookings/" + id + "/cancel", player).andExpect(status().isOk()));
    assertThat(c.get("status").asText()).isEqualTo("CANCELLED");
    assertThat(slotStatus(courtA, sid)).isEqualTo("AVAILABLE");                         // freed (FR-054)
    assertThat(body(call("GET", "/api/notifications/unread-count", adminA)).get("count").asLong()).isEqualTo(unreadBefore + 1);
    hold(player2, courtA, sid);                                                           // someone else can book it now
    assertThat(slotStatus(courtA, sid)).isEqualTo("PENDING");
  }

  @Test void bookingsThatArentEligibleCantBeCancelled() throws Exception {
    long sid = slot(slotsA, 8);
    long id = hold(player, courtA, sid);

    // Someone else's booking: not found (and nothing changes)
    call("POST", "/api/bookings/" + id + "/cancel", player2).andExpect(status().isNotFound());
    call("POST", "/api/facility-bookings/" + id + "/cancel", adminB).andExpect(status().isNotFound());
    assertThat(slotStatus(courtA, sid)).isEqualTo("PENDING");

    // Already started: refused, booking and slot unchanged
    Booking b = bookings.findById(id).orElseThrow();
    LocalDate realDate = b.getSlotDate();
    b.setSlotDate(LocalDate.now(ZoneId.of("Asia/Manila")).minusDays(1)); bookings.save(b);
    call("POST", "/api/bookings/" + id + "/cancel", player).andExpect(status().isConflict())
      .andExpect(jsonPath("$.message").value(org.hamcrest.Matchers.containsString("already started")));
    b = bookings.findById(id).orElseThrow(); b.setSlotDate(realDate); bookings.save(b);
    assertThat(slotStatus(courtA, sid)).isEqualTo("PENDING");

    // Expired: refused
    b.setPaymentDeadline(Instant.now().minusSeconds(60)); bookings.save(b);
    expiry.run();
    call("POST", "/api/bookings/" + id + "/cancel", player).andExpect(status().isConflict())
      .andExpect(jsonPath("$.message").value(org.hamcrest.Matchers.containsString("already expired")));

    // Unknown booking
    call("POST", "/api/bookings/99999999/cancel", player).andExpect(status().isNotFound());
  }

  // ---------- FR-059 / FR-060: facility booking records ----------

  @Test void facilityRecordsShowOnlyOwnFacilitiesWithSearchAndStatusFilter() throws Exception {
    long a1 = hold(player, courtA, slot(slotsA, 10));
    long a2 = hold(player2, courtA, slot(slotsA, 12));
    long b1 = hold(player, courtB, slot(slotsB, 10));
    call("POST", "/api/facility-bookings/" + a1 + "/confirm", adminA).andExpect(status().isOk());
    call("POST", "/api/bookings/" + a2 + "/cancel", player2).andExpect(status().isOk());

    // Own facilities only
    assertThat(ids(call("GET", "/api/facility-bookings?period=all", adminA))).containsExactlyInAnyOrder(a2, a1);
    assertThat(ids(call("GET", "/api/facility-bookings?period=all", adminB))).containsExactly(b1);
    assertThat(ids(call("GET", "/api/facility-bookings?period=all&facilityId=" + facilityB, adminA))).isEmpty();
    call("POST", "/api/facility-bookings/" + b1 + "/confirm", adminA).andExpect(status().isNotFound());

    // Search: by part of the reference (any case) or by player name
    String ref = body(call("GET", "/api/facility-bookings?period=all&status=CONFIRMED", adminA)).get(0).get("qr_code").asText();
    assertThat(ids(call("GET", "/api/facility-bookings?period=all&q=" + ref.substring(3).toLowerCase(), adminA))).containsExactly(a1);
    assertThat(ids(call("GET", "/api/facility-bookings?period=all&q=pedro", adminA))).containsExactly(a2);
    assertThat(ids(call("GET", "/api/facility-bookings?period=all&q=" + ref, adminB))).isEmpty();   // B can't find A's booking

    // Status filter (and upcoming is the default period)
    assertThat(ids(call("GET", "/api/facility-bookings?period=all&status=CONFIRMED", adminA))).containsExactly(a1);
    assertThat(ids(call("GET", "/api/facility-bookings?period=all&status=cancelled", adminA))).containsExactly(a2);
    assertThat(ids(call("GET", "/api/facility-bookings?status=PENDING", adminA))).isEmpty();
    JsonNode rec = body(call("GET", "/api/facility-bookings?status=CONFIRMED", adminA)).get(0);
    assertThat(rec.get("player").get("full_name").asText()).startsWith("Juana Player");

    // Bad input and roles
    call("GET", "/api/facility-bookings?status=MAYBE", adminA).andExpect(status().isBadRequest());
    call("GET", "/api/facility-bookings?period=forever", adminA).andExpect(status().isBadRequest());
    call("GET", "/api/facility-bookings", player).andExpect(status().isForbidden());
    call("GET", "/api/facility-bookings", null).andExpect(status().isUnauthorized());
  }

  // ---------- helpers ----------

  private long facility(String admin, String name) throws Exception {
    return body(call("POST", "/api/facilities", admin, Map.of("name", name, "phone", "0917 123 4567", "address", "1 Test St", "city", "Cebu City"))
      .andExpect(status().isCreated())).get("facility_id").asLong();
  }
  private long court(String admin, long facilityId) throws Exception {
    return body(call("POST", "/api/facilities/" + facilityId + "/courts", admin,
      Map.of("court_name", "Court 1", "sport_type", "Badminton", "is_indoor", true, "rental_rate", 250)).andExpect(status().isCreated())).get("court_id").asLong();
  }
  private JsonNode slots(long courtId) throws Exception {
    return body(call("GET", "/api/courts/" + courtId + "/slots?date=" + tomorrow, player).andExpect(status().isOk()));
  }
  private static long slot(JsonNode slots, int index){ return slots.get(index).get("slot_id").asLong(); }
  private long hold(String who, long courtId, long slotId) throws Exception {
    return body(call("POST", "/api/bookings", who, Map.of("courtId", courtId, "slotIds", List.of(slotId))).andExpect(status().isCreated())).get("booking_id").asLong();
  }
  private String slotStatus(long courtId, long slotId) throws Exception {
    for (JsonNode s : slots(courtId)) if (s.get("slot_id").asLong() == slotId) return s.get("status").asText();
    throw new AssertionError("slot " + slotId + " not found");
  }
  private List<Long> ids(ResultActions r) throws Exception {
    List<Long> out = new ArrayList<>();
    for (JsonNode b : body(r.andExpect(status().isOk()))) out.add(b.get("booking_id").asLong());
    return out;
  }
  private User user(String fullName, String login, Role role){
    User u = new User(); u.setFullName(fullName); u.setEmail(login + "@test.local");
    u.setPasswordHash(encoder.encode("Password1")); u.setRole(role);
    return users.save(u);
  }
  private String token(User u){ return jwt.generate(u); }
  private ResultActions call(String method, String url, String token) throws Exception { return call(method, url, token, null); }
  private ResultActions call(String method, String url, String token, Object body) throws Exception {
    var req = request(org.springframework.http.HttpMethod.valueOf(method), url).contentType(MediaType.APPLICATION_JSON);
    if (token != null) req.header("Authorization", "Bearer " + token);
    if (body != null) req.content(json.writeValueAsString(body));
    return mvc.perform(req);
  }
  private JsonNode body(ResultActions r) throws Exception {
    String s = r.andReturn().getResponse().getContentAsString();
    return s.isEmpty() ? json.nullNode() : json.readTree(s);
  }
}
