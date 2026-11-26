package com.courtconnect;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.http.MediaType;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.web.servlet.MockMvc;
import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneId;
import java.util.*;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

/** Payment confirmation through a signed PayMongo webhook: Pending → Confirmed, slots Booked; bad signatures are rejected. */
@SpringBootTest(properties = "app.paymongo.webhook-secret=whsk_test_secret") @AutoConfigureMockMvc
class PaymentWebhookTest {
  static final String SECRET = "whsk_test_secret";
  /** The real map service is never called in tests: every address resolves to Cebu City. */
  @MockBean Geocoder geocoder;
  @Autowired MockMvc mvc; @Autowired ObjectMapper json; @Autowired UserRepository users; @Autowired PasswordEncoder encoder;
  @Autowired JwtService jwt; @Autowired BookingRepository bookings; @Autowired PaymentRepository payments; @Autowired BookingExpiry expiry;

  @org.junit.jupiter.api.BeforeEach void fakeGeocoder(){
    org.mockito.Mockito.when(geocoder.locate(org.mockito.ArgumentMatchers.anyString(), org.mockito.ArgumentMatchers.anyString()))
      .thenReturn(new Geocoder.Position(10.3157, 123.8854));
  }

  @Test void paidWebhookConfirmsBooking() throws Exception {
    String n = UUID.randomUUID().toString().substring(0, 6);
    String admin = jwt.generate(user("wa-" + n, Role.FACILITY_ADMIN)), player = jwt.generate(user("wp-" + n, Role.PLAYER));
    String tomorrow = LocalDate.now(ZoneId.of("Asia/Manila")).plusDays(1).toString();
    long fac = postJson("/api/facilities", admin, Map.of("name", "Pay Hub", "phone", "09170000001", "address", "3 Pay St", "city", "Cebu City")).get("facility_id").asLong();
    long court = postJson("/api/facilities/" + fac + "/courts", admin, Map.of("court_name", "Pay Court", "sport_type", "Tennis", "rental_rate", 250)).get("court_id").asLong();
    JsonNode slots = getJson("/api/courts/" + court + "/slots?date=" + tomorrow, player);

    // Without a PayMongo key the server says payment isn't set up (and the hold stays)
    long id = postJson("/api/bookings", player, Map.of("courtId", court, "slotIds", List.of(slots.get(0).get("slot_id").asLong()))).get("booking_id").asLong();
    mvc.perform(post("/api/payments/checkout").header("Authorization", "Bearer " + player).contentType(MediaType.APPLICATION_JSON)
      .content(json.writeValueAsString(Map.of("bookingId", id, "method", "GCash")))).andExpect(status().isServiceUnavailable());

    // A checkout session that the player paid
    Payment p = new Payment(bookings.findById(id).orElseThrow(), "GCash", new java.math.BigDecimal("250.00"));
    p.setPaymongoReference("cs_test_" + n);
    payments.save(p);
    String event = paidEvent("cs_test_" + n, "pay_test_" + n);

    webhook(event, "t=1,te=wrong,li=").andExpect(status().isUnauthorized());
    webhook(event, sign(event)).andExpect(status().isOk());

    JsonNode b = getJson("/api/bookings/" + id, player);
    assertThat(b.get("status").asText()).isEqualTo("CONFIRMED");
    assertThat(b.get("payment").get("status").asText()).isEqualTo("PAID");
    assertThat(b.get("payment").get("method").asText()).isEqualTo("GCash");
    assertThat(getJson("/api/courts/" + court + "/slots?date=" + tomorrow, player).get(0).get("status").asText()).isEqualTo("BOOKED");
    // Delivered twice → still one confirmation
    webhook(event, sign(event)).andExpect(status().isOk());
    assertThat(getJson("/api/notifications", player).findValuesAsText("type")).containsOnlyOnce("BOOKING");

    // Paid just after the hold expired: the slot is still free, so the booking is confirmed anyway
    long id2 = postJson("/api/bookings", player, Map.of("courtId", court, "slotIds", List.of(slots.get(2).get("slot_id").asLong()))).get("booking_id").asLong();
    Booking late = bookings.findById(id2).orElseThrow();
    late.setPaymentDeadline(Instant.now().minusSeconds(5));
    bookings.save(late);
    expiry.run();
    assertThat(getJson("/api/bookings/" + id2, player).get("status").asText()).isEqualTo("EXPIRED");
    Payment p2 = new Payment(late, "Maya", new java.math.BigDecimal("250.00"));
    p2.setPaymongoReference("cs_test2_" + n);
    payments.save(p2);
    String event2 = paidEvent("cs_test2_" + n, "pay_test2_" + n);
    webhook(event2, sign(event2)).andExpect(status().isOk());
    assertThat(getJson("/api/bookings/" + id2, player).get("status").asText()).isEqualTo("CONFIRMED");
    assertThat(getJson("/api/courts/" + court + "/slots?date=" + tomorrow, player).get(2).get("status").asText()).isEqualTo("BOOKED");

    // A confirmed booking shows Paid in the facility's records
    JsonNode recs = getJson("/api/facility-bookings?status=CONFIRMED", admin);
    assertThat(recs).hasSize(2);
    assertThat(recs.get(0).get("payment").get("status").asText()).isEqualTo("PAID");
  }

  private String paidEvent(String sessionId, String paymentId) throws Exception {
    return json.writeValueAsString(Map.of("data", Map.of("id", "evt_1", "attributes", Map.of(
      "type", "checkout_session.payment.paid",
      "data", Map.of("id", sessionId, "attributes", Map.of("payments", List.of(Map.of("id", paymentId, "attributes", Map.of("status", "paid")))))))));
  }
  private static String sign(String body) throws Exception {
    Mac mac = Mac.getInstance("HmacSHA256");
    mac.init(new SecretKeySpec(SECRET.getBytes(StandardCharsets.UTF_8), "HmacSHA256"));
    return "t=1700000000,te=" + HexFormat.of().formatHex(mac.doFinal(("1700000000." + body).getBytes(StandardCharsets.UTF_8))) + ",li=";
  }
  private org.springframework.test.web.servlet.ResultActions webhook(String body, String sig) throws Exception {
    return mvc.perform(post("/api/payments/webhook").header("Paymongo-Signature", sig).contentType(MediaType.APPLICATION_JSON).content(body));
  }
  private User user(String name, Role role){
    User u = new User(); u.setFullName("User " + name); u.setEmail(name + "@test.local");
    u.setPasswordHash(encoder.encode("Password1")); u.setRole(role); return users.save(u);
  }
  private JsonNode postJson(String url, String token, Object body) throws Exception {
    return json.readTree(mvc.perform(post(url).header("Authorization", "Bearer " + token).contentType(MediaType.APPLICATION_JSON)
      .content(json.writeValueAsString(body))).andReturn().getResponse().getContentAsString());
  }
  private JsonNode getJson(String url, String token) throws Exception {
    return json.readTree(mvc.perform(get(url).header("Authorization", "Bearer " + token)).andReturn().getResponse().getContentAsString());
  }
}
