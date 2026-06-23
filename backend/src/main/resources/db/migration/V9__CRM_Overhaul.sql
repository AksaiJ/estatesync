-- 1. Create opportunities table (Child of Lead)
CREATE TABLE opportunities (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    lead_id BIGINT NOT NULL,
    property_id BIGINT NOT NULL,
    agent_id BIGINT,
    status VARCHAR(50) NOT NULL DEFAULT 'NEW',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (lead_id) REFERENCES leads(id),
    FOREIGN KEY (property_id) REFERENCES properties(id),
    FOREIGN KEY (agent_id) REFERENCES users(id)
);

-- 2. Migrate existing lead_interests to opportunities
INSERT INTO opportunities (lead_id, property_id, agent_id, status, created_at, updated_at)
SELECT li.lead_id, li.property_id, l.agent_id, l.status, l.created_at, l.updated_at
FROM lead_interests li
JOIN leads l ON li.lead_id = l.id;

-- 3. Create activity_logs table
CREATE TABLE activity_logs (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    opportunity_id BIGINT NOT NULL,
    user_id BIGINT,
    activity_type VARCHAR(50) NOT NULL,
    content TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (opportunity_id) REFERENCES opportunities(id),
    FOREIGN KEY (user_id) REFERENCES users(id)
);

-- 4. Create agent_properties table (Many-to-Many Linking)
CREATE TABLE agent_properties (
    agent_id BIGINT NOT NULL,
    property_id BIGINT NOT NULL,
    PRIMARY KEY (agent_id, property_id),
    FOREIGN KEY (agent_id) REFERENCES users(id),
    FOREIGN KEY (property_id) REFERENCES properties(id)
);

-- 5. Add opportunity_id to visits
ALTER TABLE visits ADD COLUMN opportunity_id BIGINT;
ALTER TABLE visits ADD FOREIGN KEY (opportunity_id) REFERENCES opportunities(id);

-- Link existing visits to opportunities
UPDATE visits v
JOIN opportunities o ON v.lead_id = o.lead_id AND v.property_id = o.property_id
SET v.opportunity_id = o.id;

-- 6. Update old lead status
ALTER TABLE leads MODIFY COLUMN status VARCHAR(50) NOT NULL DEFAULT 'OPEN';
UPDATE leads SET status = 'OPEN' WHERE status != 'CLOSED';
