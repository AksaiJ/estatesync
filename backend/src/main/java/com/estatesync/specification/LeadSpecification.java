package com.estatesync.specification;

import com.estatesync.model.Lead;
import com.estatesync.model.LeadStatus;
import org.springframework.data.jpa.domain.Specification;

public class LeadSpecification {

    public static Specification<Lead> hasStatus(LeadStatus status) {
        return (root, query, cb) -> status == null ? null : cb.equal(root.get("status"), status);
    }

    public static Specification<Lead> hasRegion(Long regionId) {
        return (root, query, cb) -> regionId == null ? null : cb.equal(root.get("region").get("id"), regionId);
    }

    public static Specification<Lead> hasManager(Long managerId) {
        return (root, query, cb) -> managerId == null ? null : cb.equal(root.get("manager").get("id"), managerId);
    }

    public static Specification<Lead> searchByCustomerNameOrPhone(String search) {
        return (root, query, cb) -> {
            if (search == null || search.trim().isEmpty()) {
                return null;
            }
            String pattern = "%" + search.toLowerCase() + "%";
            return cb.or(
                cb.like(cb.lower(root.join("customer").get("name")), pattern),
                cb.like(cb.lower(root.join("customer").get("phone")), pattern)
            );
        };
    }
}
