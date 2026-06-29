package com.estatesync.controller;

import com.estatesync.model.*;
import com.estatesync.repository.*;
import com.estatesync.service.LeadService;
import com.estatesync.service.ActivityService;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import org.springframework.transaction.annotation.Transactional;
import java.util.Map;
import java.util.List;
import java.util.Set;
import java.util.HashSet;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/manager")
@PreAuthorize("hasRole('MANAGER')")
public class ManagerController {

    private final LeadService leadService;
    private final ActivityService activityService;
    private final UserRepository userRepository;
    private final LeadRepository leadRepository;
    private final OpportunityRepository opportunityRepository;
    private final PropertyRepository propertyRepository;
    private final com.estatesync.service.OpportunityService opportunityService;
    private final com.estatesync.service.PropertyService propertyService;

    public ManagerController(LeadService leadService, ActivityService activityService, UserRepository userRepository, LeadRepository leadRepository, OpportunityRepository opportunityRepository, PropertyRepository propertyRepository, com.estatesync.service.OpportunityService opportunityService, com.estatesync.service.PropertyService propertyService) {
        this.leadService = leadService;
        this.activityService = activityService;
        this.userRepository = userRepository;
        this.leadRepository = leadRepository;
        this.opportunityRepository = opportunityRepository;
        this.propertyRepository = propertyRepository;
        this.opportunityService = opportunityService;
        this.propertyService = propertyService;
    }

    @GetMapping("/leads")
    public ResponseEntity<?> getRegionalLeads(
            @org.springframework.web.bind.annotation.RequestParam(required = false) com.estatesync.model.LeadStatus status,
            @org.springframework.web.bind.annotation.RequestParam(required = false) String search,
            org.springframework.data.domain.Pageable pageable,
            org.springframework.security.core.Authentication authentication) {
        com.estatesync.security.CustomUserDetails userDetails = (com.estatesync.security.CustomUserDetails) authentication.getPrincipal();
        Long regionId = userDetails.getUser().getRegion() != null ? userDetails.getUser().getRegion().getId() : null;
        if (regionId == null) return ResponseEntity.badRequest().body("Manager has no assigned region");
        
        return ResponseEntity.ok(leadService.getManagerLeads(status, regionId, userDetails.getUser().getId(), search, pageable));
    }

    @GetMapping("/agents")
    public ResponseEntity<?> getRegionalAgents(org.springframework.security.core.Authentication authentication) {
        com.estatesync.security.CustomUserDetails userDetails = (com.estatesync.security.CustomUserDetails) authentication.getPrincipal();
        Long regionId = userDetails.getUser().getRegion() != null ? userDetails.getUser().getRegion().getId() : null;
        if (regionId == null) return ResponseEntity.badRequest().body("Manager has no assigned region");
        
        java.util.List<User> agents = userRepository.findAll().stream()
            .filter(u -> u.getRole() == Role.AGENT && u.getRegion() != null && u.getRegion().getId().equals(regionId))
            .collect(Collectors.toList());
        return ResponseEntity.ok(agents);
    }

    @GetMapping("/kpis")
    public ResponseEntity<?> getManagerKpis(org.springframework.security.core.Authentication authentication) {
        com.estatesync.security.CustomUserDetails userDetails = (com.estatesync.security.CustomUserDetails) authentication.getPrincipal();
        Long managerId = userDetails.getUser().getId();
        Long regionId = userDetails.getUser().getRegion() != null ? userDetails.getUser().getRegion().getId() : null;
        if (regionId == null) return ResponseEntity.badRequest().body("Manager has no assigned region");

        List<Opportunity> allManagerOpps = opportunityRepository.findByLeadManagerId(managerId);
        
        long totalOpps = allManagerOpps.size();
        long unassignedOpps = allManagerOpps.stream().filter(o -> o.getAgent() == null).count();
        long closedOpps = allManagerOpps.stream().filter(o -> 
                o.getStatus() == OpportunityStatus.CLOSED_WON || o.getStatus() == OpportunityStatus.CLOSED_LOST).count();
        
        double conversionRate = totalOpps > 0 ? ((double) closedOpps / totalOpps) * 100 : 0.0;

        List<User> agents = userRepository.findAll().stream()
            .filter(u -> u.getRole() == Role.AGENT && u.getRegion() != null && u.getRegion().getId().equals(regionId))
            .collect(Collectors.toList());

        List<Map<String, Object>> agentPerformance = agents.stream().map(agent -> {
            long agentTotal = allManagerOpps.stream().filter(o -> o.getAgent() != null && o.getAgent().getId().equals(agent.getId())).count();
            long agentClosed = allManagerOpps.stream().filter(o -> o.getAgent() != null && o.getAgent().getId().equals(agent.getId()) && 
                    (o.getStatus() == OpportunityStatus.CLOSED_WON || o.getStatus() == OpportunityStatus.CLOSED_LOST)).count();
            double agentConversion = agentTotal > 0 ? ((double) agentClosed / agentTotal) * 100 : 0.0;
                        java.util.Map<String, Object> map = new java.util.HashMap<>();
              map.put("id", agent.getId());
              map.put("name", agent.getName() != null ? agent.getName() : "Unknown");
              map.put("email", agent.getEmail() != null ? agent.getEmail() : "N/A");
              map.put("phone", "");
              map.put("totalAssigned", agentTotal);
              map.put("closed", agentClosed);
              map.put("conversion", String.format("%.1f", agentConversion));
              return map;
        }).collect(Collectors.toList());

          java.util.Map<String, Object> responseMap = new java.util.HashMap<>();
          responseMap.put("totalOpps", totalOpps);
          responseMap.put("unassignedOpps", unassignedOpps);
          responseMap.put("closedOpps", closedOpps);
          responseMap.put("conversionRate", String.format("%.1f", conversionRate));
          responseMap.put("agentPerformance", agentPerformance);
          
          return ResponseEntity.ok(responseMap);
    }

    @GetMapping("/properties")
    public ResponseEntity<?> getRegionalProperties(
            @RequestParam(required = false) String status,
            @RequestParam(required = false) String type,
            @RequestParam(required = false) Double minPrice,
            @RequestParam(required = false) Double maxPrice,
            @RequestParam(required = false) String search,
            org.springframework.data.domain.Pageable pageable,
            org.springframework.security.core.Authentication authentication) {
        com.estatesync.security.CustomUserDetails userDetails = (com.estatesync.security.CustomUserDetails) authentication.getPrincipal();
        Long regionId = userDetails.getUser().getRegion() != null ? userDetails.getUser().getRegion().getId() : null;
        if (regionId == null) return ResponseEntity.badRequest().body("Manager has no assigned region");
        
        return ResponseEntity.ok(propertyService.getFilteredProperties(status, type, regionId, minPrice, maxPrice, search, pageable));
    }

    @PostMapping("/properties")
    public ResponseEntity<?> createRegionalProperty(@RequestBody Property property, org.springframework.security.core.Authentication authentication) {
        com.estatesync.security.CustomUserDetails userDetails = (com.estatesync.security.CustomUserDetails) authentication.getPrincipal();
        User manager = userRepository.findById(userDetails.getUser().getId()).orElseThrow();
        Region managerRegion = manager.getRegion();
        if (managerRegion == null) {
            return ResponseEntity.badRequest().body("Manager has no assigned region");
        }

        // Force the property to be in the manager's region
        property.setRegion(managerRegion);
        
        Property createdProperty = propertyService.createProperty(property);
        return ResponseEntity.ok(createdProperty);
    }

    @PutMapping("/properties/{id}")
    public ResponseEntity<?> updateRegionalProperty(@PathVariable Long id, @RequestBody Property propertyDetails, org.springframework.security.core.Authentication authentication) {
        com.estatesync.security.CustomUserDetails userDetails = (com.estatesync.security.CustomUserDetails) authentication.getPrincipal();
        Region managerRegion = userDetails.getUser().getRegion();
        if (managerRegion == null) {
            return ResponseEntity.badRequest().body("Manager has no assigned region");
        }

        Property existingProperty = propertyRepository.findById(id).orElse(null);
        if (existingProperty == null) {
            return ResponseEntity.notFound().build();
        }

        // Verify the property belongs to the manager's region
        if (existingProperty.getRegion() == null || !existingProperty.getRegion().getId().equals(managerRegion.getId())) {
            return ResponseEntity.status(403).body("Not authorized to edit properties outside your region");
        }

        // Force the region to remain the manager's region in case the client tried to change it
        propertyDetails.setRegion(existingProperty.getRegion());

        Property updatedProperty = propertyService.updateProperty(id, propertyDetails);
        return ResponseEntity.ok(updatedProperty);
    }

    @GetMapping("/agents/{agentId}/properties")
    public ResponseEntity<?> getAgentProperties(@PathVariable Long agentId, org.springframework.security.core.Authentication authentication) {
        User agent = userRepository.findById(agentId).orElseThrow(() -> new IllegalArgumentException("Agent not found"));
        return ResponseEntity.ok(agent.getAuthorizedProperties());
    }

    @PutMapping("/agents/{agentId}/properties")
    public ResponseEntity<?> updateAgentProperties(@PathVariable Long agentId, @RequestBody List<Long> propertyIds, org.springframework.security.core.Authentication authentication) {
        User agent = userRepository.findById(agentId).orElseThrow(() -> new IllegalArgumentException("Agent not found"));
        Set<Property> properties = new HashSet<>(propertyRepository.findAllById(propertyIds));
        agent.setAuthorizedProperties(properties);
        userRepository.save(agent);
        return ResponseEntity.ok().build();
    }

    @PostMapping("/assign-lead")
    public ResponseEntity<?> assignOpportunity(@RequestBody Map<String, Long> payload, org.springframework.security.core.Authentication authentication) {
        com.estatesync.security.CustomUserDetails userDetails = (com.estatesync.security.CustomUserDetails) authentication.getPrincipal();
        Long managerId = userDetails.getUser().getId();
        Long opportunityId = payload.get("opportunityId");
        Long agentId = payload.get("agentId");
        
        try {
            leadService.assignAgent(opportunityId, agentId, managerId);
            return ResponseEntity.ok().build();
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(e.getMessage());
        }
    }

    @org.springframework.beans.factory.annotation.Autowired
    private com.estatesync.service.EmailService emailService;

    @PutMapping("/opportunities/{id}/status/override")
    public ResponseEntity<?> overrideOpportunityStatus(@PathVariable Long id, @RequestBody java.util.Map<String, String> payload, org.springframework.security.core.Authentication authentication) {
        com.estatesync.security.CustomUserDetails userDetails = (com.estatesync.security.CustomUserDetails) authentication.getPrincipal();
        User manager = userDetails.getUser();
        com.estatesync.model.Opportunity opp = opportunityRepository.findById(id).orElse(null);
        if (opp == null) return ResponseEntity.badRequest().body("Opportunity not found");
        
        // Ensure manager has rights to this opportunity
        if (opp.getLead().getManager() == null || !opp.getLead().getManager().getId().equals(manager.getId())) {
            return ResponseEntity.badRequest().body("Not authorized to override this opportunity");
        }
        
        try {
            com.estatesync.model.OpportunityStatus newStatus = com.estatesync.model.OpportunityStatus.valueOf(payload.get("status"));
            String reason = payload.getOrDefault("reason", "No reason provided");

            if (newStatus == com.estatesync.model.OpportunityStatus.CLOSED_WON) {
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

            opportunityService.forceOverrideStatus(opp, newStatus, manager, reason);
            if (newStatus == com.estatesync.model.OpportunityStatus.CLOSED_WON || newStatus == com.estatesync.model.OpportunityStatus.CLOSED_LOST) {
                leadService.closeOpportunity(id, null);
            }
            return ResponseEntity.ok().build();
        } catch (Exception e) {
            return ResponseEntity.badRequest().body("Invalid request: " + e.getMessage());
        }
    }

    @GetMapping("/opportunity/{id}/history")
    public ResponseEntity<?> getOpportunityHistory(@PathVariable Long id, org.springframework.security.core.Authentication authentication) {
        return ResponseEntity.ok(activityService.getLogsForOpportunity(id));
    }

    @PostMapping("/opportunities")
    public ResponseEntity<?> createOpportunity(@RequestBody Map<String, String> payload, org.springframework.security.core.Authentication authentication) {
        Long leadId = Long.parseLong(payload.get("leadId"));
        Long propertyId = Long.parseLong(payload.get("propertyId"));
        String agentIdStr = payload.get("agentId");
        
        com.estatesync.model.Lead lead = leadRepository.findById(leadId).orElse(null);
        com.estatesync.model.Property property = propertyRepository.findById(propertyId).orElse(null);
        
        if (lead == null || property == null) {
            return ResponseEntity.badRequest().body("Lead or Property not found");
        }

        com.estatesync.model.Opportunity opp = new com.estatesync.model.Opportunity();
        opp.setLead(lead);
        opp.setProperty(property);
        opp.setStatus(com.estatesync.model.OpportunityStatus.NEW);
        
        if (agentIdStr != null && !agentIdStr.isEmpty()) {
            Long agentId = Long.parseLong(agentIdStr);
            User agent = userRepository.findById(agentId).orElse(null);
            opp.setAgent(agent);
        }

        opp = opportunityRepository.save(opp);
        
        com.estatesync.security.CustomUserDetails userDetails = (com.estatesync.security.CustomUserDetails) authentication.getPrincipal();
        activityService.logSystemEvent(opp, "Opportunity manually created by Manager " + userDetails.getUser().getName());
        
        return ResponseEntity.ok(opp);
    }

    @org.springframework.beans.factory.annotation.Autowired
    private com.estatesync.repository.VisitRepository visitRepository;

    @GetMapping("/visits")
    public ResponseEntity<?> getRegionalVisits(org.springframework.security.core.Authentication authentication) {
        com.estatesync.security.CustomUserDetails userDetails = (com.estatesync.security.CustomUserDetails) authentication.getPrincipal();
        Long managerId = userDetails.getUser().getId();
        return ResponseEntity.ok(visitRepository.findByOpportunityLeadManagerId(managerId));
    }

    @PostMapping("/opportunities/{id}/visits")
    public ResponseEntity<?> scheduleVisit(@PathVariable Long id, @RequestBody Map<String, String> payload, org.springframework.security.core.Authentication authentication) {
        com.estatesync.security.CustomUserDetails userDetails = (com.estatesync.security.CustomUserDetails) authentication.getPrincipal();
        User manager = userDetails.getUser();

        com.estatesync.model.Opportunity opp = opportunityRepository.findById(id).orElse(null);
        if (opp == null || opp.getLead().getManager() == null || !opp.getLead().getManager().getId().equals(manager.getId())) {
            return ResponseEntity.badRequest().body("Not authorized");
        }

        com.estatesync.model.Visit visit = new com.estatesync.model.Visit();
        visit.setOpportunity(opp);
        visit.setVisitDate(java.time.LocalDateTime.parse(payload.get("visitDate"))); // Expected ISO string
        visit.setStatus(com.estatesync.model.VisitStatus.SCHEDULED);
        visitRepository.save(visit);

        // Smart Update: Automatically update opportunity status
        if (opp.getStatus() == com.estatesync.model.OpportunityStatus.NEW) {
            opportunityService.advanceStatus(opp, com.estatesync.model.OpportunityStatus.CONTACTED, manager, "Auto-advanced to CONTACTED before scheduling visit.");
        }
        if (opp.getStatus() == com.estatesync.model.OpportunityStatus.CONTACTED) {
            opportunityService.advanceStatus(opp, com.estatesync.model.OpportunityStatus.VISIT_SCHEDULED, manager, "Auto-advanced to VISIT_SCHEDULED after scheduling visit.");
        }

        if ("true".equals(payload.get("sendEmail"))) {
            String customerName = opp.getLead() != null && opp.getLead().getCustomer() != null ? opp.getLead().getCustomer().getName() : "Customer";
            String email = opp.getLead() != null && opp.getLead().getCustomer() != null ? opp.getLead().getCustomer().getEmail() : null;
            String propertyName = opp.getProperty() != null ? opp.getProperty().getTitle() : "Property";
            String agentName = opp.getAgent() != null ? opp.getAgent().getName() : "Your Agent";
            java.time.format.DateTimeFormatter formatter = java.time.format.DateTimeFormatter.ofPattern("MMM dd, yyyy h:mm a");
            emailService.sendVisitScheduledEmail(email, customerName, propertyName, visit.getVisitDate().format(formatter), agentName);
        }

        return ResponseEntity.ok(visit);
    }

    @PostMapping("/opportunities/{id}/log")
    public ResponseEntity<?> logActivity(@PathVariable Long id, @RequestBody java.util.Map<String, String> payload, org.springframework.security.core.Authentication authentication) {
        com.estatesync.security.CustomUserDetails userDetails = (com.estatesync.security.CustomUserDetails) authentication.getPrincipal();
        User manager = userDetails.getUser();
        com.estatesync.model.Opportunity opp = opportunityRepository.findById(id).orElse(null);
        if (opp == null) return ResponseEntity.badRequest().body("Not found");
        
        // Ensure manager has rights to this opportunity
        if (opp.getLead().getManager() == null || !opp.getLead().getManager().getId().equals(manager.getId())) {
            return ResponseEntity.badRequest().body("Not authorized");
        }

        activityService.logActivity(opp, manager, com.estatesync.model.ActivityType.valueOf(payload.get("type")), payload.get("content"));

        return ResponseEntity.ok().build();
    }

    @Transactional
    @PutMapping("/visits/{id}")
    public ResponseEntity<?> updateVisit(@PathVariable Long id, @RequestBody java.util.Map<String, String> payload, org.springframework.security.core.Authentication authentication) {
        com.estatesync.security.CustomUserDetails userDetails = (com.estatesync.security.CustomUserDetails) authentication.getPrincipal();
        User manager = userDetails.getUser();

        return visitRepository.findById(id).map(visit -> {
            // Check if manager is authorized for this visit
            if (visit.getOpportunity().getLead().getManager() == null || !visit.getOpportunity().getLead().getManager().getId().equals(manager.getId())) {
                return ResponseEntity.status(403).build();
            }

            if (payload.containsKey("visitDate")) {
                visit.setVisitDate(java.time.LocalDateTime.parse(payload.get("visitDate")));
            }
            if (payload.containsKey("status")) {
                com.estatesync.model.VisitStatus newStatus = com.estatesync.model.VisitStatus.valueOf(payload.get("status"));
                visit.setStatus(newStatus);
                visitRepository.save(visit);

                com.estatesync.model.Opportunity opp = visit.getOpportunity();
                if (newStatus == com.estatesync.model.VisitStatus.COMPLETED && opp.getStatus() == com.estatesync.model.OpportunityStatus.VISIT_SCHEDULED) {
                     opportunityService.advanceStatus(opp, com.estatesync.model.OpportunityStatus.VISIT_COMPLETED, manager, "Auto-advanced to VISIT_COMPLETED after visit.");
                } else if (newStatus == com.estatesync.model.VisitStatus.CANCELLED && opp.getStatus() == com.estatesync.model.OpportunityStatus.VISIT_SCHEDULED) {
                     opportunityService.advanceStatus(opp, com.estatesync.model.OpportunityStatus.CONTACTED, manager, "Auto-reverted to CONTACTED after visit cancelled.");
                }

                activityService.logSystemEvent(visit.getOpportunity(), "Visit status updated to " + newStatus + " by Manager " + manager.getName());
            } else {
                visitRepository.save(visit);
            }
            return ResponseEntity.ok(visit);
        }).orElse(ResponseEntity.notFound().build());
    }

    @Transactional
    @PutMapping("/visits/{id}/status")
    public ResponseEntity<?> updateVisitStatus(@PathVariable Long id, @RequestBody java.util.Map<String, String> payload, org.springframework.security.core.Authentication authentication) {
        com.estatesync.security.CustomUserDetails userDetails = (com.estatesync.security.CustomUserDetails) authentication.getPrincipal();
        User manager = userDetails.getUser();

        return visitRepository.findById(id).map(visit -> {
            // Check if manager is authorized for this visit
            if (visit.getOpportunity().getLead().getManager() == null || !visit.getOpportunity().getLead().getManager().getId().equals(manager.getId())) {
                return ResponseEntity.status(403).build();
            }

            if (payload.containsKey("status")) {
                com.estatesync.model.VisitStatus newStatus = com.estatesync.model.VisitStatus.valueOf(payload.get("status"));
                visit.setStatus(newStatus);
                visitRepository.save(visit);

                com.estatesync.model.Opportunity opp = visit.getOpportunity();
                if (newStatus == com.estatesync.model.VisitStatus.COMPLETED && opp.getStatus() == com.estatesync.model.OpportunityStatus.VISIT_SCHEDULED) {
                     opportunityService.advanceStatus(opp, com.estatesync.model.OpportunityStatus.VISIT_COMPLETED, manager, "Auto-advanced to VISIT_COMPLETED after visit.");
                } else if (newStatus == com.estatesync.model.VisitStatus.CANCELLED && opp.getStatus() == com.estatesync.model.OpportunityStatus.VISIT_SCHEDULED) {
                     opportunityService.advanceStatus(opp, com.estatesync.model.OpportunityStatus.CONTACTED, manager, "Auto-reverted to CONTACTED after visit cancelled.");
                }

                activityService.logSystemEvent(visit.getOpportunity(), "Visit status updated to " + newStatus + " by Manager " + manager.getName());
            }
            return ResponseEntity.ok(visit);
        }).orElse(ResponseEntity.notFound().build());
    }
}
