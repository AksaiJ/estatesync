CREATE TABLE page_visits (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    session_id VARCHAR(255) NOT NULL,
    user_id BIGINT,
    path VARCHAR(255) NOT NULL,
    ip_address VARCHAR(255),
    timestamp DATETIME NOT NULL,
    CONSTRAINT fk_page_visits_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
);

CREATE TABLE employee_sessions (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    user_id BIGINT NOT NULL,
    session_token VARCHAR(255) NOT NULL UNIQUE,
    start_time DATETIME NOT NULL,
    last_heartbeat DATETIME NOT NULL,
    total_active_seconds BIGINT NOT NULL DEFAULT 0,
    ip_address VARCHAR(255),
    CONSTRAINT fk_employee_sessions_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);
