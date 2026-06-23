ALTER TABLE properties
ADD COLUMN defect_liability_period VARCHAR(100);

UPDATE properties SET defect_liability_period = '5 Years (RERA)' WHERE type IN ('VILLA', 'APARTMENT', 'Villa', 'Apartment') AND id % 2 = 0;
UPDATE properties SET defect_liability_period = '12 Months' WHERE type IN ('COMMERCIAL', 'Commercial');
