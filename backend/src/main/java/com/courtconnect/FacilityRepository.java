package com.courtconnect;
import org.springframework.data.jpa.repository.*;
import java.util.List;

public interface FacilityRepository extends JpaRepository<Facility,Long> {
  List<Facility> findByAdminOrderByIdAsc(User admin);
  List<Facility> findAllByOrderByNameAsc();
}
