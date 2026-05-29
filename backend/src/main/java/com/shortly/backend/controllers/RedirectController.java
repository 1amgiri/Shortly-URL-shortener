package com.shortly.backend.controllers;

import com.shortly.backend.models.AnalyticsRecord;
import com.shortly.backend.models.URLRecord;
import com.shortly.backend.services.AnalyticsService;
import com.shortly.backend.services.UrlService;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Controller;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestParam;

import java.time.Instant;
import java.util.List;
import java.util.Arrays;

@Controller
public class RedirectController {

    private final UrlService urlService;
    private final AnalyticsService analyticsService;

    public RedirectController(UrlService urlService, AnalyticsService analyticsService) {
        this.urlService = urlService;
        this.analyticsService = analyticsService;
    }

    @GetMapping("/r/{code}")
    public ResponseEntity<String> redirect(@PathVariable String code, @RequestParam(required = false, name = "p") String password, HttpServletRequest request) {
        URLRecord record = urlService.getUrlByCode(code).orElse(null);

        if (record == null || !record.isActive()) {
            return ResponseEntity.notFound().build(); // Let standard client routes handle fallback (not found card)
        }

        // Check expiration date
        if (record.getExpiresAt() != null && !record.getExpiresAt().isEmpty()) {
            try {
                Instant expires = Instant.parse(record.getExpiresAt() + "T00:00:00Z"); // simple parser
                if (expires.isBefore(Instant.now())) {
                    return ResponseEntity.status(HttpStatus.GONE).body("<html><body><h1>Link Expired</h1></body></html>"); // simplified for brevity
                }
            } catch (Exception ignored) {}
        }

        // Check password prompt
        if (record.getPassword() != null && !record.getPassword().isEmpty()) {
            if (password == null || !password.equals(record.getPassword())) {
                return ResponseEntity.status(HttpStatus.FORBIDDEN).body("<html><body><h1>Password Required</h1><form><input name='p' type='password'/><input type='submit'/></form></body></html>");
            }
        }

        // Parse telemetry details for visitors (simplified for Java)
        String ipAddress = request.getRemoteAddr();
        String userAgent = request.getHeader("User-Agent");
        String referrer = request.getHeader("Referer");

        AnalyticsRecord analytics = AnalyticsRecord.builder()
                .urlId(record.getId())
                .ipAddress(ipAddress)
                .country("US") // Mocked for Java backend 
                .city("Mock City")
                .browser(userAgent != null ? (userAgent.contains("Chrome") ? "Chrome" : "Other") : "Unknown")
                .device("Desktop")
                .referrer(referrer != null ? referrer : "Direct")
                .build();
        
        analyticsService.recordClick(analytics);

        HttpHeaders headers = new HttpHeaders();
        headers.add("Location", record.getOriginalUrl());
        return new ResponseEntity<>(headers, HttpStatus.FOUND);
    }

    @GetMapping("/{code}")
    public Object fallbackRedirect(@PathVariable String code, HttpServletRequest request) {
        List<String> reservedWords = Arrays.asList("api", "assets", "src", "index.html", "dashboard", "analytics", "profile", "pricing", "features", "login", "register");

        if (reservedWords.contains(code.toLowerCase()) || code.contains(".")) {
            return ResponseEntity.notFound().build(); // Or forward to static index.html in a real SPA setup
        }

        URLRecord record = urlService.getUrlByCode(code).orElse(null);
        if (record != null && record.isActive()) {
            HttpHeaders headers = new HttpHeaders();
            headers.add("Location", "/r/" + code);
            return new ResponseEntity<>(headers, HttpStatus.FOUND);
        }
        
        return ResponseEntity.notFound().build();
    }
}
