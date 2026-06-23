package com.estatesync.controller;

import com.estatesync.model.Customer;
import com.estatesync.model.Property;
import com.estatesync.model.User;
import com.estatesync.service.CustomerService;
import com.estatesync.service.PropertyService;
import com.estatesync.service.UserService;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/admin")
@PreAuthorize("hasRole('ADMIN')")
public class AdminController {

    private final UserService userService;
    private final PropertyService propertyService;
    private final CustomerService customerService;
    private final com.estatesync.service.RegionService regionService;
    private final com.estatesync.service.LeadService leadService;
    private final com.estatesync.service.OpportunityService opportunityService;

    public AdminController(UserService userService, PropertyService propertyService, CustomerService customerService, com.estatesync.service.RegionService regionService, com.estatesync.service.LeadService leadService, com.estatesync.service.OpportunityService opportunityService) {
        this.userService = userService;
        this.propertyService = propertyService;
        this.customerService = customerService;
        this.regionService = regionService;
        this.leadService = leadService;
        this.opportunityService = opportunityService;
    }

    // --- Regions ---
    @GetMapping("/regions")
    public List<com.estatesync.model.Region> getAllRegions() {
        return regionService.getAllRegions();
    }

    @PostMapping("/regions")
    public com.estatesync.model.Region createRegion(@RequestBody com.estatesync.model.Region region) {
        return regionService.createRegion(region);
    }

    @PutMapping("/regions/{id}")
    public com.estatesync.model.Region updateRegion(@PathVariable Long id, @RequestBody com.estatesync.model.Region region) {
        return regionService.updateRegion(id, region);
    }

    @DeleteMapping("/regions/{id}")
    public ResponseEntity<?> deleteRegion(@PathVariable Long id) {
        regionService.deleteRegion(id);
        return ResponseEntity.ok().build();
    }

    // --- Users (Employees) ---
    @GetMapping("/users")
    public org.springframework.data.domain.Page<User> getAllUsers(
            @RequestParam(required = false) com.estatesync.model.Role role,
            @RequestParam(required = false) Long regionId,
            @RequestParam(required = false) Boolean isActive,
            @RequestParam(required = false) String search,
            org.springframework.data.domain.Pageable pageable) {
        return userService.getFilteredUsers(role, regionId, isActive, search, pageable);
    }

    @PostMapping("/users")
    public User createUser(@RequestBody User user) {
        return userService.createUser(user);
    }

    @PutMapping("/users/{id}")
    public User updateUser(@PathVariable Long id, @RequestBody User user) {
        return userService.updateUser(id, user);
    }

    @DeleteMapping("/users/{id}")
    public ResponseEntity<?> deactivateUser(@PathVariable Long id) {
        userService.deactivateAgent(id);
        return ResponseEntity.ok().build();
    }

    // --- Properties ---
    @GetMapping("/properties")
    public ResponseEntity<?> getAllProperties(
            @RequestParam(required = false) String status,
            @RequestParam(required = false) String type,
            @RequestParam(required = false) Long regionId,
            @RequestParam(required = false) Double minPrice,
            @RequestParam(required = false) Double maxPrice,
            @RequestParam(required = false) String search,
            org.springframework.data.domain.Pageable pageable) {
        return ResponseEntity.ok(propertyService.getFilteredProperties(status, type, regionId, minPrice, maxPrice, search, pageable));
    }

    @PostMapping("/properties")
    public Property createProperty(@RequestBody Property property) {
        return propertyService.createProperty(property);
    }

    @PutMapping("/properties/{id}")
    public Property updateProperty(@PathVariable Long id, @RequestBody Property property) {
        return propertyService.updateProperty(id, property);
    }

    @DeleteMapping("/properties/{id}")
    public ResponseEntity<?> deleteProperty(@PathVariable Long id) {
        propertyService.deleteProperty(id);
        return ResponseEntity.ok().build();
    }

    // --- Customers ---
    @GetMapping("/customers")
    public List<Customer> getAllCustomers() {
        return customerService.getAllCustomers();
    }

    @PostMapping("/customers")
    public Customer createCustomer(@RequestBody Customer customer) {
        return customerService.createCustomer(customer);
    }

    @PutMapping("/customers/{id}")
    public Customer updateCustomer(@PathVariable Long id, @RequestBody Customer customer) {
        return customerService.updateCustomer(id, customer);
    }

    @DeleteMapping("/customers/{id}")
    public ResponseEntity<?> deleteCustomer(@PathVariable Long id) {
        customerService.deleteCustomer(id);
        return ResponseEntity.ok().build();
    }

    // --- Leads ---
    @GetMapping("/leads")
    public org.springframework.data.domain.Page<com.estatesync.model.Lead> getAllLeads(
            @RequestParam(required = false) com.estatesync.model.LeadStatus status,
            @RequestParam(required = false) Long regionId,
            @RequestParam(required = false) Long managerId,
            @RequestParam(required = false) String search,
            org.springframework.data.domain.Pageable pageable) {
        return leadService.getFilteredLeads(status, regionId, managerId, search, pageable);
    }

    @PostMapping("/leads")
    public com.estatesync.model.Lead createLead(@RequestBody com.estatesync.dto.AdminLeadDTO lead) {
        return leadService.createAdminLead(lead);
    }

    @PutMapping("/leads/{id}")
    public com.estatesync.model.Lead updateLead(@PathVariable Long id, @RequestBody com.estatesync.dto.AdminLeadDTO lead) {
        return leadService.updateAdminLead(id, lead);
    }

    @DeleteMapping("/leads/{id}")
    public ResponseEntity<?> deleteLead(@PathVariable Long id) {
        leadService.deleteLead(id);
        return ResponseEntity.ok().build();
    }

    // --- Opportunities ---
    @GetMapping("/opportunities")
    public org.springframework.data.domain.Page<com.estatesync.model.Opportunity> getAllOpportunities(
            @RequestParam(required = false) com.estatesync.model.OpportunityStatus status,
            @RequestParam(required = false) Long agentId,
            @RequestParam(required = false) Long managerId,
            @RequestParam(required = false) String search,
            org.springframework.data.domain.Pageable pageable) {
        return opportunityService.getFilteredOpportunities(status, agentId, managerId, search, pageable);
    }

    @PutMapping("/opportunities/{id}/agent")
    public ResponseEntity<?> reassignAgent(@PathVariable Long id, @RequestBody java.util.Map<String, Long> payload, org.springframework.security.core.Authentication authentication) {
        com.estatesync.security.CustomUserDetails userDetails = (com.estatesync.security.CustomUserDetails) authentication.getPrincipal();
        User admin = userDetails.getUser();
        com.estatesync.model.Opportunity opp = opportunityRepository.findById(id).orElse(null);
        if (opp == null) return ResponseEntity.badRequest().body("Opportunity not found");

        Long newAgentId = payload.get("agentId");
        User newAgent = null;
        if (newAgentId != null) {
            newAgent = userRepository.findById(newAgentId).orElse(null);
            if (newAgent == null) return ResponseEntity.badRequest().body("Agent not found");
        }

        opportunityService.reassignAgent(opp, newAgent, admin);
        return ResponseEntity.ok().build();
    }

    @org.springframework.beans.factory.annotation.Autowired
    private com.estatesync.service.EmailService emailService;

    @PutMapping("/opportunities/{id}/status/override")
    public ResponseEntity<?> overrideOpportunityStatus(@PathVariable Long id, @RequestBody java.util.Map<String, String> payload, org.springframework.security.core.Authentication authentication) {
        com.estatesync.security.CustomUserDetails userDetails = (com.estatesync.security.CustomUserDetails) authentication.getPrincipal();
        User admin = userDetails.getUser();
        com.estatesync.model.Opportunity opp = opportunityRepository.findById(id).orElse(null);
        if (opp == null) return ResponseEntity.badRequest().body("Opportunity not found");
        
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

            opportunityService.forceOverrideStatus(opp, newStatus, admin, reason);
            if (newStatus == com.estatesync.model.OpportunityStatus.CLOSED_WON || newStatus == com.estatesync.model.OpportunityStatus.CLOSED_LOST) {
                leadService.closeOpportunity(id, null);
            }
            return ResponseEntity.ok().build();
        } catch (Exception e) {
            return ResponseEntity.badRequest().body("Invalid request: " + e.getMessage());
        }
    }

    // --- Password Resets ---
    @PostMapping("/users/{id}/reset-password")
    public ResponseEntity<?> resetUserPassword(@PathVariable Long id) {
        userService.generateAndEmailPassword(id);
        return ResponseEntity.ok(java.util.Map.of("message", "Password generated and emailed successfully."));
    }

    @PostMapping("/customers/{id}/reset-password")
    public ResponseEntity<?> resetCustomerPassword(@PathVariable Long id) {
        customerService.generateAndEmailPassword(id);
        return ResponseEntity.ok(java.util.Map.of("message", "Password generated and emailed successfully."));
    }

    @org.springframework.beans.factory.annotation.Autowired
    private com.estatesync.repository.PropertyRepository propertyRepository;
    
    @org.springframework.beans.factory.annotation.Autowired
    private com.estatesync.repository.LeadRepository leadRepository;
    
    @org.springframework.beans.factory.annotation.Autowired
    private com.estatesync.repository.CustomerRepository customerRepository;
    
    @org.springframework.beans.factory.annotation.Autowired
    private com.estatesync.repository.UserRepository userRepository;

    @org.springframework.beans.factory.annotation.Autowired
    private com.estatesync.repository.OpportunityRepository opportunityRepository;

    @GetMapping("/analytics")
    public ResponseEntity<com.estatesync.dto.AnalyticsResponse> getAnalytics() {
        
        long totalProperties = propertyRepository.count();
        long totalLeads = leadRepository.count(); // Could be total opportunities instead, but total leads = total customers expressing interest
        long totalCustomers = customerRepository.count();
        long totalEmployees = userRepository.count();

        List<Object[]> leadsByStatusRaw = opportunityRepository.countOpportunitiesByStatus();
        List<java.util.Map<String, Object>> leadsByStatus = new java.util.ArrayList<>();
        for (Object[] row : leadsByStatusRaw) {
            leadsByStatus.add(java.util.Map.of("name", row[0].toString(), "value", row[1]));
        }

        List<Object[]> leadsByRegionRaw = leadRepository.countLeadsByRegion();
        List<java.util.Map<String, Object>> leadsByRegion = new java.util.ArrayList<>();
        for (Object[] row : leadsByRegionRaw) {
            leadsByRegion.add(java.util.Map.of("name", row[0].toString(), "value", row[1]));
        }

        com.estatesync.dto.AnalyticsResponse response = new com.estatesync.dto.AnalyticsResponse(
            totalProperties, totalLeads, totalCustomers, totalEmployees,
            leadsByStatus, leadsByRegion
        );
        return ResponseEntity.ok(response);
    }

    @org.springframework.beans.factory.annotation.Autowired
    private com.estatesync.repository.VisitRepository visitRepository;

    @GetMapping("/visits")
    public ResponseEntity<?> getAllVisits() {
        return ResponseEntity.ok(visitRepository.findAll());
    }

    @PutMapping("/visits/{id}")
    public ResponseEntity<?> updateVisit(@PathVariable Long id, @RequestBody java.util.Map<String, String> payload, org.springframework.security.core.Authentication authentication) {
        com.estatesync.security.CustomUserDetails userDetails = (com.estatesync.security.CustomUserDetails) authentication.getPrincipal();
        User admin = userDetails.getUser();

        return visitRepository.findById(id).map(visit -> {
            if (payload.containsKey("visitDate")) {
                visit.setVisitDate(java.time.LocalDateTime.parse(payload.get("visitDate")));
            }
            if (payload.containsKey("status")) {
                com.estatesync.model.VisitStatus newStatus = com.estatesync.model.VisitStatus.valueOf(payload.get("status"));
                visit.setStatus(newStatus);
                visitRepository.save(visit);

                com.estatesync.model.Opportunity opp = visit.getOpportunity();
                if (newStatus == com.estatesync.model.VisitStatus.COMPLETED && opp.getStatus() == com.estatesync.model.OpportunityStatus.VISIT_SCHEDULED) {
                     opportunityService.advanceStatus(opp, com.estatesync.model.OpportunityStatus.VISIT_COMPLETED, admin, "Auto-advanced to VISIT_COMPLETED after visit.");
                } else if (newStatus == com.estatesync.model.VisitStatus.CANCELLED && opp.getStatus() == com.estatesync.model.OpportunityStatus.VISIT_SCHEDULED) {
                     opportunityService.advanceStatus(opp, com.estatesync.model.OpportunityStatus.CONTACTED, admin, "Auto-reverted to CONTACTED after visit cancelled.");
                }

                activityService.logSystemEvent(visit.getOpportunity(), "Visit status updated to " + newStatus + " by Admin " + admin.getName());
            } else {
                visitRepository.save(visit);
            }
            return ResponseEntity.ok(visit);
        }).orElse(ResponseEntity.notFound().build());
    }

    @PutMapping("/visits/{id}/status")
    public ResponseEntity<?> updateVisitStatus(@PathVariable Long id, @RequestBody java.util.Map<String, String> payload, org.springframework.security.core.Authentication authentication) {
        com.estatesync.security.CustomUserDetails userDetails = (com.estatesync.security.CustomUserDetails) authentication.getPrincipal();
        User admin = userDetails.getUser();

        return visitRepository.findById(id).map(visit -> {
            if (payload.containsKey("status")) {
                com.estatesync.model.VisitStatus newStatus = com.estatesync.model.VisitStatus.valueOf(payload.get("status"));
                visit.setStatus(newStatus);
                visitRepository.save(visit);

                com.estatesync.model.Opportunity opp = visit.getOpportunity();
                if (newStatus == com.estatesync.model.VisitStatus.COMPLETED && opp.getStatus() == com.estatesync.model.OpportunityStatus.VISIT_SCHEDULED) {
                     opportunityService.advanceStatus(opp, com.estatesync.model.OpportunityStatus.VISIT_COMPLETED, admin, "Auto-advanced to VISIT_COMPLETED after visit.");
                } else if (newStatus == com.estatesync.model.VisitStatus.CANCELLED && opp.getStatus() == com.estatesync.model.OpportunityStatus.VISIT_SCHEDULED) {
                     opportunityService.advanceStatus(opp, com.estatesync.model.OpportunityStatus.CONTACTED, admin, "Auto-reverted to CONTACTED after visit cancelled.");
                }

                activityService.logSystemEvent(visit.getOpportunity(), "Visit status updated to " + newStatus + " by Admin " + admin.getName());
            }
            return ResponseEntity.ok(visit);
        }).orElse(ResponseEntity.notFound().build());
    }

    @PostMapping("/opportunities/{id}/visits")
    public ResponseEntity<?> scheduleVisit(@PathVariable Long id, @RequestBody java.util.Map<String, String> payload, org.springframework.security.core.Authentication authentication) {
        com.estatesync.security.CustomUserDetails userDetails = (com.estatesync.security.CustomUserDetails) authentication.getPrincipal();
        User admin = userDetails.getUser();

        com.estatesync.model.Opportunity opp = opportunityRepository.findById(id).orElse(null);
        if (opp == null) {
            return ResponseEntity.badRequest().body("Opportunity not found");
        }

        com.estatesync.model.Visit visit = new com.estatesync.model.Visit();
        visit.setOpportunity(opp);
        visit.setVisitDate(java.time.LocalDateTime.parse(payload.get("visitDate"))); // Expected ISO string
        visit.setStatus(com.estatesync.model.VisitStatus.SCHEDULED);
        visitRepository.save(visit);

        // Smart Update: Automatically update opportunity status
        if (opp.getStatus() == com.estatesync.model.OpportunityStatus.NEW) {
            opportunityService.advanceStatus(opp, com.estatesync.model.OpportunityStatus.CONTACTED, admin, "Auto-advanced to CONTACTED before scheduling visit.");
        }
        if (opp.getStatus() == com.estatesync.model.OpportunityStatus.CONTACTED) {
            opportunityService.advanceStatus(opp, com.estatesync.model.OpportunityStatus.VISIT_SCHEDULED, admin, "Auto-advanced to VISIT_SCHEDULED after scheduling visit.");
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

    @org.springframework.beans.factory.annotation.Autowired
    private com.estatesync.service.ActivityService activityService;

    @GetMapping("/opportunities/{id}/history")
    public ResponseEntity<?> getOpportunityHistory(@PathVariable Long id) {
        return ResponseEntity.ok(activityService.getLogsForOpportunity(id));
    }

    @PostMapping("/opportunities/{id}/log")
    public ResponseEntity<?> logActivity(@PathVariable Long id, @RequestBody java.util.Map<String, String> payload, org.springframework.security.core.Authentication authentication) {
        com.estatesync.security.CustomUserDetails userDetails = (com.estatesync.security.CustomUserDetails) authentication.getPrincipal();
        User admin = userDetails.getUser();
        com.estatesync.model.Opportunity opp = opportunityRepository.findById(id).orElse(null);
        if (opp == null) return ResponseEntity.badRequest().body("Not found");

        com.estatesync.model.ActivityLog log = new com.estatesync.model.ActivityLog();
        log.setOpportunity(opp);
        log.setActor(admin);
        log.setType(com.estatesync.model.ActivityType.valueOf(payload.get("type")));
        log.setContent(payload.get("content"));
        log.setCreatedAt(java.time.LocalDateTime.now());
        activityService.save(log);

        return ResponseEntity.ok(log);
    }

    @GetMapping("/reports/data")
    public ResponseEntity<?> getReportsData(@RequestParam String type, @RequestParam(required = false) String dateRange) {
        if ("LEAD_ACTIVITY".equals(type)) {
            return ResponseEntity.ok(opportunityRepository.findAll());
        } else if ("AGENT_PERFORMANCE".equals(type)) {
            return ResponseEntity.ok(userRepository.findAll().stream()
                .filter(u -> "AGENT".equals(u.getRole()))
                .collect(java.util.stream.Collectors.toList()));
        } else if ("PROPERTY_STATUS".equals(type)) {
            return ResponseEntity.ok(propertyRepository.findAll());
        } else if ("VISIT_SCHEDULES".equals(type)) {
            return ResponseEntity.ok(visitRepository.findAll());
        }
        return ResponseEntity.badRequest().body(java.util.Collections.singletonMap("error", "Invalid report type"));
    }

    @GetMapping("/search")
    public ResponseEntity<?> globalSearch(@RequestParam String query) {
        String lowerQuery = query.toLowerCase();
        
        java.util.List<Customer> customers = customerRepository.findAll().stream()
            .filter(c -> (c.getName() != null && c.getName().toLowerCase().contains(lowerQuery)) || 
                         (c.getEmail() != null && c.getEmail().toLowerCase().contains(lowerQuery)) || 
                         (c.getPhone() != null && c.getPhone().toLowerCase().contains(lowerQuery)))
            .collect(java.util.stream.Collectors.toList());
            
        java.util.List<Property> properties = propertyRepository.findAll().stream()
            .filter(p -> (p.getTitle() != null && p.getTitle().toLowerCase().contains(lowerQuery)) || 
                         (p.getDescription() != null && p.getDescription().toLowerCase().contains(lowerQuery)))
            .collect(java.util.stream.Collectors.toList());
            
        java.util.List<User> employees = userRepository.findAll().stream()
            .filter(u -> (u.getName() != null && u.getName().toLowerCase().contains(lowerQuery)) || 
                         (u.getEmail() != null && u.getEmail().toLowerCase().contains(lowerQuery)))
            .collect(java.util.stream.Collectors.toList());

        java.util.Map<String, Object> results = new java.util.HashMap<>();
        results.put("customers", customers);
        results.put("properties", properties);
        results.put("employees", employees);
        
        return ResponseEntity.ok(results);
    }
}
