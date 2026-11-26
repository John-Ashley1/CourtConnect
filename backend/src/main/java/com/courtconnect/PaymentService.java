package com.courtconnect;
import com.courtconnect.BookingDtos.*;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.client.SimpleClientHttpRequestFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientException;
import org.springframework.web.client.RestClientResponseException;
import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import java.math.BigDecimal;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.util.*;

/**
 * PayMongo checkout (FR-022 – FR-025), test mode with sk_test_… keys.
 *  1. startCheckout: creates a PayMongo Checkout Session for a Pending booking; the player pays on PayMongo's page.
 *  2. PayMongo sends the player back to /player/checkout/{id}?paid=1 → verify asks PayMongo whether the session is paid.
 *  3. When deployed, PayMongo also calls /api/payments/webhook (signed), so a booking is confirmed even if the player closes the tab.
 * A booking becomes Confirmed only after PayMongo says the payment is paid; the browser's word is never enough.
 */
@Service
public class PaymentService {
  private static final Logger log = LoggerFactory.getLogger(PaymentService.class);
  /** Labels shown in the app → PayMongo payment_method_types. */
  static final Map<String,String> METHODS = Map.of("GCash", "gcash", "Maya", "paymaya", "Credit / debit card", "card", "GrabPay", "grab_pay");
  static final BigDecimal MIN_AMOUNT = new BigDecimal("20");   // PayMongo's minimum, ₱20

  private final BookingService bookings; private final PaymentRepository payments; private final BookingRepository bookingRepo;
  private final NotificationService notifications; private final AppClock clock; private final ObjectMapper json;
  private final String secretKey, webhookSecret, frontendUrl; private final RestClient http;

  public PaymentService(BookingService bookings, PaymentRepository payments, BookingRepository bookingRepo, NotificationService notifications,
                        AppClock clock, ObjectMapper json, @Value("${app.paymongo.secret-key:}") String secretKey,
                        @Value("${app.paymongo.webhook-secret:}") String webhookSecret, @Value("${app.frontend-url}") String frontendUrl){
    this.bookings = bookings; this.payments = payments; this.bookingRepo = bookingRepo; this.notifications = notifications;
    this.clock = clock; this.json = json;
    this.secretKey = secretKey.trim(); this.webhookSecret = webhookSecret.trim(); this.frontendUrl = frontendUrl.replaceAll("/+$", "");
    SimpleClientHttpRequestFactory f = new SimpleClientHttpRequestFactory();
    f.setConnectTimeout(10000); f.setReadTimeout(15000);
    this.http = RestClient.builder().baseUrl("https://api.paymongo.com/v1").requestFactory(f)
      .defaultHeaders(h -> { if (!this.secretKey.isEmpty()) h.setBasicAuth(this.secretKey, ""); })
      .build();
  }

  public record CheckoutResponse(String checkout_url) {}

  /** True when PAYMONGO_SECRET_KEY is set. Until then players don't pay online; the facility confirms bookings. */
  public boolean enabled(){ return !secretKey.isEmpty(); }

  @Transactional
  public CheckoutResponse startCheckout(User player, Long bookingId, String methodLabel){
    if (secretKey.isEmpty()) throw new ApiException(HttpStatus.SERVICE_UNAVAILABLE,
      "Online payment isn't set up on this server yet (PAYMONGO_SECRET_KEY is missing). Your booking is still held.");
    String type = METHODS.get(methodLabel == null ? "" : methodLabel.trim());
    if (type == null) throw new ApiException(HttpStatus.BAD_REQUEST, "method", "Choose a payment method to continue.");
    Booking b = bookings.lockMine(player, bookingId);
    if (b.getStatus() != Booking.Status.PENDING || !b.getPaymentDeadline().isAfter(clock.now()))
      throw new ApiException(HttpStatus.CONFLICT, "Booking " + b.getQrCode() + " is no longer waiting for payment.");
    if (b.getTotalFee().compareTo(MIN_AMOUNT) < 0)
      throw new ApiException(HttpStatus.BAD_REQUEST, "PayMongo can only take payments of ₱20 or more.");

    String back = frontendUrl + "/player/checkout/" + b.getId();
    Map<String,Object> attributes = new LinkedHashMap<>();
    attributes.put("line_items", List.of(Map.of(
      "name", b.getCourt().getCourtName() + " · " + BookingService.when(b),
      "amount", b.getTotalFee().movePointRight(2).longValueExact(), "currency", "PHP", "quantity", 1)));
    attributes.put("payment_method_types", List.of(type));
    attributes.put("description", "CourtConnect booking " + b.getQrCode() + " at " + b.getCourt().getFacility().getName());
    attributes.put("reference_number", b.getQrCode());
    attributes.put("success_url", back + "?paid=1");
    attributes.put("cancel_url", back + "?cancelled=1");
    attributes.put("show_description", true);
    attributes.put("show_line_items", true);
    attributes.put("metadata", Map.of("booking_id", String.valueOf(b.getId())));

    JsonNode session = paymongo(() -> http.post().uri("/checkout_sessions").contentType(MediaType.APPLICATION_JSON)
      .body(Map.of("data", Map.of("attributes", attributes))).retrieve().body(JsonNode.class));
    String sessionId = session.path("data").path("id").asText(null);
    String url = session.path("data").path("attributes").path("checkout_url").asText(null);
    if (sessionId == null || url == null) throw new ApiException(HttpStatus.BAD_GATEWAY, "PayMongo didn't start the checkout. You haven't been charged. Try again.");

    payments.findFirstByBookingOrderByIdDesc(b).filter(p -> p.getStatus() == Payment.Status.PENDING).ifPresent(p -> p.setStatus(Payment.Status.FAILED));
    Payment p = new Payment(b, methodLabel.trim(), b.getTotalFee());
    p.setPaymongoReference(sessionId);
    payments.save(p);
    return new CheckoutResponse(url);
  }

  /** Asks PayMongo whether the booking's latest checkout was paid, and confirms the booking if so. */
  @Transactional
  public BookingDto verify(User player, Long bookingId){
    Booking b = bookings.lockMine(player, bookingId);
    Optional<Payment> latest = payments.findFirstByBookingOrderByIdDesc(b);
    if (latest.isPresent() && latest.get().getStatus() != Payment.Status.PAID && !secretKey.isEmpty() && latest.get().getPaymongoReference() != null) {
      Payment p = latest.get();
      JsonNode session = paymongo(() -> http.get().uri("/checkout_sessions/{id}", p.getPaymongoReference()).retrieve().body(JsonNode.class));
      paidPaymentId(session.path("data")).ifPresent(payId -> settle(b, p, payId));
    }
    return bookings.dto(b);
  }

  /**
   * PayMongo webhook (event checkout_session.payment.paid). The Paymongo-Signature header is checked with the
   * webhook secret, so nobody else can mark bookings as paid.
   */
  @Transactional
  public void webhook(String rawBody, String signatureHeader){
    if (webhookSecret.isEmpty()) throw new ApiException(HttpStatus.SERVICE_UNAVAILABLE, "Webhook not configured.");
    if (!validSignature(rawBody, signatureHeader)) throw new ApiException(HttpStatus.UNAUTHORIZED, "Invalid signature.");
    JsonNode event;
    try { event = json.readTree(rawBody); } catch (Exception e) { throw new ApiException(HttpStatus.BAD_REQUEST, "Invalid JSON."); }
    JsonNode attrs = event.path("data").path("attributes");
    if (!"checkout_session.payment.paid".equals(attrs.path("type").asText())) return;   // other events: nothing to do
    JsonNode session = attrs.path("data");
    payments.findByPaymongoReference(session.path("id").asText()).ifPresent(p -> {
      Booking b = bookingRepo.lockById(p.getBooking().getId()).orElseThrow();
      paidPaymentId(session).ifPresent(payId -> settle(b, p, payId));
    });
  }

  private void settle(Booking b, Payment p, String paymongoPaymentId){
    if (p.getStatus() == Payment.Status.PAID) return;
    p.markPaid(paymongoPaymentId, clock.now());
    if (!bookings.confirmPaid(b)) {
      log.warn("Booking {} was paid ({}) but is {} and its slots are taken; it needs a manual refund.", b.getQrCode(), paymongoPaymentId, b.getStatus());
      notifications.send(b.getPlayer(), Notification.Type.PAYMENT, "We received your payment for " + b.getQrCode()
        + ", but the booking had already " + (b.getStatus() == Booking.Status.CANCELLED ? "been cancelled" : "expired and the slot was taken")
        + ". Contact " + b.getCourt().getFacility().getName() + " for a refund (PayMongo ref " + paymongoPaymentId + ").");
      notifications.send(b.getCourt().getFacility().getAdmin(), Notification.Type.PAYMENT, b.getPlayer().getFullName() + " paid for " + b.getQrCode()
        + " after it was " + b.getStatus().name().toLowerCase() + ". Please refund them (PayMongo ref " + paymongoPaymentId + ").");
    }
  }

  /** The id of a paid payment in a checkout session, if any. */
  private static Optional<String> paidPaymentId(JsonNode session){
    JsonNode attrs = session.path("attributes");
    for (JsonNode pay : attrs.path("payments"))
      if ("paid".equals(pay.path("attributes").path("status").asText())) return Optional.of(pay.path("id").asText());
    if ("succeeded".equals(attrs.path("payment_intent").path("attributes").path("status").asText()))
      return Optional.of(attrs.path("payment_intent").path("id").asText());
    return Optional.empty();
  }

  /** Header "t=<timestamp>,te=<test signature>,li=<live signature>"; signature = HMAC-SHA256(secret, t + "." + body). */
  boolean validSignature(String body, String header){
    if (!StringUtils.hasText(header)) return false;
    Map<String,String> parts = new HashMap<>();
    for (String kv : header.split(",")) { String[] x = kv.trim().split("=", 2); if (x.length == 2) parts.put(x[0], x[1]); }
    String t = parts.get("t"), sig = parts.getOrDefault("li", "").isEmpty() ? parts.get("te") : parts.get("li");
    if (t == null || sig == null) return false;
    try {
      Mac mac = Mac.getInstance("HmacSHA256");
      mac.init(new SecretKeySpec(webhookSecret.getBytes(StandardCharsets.UTF_8), "HmacSHA256"));
      String expected = HexFormat.of().formatHex(mac.doFinal((t + "." + body).getBytes(StandardCharsets.UTF_8)));
      return MessageDigest.isEqual(expected.getBytes(StandardCharsets.UTF_8), sig.getBytes(StandardCharsets.UTF_8));
    } catch (Exception e) { return false; }
  }

  private <T> T paymongo(java.util.function.Supplier<T> call){
    try { return call.get(); }
    catch (RestClientResponseException e) {
      log.warn("PayMongo answered {}: {}", e.getStatusCode(), e.getResponseBodyAsString());
      throw new ApiException(HttpStatus.BAD_GATEWAY, e.getStatusCode().value() == 401
        ? "PayMongo rejected the server's key. Check PAYMONGO_SECRET_KEY. You haven't been charged."
        : "PayMongo couldn't process the request. You haven't been charged. Try again.");
    } catch (RestClientException e) {
      log.warn("PayMongo unreachable: {}", e.getMessage());
      throw new ApiException(HttpStatus.BAD_GATEWAY, "PayMongo isn't responding. You haven't been charged. Try again.");
    }
  }
}
