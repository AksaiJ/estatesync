-- Insert Pune-specific regions if they don't exist
INSERT INTO regions (name) VALUES ('Pune Central'), ('Pune East'), ('Pune West'), ('PCMC')
ON DUPLICATE KEY UPDATE name=name;

-- Get region IDs
SET @pune_central = (SELECT id FROM regions WHERE name = 'Pune Central' LIMIT 1);
SET @pune_east = (SELECT id FROM regions WHERE name = 'Pune East' LIMIT 1);
SET @pune_west = (SELECT id FROM regions WHERE name = 'Pune West' LIMIT 1);
SET @pcmc = (SELECT id FROM regions WHERE name = 'PCMC' LIMIT 1);

-- All users have password: 'admin123'
SET @pass_hash = '$2a$10$wE/.7Xw3XbJ.r6.h9H6QceOq4nZ9S.l4Z9fXmE.2m2pTf3lU6O8Gq';

-- Managers
INSERT INTO users (name, email, password_hash, role, region_id, is_active) VALUES 
('Rahul Deshmukh', 'rahul.manager@estatesync.com', @pass_hash, 'MANAGER', @pune_central, TRUE),
('Priya Kulkarni', 'priya.manager@estatesync.com', @pass_hash, 'MANAGER', @pune_east, TRUE);

SET @mgr_rahul = (SELECT id FROM users WHERE email = 'rahul.manager@estatesync.com');
SET @mgr_priya = (SELECT id FROM users WHERE email = 'priya.manager@estatesync.com');

-- Agents
INSERT INTO users (name, email, password_hash, role, region_id, is_active) VALUES 
('Amit Patil', 'amit.agent@estatesync.com', @pass_hash, 'AGENT', @pune_central, TRUE),
('Sneha Joshi', 'sneha.agent@estatesync.com', @pass_hash, 'AGENT', @pune_east, TRUE),
('Siddharth Pawar', 'siddharth.agent@estatesync.com', @pass_hash, 'AGENT', @pune_west, TRUE),
('Neha Shinde', 'neha.agent@estatesync.com', @pass_hash, 'AGENT', @pcmc, TRUE);

SET @agt_amit = (SELECT id FROM users WHERE email = 'amit.agent@estatesync.com');
SET @agt_sneha = (SELECT id FROM users WHERE email = 'sneha.agent@estatesync.com');
SET @agt_siddharth = (SELECT id FROM users WHERE email = 'siddharth.agent@estatesync.com');
SET @agt_neha = (SELECT id FROM users WHERE email = 'neha.agent@estatesync.com');

-- Properties in Pune
INSERT INTO properties (title, description, price, type, lat, lng, region_id) VALUES 
('Premium 3BHK in Koregaon Park', 'Spacious apartment with river view.', 25000000, 'Apartment', 18.5362, 73.8939, @pune_east),
('Luxury Villa in Kalyani Nagar', 'Independent villa with private garden.', 45000000, 'Villa', 18.5487, 73.9023, @pune_east),
('Modern 2BHK in Baner', 'Close to IT Park, perfect for professionals.', 8500000, 'Apartment', 18.5590, 73.7868, @pune_west),
('Commercial Shop in Deccan', 'Prime location near FC Road.', 15000000, 'Commercial', 18.5158, 73.8411, @pune_central),
('Affordable 1BHK in Wakad', 'Great connectivity to Mumbai highway.', 4500000, 'Apartment', 18.5987, 73.7688, @pcmc),
('IT Office Space in Hinjewadi', 'Ready to move in office for startups.', 30000000, 'Commercial', 18.5913, 73.7389, @pcmc);

SET @prop_kp = (SELECT id FROM properties WHERE title = 'Premium 3BHK in Koregaon Park');
SET @prop_kalyani = (SELECT id FROM properties WHERE title = 'Luxury Villa in Kalyani Nagar');
SET @prop_baner = (SELECT id FROM properties WHERE title = 'Modern 2BHK in Baner');
SET @prop_deccan = (SELECT id FROM properties WHERE title = 'Commercial Shop in Deccan');
SET @prop_wakad = (SELECT id FROM properties WHERE title = 'Affordable 1BHK in Wakad');
SET @prop_hinjewadi = (SELECT id FROM properties WHERE title = 'IT Office Space in Hinjewadi');

-- Agent Property Authorizations
INSERT INTO agent_properties (agent_id, property_id) VALUES
(@agt_sneha, @prop_kp),
(@agt_sneha, @prop_kalyani),
(@agt_siddharth, @prop_baner),
(@agt_amit, @prop_deccan),
(@agt_neha, @prop_wakad),
(@agt_neha, @prop_hinjewadi);

-- Customers
INSERT INTO customers (name, email, phone, is_email_verified, preferred_location, property_type) VALUES
('Ramesh Kale', 'ramesh.kale@example.com', '9876543210', TRUE, 'Koregaon Park', 'Apartment'),
('Anjali More', 'anjali.more@example.com', '9876543211', TRUE, 'Baner', 'Apartment'),
('Vikas Jadhav', 'vikas.jadhav@example.com', '9876543212', FALSE, 'Deccan', 'Commercial'),
('Pooja Bhat', 'pooja.bhat@example.com', '9876543213', TRUE, 'Hinjewadi', 'Commercial');

SET @cust_ramesh = (SELECT id FROM customers WHERE email = 'ramesh.kale@example.com');
SET @cust_anjali = (SELECT id FROM customers WHERE email = 'anjali.more@example.com');
SET @cust_vikas = (SELECT id FROM customers WHERE email = 'vikas.jadhav@example.com');
SET @cust_pooja = (SELECT id FROM customers WHERE email = 'pooja.bhat@example.com');

-- Leads (Parent)
INSERT INTO leads (customer_id, status) VALUES
(@cust_ramesh, 'OPEN'),
(@cust_anjali, 'OPEN'),
(@cust_vikas, 'OPEN'),
(@cust_pooja, 'OPEN');

SET @lead_ramesh = (SELECT id FROM leads WHERE customer_id = @cust_ramesh);
SET @lead_anjali = (SELECT id FROM leads WHERE customer_id = @cust_anjali);
SET @lead_vikas = (SELECT id FROM leads WHERE customer_id = @cust_vikas);
SET @lead_pooja = (SELECT id FROM leads WHERE customer_id = @cust_pooja);

-- Opportunities (Child)
INSERT INTO opportunities (lead_id, property_id, agent_id, status) VALUES
(@lead_ramesh, @prop_kp, @agt_sneha, 'CONTACTED'),
(@lead_ramesh, @prop_kalyani, NULL, 'NEW'),
(@lead_anjali, @prop_baner, @agt_siddharth, 'VISIT_SCHEDULED'),
(@lead_vikas, @prop_deccan, @agt_amit, 'NEGOTIATION'),
(@lead_pooja, @prop_hinjewadi, @agt_neha, 'PROPOSAL_SENT');

-- Let's assign opportunities to variables for logging
SET @opp_ramesh_kp = (SELECT id FROM opportunities WHERE lead_id = @lead_ramesh AND property_id = @prop_kp);
SET @opp_anjali_baner = (SELECT id FROM opportunities WHERE lead_id = @lead_anjali AND property_id = @prop_baner);

-- Activity Logs
INSERT INTO activity_logs (opportunity_id, user_id, activity_type, content) VALUES
(@opp_ramesh_kp, @agt_sneha, 'CALL', 'Spoke with Ramesh. He is very interested in the river view. Wants to schedule a visit.'),
(@opp_ramesh_kp, @agt_sneha, 'SYSTEM_EVENT', 'Status updated to CONTACTED. Note: Initial call completed.'),
(@opp_anjali_baner, @agt_siddharth, 'EMAIL', 'Sent brochure and floor plans for the Baner property.'),
(@opp_anjali_baner, @agt_siddharth, 'SYSTEM_EVENT', 'Status updated to VISIT_SCHEDULED. Note: Customer confirmed for Saturday.');

-- Visits
INSERT INTO visits (lead_id, property_id, opportunity_id, visit_date, status) VALUES
(@lead_anjali, @prop_baner, @opp_anjali_baner, DATE_ADD(NOW(), INTERVAL 2 DAY), 'SCHEDULED');
