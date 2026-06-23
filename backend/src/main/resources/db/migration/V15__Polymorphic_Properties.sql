-- Base Table enhancements
ALTER TABLE properties
ADD COLUMN power_backup_type VARCHAR(100),
ADD COLUMN fire_safety_compliance_date DATE,
ADD COLUMN last_pest_control_date DATE,
ADD COLUMN number_of_lifts INT,
ADD COLUMN water_storage_capacity_liters INT,
ADD COLUMN parking_area_capacity INT,
ADD COLUMN number_of_balconies INT,
ADD COLUMN pool_access_type VARCHAR(100),
ADD COLUMN pool_size_sqft DOUBLE,
ADD COLUMN terrace_access_type VARCHAR(100),
ADD COLUMN terrace_area_sqft DOUBLE,
ADD COLUMN garage_outlet_access_type VARCHAR(100),
ADD COLUMN garage_outlet_capacity_va INT;

-- Residential Child Table
CREATE TABLE property_residential (
    id BIGINT PRIMARY KEY,
    number_of_bedrooms INT,
    number_of_bathrooms DECIMAL(5, 1),
    furnishing_status VARCHAR(50),
    pet_policy VARCHAR(50),
    has_maids_room BOOLEAN DEFAULT false,
    FOREIGN KEY (id) REFERENCES properties(id) ON DELETE CASCADE
);

-- Commercial Child Table
CREATE TABLE property_commercial (
    id BIGINT PRIMARY KEY,
    zoning_type VARCHAR(50),
    cafeteria_access_type VARCHAR(50),
    cafeteria_size_sqft INT,
    hvac_system_type VARCHAR(50),
    max_floor_load_kg_per_sqm INT,
    loading_dock_count INT,
    has_freight_elevator BOOLEAN DEFAULT false,
    FOREIGN KEY (id) REFERENCES properties(id) ON DELETE CASCADE
);

-- Data Migration: Create residential records for existing VILLA/APARTMENT
INSERT INTO property_residential (id, number_of_bedrooms, number_of_bathrooms)
SELECT id, bedrooms, bathrooms 
FROM properties 
WHERE UPPER(type) IN ('VILLA', 'APARTMENT', 'RESIDENTIAL');

-- Data Migration: Create commercial records for existing COMMERCIAL
INSERT INTO property_commercial (id)
SELECT id 
FROM properties 
WHERE UPPER(type) IN ('COMMERCIAL', 'OFFICE', 'RETAIL');

-- Cleanup Base Table
ALTER TABLE properties 
DROP COLUMN bedrooms,
DROP COLUMN bathrooms;
