# EstateSync CRM Architecture Diagrams

This document contains visual diagrams mapping out the database relationships and execution flows for critical scenarios in the EstateSync CRM system.

## 1. Entity-Relationship (ER) Diagram

This diagram visualizes the relational database schema, highlighting how entities interact.

```mermaid
erDiagram
    REGION {
        bigint id PK
        string name
    }
    
    USER {
        bigint id PK
        string name
        string email
        string password
        string role "ADMIN, MANAGER, AGENT"
        bigint region_id FK
    }
    
    PROPERTY {
        bigint id PK
        string title
        string type
        decimal price
        string location
        bigint region_id FK
    }
    
    CUSTOMER {
        bigint id PK
        string name
        string email
        string phone
        boolean isVerified
    }
    
    LEAD {
        bigint id PK
        string source
        string status
        bigint customer_id FK
        bigint property_id FK
        bigint region_id FK
        bigint manager_id FK "Explicit assignment"
    }
    
    OPPORTUNITY {
        bigint id PK
        string status "NEW, CONTACTED, etc."
        bigint lead_id FK
        bigint agent_id FK
    }
    
    ACTIVITY_LOG {
        bigint id PK
        string type
        string notes
        bigint opportunity_id FK
        bigint agent_id FK
    }

    VISIT {
        bigint id PK
        datetime scheduledTime
        string status
        bigint opportunity_id FK
    }

    %% Relationships
    REGION ||--o{ USER : "managers operate in"
    REGION ||--o{ PROPERTY : "contains"
    REGION ||--o{ LEAD : "receives"
    
    CUSTOMER ||--o{ LEAD : "generates"
    PROPERTY ||--o{ LEAD : "associated with"
    USER ||--o{ LEAD : "explicitly assigned to"
    
    LEAD ||--o{ OPPORTUNITY : "converted to"
    USER ||--o{ OPPORTUNITY : "assigned to (Agent)"
    
    OPPORTUNITY ||--o{ ACTIVITY_LOG : "has history"
    USER ||--o{ ACTIVITY_LOG : "logs"
    
    OPPORTUNITY ||--o{ VISIT : "schedules"
```

---

## 2. Execution Flow: Lead Generation (Public)

This sequence diagram maps out what happens when a public user expresses interest in a property, including OTP verification.

```mermaid
sequenceDiagram
    autonumber
    actor Customer
    participant React as React Frontend (PublicHome.jsx)
    participant Auth as PublicController.java
    participant OTP as OtpService.java
    participant Email as EmailService.java
    participant LeadSvc as LeadService.java
    participant DB as Database

    Customer->>React: Clicks "Express Interest" & enters Email
    React->>Auth: POST /api/public/send-otp { email }
    Auth->>OTP: generateOtp(email)
    OTP->>Email: sendEmail(email, "OTP Code", code)
    Email-->>Customer: Receives OTP via Email
    Auth-->>React: 200 OK (OTP Sent)
    
    Customer->>React: Enters OTP & submits form
    React->>Auth: POST /api/public/express-interest { otp, email, propertyId }
    Auth->>OTP: verifyOtp(email, otp)
    OTP-->>Auth: true
    Auth->>LeadSvc: createAdminLead(payload)
    
    LeadSvc->>DB: Check if Customer exists
    alt Customer exists
        DB-->>LeadSvc: existing Customer
    else New Customer
        LeadSvc->>DB: Save new Customer
    end
    
    LeadSvc->>DB: Fetch Property & Region
    LeadSvc->>DB: Save Lead (Status: NEW, Region: property.region)
    DB-->>LeadSvc: Lead saved
    LeadSvc-->>Auth: Lead created
    Auth-->>React: 200 OK (Lead Generated)
    React-->>Customer: Shows Success Modal
```

---

## 3. Execution Flow: Manager Assignment Logic

This diagram details the complex backend query logic when a Manager fetches their dashboard, showcasing how `LeadSpecification.java` filters the data.

```mermaid
sequenceDiagram
    autonumber
    actor Manager
    participant React as ManagerDashboard.jsx
    participant Controller as ManagerController.java
    participant Sec as Spring Security (JWT)
    participant LeadSvc as LeadService.java
    participant Spec as LeadSpecification.java
    participant DB as Database

    Manager->>React: Opens Dashboard
    React->>Controller: GET /api/manager/leads (with Bearer Token)
    
    %% Security Context Extraction
    Sec->>Controller: intercepts & validates JWT
    Controller->>Sec: authentication.getPrincipal()
    Sec-->>Controller: Returns CustomUserDetails
    Note right of Controller: Extracts managerId and regionId directly<br/>from Security Context (Prevents spoofing!)
    
    Controller->>LeadSvc: getManagerLeads(regionId, managerId)
    
    %% Dynamic JPA Query Building
    LeadSvc->>Spec: isManagerAuthorized(regionId, managerId)
    Note right of Spec: Builds dynamic OR query:<br/>cb.or(region.id == regionId, manager.id == managerId)
    Spec-->>LeadSvc: Returns JPA Specification
    
    LeadSvc->>DB: execute query with Specification
    DB-->>LeadSvc: Returns Leads
    LeadSvc-->>Controller: Returns Page<Lead>
    Controller-->>React: 200 OK (JSON Leads array)
    
    React-->>Manager: Displays regional + assigned Leads
```

---

## 4. Execution Flow: The Token Expiration Rescue (Axios Interceptors)

This flow illustrates the custom resilience logic built into the frontend to handle background heartbeat failures without ruining the UX for public users.

```mermaid
sequenceDiagram
    autonumber
    participant React as AuthContext.jsx
    participant Analytics as AnalyticsTracker.jsx
    participant Axios as api.js (Interceptor)
    participant Backend as Spring Boot API
    
    Note over React, Backend: User token expired while reading homepage.
    
    Analytics->>Axios: setInterval triggers POST /api/analytics/heartbeat
    Axios->>Backend: Request with expired Bearer Token
    Backend-->>Axios: 401 Unauthorized
    
    %% The Fix Logic
    Axios->>Axios: Interceptor catches 401
    Axios->>Axios: localStorage.removeItem('token')
    
    alt window.location.pathname == '/'
        Note over Axios: User is on public page. DO NOT REDIRECT!
        Axios->>React: window.dispatchEvent(new Event('auth-error'))
        React->>React: handleAuthError() -> setUser(null)
        Note right of React: UI silently updates to "logged out" state.<br/>User reading experience is uninterrupted.
    else User is on /manager dashboard
        Note over Axios: User is on a protected route
        Axios->>Axios: window.location.href = '/login'
    end
```
