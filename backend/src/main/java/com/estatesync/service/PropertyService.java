package com.estatesync.service;

import com.estatesync.model.Property;
import com.estatesync.repository.PropertyRepository;
import org.springframework.beans.BeanUtils;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@Transactional
public class PropertyService {

    private final PropertyRepository propertyRepository;

    public PropertyService(PropertyRepository propertyRepository) {
        this.propertyRepository = propertyRepository;
    }

    public List<Property> getAllProperties() {
        return propertyRepository.findAll();
    }

    public org.springframework.data.domain.Page<Property> getFilteredProperties(
            String status, String type, Long regionId, Double minPrice, Double maxPrice, String search, org.springframework.data.domain.Pageable pageable) {
        org.springframework.data.jpa.domain.Specification<Property> spec = org.springframework.data.jpa.domain.Specification.where(com.estatesync.specification.PropertySpecification.hasStatus(status))
                .and(com.estatesync.specification.PropertySpecification.hasType(type))
                .and(com.estatesync.specification.PropertySpecification.hasRegion(regionId))
                .and(com.estatesync.specification.PropertySpecification.priceBetween(minPrice, maxPrice))
                .and(com.estatesync.specification.PropertySpecification.searchByTitleOrLocation(search));
        return propertyRepository.findAll(spec, pageable);
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
