package com.estatesync.service;

import com.estatesync.model.*;
import com.estatesync.repository.*;
import com.estatesync.dto.InterestRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Optional;
import java.util.stream.Collectors;

@Service
public class LeadService {

    private final LeadRepository leadRepository;
    private final OpportunityRepository opportunityRepository;
    private final CustomerRepository customerRepository;
    private final PropertyRepository propertyRepository;
    private final UserRepository userRepository;
    private final ActivityService activityService;
    private final OpportunityService opportunityService;

    public LeadService(LeadRepository leadRepository, OpportunityRepository opportunityRepository,
                       CustomerRepository customerRepository, PropertyRepository propertyRepository,
                       UserRepository userRepository, ActivityService activityService,
                       OpportunityService opportunityService) {
        this.leadRepository = leadRepository;
        this.opportunityRepository = opportunityRepository;
        this.customerRepository = customerRepository;
        this.propertyRepository = propertyRepository;
        this.userRepository = userRepository;
        this.activityService = activityService;
        this.opportunityService = opportunityService;
    }

    @Transactional
    public boolean processInterest(InterestRequest request) {
        boolean[] nameIgnored = {false};
        
        Customer customer = customerRepository.findByPhone(request.getPhone())
                .map(existing -> {
                    if (request.getName() != null && !request.getName().trim().equalsIgnoreCase(existing.getName().trim())) {
                        nameIgnored[0] = true;
                    }
                    return existing;
                })
                .orElseGet(() -> {
                    Customer newCustomer = new Customer();
                    newCustomer.setName(request.getName());
                    newCustomer.setEmail(request.getEmail());
                    newCustomer.setPhone(request.getPhone());
                    newCustomer.setIsEmailVerified(true);
                    newCustomer.setPreferredLocation(request.getPreferredLocation());
                    newCustomer.setPropertyType(request.getPropertyType());
                    return customerRepository.save(newCustomer);
                });

        List<Property> properties = propertyRepository.findAllById(request.getPropertyIds());
        
        // Group properties by Region
        java.util.Map<Region, List<Property>> propertiesByRegion = properties.stream()
            .filter(p -> p.getRegion() != null)
            .collect(Collectors.groupingBy(Property::getRegion));

        for (java.util.Map.Entry<Region, List<Property>> entry : propertiesByRegion.entrySet()) {
            Region region = entry.getKey();
            List<Property> regionProperties = entry.getValue();

            // Find existing active parent lead
            List<Lead> existingLeads = leadRepository.findByCustomerIdAndRegionIdAndStatusNot(customer.getId(), region.getId(), LeadStatus.CLOSED);
            
            Lead targetLead;
            if (!existingLeads.isEmpty()) {
                targetLead = existingLeads.get(0);
            } else {
                targetLead = new Lead();
                targetLead.setCustomer(customer);
                targetLead.setStatus(LeadStatus.OPEN);
                targetLead.setRegion(region);
                userRepository.findFirstByRoleAndRegionIdAndIsActiveTrueOrderByIdAsc(Role.MANAGER, region.getId())
                    .ifPresent(targetLead::setManager);
                targetLead = leadRepository.save(targetLead);
            }

            // Create opportunities for each property
            for (Property property : regionProperties) {
                Opportunity opp = new Opportunity();
                opp.setLead(targetLead);
                opp.setProperty(property);
                opp.setStatus(OpportunityStatus.NEW);
                opp = opportunityRepository.save(opp);

                activityService.logSystemEvent(opp, "Opportunity generated from customer web inquiry.");
            }
        }
        
        return nameIgnored[0];
    }

    @Transactional
    public void assignAgent(Long opportunityId, Long newAgentId, Long managerId) {
        Opportunity opp = opportunityRepository.findById(opportunityId)
                .orElseThrow(() -> new IllegalArgumentException("Opportunity not found"));
        
        User newAgent = userRepository.findById(newAgentId)
                .orElseThrow(() -> new IllegalArgumentException("Agent not found"));
        User manager = userRepository.findById(managerId)
                .orElseThrow(() -> new IllegalArgumentException("Manager not found"));

        // Validate constraint: Is agent linked to this property?
        if (!newAgent.getAuthorizedProperties().contains(opp.getProperty())) {
            throw new IllegalStateException("Agent is not authorized to sell this property.");
        }

        opportunityService.reassignAgent(opp, newAgent, manager);
    }
    
    @Transactional
    public void closeOpportunity(Long opportunityId, Long managerId) {
        Opportunity opp = opportunityRepository.findById(opportunityId)
                .orElseThrow(() -> new IllegalArgumentException("Opportunity not found"));
        
        // Use CLOSED_WON as default if closed without reason? No, wait. We should use OpportunityService forceOverride or let the controller handle it.
        // Actually, if we close it here, we should just assume CLOSED_LOST if no status is specified
        if (opp.getStatus() != OpportunityStatus.CLOSED_WON && opp.getStatus() != OpportunityStatus.CLOSED_LOST) {
            User manager = managerId != null ? userRepository.findById(managerId).orElse(null) : null;
            opportunityService.forceOverrideStatus(opp, OpportunityStatus.CLOSED_LOST, manager != null ? manager : new User() {{ setRole(Role.SYSTEM); setName("System"); }}, "Opportunity closed automatically.");
        }
        
        checkAndCloseParentLead(opp.getLead());
    }

    private void checkAndCloseParentLead(Lead lead) {
        List<Opportunity> opps = opportunityRepository.findByLeadId(lead.getId());
        boolean allClosed = opps.stream().allMatch(o -> o.getStatus() == OpportunityStatus.CLOSED_WON || o.getStatus() == OpportunityStatus.CLOSED_LOST);
        if (allClosed) {
            lead.setStatus(LeadStatus.CLOSED);
            leadRepository.save(lead);
        }
    }

    public List<Lead> getAllLeads() {
        return leadRepository.findAll();
    }

    public org.springframework.data.domain.Page<Lead> getFilteredLeads(
            com.estatesync.model.LeadStatus status, Long regionId, Long managerId, String search, org.springframework.data.domain.Pageable pageable) {
        org.springframework.data.jpa.domain.Specification<Lead> spec = org.springframework.data.jpa.domain.Specification.where(com.estatesync.specification.LeadSpecification.hasStatus(status))
                .and(com.estatesync.specification.LeadSpecification.hasRegion(regionId))
                .and(com.estatesync.specification.LeadSpecification.hasManager(managerId))
                .and(com.estatesync.specification.LeadSpecification.searchByCustomerNameOrPhone(search));
        return leadRepository.findAll(spec, pageable);
    }

    @Transactional
    public Lead createAdminLead(com.estatesync.dto.AdminLeadDTO dto) {
        Customer customer = customerRepository.findByPhone(dto.getCustomer().getPhone())
                .orElseGet(() -> {
                    Customer newCust = new Customer();
                    newCust.setName(dto.getCustomer().getName());
                    newCust.setEmail(dto.getCustomer().getEmail());
                    newCust.setPhone(dto.getCustomer().getPhone());
                    newCust.setIsEmailVerified(true);
                    return customerRepository.save(newCust);
                });

        Lead lead = new Lead();
        lead.setCustomer(customer);
        lead.setStatus(LeadStatus.OPEN);
        
        if (dto.getRegion() != null && dto.getRegion().getId() != null) {
            Region r = new Region();
            r.setId(dto.getRegion().getId());
            lead.setRegion(r);
        }
        if (dto.getManager() != null && dto.getManager().getId() != null) {
            User manager = userRepository.findById(dto.getManager().getId()).orElse(null);
            lead.setManager(manager);
        }
        lead = leadRepository.save(lead);

        if (dto.getInterestedProperties() != null) {
            User agent = null;
            if (dto.getAgent() != null && dto.getAgent().getId() != null) {
                agent = userRepository.findById(dto.getAgent().getId()).orElse(null);
            }
            
            for (com.estatesync.dto.AdminLeadDTO.ReferenceDTO propRef : dto.getInterestedProperties()) {
                Property prop = propertyRepository.findById(propRef.getId()).orElse(null);
                if (prop != null) {
                    Opportunity opp = new Opportunity();
                    opp.setLead(lead);
                    opp.setProperty(prop);
                    
                    // Frontend sends 'NEW' but if an agent is selected we might set it to something else, or keep it what frontend sent
                    try {
                        opp.setStatus(OpportunityStatus.valueOf(dto.getStatus()));
                    } catch (Exception e) {
                        opp.setStatus(OpportunityStatus.NEW);
                    }
                    
                    opp.setAgent(agent);
                    opp = opportunityRepository.save(opp);
                    activityService.logSystemEvent(opp, "Opportunity manually created by Admin.");
                }
            }
        }
        return lead;
    }

    @Transactional
    public Lead updateAdminLead(Long id, com.estatesync.dto.AdminLeadDTO dto) {
        Lead lead = leadRepository.findById(id).orElseThrow();
        
        Customer customer = lead.getCustomer();
        customer.setName(dto.getCustomer().getName());
        customer.setEmail(dto.getCustomer().getEmail());
        customer.setPhone(dto.getCustomer().getPhone());
        customerRepository.save(customer);

        if (dto.getRegion() != null && dto.getRegion().getId() != null) {
            Region r = new Region();
            r.setId(dto.getRegion().getId());
            lead.setRegion(r);
        }
        if (dto.getManager() != null && dto.getManager().getId() != null) {
            User manager = userRepository.findById(dto.getManager().getId()).orElse(null);
            User oldManager = lead.getManager();
            if (manager != null && (oldManager == null || !oldManager.getId().equals(manager.getId()))) {
                lead.setManager(manager);
                String oldManagerName = oldManager != null ? oldManager.getName() : "Unassigned";
                // Log to all opportunities
                List<Opportunity> existingOpps = opportunityRepository.findByLeadId(lead.getId());
                for (Opportunity opp : existingOpps) {
                    activityService.logSystemEvent(opp, "Manager changed from " + oldManagerName + " to " + manager.getName() + " by Admin");
                }
            }
        }
        
        if ("CLOSED".equals(dto.getStatus())) {
            lead.setStatus(LeadStatus.CLOSED);
        } else {
            lead.setStatus(LeadStatus.OPEN);
        }
        
        lead = leadRepository.save(lead);

        // Update opportunities - simpler version: just keep existing, maybe add new ones if any.
        // For admin edits, we'll sync the opportunities.
        if (dto.getInterestedProperties() != null) {
            User agent = null;
            if (dto.getAgent() != null && dto.getAgent().getId() != null) {
                agent = userRepository.findById(dto.getAgent().getId()).orElse(null);
            }

            List<Opportunity> existingOpps = opportunityRepository.findByLeadId(lead.getId());
            List<Long> incomingPropIds = dto.getInterestedProperties().stream().map(com.estatesync.dto.AdminLeadDTO.ReferenceDTO::getId).collect(Collectors.toList());

            // Remove opportunities not in incoming
            for (Opportunity opp : existingOpps) {
                if (!incomingPropIds.contains(opp.getProperty().getId())) {
                    opportunityRepository.delete(opp);
                } else {
                    // Update agent if changed globally
                    if (agent != null && (opp.getAgent() == null || !opp.getAgent().getId().equals(agent.getId()))) {
                        User adminUser = new User();
                        adminUser.setRole(Role.ADMIN);
                        adminUser.setName("Admin");
                        opportunityService.reassignAgent(opp, agent, adminUser);
                    }
                }
            }

            // Add new opportunities
            List<Long> existingPropIds = existingOpps.stream().map(o -> o.getProperty().getId()).collect(Collectors.toList());
            for (Long incomingPropId : incomingPropIds) {
                if (!existingPropIds.contains(incomingPropId)) {
                    Property prop = propertyRepository.findById(incomingPropId).orElse(null);
                    if (prop != null) {
                        Opportunity opp = new Opportunity();
                        opp.setLead(lead);
                        opp.setProperty(prop);
                        opp.setStatus(OpportunityStatus.NEW);
                        opp.setAgent(agent);
                        opportunityRepository.save(opp);
                    }
                }
            }
        }

        return lead;
    }

    @Transactional
    public Lead updateLeadStatus(Long id, LeadStatus status) {
        Lead existing = leadRepository.findById(id).orElseThrow();
        existing.setStatus(status);
        if (status == LeadStatus.CLOSED) {
            // Cascade close all active opportunities
            List<Opportunity> opps = opportunityRepository.findByLeadId(id);
            for (Opportunity opp : opps) {
                if (opp.getStatus() != OpportunityStatus.CLOSED) {
                    opp.setStatus(OpportunityStatus.CLOSED);
                    opportunityRepository.save(opp);
                    activityService.logSystemEvent(opp, "Opportunity auto-closed because parent lead was closed.");
                }
            }
        }
        return leadRepository.save(existing);
    }

    @Transactional
    public void deleteLead(Long id) {
        leadRepository.deleteById(id);
    }
}
