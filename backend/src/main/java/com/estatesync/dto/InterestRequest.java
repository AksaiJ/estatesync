package com.estatesync.dto;

import lombok.Data;
import java.util.List;

@Data
public class InterestRequest {
    private String name;
    private String email;
    private String phone;
    private String preferredLocation;
    private String propertyType;
    private List<Long> propertyIds;
    private String referredFrom;
}
