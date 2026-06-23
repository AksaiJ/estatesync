-- Remove NOT NULL constraints from legacy columns in visits to fix constraint violations on scheduling new visits
ALTER TABLE visits MODIFY COLUMN lead_id BIGINT NULL;
ALTER TABLE visits MODIFY COLUMN property_id BIGINT NULL;
