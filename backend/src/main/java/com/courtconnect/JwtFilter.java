package com.courtconnect;
import io.jsonwebtoken.Claims;
import io.jsonwebtoken.JwtException;
import jakarta.servlet.*;
import jakarta.servlet.http.*;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;
import java.io.IOException;
import java.util.List;
@Component
public class JwtFilter extends OncePerRequestFilter {
  private final JwtService jwt; private final UserRepository users;
  public JwtFilter(JwtService jwt, UserRepository users){ this.jwt=jwt; this.users=users; }
  @Override protected void doFilterInternal(HttpServletRequest req, HttpServletResponse res, FilterChain chain) throws ServletException, IOException {
    String h = req.getHeader("Authorization");
    if (h != null && h.startsWith("Bearer ")) {
      try {
        Claims c = jwt.parse(h.substring(7));
        Long id = Long.valueOf(c.getSubject());           // Increment 1 tokens (email subject) fail here → sign in again
        Integer ver = c.get("ver", Integer.class);
        users.findById(id)
          .filter(u -> ver != null && ver == u.getTokenVersion())   // stale after password change/reset
          .ifPresent(u -> SecurityContextHolder.getContext().setAuthentication(
            new UsernamePasswordAuthenticationToken(u, null, List.of(new SimpleGrantedAuthority("ROLE_" + u.getRole())))));
      } catch (JwtException | IllegalArgumentException ignored) {}   // invalid/expired → stays anonymous → 401
    }
    chain.doFilter(req, res);
  }
}
