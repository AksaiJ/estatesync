package com.estatesync.model;

import jakarta.persistence.*;
import lombok.Data;
import java.time.LocalDateTime;

@Data
@Entity
@Table(name = "employee_sessions")
public class EmployeeSession {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @Column(name = "session_token", nullable = false, unique = true)
    private String sessionToken;

    @Column(name = "start_time", nullable = false)
    private LocalDateTime startTime = LocalDateTime.now();

    @Column(name = "last_heartbeat", nullable = false)
    private LocalDateTime lastHeartbeat = LocalDateTime.now();

    @Column(name = "total_active_seconds", nullable = false)
    private Long totalActiveSeconds = 0L;

    @Column(name = "ip_address")
    private String ipAddress;
}
