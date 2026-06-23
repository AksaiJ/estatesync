ALTER TABLE properties
ADD COLUMN has_piped_gas BOOLEAN DEFAULT FALSE,
ADD COLUMN has_cctv_surveillance BOOLEAN DEFAULT FALSE;

ALTER TABLE property_residential
ADD COLUMN kitchen_type VARCHAR(50),
ADD COLUMN number_of_kitchens INT,
ADD COLUMN has_intercom BOOLEAN DEFAULT FALSE;

ALTER TABLE property_commercial
ADD COLUMN has_watchman_room BOOLEAN DEFAULT FALSE;

-- Update dummy data with realistic values
UPDATE properties SET has_piped_gas = TRUE WHERE type IN ('VILLA', 'APARTMENT', 'Villa', 'Apartment') AND id % 2 = 0;
UPDATE properties SET has_cctv_surveillance = TRUE WHERE type IN ('APARTMENT', 'COMMERCIAL', 'Apartment', 'Commercial');

UPDATE property_residential SET kitchen_type = 'MODULAR', number_of_kitchens = 1, has_intercom = TRUE WHERE id % 2 = 0;
UPDATE property_residential SET kitchen_type = 'STANDARD', number_of_kitchens = 1, has_intercom = FALSE WHERE id % 2 != 0;

UPDATE property_commercial SET has_watchman_room = TRUE WHERE id % 2 = 0;
