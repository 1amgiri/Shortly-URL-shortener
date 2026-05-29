package com.shortly.backend.services;

import com.shortly.backend.models.URLRecord;
import com.shortly.backend.repositories.URLRecordRepository;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Optional;

@Service
public class UrlService {

    private final URLRecordRepository urlRepository;

    public UrlService(URLRecordRepository urlRepository) {
        this.urlRepository = urlRepository;
    }

    public URLRecord createUrl(URLRecord record) {
        if (record.getCustomAlias() != null && !record.getCustomAlias().isEmpty()) {
            if (urlRepository.findByCustomAlias(record.getCustomAlias()).isPresent() ||
                urlRepository.findByShortCode(record.getCustomAlias()).isPresent()) {
                throw new RuntimeException("The custom seal/alias is already in use by another link.");
            }
        }
        
        if (record.getShortCode() == null || record.getShortCode().isEmpty()) {
            record.setShortCode(generateShortCode());
        }
        
        return urlRepository.save(record);
    }
    
    private String generateShortCode() {
        String chars = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
        StringBuilder code = new StringBuilder();
        boolean unique = false;
        int attempts = 0;
        
        while (!unique && attempts < 10) {
            code.setLength(0);
            for (int i = 0; i < 6; i++) {
                code.append(chars.charAt((int) (Math.random() * chars.length())));
            }
            if (urlRepository.findByShortCode(code.toString()).isEmpty() && 
                urlRepository.findByCustomAlias(code.toString()).isEmpty()) {
                unique = true;
            }
            attempts++;
        }
        return code.toString();
    }

    public List<URLRecord> getUserUrls(String userId) {
        return urlRepository.findByUserId(userId);
    }

    public Optional<URLRecord> getUrlById(String id) {
        return urlRepository.findById(id);
    }

    public Optional<URLRecord> getUrlByCode(String code) {
        Optional<URLRecord> byCode = urlRepository.findByShortCode(code);
        if (byCode.isPresent()) return byCode;
        return urlRepository.findByCustomAlias(code);
    }

    public URLRecord updateUrl(URLRecord record) {
        return urlRepository.save(record);
    }

    public void deleteUrl(String id) {
        urlRepository.deleteById(id);
    }
    
    public List<URLRecord> getAllUrls() {
        return urlRepository.findAll();
    }
}
