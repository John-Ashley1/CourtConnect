package com.courtconnect;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.*;
import org.springframework.http.HttpStatus;
import org.springframework.security.config.Customizer;
import org.springframework.security.config.annotation.method.configuration.EnableMethodSecurity;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.SecurityFilterChain;
import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.http.MediaType;
import java.io.IOException;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;
import org.springframework.web.cors.*;
import java.util.List;
@Configuration
@EnableMethodSecurity   // Increment 3: @PreAuthorize("hasRole(...)") on facility-admin and player endpoints
public class SecurityConfig {
  /** Same JSON error shape as ApiExceptionHandler, for errors raised before a controller runs. */
  static void writeError(HttpServletResponse res, ObjectMapper mapper, HttpStatus status, String message, String path) throws IOException {
    res.setStatus(status.value());
    res.setContentType(MediaType.APPLICATION_JSON_VALUE);
    res.setCharacterEncoding("UTF-8");
    mapper.writeValue(res.getOutputStream(), ApiExceptionHandler.body(status, message, path, null));
  }

  @Bean SecurityFilterChain chain(HttpSecurity http, JwtFilter jwtFilter, ObjectMapper mapper) throws Exception {
    http.csrf(c -> c.disable()).cors(Customizer.withDefaults())
      .sessionManagement(s -> s.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
      .authorizeHttpRequests(a -> a.requestMatchers("/api/auth/register","/api/auth/login","/api/auth/forgot-password","/api/auth/reset-password","/api/payments/webhook","/error").permitAll().anyRequest().authenticated())
      .exceptionHandling(e -> e
        .authenticationEntryPoint((req, res, ex) -> writeError(res, mapper, HttpStatus.UNAUTHORIZED, "Sign in to continue.", req.getRequestURI()))
        .accessDeniedHandler((req, res, ex) -> writeError(res, mapper, HttpStatus.FORBIDDEN, "You don't have permission to do that.", req.getRequestURI())))
      .addFilterBefore(jwtFilter, UsernamePasswordAuthenticationFilter.class);
    return http.build();
  }
  @Bean PasswordEncoder passwordEncoder(){ return new BCryptPasswordEncoder(); }
  @Bean CorsConfigurationSource corsConfigurationSource(@Value("${app.cors-origin}") String origin){
    CorsConfiguration c = new CorsConfiguration();
    c.setAllowedOrigins(List.of(origin)); c.setAllowedMethods(List.of("GET","POST","PUT","PATCH","DELETE","OPTIONS")); c.setAllowedHeaders(List.of("*"));
    UrlBasedCorsConfigurationSource s = new UrlBasedCorsConfigurationSource(); s.registerCorsConfiguration("/**", c); return s;
  }
}
