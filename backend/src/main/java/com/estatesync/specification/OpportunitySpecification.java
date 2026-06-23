package com.estatesync.specification;

import com.estatesync.model.Opportunity;
import com.estatesync.model.OpportunityStatus;
import org.springframework.data.jpa.domain.Specification;

public class OpportunitySpecification {

    public static Specification<Opportunity> hasStatus(OpportunityStatus status) {
        return (root, query, cb) -> status == null ? null : cb.equal(root.get("status"), status);
    }

    public static Specification<Opportunity> hasAgent(Long agentId) {
        return (root, query, cb) -> agentId == null ? null : cb.equal(root.get("agent").get("id"), agentId);
    }

    public static Specification<Opportunity> hasManager(Long managerId) {
        return (root, query, cb) -> managerId == null ? null : cb.equal(root.join("lead").get("manager").get("id"), managerId);
    }

    public static Specification<Opportunity> searchByCustomerName(String search) {
        return (root, query, cb) -> {
            if (search == null || search.trim().isEmpty()) {
                return null;
            }
            String pattern = "%" + search.toLowerCase() + "%";
            return cb.like(cb.lower(root.join("lead").join("customer").get("name")), pattern);
        };
    }
}
