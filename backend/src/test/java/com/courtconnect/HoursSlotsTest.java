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
import org.springframework.http.MediaType;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.ResultActions;
import java.time.DayOfWeek;
import java.time.LocalDate;
import java.time.LocalTime;
import java.time.ZoneId;
import java.time.temporal.TemporalAdjusters;
import java.util.*;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.request;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

/** Step (b): operating hours, slot length, payment time limit (FR-011) and slot generation (FR-013). */
@SpringBootTest @AutoConfigureMockMvc
class HoursSlotsTest {
  static final ZoneId MANILA = ZoneId.of("Asia/Manila");
  @MockBean Geocoder geocoder;
  @Autowired MockMvc mvc; @Autowired ObjectMapper json; @Autowired UserRepository users; @Autowired PasswordEncoder encoder;
  @Autowired JwtService jwt; @Autowired SlotGenerator generator; @Autowired TimeSlotRepository slots; @Autowired CourtRepository courts;

  String admin, otherAdmin, player; long courtId;
  final LocalDate today = LocalDate.now(MANILA);

  @BeforeEach void setUp() throws Exception {
    when(geocoder.locate(anyString(), anyString())).thenReturn(new Geocoder.Position(10.3157, 123.8854));
    String n = UUID.randomUUID().toString().substring(0, 8);
    admin = jwt.generate(user("ha-" + n, Role.FACILITY_ADMIN));
    otherAdmin = jwt.generate(user("hb-" + n, Role.FACILITY_ADMIN));
    player = jwt.generate(user("hp-" + n, Role.PLAYER));
    long fac = body(call("POST", "/api/facilities", admin, Map.of("name", "Hours Hub " + n, "phone", "09171234567", "address", "1 Hours St", "city", "Cebu City"))).get("facility_id").asLong();
    courtId = body(call("POST", "/api/facilities/" + fac + "/courts", admin, Map.of("court_name", "H1", "sport_type", "Volleyball", "rental_rate", 400))).get("court_id").asLong();
  }

  @Test void newCourtGetsDefaultHoursAndTwoWeeksOfSlots() throws Exception {
    JsonNode c = body(call("GET", "/api/courts/" + courtId, player, null));
    assertThat(c.get("slot_minutes").asInt()).isEqualTo(60);
    assertThat(c.get("payment_hold_minutes").asInt()).isEqualTo(15);
    assertThat(c.get("operating_hours")).hasSize(7).allMatch(h -> h.get("is_open").asBoolean()
      && h.get("open_time").asText().equals("06:00:00") && h.get("close_time").asText().equals("22:00:00"));
    // (22 − 6) × 60 ÷ 60 = 16 slots on every future day of the 14-day window, none after it
    for (int i = 1; i < 14; i++) assertThat(slotsOn(today.plusDays(i))).as("day +" + i).hasSize(16);
    assertThat(slotsOn(today.plusDays(14))).isEmpty();
    // Today: only slots that haven't started yet
    LocalTime now = LocalTime.now(MANILA);
    assertThat(slotsOn(today)).allMatch(s -> LocalTime.parse(s.get("start_time").asText()).isAfter(now.minusMinutes(1)));
    assertThat(slotsOn(today.plusDays(1)).get(15).get("end_time").asText()).isEqualTo("22:00:00");
  }

  @Test void savingHoursRegeneratesSlots() throws Exception {
    LocalDate monday = today.plusDays(1).with(TemporalAdjusters.nextOrSame(DayOfWeek.MONDAY));
    LocalDate tuesday = monday.plusDays(1);
    List<Map<String,Object>> week = week("08:00:00", "12:00:00");
    week.set(1, day(1, false, "08:00:00", "12:00:00"));                       // Monday closed
    week.set(6, day(6, true, "07:00:00", "10:00:00"));                        // Saturday 7–10
    JsonNode saved = body(call("PUT", "/api/courts/" + courtId + "/hours", admin, hours(30, 20, week)).andExpect(status().isOk()));
    assertThat(saved.get("slot_minutes").asInt()).isEqualTo(30);
    assertThat(saved.get("payment_hold_minutes").asInt()).isEqualTo(20);
    assertThat(saved.get("operating_hours").get(1).get("is_open").asBoolean()).isFalse();

    assertThat(slotsOn(monday)).isEmpty();
    JsonNode tue = slotsOn(tuesday);   // (12 − 8) × 60 ÷ 30 = 8
    assertThat(tue).extracting(s -> s.get("start_time").asText())
      .containsExactly("08:00:00", "08:30:00", "09:00:00", "09:30:00", "10:00:00", "10:30:00", "11:00:00", "11:30:00");
    LocalDate saturday = today.plusDays(1).with(TemporalAdjusters.nextOrSame(DayOfWeek.SATURDAY));
    assertThat(slotsOn(saturday)).hasSize(6);
  }

  @Test void leftoverMinutesAreNotBookable() throws Exception {
    // 8:00–11:00 with 2-hour slots → one slot (8–10); the last hour is too short
    call("PUT", "/api/courts/" + courtId + "/hours", admin, hours(120, 15, week("08:00:00", "11:00:00"))).andExpect(status().isOk());
    assertThat(slotsOn(today.plusDays(2))).extracting(s -> s.get("start_time").asText() + "-" + s.get("end_time").asText())
      .containsExactly("08:00:00-10:00:00");
  }

  @Test void regenerationKeepsPendingAndBlockedSlots() throws Exception {
    LocalDate d = today.plusDays(3);
    JsonNode before = slotsOn(d);   // 06:00 … 21:00, 1 hour each
    long seven = before.get(1).get("slot_id").asLong(), nine = before.get(3).get("slot_id").asLong();
    call("POST", "/api/slots/" + nine + "/block", admin, Map.of("reason", "Maintenance")).andExpect(status().isOk());
    call("POST", "/api/bookings", player, Map.of("courtId", courtId, "slotIds", List.of(seven))).andExpect(status().isCreated());

    // New hours 7–12 with 2-hour slots: 7–9 overlaps the Pending 7:00 slot, 9–11 overlaps the Blocked 9:00 slot → skipped
    call("PUT", "/api/courts/" + courtId + "/hours", admin, hours(120, 15, week("07:00:00", "12:00:00"))).andExpect(status().isOk());
    assertThat(slotsOn(d)).extracting(s -> s.get("start_time").asText() + " " + s.get("end_time").asText() + " " + s.get("status").asText())
      .containsExactly("07:00:00 08:00:00 PENDING", "09:00:00 10:00:00 BLOCKED");
    // Another day without holds gets the new pattern
    assertThat(slotsOn(d.plusDays(1))).extracting(s -> s.get("start_time").asText()).containsExactly("07:00:00", "09:00:00");
  }

  @Test void nightlyTopUpFillsTheNewDay() throws Exception {
    LocalDate last = today.plusDays(13);
    Court court = courts.findById(courtId).orElseThrow();
    slots.deleteAll(slots.findByCourtAndSlotDateOrderByStartTimeAsc(court, last));   // as if this day just entered the window
    assertThat(slotsOn(last)).isEmpty();
    generator.topUp();
    assertThat(slotsOn(last)).hasSize(16);
    generator.topUp();                                                               // running again creates no duplicates
    assertThat(slotsOn(last)).hasSize(16);
  }

  @Test void invalidHoursAreRejectedAndNothingChanges() throws Exception {
    List<Map<String,Object>> bad = week("08:00:00", "12:00:00");
    bad.set(3, day(3, true, "12:00:00", "09:00:00"));
    call("PUT", "/api/courts/" + courtId + "/hours", admin, hours(60, 15, bad))
      .andExpect(status().isBadRequest()).andExpect(jsonPath("$.message").value("Closing must be after opening (Wednesday)."));
    call("PUT", "/api/courts/" + courtId + "/hours", admin, hours(45, 15, week("08:00:00", "12:00:00")))
      .andExpect(status().isBadRequest()).andExpect(jsonPath("$.fieldErrors.slot_minutes").exists());
    call("PUT", "/api/courts/" + courtId + "/hours", admin, hours(60, 4, week("08:00:00", "12:00:00")))
      .andExpect(status().isBadRequest()).andExpect(jsonPath("$.fieldErrors.lim").value("Enter 5 to 60 minutes."));
    call("PUT", "/api/courts/" + courtId + "/hours", admin, hours(60, 61, week("08:00:00", "12:00:00"))).andExpect(status().isBadRequest());
    call("PUT", "/api/courts/" + courtId + "/hours", admin, hours(60, 15, week("08:00:00", "12:00:00").subList(0, 6)))
      .andExpect(status().isBadRequest()).andExpect(jsonPath("$.message").value("Send the hours for all 7 days."));
    List<Map<String,Object>> dup = week("08:00:00", "12:00:00");
    dup.set(6, day(0, true, "08:00:00", "12:00:00"));
    call("PUT", "/api/courts/" + courtId + "/hours", admin, hours(60, 15, dup))
      .andExpect(status().isBadRequest()).andExpect(jsonPath("$.message").value("Each day can appear only once."));
    call("PUT", "/api/courts/" + courtId + "/hours", admin, hours(60, 15, week("8am", "noon")))
      .andExpect(status().isBadRequest());
    // Still the defaults
    assertThat(slotsOn(today.plusDays(2))).hasSize(16);
    assertThat(body(call("GET", "/api/courts/" + courtId, player, null)).get("payment_hold_minutes").asInt()).isEqualTo(15);
  }

  @Test void onlyTheOwningAdminCanChangeHours() throws Exception {
    call("PUT", "/api/courts/" + courtId + "/hours", otherAdmin, hours(60, 15, week("08:00:00", "12:00:00"))).andExpect(status().isNotFound());
    call("PUT", "/api/courts/" + courtId + "/hours", player, hours(60, 15, week("08:00:00", "12:00:00"))).andExpect(status().isForbidden());
    assertThat(slotsOn(today.plusDays(2))).hasSize(16);
  }

  // ---------- helpers ----------
  private JsonNode slotsOn(LocalDate d) throws Exception { return body(call("GET", "/api/courts/" + courtId + "/slots?date=" + d, player, null).andExpect(status().isOk())); }
  private static Map<String,Object> day(int dow, boolean open, String from, String to){ return Map.of("day_of_week", dow, "is_open", open, "open_time", from, "close_time", to); }
  private static List<Map<String,Object>> week(String from, String to){
    List<Map<String,Object>> w = new ArrayList<>();
    for (int d = 0; d < 7; d++) w.add(day(d, true, from, to));
    return w;
  }
  private static Map<String,Object> hours(int len, int hold, List<Map<String,Object>> week){ return Map.of("slot_minutes", len, "payment_hold_minutes", hold, "operating_hours", week); }
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
}
