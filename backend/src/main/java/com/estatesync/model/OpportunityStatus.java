package com.estatesync.model;

public enum OpportunityStatus {
    NEW,
    CONTACTED,
    VISIT_SCHEDULED,
    VISIT_COMPLETED,
    PROPOSAL_SENT,
    IN_NEGOTIATION,
    CLOSED_WON,
    CLOSED_LOST,
    UNRESPONSIVE;

    public boolean canTransitionTo(OpportunityStatus nextState) {
        // Terminal states cannot transition out
        if (this == CLOSED_WON || this == CLOSED_LOST) {
            return false;
        }
        
        // Global Fallback
        if (nextState == UNRESPONSIVE || nextState == CLOSED_LOST) {
            return true;
        }

        switch (this) {
            case NEW:
                return nextState == CONTACTED;
            case CONTACTED:
                return nextState == VISIT_SCHEDULED || nextState == PROPOSAL_SENT;
            case VISIT_SCHEDULED:
                return nextState == VISIT_COMPLETED || nextState == CONTACTED;
            case VISIT_COMPLETED:
                return nextState == PROPOSAL_SENT;
            case PROPOSAL_SENT:
                return nextState == IN_NEGOTIATION;
            case IN_NEGOTIATION:
                return nextState == CLOSED_WON;
            case UNRESPONSIVE:
                return nextState == CONTACTED; // Re-engaging
            default:
                return false;
        }
    }
}
