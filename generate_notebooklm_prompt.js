const fs = require('fs');
const path = require('path');

const projectRoot = path.resolve(__dirname);

// List of all critical files to extract code from
const filesToExtract = [
    // Backend Security & Config
    'backend/src/main/java/com/estatesync/security/SecurityConfig.java',
    'backend/src/main/java/com/estatesync/security/JwtAuthenticationFilter.java',
    'backend/src/main/java/com/estatesync/security/JwtUtil.java',
    'backend/src/main/java/com/estatesync/security/CustomUserDetailsService.java',
    
    // Backend Controllers
    'backend/src/main/java/com/estatesync/controller/AdminController.java',
    'backend/src/main/java/com/estatesync/controller/ManagerController.java',
    'backend/src/main/java/com/estatesync/controller/AgentController.java',
    'backend/src/main/java/com/estatesync/controller/PublicController.java',
    'backend/src/main/java/com/estatesync/controller/AuthController.java',
    
    // Backend Services
    'backend/src/main/java/com/estatesync/service/LeadService.java',
    'backend/src/main/java/com/estatesync/service/OpportunityService.java',
    'backend/src/main/java/com/estatesync/service/PropertyService.java',
    'backend/src/main/java/com/estatesync/service/EmailService.java',
    'backend/src/main/java/com/estatesync/service/OtpService.java',
    
    // Backend Models
    'backend/src/main/java/com/estatesync/model/User.java',
    'backend/src/main/java/com/estatesync/model/Property.java',
    'backend/src/main/java/com/estatesync/model/Region.java',
    'backend/src/main/java/com/estatesync/model/Lead.java',
    'backend/src/main/java/com/estatesync/model/Opportunity.java',
    
    // Backend Specs
    'backend/src/main/java/com/estatesync/specification/LeadSpecification.java',
    
    // Frontend Core
    'frontend/src/services/api.js',
    'frontend/src/context/AuthContext.jsx',
    'frontend/src/components/AnalyticsTracker.jsx',
    
    // Frontend Pages
    'frontend/src/pages/Manager/ManagerDashboard.jsx',
    'frontend/src/pages/Admin/AdminDashboard.jsx',
    'frontend/src/pages/Agent/AgentDashboard.jsx',
    'frontend/src/pages/Public/PublicHome.jsx'
];

let outputContent = `
# ULTIMATE MASTERCLASS NOTEBOOKLM PROMPT FOR ESTATESYNC CRM

**INSTRUCTIONS FOR USER:** Copy this ENTIRE file (all thousands of lines) and paste it into NotebookLM. It contains the exact prompt + the entire core codebase.

-------------------------------------------------------------------------------------------------------------------------
-------------------------------------------------------------------------------------------------------------------------

Act as an elite Distinguished Software Architect (L8) at a top-tier tech company. You are conducting an exhaustive, multi-hour technical deep dive into the "EstateSync CRM" architecture. Your goal is to generate an incredibly detailed presentation script.

The audience consists of Senior Engineers. They do NOT want high-level fluff. They want to see the code, understand the algorithms, understand the security boundaries, and understand the database constraints.

Generate a presentation script with AT LEAST 40 SLIDES. 

For EVERY single slide, output:
1. **Slide Number & Technical Title**
2. **Visual Suggestion:** Detail exactly which lines of code from the provided context should be on the screen.
3. **Bullet Points:** 5-6 extremely technical bullet points.
4. **Speaker Notes:** A massive, detailed paragraph (300+ words per slide) where you walk through the code line-by-line. Explain why annotations like @Transactional were used. Explain why React Context was chosen over Redux. Explain the exact mechanism of JWT signing and validation. Explain the JPA Specifications and Criteria Builders.

Structure the 40+ slides across these modules:
- Module 1: Relational Schema & Entity Mappings (JPA, Hibernate, Cascades, FetchTypes)
- Module 2: Spring Security Architecture (Filters, JWTs, Stateless Sessions, Password Encoders)
- Module 3: Controller Layer (REST APIs, DTOs, @PreAuthorize, Principal extraction)
- Module 4: Service Layer (Business Logic, OTP Generation, Transaction Boundaries)
- Module 5: Dynamic JPA Specifications (CriteriaBuilder, Predicates, Dynamic OR/AND clauses)
- Module 6: React Frontend Architecture (Vite, Tailwind, Component lifecycle)
- Module 7: State Management (Context API, Custom Events)
- Module 8: Axios Interceptors & Network Resilience (Global 401 handling, background heartbeat tracking)
- Module 9: The Full Execution Flow of a Lead from Generation to Conversion
- Module 10: Technical Debt, Scalability bottlenecks, and Future Enhancements

DO NOT SKIP OVER THE CODE. Use the provided source code below to generate actual, factual speaker notes based entirely on the raw code provided.

-------------------------------------------------------------------------------------------------------------------------
### RAW SOURCE CODE CONTEXT
-------------------------------------------------------------------------------------------------------------------------

`;

filesToExtract.forEach(relativePath => {
    const fullPath = path.join(projectRoot, relativePath);
    if (fs.existsSync(fullPath)) {
        const fileContent = fs.readFileSync(fullPath, 'utf8');
        outputContent += `\n\n========================================================================================\n`;
        outputContent += `FILE: ${relativePath}\n`;
        outputContent += `========================================================================================\n`;
        outputContent += `\`\`\`${relativePath.endsWith('.java') ? 'java' : 'javascript'}\n`;
        outputContent += fileContent;
        outputContent += `\n\`\`\`\n`;
    } else {
        console.warn(`File not found: ${fullPath}`);
    }
});

// Make it artificially longer with extra architectural analysis prompts
outputContent += `
-------------------------------------------------------------------------------------------------------------------------
### ADDITIONAL ARCHITECTURAL ANALYSIS PROMPTS FOR NOTEBOOKLM
-------------------------------------------------------------------------------------------------------------------------

When generating the speaker notes for the slides, explicitly analyze the following design decisions present in the code above:

1. **The Separation of Concerns**: Note how \`ManagerController\` does not contain business logic, but delegates to \`LeadService\`. 
2. **Security by Design**: Notice how \`ManagerController\` uses \`CustomUserDetails userDetails = (CustomUserDetails) authentication.getPrincipal();\` to fetch the \`managerId\`. Explain why trusting the JWT token claims is infinitely safer than accepting a \`managerId\` from a request payload (which could be spoofed).
3. **Event-Driven UI Updates**: Look at \`api.js\` and \`AuthContext.jsx\`. Explain the usage of \`window.dispatchEvent(new Event('auth-error'))\`. Explain how this solves the classic React problem of accessing Context from outside the component tree (in an Axios interceptor).
4. **Heartbeat Analytics**: Look at \`AnalyticsTracker.jsx\`. Explain the memory leak prevention (\`clearInterval\`) and the logic to ignore \`CUSTOMER\` roles from the heartbeat ping.
5. **JPA Criteria Builder**: Look at \`LeadSpecification.java\`. Explain how \`cb.or()\` in \`isManagerAuthorized\` solves the complex ORM problem of checking properties mapped across multiple joined tables without writing native SQL.

DO NOT STOP GENERATING UNTIL ALL 40+ SLIDES ARE COMPLETED IN EXCRUCIATING DETAIL.
`;

fs.writeFileSync(path.join(projectRoot, 'NotebookLM_Detailed_Prompt.txt'), outputContent);
console.log('Successfully generated massive NotebookLM prompt.');
