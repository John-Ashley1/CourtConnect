package com.courtconnect;
import org.springframework.data.jpa.repository.*;
import java.util.Collection;
import java.util.List;

public interface CourtRepository extends JpaRepository<Court,Long> {
  @Query("select c from Court c join fetch c.facility f where c.removed = false and f.admin = :admin order by f.id, c.id")
  List<Court> findActiveByAdmin(User admin);
  @Query("select c from Court c join fetch c.facility where c.removed = false and c.facility.id = :facilityId order by c.id")
  List<Court> findActiveByFacility(Long facilityId);
  @Query("select c from Court c join fetch c.facility where c.removed = false order by c.id")
  List<Court> findAllActive();
  @Query("select c.facility.id, count(c) from Court c where c.removed = false and c.facility in :facilities group by c.facility.id")
  List<Object[]> countActiveByFacility(Collection<Facility> facilities);
}
