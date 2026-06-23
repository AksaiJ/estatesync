package com.estatesync.model;

import jakarta.persistence.*;
import lombok.Data;
import lombok.EqualsAndHashCode;

@Data
@EqualsAndHashCode(callSuper = true)
@Entity
@Table(name = "property_commercial")
public class CommercialProperty extends Property {

    @Enumerated(EnumType.STRING)
    @Column(name = "zoning_type")
    private ZoningType zoningType;

    @Enumerated(EnumType.STRING)
    @Column(name = "cafeteria_access_type")
    private CafeteriaAccessType cafeteriaAccessType;

    @Column(name = "cafeteria_size_sqft")
    private Integer cafeteriaSizeSqft;

    @Enumerated(EnumType.STRING)
    @Column(name = "hvac_system_type")
    private HvacSystemType hvacSystemType;

    @Column(name = "max_floor_load_kg_per_sqm")
    private Integer maxFloorLoadKgPerSqm;

    @Column(name = "loading_dock_count")
    private Integer loadingDockCount;

    @Column(name = "has_freight_elevator")
    private Boolean hasFreightElevator = false;

    @Column(name = "has_watchman_room")
    private Boolean hasWatchmanRoom = false;
}
