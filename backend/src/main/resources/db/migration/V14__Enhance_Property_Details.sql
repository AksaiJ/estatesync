ALTER TABLE properties
ADD COLUMN status VARCHAR(50) DEFAULT 'AVAILABLE',
ADD COLUMN build_date VARCHAR(50),
ADD COLUMN fire_safety_compliance BOOLEAN DEFAULT false,
ADD COLUMN pest_control_done BOOLEAN DEFAULT false,
ADD COLUMN square_footage DOUBLE,
ADD COLUMN bedrooms INT,
ADD COLUMN bathrooms INT,
ADD COLUMN parking_spaces INT;
