package com.estatesync.controller;

import com.estatesync.model.*;
import com.estatesync.repository.OpportunityRepository;
import com.estatesync.service.ActivityService;
import com.estatesync.service.LeadService;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/agent")
@PreAuthorize("hasRole('AGENT')")
public class AgentController {

    private final OpportunityRepository opportunityRepository;
    private final ActivityService activityService;
    private final LeadService leadService;
    private final com.estatesync.service.OpportunityService opportunityService;
    private final com.estatesync.service.EmailService emailService;

    public AgentController(OpportunityRepository opportunityRepository, ActivityService activityService, LeadService leadService, com.estatesync.service.OpportunityService opportunityService, com.estatesync.service.EmailService emailService) {
        this.opportunityRepository = opportunityRepository;
        this.activityService = activityService;
        this.leadService = leadService;
        this.opportunityService = opportunityService;
        this.emailService = emailService;
    }

    @GetMapping("/opportunities")
    public ResponseEntity<?> getMyOpportunities(
            @org.springframework.web.bind.annotation.RequestParam(required = false) com.estatesync.model.OpportunityStatus status,
            @org.springframework.web.bind.annotation.RequestParam(required = false) String search,
            org.springframework.data.domain.Pageable pageable,
            org.springframework.security.core.Authentication authentication) {
        com.estatesync.security.CustomUserDetails userDetails = (com.estatesync.security.CustomUserDetails) authentication.getPrincipal();
        Long agentId = userDetails.getUser().getId();
        return ResponseEntity.ok(opportunityService.getFilteredOpportunities(status, agentId, null, search, pageable));
    }

    @PutMapping("/opportunities/{id}/status")
    public ResponseEntity<?> updateOpportunityStatus(@PathVariable Long id, @RequestBody Map<String, String> payload, org.springframework.security.core.Authentication authentication) {
        com.estatesync.security.CustomUserDetails userDetails = (com.estatesync.security.CustomUserDetails) authentication.getPrincipal();
        User agent = userDetails.getUser();

        Opportunity opp = opportunityRepository.findById(id).orElse(null);
        if (opp == null || opp.getAgent() == null || !opp.getAgent().getId().equals(agent.getId())) {
            return ResponseEntity.badRequest().body("Not authorized to update this opportunity");
        }

        try {
            OpportunityStatus newStatus = OpportunityStatus.valueOf(payload.get("status"));
            String note = payload.getOrDefault("note", "No note provided");

            if (newStatus == OpportunityStatus.CLOSED_WON) {
                if (payload.containsKey("finalPrice")) {
                    opp.setFinalPrice(new java.math.BigDecimal(payload.get("finalPrice")));
                }
                if (payload.containsKey("documentationDate")) {
                    opp.setDocumentationDate(java.time.LocalDate.parse(payload.get("documentationDate")));
                }
                if (payload.containsKey("purchaseDate")) {
                    opp.setPurchaseDate(java.time.LocalDate.parse(payload.get("purchaseDate")));
                }
                opportunityRepository.save(opp);

                if ("true".equals(payload.get("sendEmail"))) {
                    // Send Email via EmailService
                    // Need to Autowire EmailService
                    try {
                        emailService.sendClosedWonAcknowledgement(
                            opp.getLead().getCustomer().getEmail(),
                            opp.getLead().getCustomer().getName(),
                            opp.getProperty().getTitle(),
                            opp.getFinalPrice()
                        );
                    } catch (Exception ignored) {}
                }
            }
            
            if (newStatus == OpportunityStatus.CLOSED_WON || newStatus == OpportunityStatus.CLOSED_LOST) {
                // Advance status first so it's logged properly
                opportunityService.advanceStatus(opp, newStatus, agent, note);
                leadService.closeOpportunity(id, null); // Will trigger auto-close of parent lead if needed
            } else {
                opportunityService.advanceStatus(opp, newStatus, agent, note);
            }
            return ResponseEntity.ok().build();
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body("Invalid status");
        } catch (IllegalStateException e) {
            return ResponseEntity.badRequest().body(e.getMessage());
        }
    }

    @PostMapping("/opportunities/{id}/negotiation")
    public ResponseEntity<?> addNegotiationOffer(@PathVariable Long id, @RequestBody NegotiationOffer offer, org.springframework.security.core.Authentication authentication) {
        com.estatesync.security.CustomUserDetails userDetails = (com.estatesync.security.CustomUserDetails) authentication.getPrincipal();
        User agent = userDetails.getUser();

        Opportunity opp = opportunityRepository.findById(id).orElse(null);
        if (opp == null || opp.getAgent() == null || !opp.getAgent().getId().equals(agent.getId())) {
            return ResponseEntity.badRequest().body("Not authorized");
        }

        try {
            return ResponseEntity.ok(opportunityService.addNegotiationOffer(opp, offer, agent));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(e.getMessage());
        }
    }

    @PostMapping("/opportunities/{id}/log")
    public ResponseEntity<?> addActivityLog(@PathVariable Long id, @RequestBody Map<String, String> payload, org.springframework.security.core.Authentication authentication) {
        com.estatesync.security.CustomUserDetails userDetails = (com.estatesync.security.CustomUserDetails) authentication.getPrincipal();
        User agent = userDetails.getUser();

        Opportunity opp = opportunityRepository.findById(id).orElse(null);
        if (opp == null || opp.getAgent() == null || !opp.getAgent().getId().equals(agent.getId())) {
            return ResponseEntity.badRequest().body("Not authorized");
        }

        ActivityType type = ActivityType.valueOf(payload.get("type"));
        String content = payload.get("content");
        
        activityService.logActivity(opp, agent, type, content);
        return ResponseEntity.ok().build();
    }

    @GetMapping("/opportunities/{id}/history")
    public ResponseEntity<?> getOpportunityHistory(@PathVariable Long id, org.springframework.security.core.Authentication authentication) {
        com.estatesync.security.CustomUserDetails userDetails = (com.estatesync.security.CustomUserDetails) authentication.getPrincipal();
        User agent = userDetails.getUser();

        Opportunity opp = opportunityRepository.findById(id).orElse(null);
        if (opp == null || opp.getAgent() == null || !opp.getAgent().getId().equals(agent.getId())) {
            return ResponseEntity.badRequest().body("Not authorized");
        }

        return ResponseEntity.ok(activityService.getLogsForOpportunity(id));
    }

    @org.springframework.beans.factory.annotation.Autowired
    private com.estatesync.repository.VisitRepository visitRepository;

    @GetMapping("/visits")
    public ResponseEntity<?> getMyVisits(org.springframework.security.core.Authentication authentication) {
        com.estatesync.security.CustomUserDetails userDetails = (com.estatesync.security.CustomUserDetails) authentication.getPrincipal();
        return ResponseEntity.ok(visitRepository.findByOpportunityAgentId(userDetails.getUser().getId()));
    }

    @PostMapping("/opportunities/{id}/visits")
    public ResponseEntity<?> scheduleVisit(@PathVariable Long id, @RequestBody Map<String, String> payload, org.springframework.security.core.Authentication authentication) {
        com.estatesync.security.CustomUserDetails userDetails = (com.estatesync.security.CustomUserDetails) authentication.getPrincipal();
        User agent = userDetails.getUser();

        Opportunity opp = opportunityRepository.findById(id).orElse(null);
        if (opp == null || opp.getAgent() == null || !opp.getAgent().getId().equals(agent.getId())) {
            return ResponseEntity.badRequest().body("Not authorized");
        }

        Visit visit = new Visit();
        visit.setOpportunity(opp);
        visit.setVisitDate(java.time.LocalDateTime.parse(payload.get("visitDate"))); // Expected ISO string
        visit.setStatus(VisitStatus.SCHEDULED);
        visitRepository.save(visit);

        // Smart Update: Automatically update opportunity status
        if (opp.getStatus() == OpportunityStatus.NEW) {
            opportunityService.advanceStatus(opp, OpportunityStatus.CONTACTED, agent, "Auto-advanced to CONTACTED before scheduling visit.");
        }
        if (opp.getStatus() == OpportunityStatus.CONTACTED) {
            opportunityService.advanceStatus(opp, OpportunityStatus.VISIT_SCHEDULED, agent, "Auto-advanced to VISIT_SCHEDULED after scheduling visit.");
        }

        if ("true".equals(payload.get("sendEmail"))) {
            String customerName = opp.getLead() != null && opp.getLead().getCustomer() != null ? opp.getLead().getCustomer().getName() : "Customer";
            String email = opp.getLead() != null && opp.getLead().getCustomer() != null ? opp.getLead().getCustomer().getEmail() : null;
            String propertyName = opp.getProperty() != null ? opp.getProperty().getTitle() : "Property";
            String agentName = opp.getAgent() != null ? opp.getAgent().getName() : "Your Agent";
            java.time.format.DateTimeFormatter formatter = java.time.format.DateTimeFormatter.ofPattern("MMM dd, yyyy h:mm a");
            emailService.sendVisitScheduledEmail(email, customerName, propertyName, visit.getVisitDate().format(formatter), agentName);
            activityService.logSystemEvent(opp, "Visit scheduled and confirmation email sent to client.");
        } else {
            activityService.logSystemEvent(opp, "Visit scheduled for " + visit.getVisitDate().toString() + " by " + agent.getName());
        }
        
        return ResponseEntity.ok(visit);
    }

    @PutMapping("/visits/{visitId}")
    public ResponseEntity<?> updateVisit(@PathVariable Long visitId, @RequestBody Map<String, String> payload, org.springframework.security.core.Authentication authentication) {
        com.estatesync.security.CustomUserDetails userDetails = (com.estatesync.security.CustomUserDetails) authentication.getPrincipal();
        User agent = userDetails.getUser();

        Visit visit = visitRepository.findById(visitId).orElse(null);
        if (visit == null || visit.getOpportunity().getAgent() == null || !visit.getOpportunity().getAgent().getId().equals(agent.getId())) {
            return ResponseEntity.badRequest().body("Not authorized");
        }

        if (payload.containsKey("visitDate")) {
            visit.setVisitDate(java.time.LocalDateTime.parse(payload.get("visitDate")));
            visitRepository.save(visit);

            Opportunity opp = visit.getOpportunity();
            activityService.logSystemEvent(opp, "Visit rescheduled to " + visit.getVisitDate().toString() + " by " + agent.getName());
        }

        return ResponseEntity.ok(visit);
    }

    @PutMapping("/visits/{visitId}/status")
    public ResponseEntity<?> updateVisitStatus(@PathVariable Long visitId, @RequestBody Map<String, String> payload, org.springframework.security.core.Authentication authentication) {
        com.estatesync.security.CustomUserDetails userDetails = (com.estatesync.security.CustomUserDetails) authentication.getPrincipal();
        User agent = userDetails.getUser();

        Visit visit = visitRepository.findById(visitId).orElse(null);
        if (visit == null || visit.getOpportunity().getAgent() == null || !visit.getOpportunity().getAgent().getId().equals(agent.getId())) {
            return ResponseEntity.badRequest().body("Not authorized");
        }

        VisitStatus newStatus = VisitStatus.valueOf(payload.get("status"));
        visit.setStatus(newStatus);
        visitRepository.save(visit);

        Opportunity opp = visit.getOpportunity();
        if (newStatus == VisitStatus.COMPLETED && opp.getStatus() == OpportunityStatus.VISIT_SCHEDULED) {
             opportunityService.advanceStatus(opp, OpportunityStatus.VISIT_COMPLETED, agent, "Auto-advanced to VISIT_COMPLETED after visit.");
        } else if (newStatus == VisitStatus.CANCELLED && opp.getStatus() == OpportunityStatus.VISIT_SCHEDULED) {
             opportunityService.advanceStatus(opp, OpportunityStatus.CONTACTED, agent, "Auto-reverted to CONTACTED after visit cancelled.");
        }

        activityService.logSystemEvent(visit.getOpportunity(), "Visit status updated to " + newStatus + " by " + agent.getName());
        return ResponseEntity.ok().build();
    }
}
