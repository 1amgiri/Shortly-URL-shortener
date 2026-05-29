package com.shortly.backend.models;

import jakarta.persistence.*;
import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;
import lombok.Builder;
import org.hibernate.annotations.GenericGenerator;

import java.time.LocalDateTime;
import java.util.List;

@Entity
@Table(name = "url_records")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class URLRecord {
    
    @Id
    @GeneratedValue(generator = "uuid2")
    @GenericGenerator(name = "uuid2", strategy = "uuid2")
    @Column(length = 36)
    private String id;
    
    @Column(nullable = false)
    private String userId; // Reference to User.id (soft relation to match previous mock db style or hard relation if preferred)
    
    @Column(nullable = false, length = 2048)
    private String originalUrl;
    
    @Column(nullable = false, unique = true)
    private String shortCode;
    
    @Column(unique = true)
    private String customAlias;
    
    private String expiresAt; // ISO String as in frontend
    
    private String password;
    
    private String title;
    
    @Column(length = 1000)
    private String description;
    
    @ElementCollection(fetch = FetchType.EAGER)
    private List<String> tags;
    
    @Column(nullable = false)
    private boolean isActive = true;
    
    private LocalDateTime createdAt;
    
    @PrePersist
    protected void onCreate() {
        this.createdAt = LocalDateTime.now();
    }
}
