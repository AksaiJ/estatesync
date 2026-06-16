package com.estatesync.controller;

import com.estatesync.model.Customer;
import com.estatesync.model.Property;
import com.estatesync.model.User;
import com.estatesync.service.CustomerService;
import com.estatesync.service.PropertyService;
import com.estatesync.service.UserService;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/admin")
@PreAuthorize("hasRole('ADMIN')")
public class AdminController {

    private final UserService userService;
    private final PropertyService propertyService;
    private final CustomerService customerService;
    private final com.estatesync.service.RegionService regionService;
    private final com.estatesync.service.LeadService leadService;

    public AdminController(UserService userService, PropertyService propertyService, CustomerService customerService, com.estatesync.service.RegionService regionService, com.estatesync.service.LeadService leadService) {
        this.userService = userService;
        this.propertyService = propertyService;
        this.customerService = customerService;
        this.regionService = regionService;
        this.leadService = leadService;
    }

    // --- Regions ---
    @GetMapping("/regions")
    public List<com.estatesync.model.Region> getAllRegions() {
        return regionService.getAllRegions();
    }

    @PostMapping("/regions")
    public com.estatesync.model.Region createRegion(@RequestBody com.estatesync.model.Region region) {
        return regionService.createRegion(region);
    }

    @PutMapping("/regions/{id}")
    public com.estatesync.model.Region updateRegion(@PathVariable Long id, @RequestBody com.estatesync.model.Region region) {
        return regionService.updateRegion(id, region);
    }

    @DeleteMapping("/regions/{id}")
    public ResponseEntity<?> deleteRegion(@PathVariable Long id) {
        regionService.deleteRegion(id);
        return ResponseEntity.ok().build();
    }

    // --- Users (Employees) ---
    @GetMapping("/users")
    public List<User> getAllUsers() {
        return userService.getAllUsers();
    }

    @PostMapping("/users")
    public User createUser(@RequestBody User user) {
        return userService.createUser(user);
    }

    @PutMapping("/users/{id}")
    public User updateUser(@PathVariable Long id, @RequestBody User user) {
        return userService.updateUser(id, user);
    }

    @DeleteMapping("/users/{id}")
    public ResponseEntity<?> deactivateUser(@PathVariable Long id) {
        userService.deactivateAgent(id);
        return ResponseEntity.ok().build();
    }

    // --- Properties ---
    @GetMapping("/properties")
    public List<Property> getAllProperties() {
        return propertyService.getAllProperties();
    }

    @PostMapping("/properties")
    public Property createProperty(@RequestBody Property property) {
        return propertyService.createProperty(property);
    }

    @PutMapping("/properties/{id}")
    public Property updateProperty(@PathVariable Long id, @RequestBody Property property) {
        return propertyService.updateProperty(id, property);
    }

    @DeleteMapping("/properties/{id}")
    public ResponseEntity<?> deleteProperty(@PathVariable Long id) {
        propertyService.deleteProperty(id);
        return ResponseEntity.ok().build();
    }

    // --- Customers ---
    @GetMapping("/customers")
    public List<Customer> getAllCustomers() {
        return customerService.getAllCustomers();
    }

    @PostMapping("/customers")
    public Customer createCustomer(@RequestBody Customer customer) {
        return customerService.createCustomer(customer);
    }

    @PutMapping("/customers/{id}")
    public Customer updateCustomer(@PathVariable Long id, @RequestBody Customer customer) {
        return customerService.updateCustomer(id, customer);
    }

    @DeleteMapping("/customers/{id}")
    public ResponseEntity<?> deleteCustomer(@PathVariable Long id) {
        customerService.deleteCustomer(id);
        return ResponseEntity.ok().build();
    }

    // --- Leads ---
    @GetMapping("/leads")
    public List<com.estatesync.model.Lead> getAllLeads() {
        return leadService.getAllLeads();
    }

    @PostMapping("/leads")
    public com.estatesync.model.Lead createLead(@RequestBody com.estatesync.model.Lead lead) {
        return leadService.createLead(lead);
    }

    @PutMapping("/leads/{id}")
    public com.estatesync.model.Lead updateLead(@PathVariable Long id, @RequestBody com.estatesync.model.Lead lead) {
        return leadService.updateLead(id, lead);
    }

    @DeleteMapping("/leads/{id}")
    public ResponseEntity<?> deleteLead(@PathVariable Long id) {
        leadService.deleteLead(id);
        return ResponseEntity.ok().build();
    }

    // --- Password Resets ---
    @PostMapping("/users/{id}/reset-password")
    public ResponseEntity<?> resetUserPassword(@PathVariable Long id) {
        userService.generateAndEmailPassword(id);
        return ResponseEntity.ok(java.util.Map.of("message", "Password generated and emailed successfully."));
    }

    @PostMapping("/customers/{id}/reset-password")
    public ResponseEntity<?> resetCustomerPassword(@PathVariable Long id) {
        customerService.generateAndEmailPassword(id);
        return ResponseEntity.ok(java.util.Map.of("message", "Password generated and emailed successfully."));
    }
}
