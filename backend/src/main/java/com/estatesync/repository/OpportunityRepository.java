package com.estatesync.repository;

import com.estatesync.model.Opportunity;
import com.estatesync.model.OpportunityStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface OpportunityRepository extends JpaRepository<Opportunity, Long>, JpaSpecificationExecutor<Opportunity> {
    List<Opportunity> findByLeadId(Long leadId);
    List<Opportunity> findByAgentId(Long agentId);
    List<Opportunity> findByLeadManagerId(Long managerId);
    List<Opportunity> findByStatus(OpportunityStatus status);
    boolean existsByAgentIdAndStatusNotIn(Long agentId, List<OpportunityStatus> statuses);

    @org.springframework.data.jpa.repository.Query("SELECT o.status as status, COUNT(o) as count FROM Opportunity o GROUP BY o.status")
    List<Object[]> countOpportunitiesByStatus();
}
