package com.estatesync.service;

import com.estatesync.model.Property;
import com.estatesync.repository.PropertyRepository;
import com.estatesync.specification.PropertySpecification;
import org.springframework.beans.BeanUtils;
import org.springframework.data.jpa.domain.Specification;
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
        
        // Start the specification directly with the status rule (the compiler knows its type)
        Specification<Property> spec = Specification.where(PropertySpecification.hasStatus(status));

        Specification<Property> typeSpec = PropertySpecification.hasType(type);
        if (typeSpec != null) spec = spec.and(typeSpec);

        Specification<Property> regionSpec = PropertySpecification.hasRegion(regionId);
        if (regionSpec != null) spec = spec.and(regionSpec);

        Specification<Property> priceSpec = PropertySpecification.priceBetween(minPrice, maxPrice);
        if (priceSpec != null) spec = spec.and(priceSpec);

        Specification<Property> searchSpec = PropertySpecification.searchByTitleOrLocation(search);
        if (searchSpec != null) spec = spec.and(searchSpec);

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