-- 1. Add optimistic locking version column to opportunities
ALTER TABLE opportunities ADD COLUMN version INT NOT NULL DEFAULT 0;

-- 2. Migrate existing status strings to new FSM values safely
UPDATE opportunities SET status = 'CONTACTED' WHERE status IN ('QUALIFIED', 'VISIT_SCHEDULED');
UPDATE opportunities SET status = 'IN_NEGOTIATION' WHERE status = 'NEGOTIATION';
UPDATE opportunities SET status = 'CLOSED_WON' WHERE status = 'CLOSED';

-- 3. Create Negotiation Offers table
CREATE TABLE negotiation_offers (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    opportunity_id BIGINT NOT NULL,
    client_offer_amount DECIMAL(15, 2) NOT NULL,
    agent_counter_offer DECIMAL(15, 2),
    conditions TEXT,
    validity_date DATETIME NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (opportunity_id) REFERENCES opportunities(id)
);
