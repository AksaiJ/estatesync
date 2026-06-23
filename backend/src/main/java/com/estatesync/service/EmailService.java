package com.estatesync.service;

import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.stereotype.Service;
import java.math.BigDecimal;

@Service
public class EmailService {

    private final JavaMailSender mailSender;
    private final String FROM_ADDRESS = "noreply@estatesync.com";

    public EmailService(JavaMailSender mailSender) {
        this.mailSender = mailSender;
    }

    public void sendClosedWonAcknowledgement(String toEmail, String customerName, String propertyName, BigDecimal finalPrice) {
        if (toEmail == null || toEmail.isEmpty()) return;

        try {
            SimpleMailMessage message = new SimpleMailMessage();
            message.setFrom(FROM_ADDRESS);
            message.setTo(toEmail);
            message.setSubject("Congratulations on your new property - " + propertyName + "!");
            message.setText("Dear " + customerName + ",\n\n" +
                    "Congratulations on securing " + propertyName + "! We are thrilled to welcome you to your new property.\n\n" +
                    "Transaction Details:\n" +
                    "Property: " + propertyName + "\n" +
                    "Final Price: $" + finalPrice + "\n\n" +
                    "Our team will be in touch shortly to finalize the documentation and next steps.\n\n" +
                    "Best Regards,\n" +
                    "The EstateSync Team");

            mailSender.send(message);
        } catch (Exception e) {
            System.err.println("Failed to send Closed Won acknowledgment email: " + e.getMessage());
        }
    }
    public void sendVisitScheduledEmail(String toEmail, String customerName, String propertyName, String visitDate, String agentName) {
        if (toEmail == null || toEmail.isEmpty()) return;

        try {
            SimpleMailMessage message = new SimpleMailMessage();
            message.setFrom(FROM_ADDRESS);
            message.setTo(toEmail);
            message.setSubject("Property Visit Scheduled: " + propertyName);
            message.setText("Dear " + customerName + ",\n\n" +
                    "Your visit for " + propertyName + " has been successfully scheduled.\n\n" +
                    "Visit Details:\n" +
                    "Property: " + propertyName + "\n" +
                    "Date & Time: " + visitDate + "\n" +
                    "Agent: " + agentName + "\n\n" +
                    "Please let us know if you need to reschedule or have any questions.\n\n" +
                    "Best Regards,\n" +
                    "The EstateSync Team");

            mailSender.send(message);
        } catch (Exception e) {
            System.err.println("Failed to send visit scheduled email: " + e.getMessage());
        }
    }
}
