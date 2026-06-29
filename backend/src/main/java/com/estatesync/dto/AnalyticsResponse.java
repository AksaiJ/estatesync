package com.estatesync.dto;

import lombok.Data;
import lombok.AllArgsConstructor;
import lombok.NoArgsConstructor;
import java.util.Map;
import java.util.List;

@Data
@AllArgsConstructor
@NoArgsConstructor
public class AnalyticsResponse {
    // KPIs
    private long totalProperties;
    private long totalLeads;
    private long totalCustomers;
    private long totalEmployees;

    // Charts
    private List<Map<String, Object>> leadsByStatus;
    private List<Map<String, Object>> leadsByRegion;
    private List<Map<String, Object>> leadsBySource;
    private List<Map<String, Object>> customersOverTime;
    private List<Map<String, Object>> revenueOverTime;
    private List<Map<String, Object>> visitsOverTime;
}
