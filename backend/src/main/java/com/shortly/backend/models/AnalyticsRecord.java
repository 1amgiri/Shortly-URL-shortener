package com.shortly.backend.models;

import jakarta.persistence.*;
import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;
import lombok.Builder;
import org.hibernate.annotations.GenericGenerator;

import java.time.LocalDateTime;

@Entity
@Table(name = "analytics")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class AnalyticsRecord {
    
    @Id
    @GeneratedValue(generator = "uuid2")
    @GenericGenerator(name = "uuid2", strategy = "uuid2")
    @Column(length = 36)
    private String id;
    
    @Column(nullable = false)
    private String urlId;
    
    private String ipAddress;
    private String country;
    private String city;
    private String browser;
    private String device;
    private String referrer;
    
    private String timestamp; // Kept as String to match frontend expected format easily, or use LocalDateTime
    
    @PrePersist
    protected void onCreate() {
        if (this.timestamp == null) {
            this.timestamp = LocalDateTime.now().toString();
        }
    }
}
