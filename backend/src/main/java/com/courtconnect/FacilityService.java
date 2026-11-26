package com.courtconnect;
import com.courtconnect.BookingDtos.*;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.regex.Pattern;

/**
 * Facility registration and details (FR-007) with address geocoding (FR-010).
 * An administrator only sees and edits their own facilities. Validation and geocoding run before anything
 * is changed; if either fails, nothing is saved.
 */
@Service
public class FacilityService {
  /** PH mobile (09XXXXXXXXX) or landline with area code (e.g. 032 123 4567). */
  private static final Pattern PH_PHONE = Pattern.compile("^0\\d{9,10}$");

  private final FacilityRepository facilities; private final CourtRepository courts; private final Geocoder geocoder;
  public FacilityService(FacilityRepository facilities, CourtRepository courts, Geocoder geocoder){
    this.facilities = facilities; this.courts = courts; this.geocoder = geocoder; }

  @Transactional(readOnly=true)
  public List<FacilityDto> listMine(User admin){ return withCounts(facilities.findByAdminOrderByIdAsc(admin)); }

  @Transactional(readOnly=true)
  public List<FacilityDto> listAll(){ return withCounts(facilities.findAllByOrderByNameAsc()); }

  @Transactional
  public FacilityDto create(User admin, FacilityRequest r){
    Facility f = new Facility();
    f.setAdmin(admin);
    apply(f, r, true);
    facilities.save(f);
    return FacilityDto.of(f, 0);
  }

  @Transactional
  public FacilityDto update(User admin, Long id, FacilityRequest r){
    Facility f = owned(admin, id);
    String street = r.address().trim(), city = r.city().trim();
    apply(f, r, !f.getAddress().equalsIgnoreCase(street + ", " + city));   // look up again only if the address changed
    return FacilityDto.of(f, courts.findActiveByFacility(f.getId()).size());
  }

  /** The facility, if it belongs to this administrator; otherwise 404 (we don't reveal other admins' facilities). */
  Facility owned(User admin, Long id){
    return facilities.findById(id).filter(f -> f.getAdmin().getId().equals(admin.getId()))
      .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "Facility not found."));
  }

  private void apply(Facility f, FacilityRequest r, boolean geocode){
    String phone = r.phone().replaceAll("[\\s()-]", "");
    if (!PH_PHONE.matcher(phone).matches()) throw new ApiException(HttpStatus.BAD_REQUEST, "phone", "Enter a contact number like 0917 123 4567.");
    String street = r.address().trim(), city = r.city().trim();
    Geocoder.Position p = geocode ? geocoder.locate(street, city) : null;   // throws → nothing is saved
    f.setName(r.name().trim()); f.setPhone(phone); f.setCity(city); f.setAddress(street + ", " + city);
    if (p != null) { f.setLatitude(p.latitude()); f.setLongitude(p.longitude()); }
  }

  private List<FacilityDto> withCounts(List<Facility> list){
    Map<Long,Integer> counts = new HashMap<>();
    if (!list.isEmpty()) courts.countActiveByFacility(list).forEach(row -> counts.put((Long) row[0], ((Long) row[1]).intValue()));
    return list.stream().map(f -> FacilityDto.of(f, counts.getOrDefault(f.getId(), 0))).toList();
  }
}
