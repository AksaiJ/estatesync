package com.estatesync.model;

import jakarta.persistence.*;
import lombok.Data;
import java.math.BigDecimal;
import java.time.LocalDateTime;

@Data
@Entity
@Table(name = "negotiation_offers")
public class NegotiationOffer {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "opportunity_id", nullable = false)
    private Opportunity opportunity;

    @Column(name = "client_offer_amount", nullable = false)
    private BigDecimal clientOfferAmount;

    @Column(name = "agent_counter_offer")
    private BigDecimal agentCounterOffer;

    @Column(columnDefinition = "TEXT")
    private String conditions;

    @Column(name = "validity_date", nullable = false)
    private LocalDateTime validityDate;

    @Column(name = "created_at", insertable = false, updatable = false)
    private LocalDateTime createdAt;
}
