package com.shortly.backend.controllers;

import com.shortly.backend.models.AnalyticsRecord;
import com.shortly.backend.models.URLRecord;
import com.shortly.backend.models.User;
import com.shortly.backend.services.AnalyticsService;
import com.shortly.backend.services.UrlService;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/analytics")
public class AnalyticsController {

    private final UrlService urlService;
    private final AnalyticsService analyticsService;

    public AnalyticsController(UrlService urlService, AnalyticsService analyticsService) {
        this.urlService = urlService;
        this.analyticsService = analyticsService;
    }

    @GetMapping
    public ResponseEntity<?> getDashboardAnalytics(HttpServletRequest request) {
        User user = (User) request.getAttribute("user");
        if (user == null) return ResponseEntity.status(401).body(Map.of("error", "Unauthorized"));

        List<URLRecord> userUrls = urlService.getUserUrls(user.getId());
        List<String> urlIds = userUrls.stream().map(URLRecord::getId).collect(Collectors.toList());

        List<AnalyticsRecord> userAnalytics = analyticsService.getAnalyticsForUrls(urlIds);

        return ResponseEntity.ok(Map.of(
                "success", true,
                "totalUrls", userUrls.size(),
                "totalClicks", userAnalytics.size(),
                "urls", userUrls,
                "analytics", userAnalytics
        ));
    }

    @GetMapping("/{urlId}")
    public ResponseEntity<?> getSingleUrlAnalytics(@PathVariable String urlId, HttpServletRequest request) {
        User user = (User) request.getAttribute("user");
        if (user == null) return ResponseEntity.status(401).body(Map.of("error", "Unauthorized"));

        URLRecord urlRecord = urlService.getUrlById(urlId).orElse(null);
        if (urlRecord == null || !urlRecord.getUserId().equals(user.getId())) {
            return ResponseEntity.status(404).body(Map.of("error", "URL not found or unauthorized access."));
        }

        List<AnalyticsRecord> analytics = analyticsService.getAnalyticsForUrl(urlId);
        return ResponseEntity.ok(Map.of(
                "success", true,
                "url", urlRecord,
                "analytics", analytics
        ));
    }

    @GetMapping(value = "/export/{urlId}", produces = "text/csv")
    public void exportCsv(@PathVariable String urlId, HttpServletRequest request, HttpServletResponse response) throws Exception {
        // Simple auth check via header or query param could go here for csv download
        // In the Express app, we allowed token as a query param `?token=...` or Auth header
        String token = request.getParameter("token");
        User user = (User) request.getAttribute("user");
        
        URLRecord urlRecord = urlService.getUrlById(urlId).orElse(null);
        if (urlRecord == null || user == null || !urlRecord.getUserId().equals(user.getId())) {
            response.setStatus(404);
            return;
        }

        List<AnalyticsRecord> analytics = analyticsService.getAnalyticsForUrl(urlId);

        StringBuilder csv = new StringBuilder("ID,IP Address,Country,City,Browser,Device,Referrer,Timestamp\r\n");
        for (AnalyticsRecord row : analytics) {
            csv.append(String.format("%s,\"%s\",\"%s\",\"%s\",\"%s\",\"%s\",\"%s\",\"%s\"\r\n",
                    row.getId(), row.getIpAddress(), row.getCountry(), row.getCity(),
                    row.getBrowser(), row.getDevice(), row.getReferrer(), row.getTimestamp()));
        }

        response.setContentType("text/csv");
        response.setHeader("Content-Disposition", "attachment; filename=analytics_" + urlRecord.getShortCode() + ".csv");
        response.getWriter().write(csv.toString());
    }
}
