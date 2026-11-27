package com.courtconnect;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.http.MediaType;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.ResultActions;
import java.time.Duration;
import java.util.*;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.request;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

/**
 * Increment 3 step (f): regression of Increments 1–2 through the REST API (H2).
 * Registration (player only, strong-password rule), sign-in (no password rule, roles), /auth/me, profile
 * (email is permanent), change password (other sessions signed out), forgot / reset password.
 */
@SpringBootTest @AutoConfigureMockMvc
class AccountRegressionTest {
  /** Reset links are captured here instead of being emailed or printed. */
  @MockBean ResetLinkSender resetLinks;
  @Autowired MockMvc mvc; @Autowired ObjectMapper json; @Autowired UserRepository users; @Autowired PasswordEncoder encoder;

  String n;
  @BeforeEach void id(){ n = UUID.randomUUID().toString().substring(0, 8); }

  // ---------- Increment 1: register, sign in, roles ----------

  @Test void registrationCreatesPlayersAndEnforcesThePasswordRule() throws Exception {
    String email = "new-" + n + "@test.local";
    for (String weak : List.of("12345678", "abcdefgh", "abc123"))
      call("POST", "/api/auth/register", null, Map.of("fullName", "New Player", "email", email, "password", weak))
        .andExpect(status().isBadRequest())
        .andExpect(jsonPath("$.fieldErrors.password").value("Password must be at least 8 characters and include a letter and a number."));
    call("POST", "/api/auth/register", null, Map.of("fullName", "New Player", "email", email, "password", ""))
      .andExpect(status().isBadRequest()).andExpect(jsonPath("$.fieldErrors.password").value("Enter a password."));
    call("POST", "/api/auth/register", null, Map.of("fullName", "New Player", "email", "not-an-email", "password", "Court2026"))
      .andExpect(status().isBadRequest()).andExpect(jsonPath("$.fieldErrors.email").exists());

    // Valid: signed in straight away as a PLAYER (role can't be chosen), email stored lower-case
    JsonNode r = body(call("POST", "/api/auth/register", null,
      Map.of("fullName", "  New Player  ", "email", email.toUpperCase(), "password", "Court2026", "role", "SYSTEM_ADMIN")).andExpect(status().isOk()));
    assertThat(r.get("token").asText()).isNotBlank();
    assertThat(r.get("user").get("role").asText()).isEqualTo("PLAYER");
    assertThat(r.get("user").get("email").asText()).isEqualTo(email);
    assertThat(r.get("user").get("fullName").asText()).isEqualTo("New Player");

    // Same email again (any case) is refused
    call("POST", "/api/auth/register", null, Map.of("fullName", "Copy", "email", email, "password", "Court2026"))
      .andExpect(status().isConflict()).andExpect(jsonPath("$.message").value("An account with this email already exists."));
  }

  @Test void signInHasNoPasswordRuleAndEachRoleGetsItsOwnAccess() throws Exception {
    // Older admin accounts with number-only passwords must still sign in
    user("fa-" + n, Role.FACILITY_ADMIN, "12345678");
    user("sa-" + n, Role.SYSTEM_ADMIN, "1234");
    user("pl-" + n, Role.PLAYER, "Court2026");
    String fa = login("fa-" + n, "12345678"), sa = login("sa-" + n, "1234"), pl = login("pl-" + n, "Court2026");

    call("POST", "/api/auth/login", null, Map.of("email", "fa-" + n + "@test.local", "password", "wrong"))
      .andExpect(status().isUnauthorized()).andExpect(jsonPath("$.message").value("Incorrect email or password."));
    call("POST", "/api/auth/login", null, Map.of("email", "nobody-" + n + "@test.local", "password", "x")).andExpect(status().isUnauthorized());
    call("POST", "/api/auth/login", null, Map.of("email", "", "password", "")).andExpect(status().isBadRequest());

    // /auth/me returns the signed-in user; no or bad token → 401
    call("GET", "/api/auth/me", fa, null).andExpect(status().isOk()).andExpect(jsonPath("$.role").value("FACILITY_ADMIN"));
    call("GET", "/api/auth/me", sa, null).andExpect(status().isOk()).andExpect(jsonPath("$.role").value("SYSTEM_ADMIN"));
    call("GET", "/api/auth/me", pl, null).andExpect(status().isOk()).andExpect(jsonPath("$.role").value("PLAYER"));
    call("GET", "/api/auth/me", null, null).andExpect(status().isUnauthorized());
    call("GET", "/api/auth/me", "not-a-jwt", null).andExpect(status().isUnauthorized());

    // Role checks across increments
    call("GET", "/api/bookings/mine", fa, null).andExpect(status().isForbidden());
    call("GET", "/api/facility-bookings", pl, null).andExpect(status().isForbidden());
    call("GET", "/api/facilities/mine", sa, null).andExpect(status().isForbidden());
  }

  // ---------- Increment 2: profile ----------

  @Test void profileUpdatesNameAndMobileButNeverTheEmail() throws Exception {
    User u = user("pf-" + n, Role.PLAYER, "Court2026");
    String t = login("pf-" + n, "Court2026");

    call("GET", "/api/users/me", t, null).andExpect(status().isOk())
      .andExpect(jsonPath("$.email").value(u.getEmail())).andExpect(jsonPath("$.role").value("PLAYER"));

    // A different email in the body is ignored
    call("PUT", "/api/users/me", t, Map.of("fullName", "Renamed Player", "email", "changed-" + n + "@test.local", "phoneNo", "0917 123 4567"))
      .andExpect(status().isOk())
      .andExpect(jsonPath("$.fullName").value("Renamed Player")).andExpect(jsonPath("$.phoneNo").value("09171234567"))
      .andExpect(jsonPath("$.email").value(u.getEmail()));
    assertThat(users.findById(u.getId()).orElseThrow().getEmail()).isEqualTo(u.getEmail());
    login("pf-" + n, "Court2026");   // still signs in with the same email

    // Validation; mobile can be cleared
    call("PUT", "/api/users/me", t, Map.of("fullName", "A", "phoneNo", "")).andExpect(status().isBadRequest()).andExpect(jsonPath("$.fieldErrors.fullName").exists());
    call("PUT", "/api/users/me", t, Map.of("fullName", "Renamed Player", "phoneNo", "12345")).andExpect(status().isBadRequest()).andExpect(jsonPath("$.fieldErrors.phoneNo").exists());
    call("PUT", "/api/users/me", t, Map.of("fullName", "Renamed Player", "phoneNo", "")).andExpect(status().isOk()).andExpect(jsonPath("$.phoneNo").doesNotExist());
    call("GET", "/api/users/me", null, null).andExpect(status().isUnauthorized());
  }

  // ---------- Increment 2: change password ----------

  @Test void changePasswordChecksTheRuleAndSignsOutOtherSessions() throws Exception {
    user("cp-" + n, Role.FACILITY_ADMIN, "12345678");     // an admin with an old number-only password
    String here = login("cp-" + n, "12345678"), otherDevice = login("cp-" + n, "12345678");

    call("POST", "/api/users/me/password", here, Map.of("currentPassword", "wrong", "newPassword", "Court2026"))
      .andExpect(status().isBadRequest()).andExpect(jsonPath("$.fieldErrors.currentPassword").exists());
    call("POST", "/api/users/me/password", here, Map.of("currentPassword", "12345678", "newPassword", "87654321"))
      .andExpect(status().isBadRequest()).andExpect(jsonPath("$.fieldErrors.newPassword").exists());
    call("POST", "/api/users/me/password", here, Map.of("currentPassword", "12345678", "newPassword", "12345678"))
      .andExpect(status().isBadRequest());

    JsonNode ok = body(call("POST", "/api/users/me/password", here, Map.of("currentPassword", "12345678", "newPassword", "Court2026"))
      .andExpect(status().isOk()));
    String fresh = ok.get("token").asText();
    call("GET", "/api/auth/me", fresh, null).andExpect(status().isOk());              // this device stays signed in
    call("GET", "/api/auth/me", otherDevice, null).andExpect(status().isUnauthorized()); // others are signed out
    call("GET", "/api/auth/me", here, null).andExpect(status().isUnauthorized());        // the old token too
    call("POST", "/api/auth/login", null, Map.of("email", "cp-" + n + "@test.local", "password", "12345678")).andExpect(status().isUnauthorized());
    login("cp-" + n, "Court2026");
  }

  // ---------- Increment 2: forgot / reset password ----------

  @Test void forgotAndResetPassword() throws Exception {
    User u = user("rp-" + n, Role.PLAYER, "Court2026");
    String before = login("rp-" + n, "Court2026");

    // Same answer for unknown emails, and nothing is sent
    String unknownMsg = body(call("POST", "/api/auth/forgot-password", null, Map.of("email", "nobody-" + n + "@test.local")).andExpect(status().isOk())).get("message").asText();
    verify(resetLinks, never()).send(any(), anyString(), any());

    String msg = body(call("POST", "/api/auth/forgot-password", null, Map.of("email", u.getEmail().toUpperCase())).andExpect(status().isOk())).get("message").asText();
    assertThat(msg).isEqualTo(unknownMsg);
    ArgumentCaptor<String> link = ArgumentCaptor.forClass(String.class);
    verify(resetLinks, times(1)).send(any(), link.capture(), eq(Duration.ofMinutes(30)));
    assertThat(link.getValue()).contains("/reset-password?token=");
    String token = link.getValue().substring(link.getValue().indexOf("token=") + 6);

    // A second request within a minute doesn't send another link
    call("POST", "/api/auth/forgot-password", null, Map.of("email", u.getEmail())).andExpect(status().isOk());
    verify(resetLinks, times(1)).send(any(), anyString(), any());

    // New password must follow the rule; a bad token is refused
    call("POST", "/api/auth/reset-password", null, Map.of("token", token, "newPassword", "abcdefgh"))
      .andExpect(status().isBadRequest()).andExpect(jsonPath("$.fieldErrors.newPassword").exists());
    call("POST", "/api/auth/reset-password", null, Map.of("token", "made-up", "newPassword", "Reset2026"))
      .andExpect(status().isBadRequest()).andExpect(jsonPath("$.fieldErrors.token").exists());

    call("POST", "/api/auth/reset-password", null, Map.of("token", token, "newPassword", "Reset2026")).andExpect(status().isOk())
      .andExpect(jsonPath("$.role").value("PLAYER"));   // lets the page pick the right sign-in page
    call("GET", "/api/auth/me", before, null).andExpect(status().isUnauthorized());   // signed out everywhere
    login("rp-" + n, "Reset2026");
    call("POST", "/api/auth/login", null, Map.of("email", u.getEmail(), "password", "Court2026")).andExpect(status().isUnauthorized());
    // The link works once
    call("POST", "/api/auth/reset-password", null, Map.of("token", token, "newPassword", "Again2026")).andExpect(status().isBadRequest());
  }

  // ---------- helpers ----------

  private static <T> T eq(T v){ return org.mockito.ArgumentMatchers.eq(v); }

  private User user(String login, Role role, String password){
    User u = new User(); u.setFullName("User " + login); u.setEmail(login + "@test.local");
    u.setPasswordHash(encoder.encode(password)); u.setRole(role);
    return users.save(u);
  }
  private String login(String login, String password) throws Exception {
    return body(call("POST", "/api/auth/login", null, Map.of("email", login + "@test.local", "password", password))
      .andExpect(status().isOk())).get("token").asText();
  }
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
}
