package com.estatesync.dto;

import lombok.Data;
import java.util.List;

@Data
public class AdminLeadDTO {
    private String status; // Usually OPEN or CLOSED for Lead, or NEW for Opportunity
    private CustomerDTO customer;
    private ReferenceDTO region;
    private ReferenceDTO agent;
    private ReferenceDTO manager;
    private List<ReferenceDTO> interestedProperties;

    @Data
    public static class CustomerDTO {
        private String name;
        private String email;
        private String phone;
    }

    @Data
    public static class ReferenceDTO {
        private Long id;
    }
}
