package com.shortly.backend.controllers;

import com.shortly.backend.models.URLRecord;
import com.shortly.backend.models.User;
import com.shortly.backend.services.UrlService;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/urls")
public class UrlController {

    private final UrlService urlService;

    public UrlController(UrlService urlService) {
        this.urlService = urlService;
    }

    @PostMapping
    public ResponseEntity<?> createUrl(@RequestBody URLRecord record, HttpServletRequest request) {
        if (record.getOriginalUrl() == null || record.getOriginalUrl().trim().isEmpty()) {
            return ResponseEntity.badRequest().body(Map.of("error", "Original URL is required."));
        }

        String target = record.getOriginalUrl().trim();
        if (!target.matches("(?i)^https?://.*")) {
            target = "https://" + target;
        }
        record.setOriginalUrl(target);

        // Associate user if logged in
        User user = (User) request.getAttribute("user");
        if (user != null) {
            record.setUserId(user.getId());
            // Free plan limit
            if ("Free".equals(user.getSubscriptionPlan())) {
                long count = urlService.getUserUrls(user.getId()).size();
                if (count >= 5) {
                    return ResponseEntity.status(403).body(Map.of("error", "Free Plan limit exceeded (Max 5 URLs). Upgrade to Pro for unlimited links."));
                }
            }
        } else {
            record.setUserId("anonymous");
        }

        if (record.getTitle() == null) {
            record.setTitle(record.getOriginalUrl().replaceFirst("(?i)^https?://", "").split("/")[0]);
        }

        try {
            URLRecord saved = urlService.createUrl(record);
            return ResponseEntity.ok(Map.of("success", true, "url", saved));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    @PostMapping("/bulk")
    public ResponseEntity<?> bulkCreateUrls(@RequestBody Map<String, List<Map<String, Object>>> body, HttpServletRequest request) {
        User user = (User) request.getAttribute("user");
        if (user == null) return ResponseEntity.status(401).body(Map.of("error", "Unauthorized"));

        List<Map<String, Object>> urlsList = body.get("urlsList");
        if (urlsList == null || urlsList.isEmpty()) {
            return ResponseEntity.badRequest().body(Map.of("error", "Missing or invalid list of URLs for bulk treatment."));
        }

        List<URLRecord> results = new ArrayList<>();
        for (Map<String, Object> item : urlsList) {
            String originalUrl = (String) item.get("originalUrl");
            if (originalUrl == null || originalUrl.trim().isEmpty()) continue;

            String target = originalUrl.trim();
            if (!target.matches("(?i)^https?://.*")) {
                target = "https://" + target;
            }

            URLRecord record = new URLRecord();
            record.setUserId(user.getId());
            record.setOriginalUrl(target);
            
            String title = (String) item.get("title");
            record.setTitle(title != null ? title : target.replaceFirst("(?i)^https?://", "").split("/")[0]);
            record.setDescription((String) item.get("description"));
            
            List<String> tags = (List<String>) item.get("tags");
            if (tags != null) record.setTags(tags);

            try {
                results.add(urlService.createUrl(record));
            } catch (Exception ignored) {}
        }
        return ResponseEntity.ok(Map.of("success", true, "urls", results));
    }

    @GetMapping
    public ResponseEntity<?> getUserUrls(HttpServletRequest request) {
        User user = (User) request.getAttribute("user");
        if (user == null) return ResponseEntity.status(401).body(Map.of("error", "Unauthorized"));

        List<URLRecord> list = urlService.getUserUrls(user.getId());
        return ResponseEntity.ok(Map.of("success", true, "urls", list));
    }

    @PutMapping("/{id}")
    public ResponseEntity<?> updateUrl(@PathVariable String id, @RequestBody Map<String, Object> body, HttpServletRequest request) {
        User user = (User) request.getAttribute("user");
        if (user == null) return ResponseEntity.status(401).body(Map.of("error", "Unauthorized"));

        URLRecord original = urlService.getUrlById(id).orElse(null);
        if (original == null || !original.getUserId().equals(user.getId())) {
            return ResponseEntity.status(404).body(Map.of("error", "URL record not found or access denied."));
        }

        String customAlias = (String) body.get("customAlias");
        if (customAlias != null && !customAlias.equals(original.getCustomAlias())) {
            URLRecord aliasInUse = urlService.getUrlByCode(customAlias).orElse(null);
            if (aliasInUse != null && !aliasInUse.getId().equals(id)) {
                return ResponseEntity.badRequest().body(Map.of("error", "Custom alias already claimed."));
            }
        }

        if (body.containsKey("originalUrl")) original.setOriginalUrl((String) body.get("originalUrl"));
        if (body.containsKey("customAlias")) original.setCustomAlias(customAlias);
        if (body.containsKey("expiresAt")) original.setExpiresAt((String) body.get("expiresAt"));
        if (body.containsKey("password")) original.setPassword((String) body.get("password"));
        if (body.containsKey("title")) original.setTitle((String) body.get("title"));
        if (body.containsKey("description")) original.setDescription((String) body.get("description"));
        if (body.containsKey("tags")) original.setTags((List<String>) body.get("tags"));
        if (body.containsKey("isActive")) original.setActive((Boolean) body.get("isActive"));

        URLRecord updated = urlService.updateUrl(original);
        return ResponseEntity.ok(Map.of("success", true, "url", updated));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<?> deleteUrl(@PathVariable String id, HttpServletRequest request) {
        User user = (User) request.getAttribute("user");
        if (user == null) return ResponseEntity.status(401).body(Map.of("error", "Unauthorized"));

        URLRecord original = urlService.getUrlById(id).orElse(null);
        if (original == null || !original.getUserId().equals(user.getId())) {
            return ResponseEntity.status(404).body(Map.of("error", "URL not found or access denied."));
        }

        urlService.deleteUrl(id);
        return ResponseEntity.ok(Map.of("success", true, "message", "URL deleted successfully."));
    }
}
