package com.courtconnect;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.http.HttpMethod;
import org.springframework.http.MediaType;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.ResultActions;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneId;
import java.util.*;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.request;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

/** Step (d): facility admin confirms/cancels (FR-018), blocks/unblocks (FR-020); unpaid holds auto-release (FR-019). */
@SpringBootTest @AutoConfigureMockMvc
class FacilityReviewTest {
  @MockBean Geocoder geocoder;
  @Autowired MockMvc mvc; @Autowired ObjectMapper json; @Autowired UserRepository users; @Autowired PasswordEncoder encoder;
  @Autowired JwtService jwt; @Autowired BookingRepository bookings; @Autowired BookingExpiry expiry;

  String admin, otherAdmin, player; long courtId; JsonNode s;
  final LocalDate tomorrow = LocalDate.now(ZoneId.of("Asia/Manila")).plusDays(1);

  @BeforeEach void setUp() throws Exception {
    when(geocoder.locate(anyString(), anyString())).thenReturn(new Geocoder.Position(10.3157, 123.8854));
    String n = UUID.randomUUID().toString().substring(0, 8);
    admin = jwt.generate(user("da-" + n, Role.FACILITY_ADMIN));
    otherAdmin = jwt.generate(user("db-" + n, Role.FACILITY_ADMIN));
    player = jwt.generate(user("dp-" + n, Role.PLAYER));
    long fac = body(call("POST", "/api/facilities", admin, Map.of("name", "Review Hub " + n, "phone", "09171234567", "address", "1 Review St", "city", "Cebu City"))).get("facility_id").asLong();
    courtId = body(call("POST", "/api/facilities/" + fac + "/courts", admin, Map.of("court_name", "D1", "sport_type", "Basketball", "rental_rate", 500))).get("court_id").asLong();
    s = slots();
  }

  @Test void facilityConfirmsAPendingBooking() throws Exception {
    long id = hold(0, 1);
    // Only the owning facility admin
    call("POST", "/api/facility-bookings/" + id + "/confirm", otherAdmin, null).andExpect(status().isNotFound());
    call("POST", "/api/facility-bookings/" + id + "/confirm", player, null).andExpect(status().isForbidden());

    JsonNode b = body(call("POST", "/api/facility-bookings/" + id + "/confirm", admin, null).andExpect(status().isOk()));
    assertThat(b.get("status").asText()).isEqualTo("CONFIRMED");
    assertThat(slots()).extracting(x -> x.get("status").asText()).startsWith("BOOKED", "BOOKED", "AVAILABLE");
    assertThat(body(call("GET", "/api/bookings/" + id, player, null)).get("status").asText()).isEqualTo("CONFIRMED");
    assertThat(body(call("GET", "/api/notifications", player, null)).get(0).get("message").asText()).contains("confirmed your booking");
    // Twice → refused; a confirmed booking stays confirmed after the hold time passes
    call("POST", "/api/facility-bookings/" + id + "/confirm", admin, null).andExpect(status().isConflict());
    pastDeadline(id);
    expiry.run();
    assertThat(body(call("GET", "/api/bookings/" + id, player, null)).get("status").asText()).isEqualTo("CONFIRMED");
    // Shows up as Confirmed in the facility's records
    call("GET", "/api/facility-bookings?status=CONFIRMED", admin, null).andExpect(jsonPath("$[0].booking_id").value(id));
  }

  @Test void cannotConfirmExpiredOrCancelled() throws Exception {
    long late = hold(2);
    pastDeadline(late);
    call("POST", "/api/facility-bookings/" + late + "/confirm", admin, null)
      .andExpect(status().isConflict()).andExpect(jsonPath("$.message").value(org.hamcrest.Matchers.containsString("expired")));
    assertThat(body(call("GET", "/api/bookings/" + late, player, null)).get("status").asText()).isEqualTo("EXPIRED");
    assertThat(slots().get(2).get("status").asText()).isEqualTo("AVAILABLE");

    long cancelled = hold(4);
    call("POST", "/api/bookings/" + cancelled + "/cancel", player, null).andExpect(status().isOk());
    call("POST", "/api/facility-bookings/" + cancelled + "/confirm", admin, null).andExpect(status().isConflict());
  }

  @Test void facilityCancelsPendingAndConfirmedBookings() throws Exception {
    long pending = hold(0);
    long confirmed = hold(2);
    call("POST", "/api/facility-bookings/" + confirmed + "/confirm", admin, null).andExpect(status().isOk());

    call("POST", "/api/facility-bookings/" + confirmed + "/cancel", otherAdmin, null).andExpect(status().isNotFound());
    call("POST", "/api/facility-bookings/" + confirmed + "/cancel", admin, null).andExpect(status().isOk()).andExpect(jsonPath("$.status").value("CANCELLED"));
    call("POST", "/api/facility-bookings/" + pending + "/cancel", admin, null).andExpect(status().isOk());
    assertThat(slots()).extracting(x -> x.get("status").asText()).startsWith("AVAILABLE", "AVAILABLE", "AVAILABLE");
    call("POST", "/api/facility-bookings/" + pending + "/cancel", admin, null).andExpect(status().isConflict());
    assertThat(body(call("GET", "/api/notifications", player, null))).anyMatch(x -> x.get("type").asText().equals("CANCELLED"));
  }

  @Test void blockAndUnblockWithAReason() throws Exception {
    long slot = s.get(6).get("slot_id").asLong();
    call("POST", "/api/slots/" + slot + "/block", admin, Map.of("reason", "Other")).andExpect(status().isBadRequest()).andExpect(jsonPath("$.fieldErrors.reason").exists());
    call("POST", "/api/slots/" + slot + "/block", admin, null).andExpect(status().isBadRequest());
    call("POST", "/api/slots/" + slot + "/block", otherAdmin, Map.of("reason", "Maintenance")).andExpect(status().isNotFound());
    call("POST", "/api/slots/" + slot + "/block", player, Map.of("reason", "Maintenance")).andExpect(status().isForbidden());

    call("POST", "/api/slots/" + slot + "/block", admin, Map.of("reason", "Private event"))
      .andExpect(status().isOk()).andExpect(jsonPath("$.status").value("BLOCKED")).andExpect(jsonPath("$.block_reason").value("Private event"));
    call("POST", "/api/slots/" + slot + "/block", admin, Map.of("reason", "Maintenance")).andExpect(status().isConflict());
    // Players see it Blocked and can't book it
    assertThat(slots().get(6).get("status").asText()).isEqualTo("BLOCKED");
    call("POST", "/api/bookings", player, Map.of("courtId", courtId, "slotIds", List.of(slot))).andExpect(status().isConflict());
    // The facility schedule shows the reason
    JsonNode sched = body(call("GET", "/api/facilities/" + facilityOf() + "/schedule?date=" + tomorrow, admin, null));
    assertThat(sched.get(0).get("slots").get(6).get("block_reason").asText()).isEqualTo("Private event");

    call("POST", "/api/slots/" + slot + "/unblock", admin, null).andExpect(status().isOk()).andExpect(jsonPath("$.status").value("AVAILABLE"));
    call("POST", "/api/slots/" + slot + "/unblock", admin, null).andExpect(status().isConflict());
    assertThat(slots().get(6).get("block_reason").isNull()).isTrue();
    // A held slot can't be blocked
    long held = hold(8);
    call("POST", "/api/slots/" + s.get(8).get("slot_id").asLong() + "/block", admin, Map.of("reason", "Maintenance")).andExpect(status().isConflict());
    assertThat(held).isPositive();
  }

  @Test void autoReleaseOnlyExpiresOverdueHolds() throws Exception {
    long overdue = hold(0), fresh = hold(2);
    pastDeadline(overdue);
    expiry.run();   // the @Scheduled job (every 15 s in the app)
    assertThat(body(call("GET", "/api/bookings/" + overdue, player, null)).get("status").asText()).isEqualTo("EXPIRED");
    assertThat(body(call("GET", "/api/bookings/" + fresh, player, null)).get("status").asText()).isEqualTo("PENDING");
    assertThat(slots()).extracting(x -> x.get("status").asText()).startsWith("AVAILABLE", "AVAILABLE", "PENDING");
    // The freed slot can be booked again right away
    call("POST", "/api/bookings", player, Map.of("courtId", courtId, "slotIds", List.of(s.get(0).get("slot_id").asLong()))).andExpect(status().isCreated());
    // Expired bookings stay in history
    assertThat(body(call("GET", "/api/facility-bookings?status=EXPIRED&period=all", admin, null))).hasSize(1);
  }

  // ---------- helpers ----------
  private long facilityOf() throws Exception { return body(call("GET", "/api/courts/" + courtId, player, null)).get("facility_id").asLong(); }
  private long hold(int... idx) throws Exception {
    List<Long> ids = new ArrayList<>(); for (int i : idx) ids.add(s.get(i).get("slot_id").asLong());
    return body(call("POST", "/api/bookings", player, Map.of("courtId", courtId, "slotIds", ids)).andExpect(status().isCreated())).get("booking_id").asLong();
  }
  private void pastDeadline(long id){
    Booking b = bookings.findById(id).orElseThrow(); b.setPaymentDeadline(Instant.now().minusSeconds(1)); bookings.save(b);
  }
  private JsonNode slots() throws Exception { return body(call("GET", "/api/courts/" + courtId + "/slots?date=" + tomorrow, player, null)); }
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
    String x = r.andReturn().getResponse().getContentAsString();
    return x.isEmpty() ? json.nullNode() : json.readTree(x);
  }
}
