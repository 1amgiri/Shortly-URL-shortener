package com.shortly.backend.services;

import com.shortly.backend.models.AnalyticsRecord;
import com.shortly.backend.repositories.AnalyticsRecordRepository;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
public class AnalyticsService {

    private final AnalyticsRecordRepository analyticsRepository;

    public AnalyticsService(AnalyticsRecordRepository analyticsRepository) {
        this.analyticsRepository = analyticsRepository;
    }

    public void recordClick(AnalyticsRecord record) {
        analyticsRepository.save(record);
    }

    public List<AnalyticsRecord> getAnalyticsForUrl(String urlId) {
        return analyticsRepository.findByUrlId(urlId);
    }

    public List<AnalyticsRecord> getAnalyticsForUrls(List<String> urlIds) {
        return analyticsRepository.findByUrlIdIn(urlIds);
    }
}
