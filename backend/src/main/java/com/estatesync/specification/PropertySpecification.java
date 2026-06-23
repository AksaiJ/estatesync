package com.estatesync.specification;

import com.estatesync.model.Property;
import org.springframework.data.jpa.domain.Specification;

public class PropertySpecification {

    public static Specification<Property> hasType(String type) {
        return (root, query, cb) -> {
            if (type == null || type.trim().isEmpty() || "ALL".equalsIgnoreCase(type)) {
                return null;
            }
            return cb.equal(root.get("type"), type);
        };
    }

    public static Specification<Property> hasStatus(String status) {
        return (root, query, cb) -> {
            if (status == null || status.trim().isEmpty() || "ALL".equalsIgnoreCase(status)) {
                return null;
            }
            return cb.equal(root.get("status"), status);
        };
    }

    public static Specification<Property> hasRegion(Long regionId) {
        return (root, query, cb) -> regionId == null ? null : cb.equal(root.get("region").get("id"), regionId);
    }

    public static Specification<Property> priceBetween(Double minPrice, Double maxPrice) {
        return (root, query, cb) -> {
            if (minPrice != null && maxPrice != null) {
                return cb.between(root.get("price"), minPrice, maxPrice);
            } else if (minPrice != null) {
                return cb.greaterThanOrEqualTo(root.get("price"), minPrice);
            } else if (maxPrice != null) {
                return cb.lessThanOrEqualTo(root.get("price"), maxPrice);
            }
            return null;
        };
    }

    public static Specification<Property> searchByTitleOrLocation(String search) {
        return (root, query, cb) -> {
            if (search == null || search.trim().isEmpty()) {
                return null;
            }
            String pattern = "%" + search.toLowerCase() + "%";
            return cb.or(
                cb.like(cb.lower(root.get("title")), pattern),
                cb.like(cb.lower(root.get("description")), pattern)
            );
        };
    }
}
