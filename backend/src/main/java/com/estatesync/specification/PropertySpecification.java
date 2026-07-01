package com.estatesync.specification;

import com.estatesync.model.Property;
import org.springframework.data.jpa.domain.Specification;

public class PropertySpecification {

    public static Specification<Property> hasType(String type) {
        // Return null *before* we even try to build a query
        if (type == null || type.trim().isEmpty() || "ALL".equalsIgnoreCase(type)) {
            return null;
        }
        return (root, query, cb) -> cb.equal(root.get("type"), type);
    }

    public static Specification<Property> hasStatus(String status) {
        if (status == null || status.trim().isEmpty() || "ALL".equalsIgnoreCase(status)) {
            return null;
        }
        return (root, query, cb) -> cb.equal(root.get("status"), status);
    }

    public static Specification<Property> hasRegion(Long regionId) {
        if (regionId == null) {
            return null;
        }
        return (root, query, cb) -> cb.equal(root.get("region").get("id"), regionId);
    }

    public static Specification<Property> priceBetween(Double minPrice, Double maxPrice) {
        if (minPrice == null && maxPrice == null) {
            return null;
        }
        return (root, query, cb) -> {
            if (minPrice != null && maxPrice != null) {
                return cb.between(root.get("price"), minPrice, maxPrice);
            } else if (minPrice != null) {
                return cb.greaterThanOrEqualTo(root.get("price"), minPrice);
            } else {
                return cb.lessThanOrEqualTo(root.get("price"), maxPrice);
            }
        };
    }

    public static Specification<Property> searchByTitleOrLocation(String search) {
        if (search == null || search.trim().isEmpty()) {
            return null;
        }
        return (root, query, cb) -> {
            String pattern = "%" + search.toLowerCase() + "%";
            return cb.or(
                cb.like(cb.lower(root.get("title")), pattern),
                cb.like(cb.lower(root.get("description")), pattern)
            );
        };
    }
}