package com.estatesync.service;

import com.estatesync.model.Customer;
import com.estatesync.repository.CustomerRepository;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
public class CustomerService {

    private final CustomerRepository customerRepository;
    private final org.springframework.security.crypto.password.PasswordEncoder passwordEncoder;
    private final OtpService otpService;

    public CustomerService(CustomerRepository customerRepository, org.springframework.security.crypto.password.PasswordEncoder passwordEncoder, OtpService otpService) {
        this.customerRepository = customerRepository;
        this.passwordEncoder = passwordEncoder;
        this.otpService = otpService;
    }

    public List<Customer> getAllCustomers() {
        return customerRepository.findAll();
    }

    public Customer createCustomer(Customer customer) {
        if (customerRepository.findByEmail(customer.getEmail()).isPresent()) {
            throw new IllegalArgumentException("Email already exists");
        }
        if (customer.getPassword() != null && !customer.getPassword().isEmpty()) {
            customer.setPassword(passwordEncoder.encode(customer.getPassword()));
        }
        return customerRepository.save(customer);
    }

    public Customer updateCustomer(Long id, Customer updated) {
        Customer existing = customerRepository.findById(id).orElseThrow();
        
        java.util.Optional<Customer> existingWithEmail = customerRepository.findByEmail(updated.getEmail());
        if (existingWithEmail.isPresent() && !existingWithEmail.get().getId().equals(id)) {
            throw new IllegalArgumentException("Email already exists for another customer");
        }

        existing.setName(updated.getName());
        existing.setEmail(updated.getEmail());
        existing.setPhone(updated.getPhone());
        existing.setPreferredLocation(updated.getPreferredLocation());
        existing.setPropertyType(updated.getPropertyType());
        if (updated.getPassword() != null && !updated.getPassword().isEmpty()) {
            existing.setPassword(passwordEncoder.encode(updated.getPassword()));
        }
        return customerRepository.save(existing);
    }

    public void generateAndEmailPassword(Long id) {
        Customer existing = customerRepository.findById(id).orElseThrow();
        String plainPassword = java.util.UUID.randomUUID().toString().substring(0, 8);
        existing.setPassword(passwordEncoder.encode(plainPassword));
        customerRepository.save(existing);
        otpService.sendPasswordEmail(existing.getEmail(), plainPassword);
    }

    public void deleteCustomer(Long id) {
        customerRepository.deleteById(id);
    }
}
