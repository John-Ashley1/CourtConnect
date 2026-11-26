package com.courtconnect;
import com.courtconnect.BookingDtos.*;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;
import java.util.List;

/** The signed-in user's in-app notifications. */
@RestController @RequestMapping("/api/notifications")
public class NotificationController {
  private final NotificationService service;
  public NotificationController(NotificationService service){ this.service = service; }

  @GetMapping public List<NotificationDto> list(@AuthenticationPrincipal User me){ return service.list(me); }
  @GetMapping("/unread-count") public CountDto unread(@AuthenticationPrincipal User me){ return new CountDto(service.unread(me)); }
  @PostMapping("/{id}/read") public NotificationDto read(@AuthenticationPrincipal User me, @PathVariable Long id){ return service.markRead(me, id); }
  @PostMapping("/read-all") public void readAll(@AuthenticationPrincipal User me){ service.markAllRead(me); }
}
