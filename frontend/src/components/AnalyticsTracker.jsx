import React, { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import api from '../services/api';

// Generate or retrieve session ID for anonymous tracking
const getOrCreateSessionId = () => {
  let sessionId = localStorage.getItem('analytics_session_id');
  if (!sessionId) {
    sessionId = crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).substring(2, 15);
    localStorage.setItem('analytics_session_id', sessionId);
  }
  return sessionId;
};

const AnalyticsTracker = () => {
  const location = useLocation();

  // Track page visits
  useEffect(() => {
    const sessionId = getOrCreateSessionId();
    api.post('/analytics/visit', {
      sessionId,
      path: location.pathname
    }).catch(err => {
      // Silently fail if analytics is blocked or server is down
      console.error("Failed to track visit", err);
    });
  }, [location]);

  // Track employee heartbeat
  useEffect(() => {
    // Check if user is logged in and has a session token
    const token = localStorage.getItem('token');
    const sessionToken = localStorage.getItem('sessionToken');
    const role = localStorage.getItem('role');

    // Only track heartbeat for employees (Managers, Agents, Admins)
    if (token && sessionToken && role && role !== 'CUSTOMER') {
      const pingHeartbeat = () => {
        api.post('/analytics/heartbeat', { sessionToken })
          .catch(err => console.error("Heartbeat failed", err));
      };

      // Initial ping
      pingHeartbeat();

      // Ping every 1 minute
      const intervalId = setInterval(pingHeartbeat, 60000);
      return () => clearInterval(intervalId);
    }
  }, []); // Run once on mount

  return null; // This component doesn't render anything
};

export default AnalyticsTracker;
