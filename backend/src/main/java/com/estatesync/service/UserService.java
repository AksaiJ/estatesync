package com.estatesync.service;

import com.estatesync.model.User;
import com.estatesync.model.LeadStatus;
import com.estatesync.repository.UserRepository;
import com.estatesync.repository.LeadRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.security.crypto.password.PasswordEncoder;
import java.util.List;

@Service
public class UserService {

    private final UserRepository userRepository;
    private final LeadRepository leadRepository;
    private final PasswordEncoder passwordEncoder;
    private final OtpService otpService;

    public UserService(UserRepository userRepository, LeadRepository leadRepository, PasswordEncoder passwordEncoder, OtpService otpService) {
        this.userRepository = userRepository;
        this.leadRepository = leadRepository;
        this.passwordEncoder = passwordEncoder;
        this.otpService = otpService;
    }

    public List<User> getAllUsers() {
        return userRepository.findAll();
    }

    @Transactional
    public User createUser(User user) {
        user.setPasswordHash(passwordEncoder.encode(user.getPasswordHash()));
        return userRepository.save(user);
    }

    @Transactional
    public User updateUser(Long id, User updatedUser) {
        User user = userRepository.findById(id).orElseThrow(() -> new IllegalArgumentException("User not found"));
        user.setName(updatedUser.getName());
        user.setEmail(updatedUser.getEmail());
        user.setRole(updatedUser.getRole());
        user.setRegion(updatedUser.getRegion());
        if (updatedUser.getPasswordHash() != null && !updatedUser.getPasswordHash().isEmpty()) {
            user.setPasswordHash(passwordEncoder.encode(updatedUser.getPasswordHash()));
        }
        return userRepository.save(user);
    }

    @Transactional
    public void generateAndEmailPassword(Long id) {
        User user = userRepository.findById(id).orElseThrow(() -> new IllegalArgumentException("User not found"));
        String plainPassword = java.util.UUID.randomUUID().toString().substring(0, 8);
        user.setPasswordHash(passwordEncoder.encode(plainPassword));
        userRepository.save(user);
        otpService.sendPasswordEmail(user.getEmail(), plainPassword);
    }

    @Transactional
    public void deactivateAgent(Long agentId) {
        User agent = userRepository.findById(agentId)
                .orElseThrow(() -> new IllegalArgumentException("User not found"));

        if (leadRepository.existsByAgentIdAndStatusNot(agentId, LeadStatus.CLOSED)) {
            throw new IllegalStateException("Cannot deactivate agent with active leads.");
        }

        agent.setIsActive(false);
        userRepository.save(agent);
    }
}
