package com.estatesync.repository;

import com.estatesync.model.NegotiationOffer;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface NegotiationOfferRepository extends JpaRepository<NegotiationOffer, Long> {
    List<NegotiationOffer> findByOpportunityIdOrderByCreatedAtDesc(Long opportunityId);
}
