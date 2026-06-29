package com.estatesync.repository;

import com.estatesync.model.EmployeeSession;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

import org.springframework.data.jpa.repository.Query;
import java.util.List;

@Repository
public interface EmployeeSessionRepository extends JpaRepository<EmployeeSession, Long> {
    Optional<EmployeeSession> findBySessionToken(String sessionToken);

    @Query("SELECT SUM(e.totalActiveSeconds) FROM EmployeeSession e")
    Long sumTotalActiveSeconds();

    @Query(value = "SELECT u.id, u.name, u.role, SUM(e.total_active_seconds) as totalActiveSeconds FROM employee_sessions e JOIN users u ON e.user_id = u.id GROUP BY u.id, u.name, u.role ORDER BY totalActiveSeconds DESC", nativeQuery = true)
    List<Object[]> getRawLeaderboard();
}
