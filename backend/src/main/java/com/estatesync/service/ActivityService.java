package com.estatesync.service;

import com.estatesync.model.ActivityLog;
import com.estatesync.model.ActivityType;
import com.estatesync.model.Opportunity;
import com.estatesync.model.User;
import com.estatesync.repository.ActivityLogRepository;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
public class ActivityService {
    
    private final ActivityLogRepository activityLogRepository;

    public ActivityService(ActivityLogRepository activityLogRepository) {
        this.activityLogRepository = activityLogRepository;
    }

    public void logSystemEvent(Opportunity opportunity, String content) {
        logActivity(opportunity, null, ActivityType.SYSTEM_EVENT, content);
    }

    public void logActivity(Opportunity opportunity, User user, ActivityType type, String content) {
        ActivityLog log = new ActivityLog();
        log.setOpportunity(opportunity);
        log.setUser(user);
        log.setType(type);
        log.setContent(content);
        activityLogRepository.save(log);
    }

    public List<ActivityLog> getLogsForOpportunity(Long opportunityId) {
        return activityLogRepository.findByOpportunityIdOrderByCreatedAtDesc(opportunityId);
    }
}
