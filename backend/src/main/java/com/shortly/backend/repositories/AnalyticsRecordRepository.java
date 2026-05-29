package com.shortly.backend.repositories;

import com.shortly.backend.models.AnalyticsRecord;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface AnalyticsRecordRepository extends JpaRepository<AnalyticsRecord, String> {
    List<AnalyticsRecord> findByUrlId(String urlId);
    List<AnalyticsRecord> findByUrlIdIn(List<String> urlIds);
}
