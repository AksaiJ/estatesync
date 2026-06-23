package com.estatesync.repository;

import com.estatesync.model.Visit;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface VisitRepository extends JpaRepository<Visit, Long> {
    List<Visit> findByOpportunityId(Long opportunityId);
    List<Visit> findByOpportunityAgentId(Long agentId);
    List<Visit> findByOpportunityLeadManagerId(Long managerId);
}
