package com.courtconnect;
import org.springframework.data.jpa.repository.*;
import java.util.Collection;
import java.util.List;

public interface CourtHoursRepository extends JpaRepository<CourtHours,Long> {
  List<CourtHours> findByCourtOrderByDayOfWeekAsc(Court court);
  List<CourtHours> findByCourtIn(Collection<Court> courts);
}
