package com.estatesync.repository;

import com.estatesync.model.PageVisit;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import org.springframework.data.jpa.repository.Query;
import java.util.List;
import com.estatesync.dto.PageVisitTrendDTO;

@Repository
public interface PageVisitRepository extends JpaRepository<PageVisit, Long> {
    @Query("SELECT COUNT(DISTINCT p.sessionId) FROM PageVisit p")
    long countDistinctSessionId();

    @Query(value = "SELECT DATE_FORMAT(timestamp, '%Y-%m-%d') as date, COUNT(*) as totalVisits, COUNT(DISTINCT session_id) as uniqueVisitors FROM page_visits GROUP BY DATE_FORMAT(timestamp, '%Y-%m-%d') ORDER BY DATE_FORMAT(timestamp, '%Y-%m-%d')", nativeQuery = true)
    List<Object[]> getRawVisitTrends();
}
