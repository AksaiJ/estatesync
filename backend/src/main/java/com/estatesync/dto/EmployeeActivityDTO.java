package com.estatesync.dto;

import lombok.AllArgsConstructor;
import lombok.Data;

@Data
@AllArgsConstructor
public class EmployeeActivityDTO {
    private Long id;
    private String name;
    private String role;
    private Long totalActiveSeconds;
}
