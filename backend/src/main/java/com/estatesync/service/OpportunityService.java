package com.estatesync.service;

import com.estatesync.model.*;
import com.estatesync.repository.NegotiationOfferRepository;
import com.estatesync.repository.OpportunityRepository;
import com.estatesync.repository.PropertyRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Arrays;
import java.util.List;

@Service
public class OpportunityService {

    private final OpportunityRepository opportunityRepository;
    private final ActivityService activityService;
    private final NegotiationOfferRepository negotiationOfferRepository;
    private final PropertyRepository propertyRepository;

    public OpportunityService(OpportunityRepository opportunityRepository, ActivityService activityService, NegotiationOfferRepository negotiationOfferRepository, PropertyRepository propertyRepository) {
        this.opportunityRepository = opportunityRepository;
        this.activityService = activityService;
        this.negotiationOfferRepository = negotiationOfferRepository;
        this.propertyRepository = propertyRepository;
    }

    public List<Opportunity> getOpportunitiesByLead(Long leadId) {
        return opportunityRepository.findByLeadId(leadId);
    }

    public org.springframework.data.domain.Page<Opportunity> getFilteredOpportunities(
            com.estatesync.model.OpportunityStatus status, Long agentId, Long managerId, String search, org.springframework.data.domain.Pageable pageable) {
        org.springframework.data.jpa.domain.Specification<Opportunity> spec = org.springframework.data.jpa.domain.Specification.where(com.estatesync.specification.OpportunitySpecification.hasStatus(status))
                .and(com.estatesync.specification.OpportunitySpecification.hasAgent(agentId))
                .and(com.estatesync.specification.OpportunitySpecification.hasManager(managerId))
                .and(com.estatesync.specification.OpportunitySpecification.searchByCustomerName(search));
        return opportunityRepository.findAll(spec, pageable);
    }

    @Transactional
    public void advanceStatus(Opportunity opp, OpportunityStatus newStatus, User actor, String note) {
        OpportunityStatus currentStatus = opp.getStatus();
        
        if (!currentStatus.canTransitionTo(newStatus)) {
            throw new IllegalStateException("Invalid status transition from " + currentStatus + " to " + newStatus);
        }

        opp.setStatus(newStatus);
        opportunityRepository.save(opp);

        if (newStatus == OpportunityStatus.CLOSED_WON) {
            Property p = opp.getProperty();
            if (p != null) {
                p.setStatus("SOLD");
                propertyRepository.save(p);
            }
        }

        String message = "Status updated to " + newStatus + ". Note: " + note;
        activityService.logSystemEvent(opp, message);
    }

    @Transactional
    public void forceOverrideStatus(Opportunity opp, OpportunityStatus newStatus, User actor, String reason) {
        OpportunityStatus currentStatus = opp.getStatus();
        opp.setStatus(newStatus);
        opportunityRepository.save(opp);

        if (newStatus == OpportunityStatus.CLOSED_WON) {
            Property p = opp.getProperty();
            if (p != null) {
                p.setStatus("SOLD");
                propertyRepository.save(p);
            }
        }

        String message = "Status OVERRIDDEN by " + actor.getRole() + " from " + currentStatus + " to " + newStatus + ". Reason: " + reason;
        activityService.logSystemEvent(opp, message);
    }

    @Transactional
    public void reassignAgent(Opportunity opp, User newAgent, User actor) {
        User oldAgent = opp.getAgent();
        opp.setAgent(newAgent);
        opportunityRepository.save(opp);

        String oldAgentName = oldAgent != null ? oldAgent.getName() : "Unassigned";
        String newAgentName = newAgent != null ? newAgent.getName() : "Unassigned";
        
        String message = "Agent reassigned from " + oldAgentName + " to " + newAgentName + " by " + actor.getRole();
        activityService.logSystemEvent(opp, message);
    }

    @Transactional
    public NegotiationOffer addNegotiationOffer(Opportunity opp, NegotiationOffer offer, User actor) {
        offer.setOpportunity(opp);
        NegotiationOffer savedOffer = negotiationOfferRepository.save(offer);

        if (opp.getStatus() != OpportunityStatus.IN_NEGOTIATION) {
            advanceStatus(opp, OpportunityStatus.IN_NEGOTIATION, actor, "Auto-transitioned to IN_NEGOTIATION due to new offer.");
        }

        String message = "New Offer Logged: Client Offer " + offer.getClientOfferAmount() + 
            (offer.getAgentCounterOffer() != null ? ", Counter: " + offer.getAgentCounterOffer() : "") + 
            ", Valid till " + offer.getValidityDate();
        
        activityService.logSystemEvent(opp, message);
        return savedOffer;
    }
}
