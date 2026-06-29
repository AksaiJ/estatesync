const fs = require("fs");
const docx = require("docx");
const { Document, Packer, Paragraph, TextRun, HeadingLevel } = docx;

const doc = new Document({
    creator: "EstateSync AI Assistant",
    title: "EstateSync CRM Project Report",
    description: "Detailed report of features, architecture, and recent updates",
    sections: [
        {
            properties: {},
            children: [
                new Paragraph({
                    text: "EstateSync CRM Project Report",
                    heading: HeadingLevel.TITLE,
                    spacing: { after: 300 }
                }),
                new Paragraph({
                    children: [
                        new TextRun({ text: "Generated on: ", bold: true }),
                        new TextRun(new Date().toLocaleDateString())
                    ],
                    spacing: { after: 400 }
                }),
                new Paragraph({
                    text: "1. Executive Summary",
                    heading: HeadingLevel.HEADING_1,
                    spacing: { before: 200, after: 200 }
                }),
                new Paragraph({
                    text: "EstateSync is a comprehensive Customer Relationship Management (CRM) platform tailored for the real estate industry. It facilitates property management, lead tracking, and role-based access control across Administrators, Managers, and Agents. The system features a modern React frontend with Vite and a robust Spring Boot backend."
                }),
                new Paragraph({
                    text: "2. Key Features Implemented",
                    heading: HeadingLevel.HEADING_1,
                    spacing: { before: 400, after: 200 }
                }),
                new Paragraph({
                    children: [
                        new TextRun({ text: "• Lead Management: ", bold: true }),
                        new TextRun("Public users can express interest in properties, generating 'Leads'. Managers assign these leads to agents, creating 'Opportunities'.")
                    ]
                }),
                new Paragraph({
                    children: [
                        new TextRun({ text: "• Role-Based Dashboards: ", bold: true }),
                        new TextRun("Distinct dashboards for Admins, Managers, and Agents with tailored KPI metrics and data visibility.")
                    ]
                }),
                new Paragraph({
                    children: [
                        new TextRun({ text: "• Analytics Tracking: ", bold: true }),
                        new TextRun("Advanced analytics featuring automated page visit tracking and a secure employee 'heartbeat' ping to monitor active sessions without abruptly logging users out from public pages.")
                    ]
                }),
                new Paragraph({
                    children: [
                        new TextRun({ text: "• Multi-Region Hierarchy: ", bold: true }),
                        new TextRun("Properties and Managers are segmented by regions (e.g., Pune, Aurangabad). Enhanced assignment logic enables admins to bypass region locks when assigning a lead to a specific manager.")
                    ]
                }),
                new Paragraph({
                    text: "3. Recent Technical Enhancements",
                    heading: HeadingLevel.HEADING_1,
                    spacing: { before: 400, after: 200 }
                }),
                new Paragraph({
                    children: [
                        new TextRun({ text: "• UI Validations: ", bold: true }),
                        new TextRun("Added confirmation modals for sensitive actions, such as when a Manager assigns an agent to an opportunity.")
                    ]
                }),
                new Paragraph({
                    children: [
                        new TextRun({ text: "• Session Management: ", bold: true }),
                        new TextRun("Fixed token interceptors so expired background heartbeat requests do not forcefully redirect public homepage visitors to the staff login.")
                    ]
                }),
                new Paragraph({
                    children: [
                        new TextRun({ text: "• Backend Specifications: ", bold: true }),
                        new TextRun("Refactored JPA specifications (LeadSpecification) to use dynamic 'OR' clauses, ensuring managers see both region-matched leads and explicitly assigned leads.")
                    ]
                }),
                new Paragraph({
                    text: "4. Architecture Stack",
                    heading: HeadingLevel.HEADING_1,
                    spacing: { before: 400, after: 200 }
                }),
                new Paragraph({
                    children: [
                        new TextRun({ text: "Frontend: ", bold: true }),
                        new TextRun("React, Vite, Tailwind CSS, Recharts for data visualization, React Router for navigation.")
                    ]
                }),
                new Paragraph({
                    children: [
                        new TextRun({ text: "Backend: ", bold: true }),
                        new TextRun("Java, Spring Boot, Spring Security (JWT authentication), Spring Data JPA.")
                    ]
                }),
                new Paragraph({
                    children: [
                        new TextRun({ text: "Database: ", bold: true }),
                        new TextRun("Relational DB via JPA/Hibernate with comprehensive schema for Users, Regions, Properties, Leads, and Opportunities.")
                    ]
                }),
            ],
        },
    ],
});

Packer.toBuffer(doc).then((buffer) => {
    fs.writeFileSync("EstateSync_Detailed_Report.docx", buffer);
    console.log("Document created successfully");
});
