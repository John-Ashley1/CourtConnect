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
import java.util.*;
import java.util.concurrent.*;
import java.util.concurrent.atomic.AtomicInteger;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

/**
 * Increment 3 end to end through the REST API (H2, PostgreSQL mode):
 * facility → court → generated slots → search → hold (Pending) → double-booking refused → expiry / cancel → release,
 * block / unblock, hours change, facility booking records, role checks.
 */
@SpringBootTest @AutoConfigureMockMvc
class BookingFlowTest {
  /** The real map service is never called in tests: every address resolves to Cebu City. */
  @MockBean Geocoder geocoder;
  @Autowired MockMvc mvc; @Autowired ObjectMapper json; @Autowired UserRepository users; @Autowired PasswordEncoder encoder;
  @Autowired JwtService jwt; @Autowired BookingRepository bookings; @Autowired BookingExpiry expiry; @Autowired BookingService bookingService;
  @Autowired AppClock clock;

  String admin, player, player2; User playerUser, player2User;
  final String tomorrow = LocalDate.now(java.time.ZoneId.of("Asia/Manila")).plusDays(1).toString();

  @BeforeEach void users(){
    String n = UUID.randomUUID().toString().substring(0, 8);
    admin = token(user("fa-" + n, Role.FACILITY_ADMIN));
    playerUser = user("p1-" + n, Role.PLAYER); player = token(playerUser);
    player2User = user("p2-" + n, Role.PLAYER); player2 = token(player2User);
  }

  @org.junit.jupiter.api.BeforeEach void fakeGeocoder(){
    org.mockito.Mockito.when(geocoder.locate(org.mockito.ArgumentMatchers.anyString(), org.mockito.ArgumentMatchers.anyString()))
      .thenReturn(new Geocoder.Position(10.3157, 123.8854));
  }

  @Test void fullBookingFlow() throws Exception {
    // FR-007 / FR-010: register a facility (geocoding off in tests → approximate position)
    JsonNode fac = body(call("POST", "/api/facilities", admin, Map.of("name", "Test Sports Hub", "phone", "0917 123 4567", "address", "1 Test St", "city", "Cebu City"))
      .andExpect(status().isCreated()));
    long facilityId = fac.get("facility_id").asLong();
    assertThat(fac.get("address").asText()).isEqualTo("1 Test St, Cebu City");
    assertThat(fac.get("phone").asText()).isEqualTo("09171234567");
    assertThat(fac.get("latitude").asDouble()).isEqualTo(10.3157);

    // Field errors come back in snake_case so the form can show them under the right input
    call("POST", "/api/facilities/" + facilityId + "/courts", admin, Map.of("court_name", "", "sport_type", "Basketball", "rental_rate", 300))
      .andExpect(status().isBadRequest()).andExpect(jsonPath("$.fieldErrors.court_name").exists());

    // FR-008: add a court → default hours 6 AM–10 PM, 1-hour slots generated (FR-013)
    JsonNode court = body(call("POST", "/api/facilities/" + facilityId + "/courts", admin,
      Map.of("court_name", "Court A", "sport_type", "Basketball", "is_indoor", false, "rental_rate", 350)).andExpect(status().isCreated()));
    long courtId = court.get("court_id").asLong();
    assertThat(court.get("is_indoor").asBoolean()).isFalse();
    assertThat(court.get("operating_hours")).hasSize(7);
    assertThat(court.get("open_time").asText()).isEqualTo("06:00:00");

    // Same name twice at one facility is refused
    call("POST", "/api/facilities/" + facilityId + "/courts", admin, Map.of("court_name", "court a", "sport_type", "Tennis", "rental_rate", 100))
      .andExpect(status().isConflict()).andExpect(jsonPath("$.fieldErrors.court_name").exists());

    // FR-014: slots with status
    JsonNode slots = body(call("GET", "/api/courts/" + courtId + "/slots?date=" + tomorrow, player, null).andExpect(status().isOk()));
    assertThat(slots).hasSize(16);
    assertThat(slots.get(0).get("start_time").asText()).isEqualTo("06:00:00");
    assertThat(slots.get(0).get("status").asText()).isEqualTo("AVAILABLE");
    long s0 = slots.get(0).get("slot_id").asLong(), s1 = slots.get(1).get("slot_id").asLong(), s2 = slots.get(2).get("slot_id").asLong(), s5 = slots.get(5).get("slot_id").asLong();

    // Search finds it with distance and open slots
    JsonNode found = body(call("GET", "/api/courts?sport=Basketball&date=" + tomorrow, player, null).andExpect(status().isOk()));
    JsonNode mine = find(found, "court_id", courtId);
    assertThat(mine.get("open_slots").asInt()).isEqualTo(16);
    assertThat(mine.get("distance_km").asDouble()).isEqualTo(0.0);
    assertThat(mine.get("facility").get("name").asText()).isEqualTo("Test Sports Hub");

    // Role checks
    call("POST", "/api/bookings", admin, Map.of("courtId", courtId, "slotIds", List.of(s0))).andExpect(status().isForbidden());
    call("GET", "/api/facilities/mine", player, null).andExpect(status().isForbidden());
    call("GET", "/api/courts/" + courtId + "/slots", null, null).andExpect(status().isUnauthorized());

    // FR-015 / FR-017 / FR-021: hold 2 consecutive hours → Pending, fee = rate × hours
    JsonNode b = body(call("POST", "/api/bookings", player, Map.of("courtId", courtId, "slotIds", List.of(s0, s1))).andExpect(status().isCreated()));
    long bookingId = b.get("booking_id").asLong();
    assertThat(b.get("status").asText()).isEqualTo("PENDING");
    assertThat(b.get("total_fee").decimalValue()).isEqualByComparingTo("700");
    assertThat(b.get("hours").decimalValue()).isEqualByComparingTo("2");
    assertThat(b.get("qr_code").asText()).matches("CC-\\d{4}-[A-Z2-9]{6}");
    assertThat(b.get("slot").get("start_time").asText()).isEqualTo("06:00:00");
    assertThat(b.get("slot").get("end_time").asText()).isEqualTo("07:00:00");
    assertThat(b.get("end_time").asText()).isEqualTo("08:00:00");
    assertThat(Instant.parse(b.get("payment_deadline").asText())).isAfter(Instant.now().plusSeconds(14 * 60));
    assertThat(statusOf(courtId, 0)).isEqualTo("PENDING");

    // FR-016: someone else can't take those slots
    call("POST", "/api/bookings", player2, Map.of("courtId", courtId, "slotIds", List.of(s1, s2))).andExpect(status().isConflict());
    // Non-consecutive slots are refused
    call("POST", "/api/bookings", player2, Map.of("courtId", courtId, "slotIds", List.of(s2, s5))).andExpect(status().isBadRequest());
    // Another player can't see this booking
    call("GET", "/api/bookings/" + bookingId, player2, null).andExpect(status().isNotFound());

    // FR-059 / FR-060: facility sees it, with the player; search by reference
    JsonNode recs = body(call("GET", "/api/facility-bookings?q=" + b.get("qr_code").asText() + "&period=all", admin, null).andExpect(status().isOk()));
    assertThat(recs).hasSize(1);
    assertThat(recs.get(0).get("player").get("full_name").asText()).isEqualTo(playerUser.getFullName());
    JsonNode sched = body(call("GET", "/api/facilities/" + facilityId + "/schedule?date=" + tomorrow, admin, null).andExpect(status().isOk()));
    assertThat(sched.get(0).get("slots").get(0).get("booking").get("qr_code").asText()).isEqualTo(b.get("qr_code").asText());

    // FR-019: the hold runs out → Expired, slots Available, player notified
    Booking held = bookings.findById(bookingId).orElseThrow();
    held.setPaymentDeadline(Instant.now().minusSeconds(1));
    bookings.save(held);
    expiry.run();
    assertThat(body(call("GET", "/api/bookings/" + bookingId, player, null)).get("status").asText()).isEqualTo("EXPIRED");
    assertThat(statusOf(courtId, 0)).isEqualTo("AVAILABLE");
    assertThat(statusOf(courtId, 1)).isEqualTo("AVAILABLE");
    assertThat(body(call("GET", "/api/notifications/unread-count", player, null)).get("count").asInt()).isEqualTo(1);

    // FR-053 / FR-054: player books again and cancels → slots released, facility notified
    long b2 = body(call("POST", "/api/bookings", player2, Map.of("courtId", courtId, "slotIds", List.of(s1, s2))).andExpect(status().isCreated())).get("booking_id").asLong();
    JsonNode cancelled = body(call("POST", "/api/bookings/" + b2 + "/cancel", player2, null).andExpect(status().isOk()));
    assertThat(cancelled.get("status").asText()).isEqualTo("CANCELLED");
    assertThat(cancelled.get("cancelled_by").asText()).isEqualTo("PLAYER");
    assertThat(statusOf(courtId, 1)).isEqualTo("AVAILABLE");
    call("POST", "/api/bookings/" + b2 + "/cancel", player2, null).andExpect(status().isConflict());
    assertThat(body(call("GET", "/api/notifications", admin, null)).get(0).get("type").asText()).isEqualTo("CANCELLED");

    // FR-018: the facility cancels a player's booking → player notified
    long b3 = body(call("POST", "/api/bookings", player, Map.of("courtId", courtId, "slotIds", List.of(s5)))).get("booking_id").asLong();
    call("POST", "/api/facility-bookings/" + b3 + "/cancel", admin, null).andExpect(status().isOk()).andExpect(jsonPath("$.cancelled_by").value("FACILITY_ADMIN"));
    call("POST", "/api/facility-bookings/" + b3 + "/cancel", player, null).andExpect(status().isForbidden());

    // FR-052: player 1's history keeps both past bookings (expired + cancelled by the facility)
    JsonNode history = body(call("GET", "/api/bookings/mine", player, null).andExpect(status().isOk()));
    assertThat(history).hasSize(2);

    // FR-020: block a slot → players can't book it; unblock → Available again
    call("POST", "/api/slots/" + s2 + "/block", admin, Map.of("reason", "Maintenance")).andExpect(status().isOk()).andExpect(jsonPath("$.status").value("BLOCKED"));
    call("POST", "/api/bookings", player, Map.of("courtId", courtId, "slotIds", List.of(s2))).andExpect(status().isConflict());
    call("POST", "/api/slots/" + s2 + "/block", player, Map.of("reason", "Maintenance")).andExpect(status().isForbidden());
    call("POST", "/api/slots/" + s2 + "/unblock", admin, null).andExpect(status().isOk()).andExpect(jsonPath("$.status").value("AVAILABLE"));

    // FR-009: removing a court with an upcoming booking is refused
    call("POST", "/api/bookings", player, Map.of("courtId", courtId, "slotIds", List.of(s2))).andExpect(status().isCreated());
    call("DELETE", "/api/courts/" + courtId, admin, null).andExpect(status().isConflict());

    // FR-011: new hours → future Available slots regenerated, the held 8 AM slot is kept
    List<Map<String,Object>> week = new ArrayList<>();
    for (int d = 0; d < 7; d++) week.add(Map.of("day_of_week", d, "is_open", true, "open_time", "08:00:00", "close_time", "14:00:00"));
    call("PUT", "/api/courts/" + courtId + "/hours", admin, Map.of("slot_minutes", 120, "payment_hold_minutes", 20, "operating_hours", week))
      .andExpect(status().isOk()).andExpect(jsonPath("$.slot_minutes").value(120));
    JsonNode after = body(call("GET", "/api/courts/" + courtId + "/slots?date=" + tomorrow, player, null));
    // kept: 08:00–09:00 (Pending). New 2-hour slots: 08–10 overlaps → skipped; 10–12, 12–14.
    assertThat(after).extracting(s -> s.get("start_time").asText() + " " + s.get("status").asText())
      .containsExactly("08:00:00 PENDING", "10:00:00 AVAILABLE", "12:00:00 AVAILABLE");
    call("PUT", "/api/courts/" + courtId + "/hours", admin, Map.of("slot_minutes", 60, "payment_hold_minutes", 99, "operating_hours", week))
      .andExpect(status().isBadRequest()).andExpect(jsonPath("$.fieldErrors.lim").exists());
  }

  /** FR-016 under load: many players press "book" on the same slot at the same moment; exactly one wins. */
  @Test void onlyOnePlayerGetsASlot() throws Exception {
    long facilityId = body(call("POST", "/api/facilities", admin, Map.of("name", "Race Hub", "phone", "09170000000", "address", "2 Race St", "city", "Cebu City"))).get("facility_id").asLong();
    long courtId = body(call("POST", "/api/facilities/" + facilityId + "/courts", admin, Map.of("court_name", "Race Court", "sport_type", "Badminton", "rental_rate", 200))).get("court_id").asLong();
    long slotId = body(call("GET", "/api/courts/" + courtId + "/slots?date=" + tomorrow, player, null)).get(3).get("slot_id").asLong();

    int n = 8;
    List<User> racers = new ArrayList<>();
    for (int i = 0; i < n; i++) racers.add(user("race-" + i + "-" + UUID.randomUUID().toString().substring(0, 6), Role.PLAYER));
    ExecutorService pool = Executors.newFixedThreadPool(n);
    CountDownLatch go = new CountDownLatch(1);
    AtomicInteger ok = new AtomicInteger(), conflict = new AtomicInteger();
    List<Future<?>> fs = new ArrayList<>();
    for (User u : racers) fs.add(pool.submit(() -> {
      go.await();
      try { bookingService.hold(u, new BookingDtos.HoldRequest(courtId, List.of(slotId))); ok.incrementAndGet(); }
      catch (ApiException e) { if (e.getStatus().value() == 409) conflict.incrementAndGet(); else throw e; }
      return null;
    }));
    go.countDown();
    for (Future<?> f : fs) f.get(30, TimeUnit.SECONDS);
    pool.shutdown();
    assertThat(ok.get()).isEqualTo(1);
    assertThat(conflict.get()).isEqualTo(n - 1);
  }

  // ---------- helpers ----------

  private String statusOf(long courtId, int index) throws Exception {
    return body(call("GET", "/api/courts/" + courtId + "/slots?date=" + tomorrow, player, null)).get(index).get("status").asText();
  }

  private User user(String name, Role role){
    User u = new User(); u.setFullName("User " + name); u.setEmail(name + "@test.local");
    u.setPasswordHash(encoder.encode("Password1")); u.setRole(role);
    return users.save(u);
  }
  private String token(User u){ return jwt.generate(u); }

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
  private static JsonNode find(JsonNode arr, String key, long id){
    for (JsonNode x : arr) if (x.get(key).asLong() == id) return x;
    throw new AssertionError("No " + key + "=" + id + " in " + arr);
  }
}
