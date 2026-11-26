package com.courtconnect;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.http.HttpMethod;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.ResultActions;
import java.util.*;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.request;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

/** Step (a): facilities, courts and geocoding (FR-007 – FR-012), with ownership and role rules. */
@SpringBootTest @AutoConfigureMockMvc
class FacilityCourtTest {
  @MockBean Geocoder geocoder;
  @Autowired MockMvc mvc; @Autowired ObjectMapper json; @Autowired UserRepository users; @Autowired PasswordEncoder encoder;
  @Autowired JwtService jwt; @Autowired FacilityRepository facilities;

  String adminA, adminB, player;

  @BeforeEach void setUp(){
    String n = UUID.randomUUID().toString().substring(0, 8);
    adminA = jwt.generate(user("a-" + n, Role.FACILITY_ADMIN));
    adminB = jwt.generate(user("b-" + n, Role.FACILITY_ADMIN));
    player = jwt.generate(user("p-" + n, Role.PLAYER));
    reset(geocoder);
    when(geocoder.locate(anyString(), anyString())).thenReturn(new Geocoder.Position(10.3300, 123.9000));
  }

  @Test void registerFacilityUsesGeocodedCoordinates() throws Exception {
    JsonNode f = body(call("POST", "/api/facilities", adminA, facility("Hub One", "12 Gorordo Ave, Lahug")).andExpect(status().isCreated()));
    assertThat(f.get("latitude").asDouble()).isEqualTo(10.33);
    assertThat(f.get("longitude").asDouble()).isEqualTo(123.9);
    assertThat(f.get("court_count").asInt()).isZero();
    verify(geocoder).locate("12 Gorordo Ave, Lahug", "Cebu City");
  }

  @Test void addressNotFoundIsNotSaved() throws Exception {
    when(geocoder.locate(eq("Nowhere 999"), anyString()))
      .thenThrow(new ApiException(HttpStatus.BAD_REQUEST, "address", "The map couldn't find this address."));
    long before = facilities.count();
    call("POST", "/api/facilities", adminA, facility("Ghost Hub", "Nowhere 999"))
      .andExpect(status().isBadRequest()).andExpect(jsonPath("$.fieldErrors.address").exists());
    assertThat(facilities.count()).isEqualTo(before);
  }

  @Test void mapServiceDownIsAClearErrorAndNothingIsSaved() throws Exception {
    // the real Geocoder pointed at a closed port
    Geocoder down = new Geocoder("http://127.0.0.1:1");
    assertThatThrownBy(() -> down.locate("1 St", "Cebu City"))
      .isInstanceOf(ApiException.class).hasMessageContaining("isn't responding")
      .satisfies(e -> assertThat(((ApiException) e).getStatus()).isEqualTo(HttpStatus.BAD_GATEWAY));
    // through the API
    when(geocoder.locate(anyString(), anyString())).thenAnswer(i -> down.locate(i.getArgument(0), i.getArgument(1)));
    long before = facilities.count();
    call("POST", "/api/facilities", adminA, facility("Offline Hub", "1 St"))
      .andExpect(status().isBadGateway()).andExpect(jsonPath("$.message").value(org.hamcrest.Matchers.containsString("wasn't saved")));
    assertThat(facilities.count()).isEqualTo(before);
  }

  @Test void editKeepsOldPositionWhenGeocodingFails() throws Exception {
    long id = body(call("POST", "/api/facilities", adminA, facility("Hub Two", "5 Old St"))).get("facility_id").asLong();
    when(geocoder.locate(eq("Bad Street"), anyString())).thenThrow(new ApiException(HttpStatus.BAD_REQUEST, "address", "not found"));
    call("PUT", "/api/facilities/" + id, adminA, facility("Renamed", "Bad Street")).andExpect(status().isBadRequest());
    JsonNode mine = find(body(call("GET", "/api/facilities/mine", adminA, null)), id);
    assertThat(mine.get("name").asText()).isEqualTo("Hub Two");        // nothing changed
    assertThat(mine.get("address").asText()).isEqualTo("5 Old St, Cebu City");
    // Same address, new name: no new lookup needed
    clearInvocations(geocoder);
    call("PUT", "/api/facilities/" + id, adminA, facility("Hub Two Renamed", "5 Old St")).andExpect(status().isOk());
    verify(geocoder, never()).locate(anyString(), anyString());
  }

  @Test void validationErrorsPerField() throws Exception {
    call("POST", "/api/facilities", adminA, Map.of("name", "", "phone", "123", "address", "", "city", ""))
      .andExpect(status().isBadRequest())
      .andExpect(jsonPath("$.fieldErrors.name").exists()).andExpect(jsonPath("$.fieldErrors.address").exists()).andExpect(jsonPath("$.fieldErrors.city").exists());
    call("POST", "/api/facilities", adminA, Map.of("name", "X", "phone", "12345", "address", "1 St", "city", "Cebu City"))
      .andExpect(status().isBadRequest()).andExpect(jsonPath("$.fieldErrors.phone").exists());
    verify(geocoder, never()).locate(anyString(), anyString());   // invalid input never reaches the map service
  }

  @Test void ownershipAndRoles() throws Exception {
    long facA = body(call("POST", "/api/facilities", adminA, facility("A's Hub", "1 A St"))).get("facility_id").asLong();
    long courtA = body(call("POST", "/api/facilities/" + facA + "/courts", adminA, court("A1", "Basketball", 300)).andExpect(status().isCreated())).get("court_id").asLong();

    // Another facility admin: can't see, edit or add courts to A's facility, nor touch A's courts
    assertThat(body(call("GET", "/api/facilities/mine", adminB, null))).noneMatch(x -> x.get("facility_id").asLong() == facA);
    call("PUT", "/api/facilities/" + facA, adminB, facility("Hijack", "1 A St")).andExpect(status().isNotFound());
    call("POST", "/api/facilities/" + facA + "/courts", adminB, court("B1", "Tennis", 100)).andExpect(status().isNotFound());
    call("PUT", "/api/courts/" + courtA, adminB, court("Hijack", "Tennis", 1)).andExpect(status().isNotFound());
    call("DELETE", "/api/courts/" + courtA, adminB, null).andExpect(status().isNotFound());
    call("PUT", "/api/courts/" + courtA + "/hours", adminB, Map.of()).andExpect(status().isBadRequest()); // invalid body is rejected first
    assertThat(body(call("GET", "/api/courts/mine", adminB, null))).noneMatch(x -> x.get("court_id").asLong() == courtA);

    // Players can view but not manage
    call("POST", "/api/facilities", player, facility("P Hub", "1 P St")).andExpect(status().isForbidden());
    call("POST", "/api/facilities/" + facA + "/courts", player, court("P1", "Tennis", 100)).andExpect(status().isForbidden());
    call("GET", "/api/courts/mine", player, null).andExpect(status().isForbidden());
    call("GET", "/api/courts/" + courtA, player, null).andExpect(status().isOk()).andExpect(jsonPath("$.facility.name").value("A's Hub"));
    call("GET", "/api/facilities/" + facA + "/courts", player, null).andExpect(status().isOk()).andExpect(jsonPath("$[0].court_name").value("A1"));
    // Not signed in
    call("GET", "/api/courts", null, null).andExpect(status().isUnauthorized());
  }

  @Test void courtRulesAndPlayerSearch() throws Exception {
    long fac = body(call("POST", "/api/facilities", adminA, facility("Court Hub", "9 Court St"))).get("facility_id").asLong();
    call("POST", "/api/facilities/" + fac + "/courts", adminA, court("", "Basketball", 300))
      .andExpect(status().isBadRequest()).andExpect(jsonPath("$.fieldErrors.court_name").exists());
    call("POST", "/api/facilities/" + fac + "/courts", adminA, court("C", "Chess", 300))
      .andExpect(status().isBadRequest()).andExpect(jsonPath("$.fieldErrors.sport_type").exists());
    call("POST", "/api/facilities/" + fac + "/courts", adminA, court("C", "Tennis", 0))
      .andExpect(status().isBadRequest()).andExpect(jsonPath("$.fieldErrors.rental_rate").exists());
    Map<String,Object> badPhoto = new HashMap<>(court("C", "Tennis", 100)); badPhoto.put("photo_url", "ftp://x");
    call("POST", "/api/facilities/" + fac + "/courts", adminA, badPhoto)
      .andExpect(status().isBadRequest()).andExpect(jsonPath("$.fieldErrors.photo_url").exists());

    long tennis = body(call("POST", "/api/facilities/" + fac + "/courts", adminA, court("T1", "Tennis", 150))).get("court_id").asLong();
    long badminton = body(call("POST", "/api/facilities/" + fac + "/courts", adminA, court("B1", "Badminton", 120))).get("court_id").asLong();
    call("POST", "/api/facilities/" + fac + "/courts", adminA, court("t1", "Tennis", 150)).andExpect(status().isConflict());

    // Edit
    Map<String,Object> edited = new HashMap<>(court("T1 Indoor", "Tennis", 175)); edited.put("is_indoor", true);
    call("PUT", "/api/courts/" + tennis, adminA, edited).andExpect(status().isOk())
      .andExpect(jsonPath("$.court_name").value("T1 Indoor")).andExpect(jsonPath("$.rental_rate").value(175.0));

    // FR-031: sport filter
    JsonNode onlyTennis = body(call("GET", "/api/courts?sport=Tennis", player, null));
    assertThat(onlyTennis).anyMatch(x -> x.get("court_id").asLong() == tennis);
    assertThat(onlyTennis).allMatch(x -> x.get("sport_type").asText().equals("Tennis"));

    // FR-009: remove (no bookings) → gone for players and admin
    call("DELETE", "/api/courts/" + badminton, adminA, null).andExpect(status().isNoContent());
    call("GET", "/api/courts/" + badminton, player, null).andExpect(status().isNotFound());
    assertThat(body(call("GET", "/api/facilities/mine", adminA, null))).anyMatch(x -> x.get("facility_id").asLong() == fac && x.get("court_count").asInt() == 1);
  }

  // ---------- helpers ----------
  private static Map<String,Object> facility(String name, String street){ return Map.of("name", name, "phone", "0917 123 4567", "address", street, "city", "Cebu City"); }
  private static Map<String,Object> court(String name, String sport, double rate){ return Map.of("court_name", name, "sport_type", sport, "is_indoor", false, "rental_rate", rate); }
  private User user(String name, Role role){
    User u = new User(); u.setFullName("User " + name); u.setEmail(name + "@test.local");
    u.setPasswordHash(encoder.encode("Password1")); u.setRole(role); return users.save(u);
  }
  private ResultActions call(String method, String url, String token, Object body) throws Exception {
    var req = request(HttpMethod.valueOf(method), url).contentType(MediaType.APPLICATION_JSON);
    if (token != null) req.header("Authorization", "Bearer " + token);
    if (body != null) req.content(json.writeValueAsString(body));
    return mvc.perform(req);
  }
  private JsonNode body(ResultActions r) throws Exception {
    String s = r.andReturn().getResponse().getContentAsString();
    return s.isEmpty() ? json.nullNode() : json.readTree(s);
  }
  private static JsonNode find(JsonNode arr, long id){
    for (JsonNode x : arr) if (x.get("facility_id").asLong() == id) return x;
    throw new AssertionError("facility " + id + " not found");
  }
}
