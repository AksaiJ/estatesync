package com.estatesync.service;

import com.estatesync.model.Property;
import com.estatesync.repository.PropertyRepository;
import org.springframework.beans.BeanUtils;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.estatesync.specification.PropertySpecification;

import jakarta.persistence.EntityManager;
import jakarta.persistence.PersistenceContext;
import jakarta.persistence.TypedQuery;
import org.springframework.data.domain.PageImpl;
import java.util.List;
import java.util.ArrayList;

@Service
@Transactional
public class PropertyService {

    private final PropertyRepository propertyRepository;
    
    @PersistenceContext
    private EntityManager entityManager;

    public PropertyService(PropertyRepository propertyRepository) {
        this.propertyRepository = propertyRepository;
    }

    public List<Property> getAllProperties() {
        List<Property> all = new ArrayList<>();
        all.addAll(entityManager.createQuery("SELECT p FROM ResidentialProperty p", com.estatesync.model.ResidentialProperty.class).getResultList());
        all.addAll(entityManager.createQuery("SELECT p FROM CommercialProperty p", com.estatesync.model.CommercialProperty.class).getResultList());
        return all;
    }

    public org.springframework.data.domain.Page<Property> getFilteredProperties(
            String status, String type, Long regionId, Double minPrice, Double maxPrice, String search, org.springframework.data.domain.Pageable pageable) {
        
        String condition = "";
        if (status != null && !status.trim().isEmpty() && !"ALL".equalsIgnoreCase(status)) {
            condition += "AND p.status = :status ";
        }
        if (type != null && !type.trim().isEmpty() && !"ALL".equalsIgnoreCase(type)) {
            condition += "AND p.type = :type ";
        }
        if (regionId != null) {
            condition += "AND p.region.id = :regionId ";
        }
        if (minPrice != null) {
            condition += "AND p.price >= :minPrice ";
        }
        if (maxPrice != null) {
            condition += "AND p.price <= :maxPrice ";
        }
        if (search != null && !search.trim().isEmpty()) {
            condition += "AND (LOWER(p.title) LIKE LOWER(CONCAT('%', :search, '%')) OR LOWER(p.description) LIKE LOWER(CONCAT('%', :search, '%'))) ";
        }

        TypedQuery<com.estatesync.model.ResidentialProperty> resQuery = entityManager.createQuery("SELECT p FROM ResidentialProperty p WHERE 1=1 " + condition, com.estatesync.model.ResidentialProperty.class);
        TypedQuery<com.estatesync.model.CommercialProperty> comQuery = entityManager.createQuery("SELECT p FROM CommercialProperty p WHERE 1=1 " + condition, com.estatesync.model.CommercialProperty.class);
        
        if (status != null && !status.trim().isEmpty() && !"ALL".equalsIgnoreCase(status)) {
            resQuery.setParameter("status", status);
            comQuery.setParameter("status", status);
        }
        if (type != null && !type.trim().isEmpty() && !"ALL".equalsIgnoreCase(type)) {
            resQuery.setParameter("type", type);
            comQuery.setParameter("type", type);
        }
        if (regionId != null) {
            resQuery.setParameter("regionId", regionId);
            comQuery.setParameter("regionId", regionId);
        }
        if (minPrice != null) {
            resQuery.setParameter("minPrice", minPrice);
            comQuery.setParameter("minPrice", minPrice);
        }
        if (maxPrice != null) {
            resQuery.setParameter("maxPrice", maxPrice);
            comQuery.setParameter("maxPrice", maxPrice);
        }
        if (search != null && !search.trim().isEmpty()) {
            resQuery.setParameter("search", search);
            comQuery.setParameter("search", search);
        }

        // Fetch all matching properties and manually paginate to avoid count query bug
        List<Property> allProperties = new ArrayList<>();
        allProperties.addAll(resQuery.getResultList());
        allProperties.addAll(comQuery.getResultList());
        
        int start = (int) pageable.getOffset();
        int end = Math.min((start + pageable.getPageSize()), allProperties.size());
        
        List<Property> pageContent;
        if (start > allProperties.size()) {
            pageContent = List.of();
        } else {
            pageContent = allProperties.subList(start, end);
        }

        return new PageImpl<>(pageContent, pageable, allProperties.size());
    }

    public Property createProperty(Property property) {
        return propertyRepository.save(property);
    }

    public Property updateProperty(Long id, Property updated) {
        Property existing = propertyRepository.findById(id).orElseThrow();
        
        // Copy all properties except id and type
        String[] ignoredProperties = {"id", "type", "imageUrls"};
        BeanUtils.copyProperties(updated, existing, ignoredProperties);

        if (updated.getImageUrls() != null) {
            existing.getImageUrls().clear();
            existing.getImageUrls().addAll(updated.getImageUrls());
        }
        return propertyRepository.save(existing);
    }

    public void deleteProperty(Long id) {
        propertyRepository.deleteById(id);
    }
}