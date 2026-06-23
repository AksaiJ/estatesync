package com.estatesync.model;

import jakarta.persistence.*;
import lombok.Data;
import lombok.EqualsAndHashCode;

@Data
@EqualsAndHashCode(callSuper = true)
@Entity
@Table(name = "property_residential")
public class ResidentialProperty extends Property {

    @Column(name = "number_of_bedrooms")
    private Integer numberOfBedrooms;

    @Column(name = "number_of_bathrooms", precision = 5, scale = 1)
    private java.math.BigDecimal numberOfBathrooms;

    @Enumerated(EnumType.STRING)
    @Column(name = "furnishing_status")
    private FurnishingStatus furnishingStatus;

    @Enumerated(EnumType.STRING)
    @Column(name = "pet_policy")
    private PetPolicy petPolicy;

    @Column(name = "has_maids_room")
    private Boolean hasMaidsRoom = false;

    @Enumerated(EnumType.STRING)
    @Column(name = "kitchen_type")
    private KitchenType kitchenType;

    @Column(name = "number_of_kitchens")
    private Integer numberOfKitchens;

    @Column(name = "has_intercom")
    private Boolean hasIntercom = false;
}
