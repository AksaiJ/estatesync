package com.estatesync.service;

import com.estatesync.dto.AuthRequest;
import com.estatesync.dto.AuthResponse;
import com.estatesync.security.CustomUserDetails;
import com.estatesync.security.JwtUtil;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.stereotype.Service;

@Service
public class AuthService {

    private final AuthenticationManager authenticationManager;
    private final JwtUtil jwtUtil;
    private final com.estatesync.repository.UserRepository userRepository;
    private final org.springframework.security.crypto.password.PasswordEncoder passwordEncoder;
    private final OtpService otpService;

    public AuthService(AuthenticationManager authenticationManager, JwtUtil jwtUtil, 
                       com.estatesync.repository.UserRepository userRepository,
                       org.springframework.security.crypto.password.PasswordEncoder passwordEncoder,
                       OtpService otpService) {
        this.authenticationManager = authenticationManager;
        this.jwtUtil = jwtUtil;
        this.userRepository = userRepository;
        this.passwordEncoder = passwordEncoder;
        this.otpService = otpService;
    }

    @jakarta.annotation.PostConstruct
    public void fixAdminPassword() {
        userRepository.findByEmail("admin@estatesync.com").ifPresent(admin -> {
            admin.setPasswordHash(passwordEncoder.encode("admin123"));
            userRepository.save(admin);
        });
    }

    public AuthResponse authenticate(AuthRequest request) {
        Authentication authentication = authenticationManager.authenticate(
                new UsernamePasswordAuthenticationToken(request.getEmail(), request.getPassword())
        );

        CustomUserDetails userDetails = (CustomUserDetails) authentication.getPrincipal();
        String token = jwtUtil.generateToken(userDetails);
        
        return new AuthResponse(token, userDetails.getUser().getRole().name(), userDetails.getUser().getName());
    }

    public void sendOtp(String email) {
        userRepository.findByEmail(email).orElseThrow(() -> new IllegalArgumentException("User not found"));
        otpService.generateAndSendOtp(email);
    }

    public AuthResponse verifyOtp(String email, String otp) {
        if (!otpService.verifyOtp(email, otp)) {
            throw new IllegalArgumentException("Invalid OTP");
        }
        com.estatesync.model.User user = userRepository.findByEmail(email).orElseThrow(() -> new IllegalArgumentException("User not found"));
        CustomUserDetails userDetails = new CustomUserDetails(user);
        String token = jwtUtil.generateToken(userDetails);
        return new AuthResponse(token, user.getRole().name(), user.getName());
    }

    public void resetPassword(String email, String currentPassword, String newPassword) {
        com.estatesync.model.User user = userRepository.findByEmail(email).orElseThrow(() -> new IllegalArgumentException("User not found"));
        if (!passwordEncoder.matches(currentPassword, user.getPasswordHash())) {
            throw new IllegalArgumentException("Incorrect current password");
        }
        user.setPasswordHash(passwordEncoder.encode(newPassword));
        userRepository.save(user);
    }
}
