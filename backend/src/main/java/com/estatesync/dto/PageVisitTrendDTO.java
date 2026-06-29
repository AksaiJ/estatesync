package com.estatesync.dto;

import lombok.AllArgsConstructor;
import lombok.Data;

@Data
@AllArgsConstructor
public class PageVisitTrendDTO {
    private String date;
    private Long totalVisits;
    private Long uniqueVisitors;
}
