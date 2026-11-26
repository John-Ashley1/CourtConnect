package com.courtconnect;
import com.courtconnect.BookingDtos.*;
import jakarta.validation.Valid;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;
import java.time.LocalDate;
import java.util.List;

/** Court search and details for players (FR-012, FR-014); court management for facility administrators (FR-008, FR-009, FR-011). */
@RestController @RequestMapping("/api/courts")
public class CourtController {
  private final CourtService courts; private final BookingExpiry expiry;
  public CourtController(CourtService courts, BookingExpiry expiry){ this.courts = courts; this.expiry = expiry; }

  /** Distances are measured from (lat, lng); Cebu City when not given. */
  @GetMapping
  public List<CourtDto> search(@RequestParam(required=false) String sport,
                               @RequestParam(required=false) @DateTimeFormat(iso=DateTimeFormat.ISO.DATE) LocalDate date,
                               @RequestParam(required=false) Double maxKm, @RequestParam(defaultValue="distance") String sort,
                               @RequestParam(defaultValue="10.3157") double lat, @RequestParam(defaultValue="123.8854") double lng){
    expiry.run();
    return courts.search(sport, date, maxKm, sort, lat, lng);
  }

  @GetMapping("/mine") @PreAuthorize("hasRole('FACILITY_ADMIN')")
  public List<CourtDto> mine(@AuthenticationPrincipal User me){ return courts.listMine(me); }

  @GetMapping("/{courtId}")
  public CourtDto get(@PathVariable Long courtId){ return courts.get(courtId); }

  @GetMapping("/{courtId}/slots")
  public List<SlotDto> slots(@PathVariable Long courtId, @RequestParam(required=false) @DateTimeFormat(iso=DateTimeFormat.ISO.DATE) LocalDate date){
    expiry.run();
    return courts.slotsFor(courtId, date);
  }

  @PutMapping("/{courtId}") @PreAuthorize("hasRole('FACILITY_ADMIN')")
  public CourtDto update(@AuthenticationPrincipal User me, @PathVariable Long courtId, @Valid @RequestBody CourtRequest r){ return courts.update(me, courtId, r); }

  @DeleteMapping("/{courtId}") @ResponseStatus(HttpStatus.NO_CONTENT) @PreAuthorize("hasRole('FACILITY_ADMIN')")
  public void remove(@AuthenticationPrincipal User me, @PathVariable Long courtId){ courts.remove(me, courtId); }

  @PutMapping("/{courtId}/hours") @PreAuthorize("hasRole('FACILITY_ADMIN')")
  public CourtDto hours(@AuthenticationPrincipal User me, @PathVariable Long courtId, @Valid @RequestBody HoursRequest r){ return courts.saveHours(me, courtId, r); }
}
