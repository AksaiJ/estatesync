package com.estatesync.controller;

import com.estatesync.model.EmployeeSession;
import com.estatesync.model.PageVisit;
import com.estatesync.model.User;
import com.estatesync.repository.EmployeeSessionRepository;
import com.estatesync.repository.PageVisitRepository;
import com.estatesync.repository.UserRepository;
import com.estatesync.security.CustomUserDetails;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.time.temporal.ChronoUnit;
import java.util.Map;
import java.util.List;
import java.util.stream.Collectors;
import com.estatesync.dto.PageVisitTrendDTO;
import com.estatesync.dto.EmployeeActivityDTO;

@RestController
@RequestMapping("/api/analytics")
public class AnalyticsController {

    private final PageVisitRepository pageVisitRepository;
    private final EmployeeSessionRepository employeeSessionRepository;
    private final UserRepository userRepository;

    public AnalyticsController(PageVisitRepository pageVisitRepository, EmployeeSessionRepository employeeSessionRepository, UserRepository userRepository) {
        this.pageVisitRepository = pageVisitRepository;
        this.employeeSessionRepository = employeeSessionRepository;
        this.userRepository = userRepository;
    }

    @PostMapping("/visit")
    public ResponseEntity<?> recordVisit(@RequestBody Map<String, String> payload, HttpServletRequest request, Authentication authentication) {
        PageVisit visit = new PageVisit();
        visit.setSessionId(payload.get("sessionId"));
        visit.setPath(payload.get("path"));
        visit.setIpAddress(request.getRemoteAddr());
        
        if (authentication != null && authentication.isAuthenticated() && !authentication.getPrincipal().equals("anonymousUser")) {
            CustomUserDetails userDetails = (CustomUserDetails) authentication.getPrincipal();
            visit.setUser(userRepository.findById(userDetails.getUser().getId()).orElse(null));
        }

        pageVisitRepository.save(visit);
        return ResponseEntity.ok().build();
    }

    @Transactional
    @PostMapping("/heartbeat")
    public ResponseEntity<?> heartbeat(@RequestBody Map<String, String> payload, HttpServletRequest request) {
        String sessionToken = payload.get("sessionToken");
        if (sessionToken == null) return ResponseEntity.badRequest().build();

        return employeeSessionRepository.findBySessionToken(sessionToken).map(session -> {
            LocalDateTime now = LocalDateTime.now();
            long secondsSinceLastHeartbeat = ChronoUnit.SECONDS.between(session.getLastHeartbeat(), now);
            
            // If the heartbeat is reasonably close (e.g., within 5 minutes), we increment the active time
            if (secondsSinceLastHeartbeat > 0 && secondsSinceLastHeartbeat < 300) {
                session.setTotalActiveSeconds(session.getTotalActiveSeconds() + secondsSinceLastHeartbeat);
            }
            
            session.setLastHeartbeat(now);
            session.setIpAddress(request.getRemoteAddr());
            employeeSessionRepository.save(session);
            
            return ResponseEntity.ok().build();
        }).orElse(ResponseEntity.notFound().build());
    }
    @org.springframework.security.access.prepost.PreAuthorize("hasRole('ADMIN')")
    @GetMapping("/admin/summary")
    public ResponseEntity<Map<String, Object>> getSummary() {
        long totalVisits = pageVisitRepository.count();
        long uniqueVisitors = pageVisitRepository.countDistinctSessionId();
        Long totalActiveSeconds = employeeSessionRepository.sumTotalActiveSeconds();
        if (totalActiveSeconds == null) totalActiveSeconds = 0L;
        long totalActiveHours = totalActiveSeconds / 3600;

        return ResponseEntity.ok(Map.of(
            "totalVisits", totalVisits,
            "uniqueVisitors", uniqueVisitors,
            "totalActiveHours", totalActiveHours
        ));
    }

    @org.springframework.security.access.prepost.PreAuthorize("hasRole('ADMIN')")
    @GetMapping("/admin/trends")
    public ResponseEntity<List<PageVisitTrendDTO>> getTrends() {
        List<Object[]> results = pageVisitRepository.getRawVisitTrends();
        List<PageVisitTrendDTO> dtos = results.stream()
            .map(row -> new PageVisitTrendDTO(
                (String) row[0],
                ((Number) row[1]).longValue(),
                ((Number) row[2]).longValue()
            ))
            .collect(Collectors.toList());
        return ResponseEntity.ok(dtos);
    }

    @org.springframework.security.access.prepost.PreAuthorize("hasRole('ADMIN')")
    @GetMapping("/admin/leaderboard")
    public ResponseEntity<List<EmployeeActivityDTO>> getLeaderboard() {
        List<Object[]> results = employeeSessionRepository.getRawLeaderboard();
        List<EmployeeActivityDTO> dtos = results.stream()
            .map(row -> new EmployeeActivityDTO(
                ((Number) row[0]).longValue(),
                (String) row[1],
                (String) row[2],
                ((Number) row[3]).longValue()
            ))
            .collect(Collectors.toList());
        return ResponseEntity.ok(dtos);
    }
}
