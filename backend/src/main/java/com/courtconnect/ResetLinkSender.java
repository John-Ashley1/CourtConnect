package com.courtconnect;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.mail.MailException;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.stereotype.Component;
import org.springframework.util.StringUtils;
import java.time.Duration;

/**
 * Delivers the reset link: by email when MAIL_HOST is configured (e.g. Gmail SMTP),
 * otherwise — or if sending fails — it is printed in the backend console.
 */
@Component
public class ResetLinkSender {
  private static final Logger log = LoggerFactory.getLogger(ResetLinkSender.class);
  private final ObjectProvider<JavaMailSender> mail; private final String host; private final String from;

  public ResetLinkSender(ObjectProvider<JavaMailSender> mail, @Value("${spring.mail.host:}") String host, @Value("${app.mail.from:}") String from){
    this.mail = mail; this.host = host; this.from = from; }

  public void send(User u, String link, Duration ttl){
    JavaMailSender sender = mail.getIfAvailable();
    if (StringUtils.hasText(host) && sender != null) {
      try {
        SimpleMailMessage m = new SimpleMailMessage();
        if (StringUtils.hasText(from)) m.setFrom(from.contains("<") ? from : "CourtConnect <" + from + ">");
        m.setTo(u.getEmail());
        m.setSubject("Reset your CourtConnect password");
        m.setText("""
          Hi %s,

          We received a request to reset the password for your CourtConnect account.
          Open this link to choose a new password (it works once and expires in %d minutes):

          %s

          If you didn't ask for this, you can ignore this email — your password won't change.

          — CourtConnect
          """.formatted(u.getFullName(), ttl.toMinutes(), link));
        sender.send(m);
        log.info("Password reset email sent to {}", u.getEmail());
        return;
      } catch (MailException e) {
        log.error("Could not send the password reset email to {} ({}). Printing the link instead.", u.getEmail(), e.getMessage());
      }
    }
    log.warn("""

      ================ PASSWORD RESET LINK (email not sent) ================
      User:    {}
      Link:    {}
      Expires: in {} minutes, works once
      ======================================================================""", u.getEmail(), link, ttl.toMinutes());
  }
}
