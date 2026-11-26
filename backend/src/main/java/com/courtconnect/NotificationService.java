package com.courtconnect;
import com.courtconnect.BookingDtos.*;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.util.List;

/** In-app notifications. Always for the signed-in user (from the JWT). */
@Service
public class NotificationService {
  private final NotificationRepository repo; private final AppClock clock;
  public NotificationService(NotificationRepository repo, AppClock clock){ this.repo = repo; this.clock = clock; }

  /** Joins the caller's transaction, so a notification is saved only if the change it describes is. */
  @Transactional
  public void send(User to, Notification.Type type, String message){
    if (to != null) repo.save(new Notification(to, type, message.length() > 500 ? message.substring(0, 497) + "…" : message));
  }

  @Transactional(readOnly=true)
  public List<NotificationDto> list(User me){ return repo.findTop100ByUserOrderBySentAtDesc(me).stream().map(NotificationDto::of).toList(); }

  @Transactional(readOnly=true)
  public long unread(User me){ return repo.countByUserAndReadAtIsNull(me); }

  @Transactional
  public NotificationDto markRead(User me, Long id){
    Notification n = repo.findByIdAndUser(id, me).orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "Notification not found."));
    n.markRead(clock.now());
    return NotificationDto.of(n);
  }

  @Transactional
  public void markAllRead(User me){ repo.markAllRead(me, clock.now()); }
}
