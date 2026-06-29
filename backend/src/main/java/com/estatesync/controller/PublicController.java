package com.estatesync.controller;

import com.estatesync.dto.InterestRequest;
import com.estatesync.model.Property;
import com.estatesync.repository.PropertyRepository;
import com.estatesync.repository.CustomerRepository;
import com.estatesync.service.LeadService;
import com.estatesync.service.OtpService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/public")
public class PublicController {

    private final PropertyRepository propertyRepository;
    private final com.estatesync.service.PropertyService propertyService;
    private final CustomerRepository customerRepository;
    private final OtpService otpService;
    private final LeadService leadService;
    private final com.estatesync.service.RegionService regionService;
    private final com.estatesync.security.JwtUtil jwtUtil;
    private final org.springframework.security.crypto.password.PasswordEncoder passwordEncoder;

    public PublicController(PropertyRepository propertyRepository, com.estatesync.service.PropertyService propertyService, CustomerRepository customerRepository, OtpService otpService, LeadService leadService, com.estatesync.service.RegionService regionService, com.estatesync.security.JwtUtil jwtUtil, org.springframework.security.crypto.password.PasswordEncoder passwordEncoder) {
        this.propertyRepository = propertyRepository;
        this.propertyService = propertyService;
        this.customerRepository = customerRepository;
        this.otpService = otpService;
        this.leadService = leadService;
        this.regionService = regionService;
        this.jwtUtil = jwtUtil;
        this.passwordEncoder = passwordEncoder;
    }

    @GetMapping("/properties")
    public ResponseEntity<org.springframework.data.domain.Page<Property>> getProperties(
            @RequestParam(required = false) String type,
            @RequestParam(required = false) Long regionId,
            @RequestParam(required = false) Double minPrice,
            @RequestParam(required = false) Double maxPrice,
            @RequestParam(required = false) String search,
            org.springframework.data.domain.Pageable pageable) {
        // Force status to be AVAILABLE for public queries
        return ResponseEntity.ok(propertyService.getFilteredProperties("AVAILABLE", type, regionId, minPrice, maxPrice, search, pageable));
    }

    @GetMapping("/regions")
    public ResponseEntity<List<com.estatesync.model.Region>> getRegions() {
        return ResponseEntity.ok(regionService.getAllRegions());
    }

    @PostMapping("/send-otp")
    public ResponseEntity<?> sendOtp(@RequestBody Map<String, String> payload) {
        String email = payload.get("email");
        String phone = payload.get("phone");
        String type = payload.get("type"); // "login" or "signup"

        if ("signup".equals(type)) {
            java.util.Optional<com.estatesync.model.Customer> existingEmail = customerRepository.findByEmail(email);
            if (existingEmail.isPresent()) {
                return ResponseEntity.badRequest().body("EMAIL_EXISTS");
            }
        } else if ("login".equals(type)) {
            java.util.Optional<com.estatesync.model.Customer> existingEmail = customerRepository.findByEmail(email);
            if (!existingEmail.isPresent()) {
                return ResponseEntity.badRequest().body("USER_NOT_FOUND");
            }
        }

        if (phone != null && !phone.isEmpty()) {
            java.util.Optional<com.estatesync.model.Customer> existing = customerRepository.findByPhone(phone);
            if (existing.isPresent() && !existing.get().getEmail().equalsIgnoreCase(email)) {
                return ResponseEntity.badRequest().body("PHONE_EMAIL_MISMATCH");
            }
        }

        otpService.generateAndSendOtp(email);
        return ResponseEntity.ok().build();
    }

    @PostMapping("/customer/verify-login")
    public ResponseEntity<?> verifyLogin(@RequestBody Map<String, String> payload) {
        String email = payload.get("email");
        String phone = payload.get("phone");
        String otp = payload.get("otp");
        String name = payload.get("name");
        String password = payload.get("password");

        if (!otpService.verifyOtp(email, otp)) {
            return ResponseEntity.badRequest().body("Invalid OTP");
        }

        com.estatesync.model.Customer customer = customerRepository.findByEmail(email)
            .orElseGet(() -> customerRepository.findByPhone(phone)
                .orElseGet(() -> {
                    com.estatesync.model.Customer newC = new com.estatesync.model.Customer();
                    newC.setName(name != null ? name : "Unknown");
                    newC.setEmail(email);
                    newC.setPhone(phone);
                    newC.setIsEmailVerified(true);
                    if (password != null && !password.isEmpty()) {
                        newC.setPassword(passwordEncoder.encode(password));
                    }
                    return customerRepository.save(newC);
                })
            );

        String token = jwtUtil.generateCustomerToken(email, customer.getId());
        return ResponseEntity.ok(Map.of("token", token, "customer", customer));
    }

    @PostMapping("/customer/login-password")
    public ResponseEntity<?> loginPassword(@RequestBody Map<String, String> payload) {
        String email = payload.get("email");
        String password = payload.get("password");

        java.util.Optional<com.estatesync.model.Customer> customerOpt = customerRepository.findByEmail(email);
        if (customerOpt.isEmpty()) {
            return ResponseEntity.badRequest().body("USER_NOT_FOUND");
        }

        com.estatesync.model.Customer customer = customerOpt.get();
        if (customer.getPassword() == null || !passwordEncoder.matches(password, customer.getPassword())) {
            return ResponseEntity.badRequest().body("INVALID_PASSWORD");
        }

        String token = jwtUtil.generateCustomerToken(email, customer.getId());
        return ResponseEntity.ok(Map.of("token", token, "customer", customer));
    }

    @PostMapping("/express-interest")
    public ResponseEntity<?> expressInterest(@RequestBody InterestRequest request, 
                                             @RequestParam(required = false) String otp,
                                             @RequestHeader(value = "Authorization", required = false) String authHeader) {
        boolean isValidAuth = false;
        Long customerId = null;
        if (authHeader != null && authHeader.startsWith("Bearer ")) {
            try {
                String token = authHeader.substring(7);
                String role = jwtUtil.extractClaim(token, claims -> claims.get("role", String.class));
                if ("CUSTOMER".equals(role)) {
                    isValidAuth = true;
                    Object cid = jwtUtil.extractClaim(token, claims -> claims.get("customerId", Object.class));
                    if (cid instanceof Integer) {
                        customerId = ((Integer) cid).longValue();
                    } else if (cid instanceof Long) {
                        customerId = (Long) cid;
                    }
                }
            } catch (Exception e) {
                // Invalid token
            }
        }

        if (isValidAuth && customerId != null) {
            com.estatesync.model.Customer cust = customerRepository.findById(customerId).orElse(null);
            if (cust != null) {
                request.setPhone(cust.getPhone());
                request.setEmail(cust.getEmail());
                request.setName(cust.getName());
            } else {
                isValidAuth = false;
            }
        }

        if (!isValidAuth) {
            if (otp == null || !otpService.verifyOtp(request.getEmail(), otp)) {
                return ResponseEntity.badRequest().body("Invalid OTP or Token");
            }
        }
        
        request.setReferredFrom("Official Website Catalogue Enquiry");
        
        try {
            boolean nameIgnored = leadService.processInterest(request);
            if (nameIgnored) {
                return ResponseEntity.ok(Map.of("message", "NAME_IGNORED"));
            }
            return ResponseEntity.ok(Map.of("message", "SUCCESS"));
        } catch (Exception e) {
            e.printStackTrace();
            return ResponseEntity.internalServerError().body(e.getMessage());
        }
    }
}
