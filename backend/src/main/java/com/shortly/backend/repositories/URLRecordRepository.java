package com.shortly.backend.repositories;

import com.shortly.backend.models.URLRecord;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface URLRecordRepository extends JpaRepository<URLRecord, String> {
    Optional<URLRecord> findByShortCode(String shortCode);
    Optional<URLRecord> findByCustomAlias(String customAlias);
    List<URLRecord> findByUserId(String userId);
}
