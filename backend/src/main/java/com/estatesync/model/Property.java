package com.estatesync.model;

import com.fasterxml.jackson.annotation.JsonSubTypes;
import com.fasterxml.jackson.annotation.JsonTypeInfo;
import jakarta.persistence.*;
import lombok.Data;
import java.util.List;
import java.util.ArrayList;

@Data
@Entity
@Table(name = "properties")
@Inheritance(strategy = InheritanceType.JOINED)
@JsonTypeInfo(
    use = JsonTypeInfo.Id.NAME, 
    include = JsonTypeInfo.As.EXISTING_PROPERTY, 
    property = "type", 
    visible = true
)
@JsonSubTypes({
    @JsonSubTypes.Type(value = ResidentialProperty.class, names = {"VILLA", "APARTMENT", "Villa", "Apartment", "villa", "apartment"}),
    @JsonSubTypes.Type(value = CommercialProperty.class, names = {"COMMERCIAL", "Commercial", "commercial"})
})
public abstract class Property {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private String title;

    @Column(columnDefinition = "TEXT")
    private String description;

    @Column(precision = 15, scale = 2)
    private java.math.BigDecimal price;

    @Column(length = 50)
    private String type;

    @Column(length = 50)
    private String status = "AVAILABLE"; // AVAILABLE, DELISTED, SOLD

    @Column(name = "build_date")
    private String buildDate;

    @Column(name = "fire_safety_compliance")
    private Boolean fireSafetyCompliance = false;

    @Column(name = "pest_control_done")
    private Boolean pestControlDone = false;

    @Column(name = "square_footage")
    private Double squareFootage;

    @Column(name = "parking_spaces")
    private Integer parkingSpaces;

    private Double lat;
    private Double lng;

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "region_id")
    private Region region;

    @ElementCollection(fetch = FetchType.EAGER)
    @CollectionTable(name = "property_images", joinColumns = @JoinColumn(name = "property_id"))
    @Column(name = "image_url")
    private List<String> imageUrls = new ArrayList<>();

    @Column(name = "power_backup_type", length = 100)
    private String powerBackupType;

    @Column(name = "fire_safety_compliance_date")
    private java.time.LocalDate fireSafetyComplianceDate;

    @Column(name = "last_pest_control_date")
    private java.time.LocalDate lastPestControlDate;

    @Column(name = "number_of_lifts")
    private Integer numberOfLifts;

    @Column(name = "water_storage_capacity_liters")
    private Integer waterStorageCapacityLiters;

    @Column(name = "parking_area_capacity")
    private Integer parkingAreaCapacity;

    @Column(name = "number_of_balconies")
    private Integer numberOfBalconies;

    @Column(name = "pool_access_type", length = 100)
    private String poolAccessType;

    @Column(name = "pool_size_sqft")
    private Double poolSizeSqft;

    @Column(name = "terrace_access_type", length = 100)
    private String terraceAccessType;

    @Column(name = "terrace_area_sqft")
    private Double terraceAreaSqft;

    @Column(name = "garage_outlet_access_type", length = 100)
    private String garageOutletAccessType;

    @Column(name = "garage_outlet_capacity_va")
    private Integer garageOutletCapacityVa;

    @Column(name = "has_piped_gas")
    private Boolean hasPipedGas = false;

    @Column(name = "has_cctv_surveillance")
    private Boolean hasCctvSurveillance = false;

    @Column(name = "defect_liability_period", length = 100)
    private String defectLiabilityPeriod;
}
