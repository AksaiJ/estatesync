package com.estatesync.repository;

import com.estatesync.model.Lead;
import com.estatesync.model.LeadStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import java.util.List;
import java.util.Optional;

public interface LeadRepository extends JpaRepository<Lead, Long>, JpaSpecificationExecutor<Lead> {
    List<Lead> findByCustomerIdAndRegionIdAndStatusNot(Long customerId, Long regionId, LeadStatus status);
    boolean existsByManagerIdAndStatusNot(Long managerId, LeadStatus status);
    List<Lead> findByRegionId(Long regionId);
    @org.springframework.data.jpa.repository.Query("SELECT r.name as region, COUNT(l) as count FROM Lead l JOIN l.region r GROUP BY r.name")
    List<Object[]> countLeadsByRegion();

    @org.springframework.data.jpa.repository.Query("SELECT COALESCE(l.referredFrom, 'Unknown') as source, COUNT(l) as count FROM Lead l GROUP BY l.referredFrom")
    List<Object[]> countLeadsBySource();
}
