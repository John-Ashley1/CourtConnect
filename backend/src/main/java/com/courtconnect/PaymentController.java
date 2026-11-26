package com.courtconnect;
import com.courtconnect.BookingDtos.*;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotNull;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

/** PayMongo payments (FR-022 – FR-025). The webhook is public but signature-checked. */
@RestController @RequestMapping("/api/payments")
public class PaymentController {
  private final PaymentService payments; private final BookingExpiry expiry;
  public PaymentController(PaymentService payments, BookingExpiry expiry){ this.payments = payments; this.expiry = expiry; }

  public record CheckoutRequest(@NotNull(message="Choose a booking.") Long bookingId, String method) {}

  /** Whether online payment (PayMongo) is switched on. When it isn't, the facility administrator confirms bookings (FR-018). */
  @GetMapping("/config")
  public java.util.Map<String,Boolean> config(){ return java.util.Map.of("online_payment", payments.enabled()); }

  @PostMapping("/checkout") @PreAuthorize("hasRole('PLAYER')")
  public PaymentService.CheckoutResponse checkout(@AuthenticationPrincipal User me, @Valid @RequestBody CheckoutRequest r){
    expiry.run();
    return payments.startCheckout(me, r.bookingId(), r.method());
  }

  @PostMapping("/{bookingId}/verify") @PreAuthorize("hasRole('PLAYER')")
  public BookingDto verify(@AuthenticationPrincipal User me, @PathVariable Long bookingId){ return payments.verify(me, bookingId); }

  @PostMapping("/webhook")
  public void webhook(@RequestBody String body, @RequestHeader(value="Paymongo-Signature", required=false) String signature){
    payments.webhook(body, signature);
  }
}
