# EstateSync CRM: Comprehensive Architecture & Development Guide

## 1. Executive Summary
EstateSync is a comprehensive Customer Relationship Management (CRM) platform specifically designed for the real estate industry. It enables seamless property management, lead tracking, and role-based access control. The primary users are Administrators (Admins), Regional Managers (Managers), Agents, and Public Customers.

The system features a modern React frontend powered by Vite and Tailwind CSS, and a robust backend built with Java, Spring Boot, Spring Security, and JPA/Hibernate.

This document serves as an exhaustive guide to the system's architecture, software logic, entities, and execution flows. It is intended to help developers with basic Java and JavaScript knowledge quickly onboard and master the system.

---

## 2. System Entities & Database Schema
At the core of the backend is the relational database, mapped using Java Persistence API (JPA) / Hibernate. The primary entities include:

### 2.1. `User` (and Roles)
The `User` entity represents system staff: Admins, Managers, and Agents. 
- **Roles**: Defined via the `Role` enum (`ADMIN`, `MANAGER`, `AGENT`, `CUSTOMER`).
- **Hierarchy**: An `Agent` is often tied to a `Manager` or operates within a `Region`.

### 2.2. `Region`
Represents a geographical operational area (e.g., Pune, Aurangabad). 
- Properties are grouped by Regions. 
- Managers are assigned to Regions to oversee local Leads and Agents.

### 2.3. `Property`
Represents a real estate listing. 
- **Fields**: Title, type (e.g., Apartment, Villa), price, description, images, location (lat/lng).
- **Association**: Belongs to exactly one `Region`.

### 2.4. `Customer`
Represents a public user who expresses interest in a property.
- **Fields**: Name, email, phone number, OTP verification status.

### 2.5. `Lead`
When a `Customer` expresses interest in a `Property`, a `Lead` is generated.
- **Fields**: Source (e.g., Official Website), status (e.g., NEW, CONTACTED).
- **Association**: Belongs to a `Customer` and a `Region` (inferred from the Property).
- **Assignment**: Admins or the system can assign a Lead to a specific `Manager`.

### 2.6. `Opportunity`
When a Manager assigns a `Lead` to an `Agent` for a specific `Property`, it becomes an `Opportunity`.
- **Status Flow**: `NEW` -> `CONTACTED` -> `SITE_VISIT` -> `NEGOTIATION` -> `CLOSED_WON` / `CLOSED_LOST`.

### 2.7. `ActivityLog` & `Visit`
- **ActivityLog**: Tracks status changes, calls, and agent notes.
- **Visit**: Tracks scheduled physical site visits by the Customer.

---

## 3. High-Level Architecture

The system follows a classic decoupled Client-Server architecture.

### 3.1. Frontend (Client)
- **Framework**: React 18 (via Vite).
- **Styling**: Tailwind CSS & Lucide React for modern, responsive icons and layouts.
- **Routing**: `react-router-dom` handles navigation. The app uses protected routes to ensure only authenticated users can access specific dashboards (e.g., `/admin`, `/manager`, `/agent`).
- **HTTP Client**: Axios (configured in `api.js`) automatically attaches JWT tokens to requests and handles global 401/403 redirects.

### 3.2. Backend (Server)
- **Framework**: Spring Boot 3.x (Java 17+).
- **Security**: Spring Security with stateless JSON Web Tokens (JWT). 
- **Data Access**: Spring Data JPA interfaces handle SQL queries automatically.
- **Controllers**: Grouped by role (`AdminController`, `ManagerController`, `AgentController`, `PublicController`). This logical separation ensures tight security boundaries.

---

## 4. Programming Logic & Execution Flows

### 4.1. Authentication Flow (JWT)
1. **Login Request**: User enters email/password. Frontend `api.post('/auth/login')`.
2. **Backend Verification**: `CustomUserDetailsService` loads the user. `AuthenticationManager` checks credentials.
3. **Token Generation**: `JwtUtil` generates a signed JWT token containing the user's email/role.
4. **Client Storage**: Frontend stores the JWT in `localStorage`.
5. **Subsequent Requests**: Axios interceptor attaches `Authorization: Bearer <token>` to every request. `JwtAuthenticationFilter` intercepts it, validates the signature, and sets the `SecurityContext`.

### 4.2. Lead Generation Flow (Public)
1. **Public Home Page**: A customer clicks "Express Interest" on a Property.
2. **Customer Verification**: The system asks for Email/Phone and sends a One-Time Password (OTP).
3. **Backend OTP Logic**: `OtpService` generates a 6-digit code and emails it via `EmailService`.
4. **Interest Submission**: Upon verifying the OTP, the frontend calls `POST /api/public/express-interest`.
5. **Lead Creation**: `LeadService` checks if a Customer exists (creates if not), then creates a `Lead` entity linked to the `Region` of the requested property.

### 4.3. Manager Lead Assignment Flow (Complex Logic)
*How does a Manager see and assign Leads?*
1. **Dashboard Fetch**: The Manager dashboard requests `GET /api/manager/leads`.
2. **Dynamic Filtering**: The backend executes `LeadService.getManagerLeads()`.
   - **Logic**: It uses JPA `Specification` to build dynamic queries. 
   - **Rule**: It fetches leads where the Lead's Region matches the Manager's Region **OR** the Lead is explicitly assigned to the Manager ID. This ensures managers see all regional leads plus any special assignments from Admins.
3. **UI Display**: The frontend groups Opportunities under each Lead.
4. **Agent Assignment**: The Manager selects an Agent from a dropdown. A confirmation modal prevents accidental assignments. Upon confirmation, `POST /api/manager/assign-lead` is triggered, creating an `Opportunity` for the Agent.

---

## 5. Frontend Deep-Dive (React & JavaScript)

### 5.1. Context API (`AuthContext.jsx`)
State management for authentication is handled globally using React Context. 
- **Initialization**: Checks `localStorage` on mount.
- **Auto-Logout**: If `api.js` catches an expired token error (401), it dispatches a custom `auth-error` event. `AuthContext` listens to this event and seamlessly sets the user state to `null` without jarring page reloads.

### 5.2. Axios Interceptors (`api.js`)
Centralized API configuration:
- **Request Interceptor**: Injects the Bearer token.
- **Response Interceptor**: Listens for error codes. If the backend denies access (token expired), it silently clears local storage. If the user is on a protected route, it forces a redirect to `/login`.

### 5.3. Analytics Tracking (`AnalyticsTracker.jsx`)
A background, invisible component rendered inside the main `<Router>`.
- **Page Views**: Fires a `/visit` API call on every route change (`useEffect` listening to `location.pathname`).
- **Heartbeat**: Pings the backend every 60 seconds to keep staff sessions alive and track active employees.

---

## 6. Backend Deep-Dive (Spring Boot & Java)

### 6.1. Controllers & PreAuthorize
Controllers act as entry points. They are strictly annotated to prevent unauthorized access.
```java
@RestController
@RequestMapping("/api/manager")
@PreAuthorize("hasRole('MANAGER')") // Spring Security enforces this before the method even runs.
public class ManagerController { ... }
```

### 6.2. Services & Transactional Logic
Services handle business logic. The `@Transactional` annotation ensures that if a database operation fails halfway through, the entire transaction rolls back to prevent corrupted data.
```java
@Transactional
public Opportunity createOpportunity(Long leadId, Long agentId) {
    // 1. Fetch Lead
    // 2. Fetch Agent
    // 3. Save Opportunity
    // 4. Log Activity
    // If anything throws an error, steps 1-4 are reverted automatically!
}
```

### 6.3. JPA Specifications
When filtering lists with optional parameters (e.g., status, search text, region), writing native SQL is messy. JPA Specifications allow us to construct queries programmatically in Java.
```java
// Example: Dynamically filtering leads
public static Specification<Lead> isManagerAuthorized(Long regionId, Long managerId) {
    return (root, query, cb) -> cb.or(
        cb.equal(root.get("region").get("id"), regionId),
        cb.equal(root.get("manager").get("id"), managerId)
    );
}
```

---

## 7. Execution Flow Diagram: Lead to Closure

Below is a textual representation of the execution flow from a new customer to a closed deal:

1. [CUSTOMER] --> (Visits Public Website) --> (Views Property)
2. [CUSTOMER] --> (Clicks Express Interest) --> (Verifies OTP) --> System creates `Lead`.
3. [ADMIN / MANAGER] --> (Logs in) --> System fetches `Lead` via JPA Specification.
4. [MANAGER] --> (Assigns Agent via UI Dropdown) --> System creates `Opportunity` & `ActivityLog`.
5. [AGENT] --> (Logs in) --> Views `Opportunity` on Agent Dashboard.
6. [AGENT] --> (Updates Status to SITE_VISIT) --> System logs update.
7. [AGENT] --> (Marks as CLOSED_WON) --> Deal Complete.

---

## 8. Summary & Next Steps
This CRM is built with high scalability in mind. The separation of Controllers by role, the usage of JPA Specifications for complex queries, and the centralized Axios interceptors for session management ensure the codebase remains maintainable as business logic grows.

Developers joining the project should familiarize themselves with:
1. **Spring Data JPA** (specifically `Specification` and `Repository` interfaces).
2. **React Context** and **Hooks** (`useState`, `useEffect`).
3. **Tailwind CSS** for UI styling.
