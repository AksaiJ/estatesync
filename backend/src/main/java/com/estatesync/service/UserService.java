package com.estatesync.service;

import com.estatesync.model.User;
import com.estatesync.model.LeadStatus;
import com.estatesync.model.Role;
import com.estatesync.model.OpportunityStatus;
import com.estatesync.repository.UserRepository;
import com.estatesync.repository.LeadRepository;
import com.estatesync.repository.OpportunityRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.security.crypto.password.PasswordEncoder;
import java.util.List;
import java.util.Arrays;

@Service
public class UserService {

    private final UserRepository userRepository;
    private final LeadRepository leadRepository;
    private final OpportunityRepository opportunityRepository;
    private final PasswordEncoder passwordEncoder;
    private final OtpService otpService;

    public UserService(UserRepository userRepository, LeadRepository leadRepository, OpportunityRepository opportunityRepository, PasswordEncoder passwordEncoder, OtpService otpService) {
        this.userRepository = userRepository;
        this.leadRepository = leadRepository;
        this.opportunityRepository = opportunityRepository;
        this.passwordEncoder = passwordEncoder;
        this.otpService = otpService;
    }

    public List<User> getAllUsers() {
        return userRepository.findAll();
    }

    public org.springframework.data.domain.Page<User> getFilteredUsers(
            Role role, Long regionId, Boolean isActive, String search, org.springframework.data.domain.Pageable pageable) {
        org.springframework.data.jpa.domain.Specification<User> spec = org.springframework.data.jpa.domain.Specification.where(com.estatesync.specification.UserSpecification.hasRole(role))
                .and(com.estatesync.specification.UserSpecification.hasRegion(regionId))
                .and(com.estatesync.specification.UserSpecification.isActive(isActive))
                .and(com.estatesync.specification.UserSpecification.searchByNameOrEmail(search));
        return userRepository.findAll(spec, pageable);
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
    public void deactivateAgent(Long userId) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new IllegalArgumentException("User not found"));

        if (user.getRole() == Role.AGENT) {
            List<OpportunityStatus> terminalStates = Arrays.asList(OpportunityStatus.CLOSED_WON, OpportunityStatus.CLOSED_LOST);
            if (opportunityRepository.existsByAgentIdAndStatusNotIn(userId, terminalStates)) {
                throw new IllegalStateException("Cannot deactivate agent with active opportunities.");
            }
        } else if (user.getRole() == Role.MANAGER) {
            if (leadRepository.existsByManagerIdAndStatusNot(userId, LeadStatus.CLOSED)) {
                throw new IllegalStateException("Cannot deactivate manager with active leads under their supervision.");
            }
        }

        user.setIsActive(false);
        userRepository.save(user);
    }
}
