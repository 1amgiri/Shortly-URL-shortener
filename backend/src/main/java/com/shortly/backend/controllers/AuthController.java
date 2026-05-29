package com.shortly.backend.controllers;

import com.shortly.backend.models.User;
import com.shortly.backend.services.AuthService;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;
import java.util.HashMap;

@RestController
@RequestMapping("/api/auth")
public class AuthController {

    private final AuthService authService;

    public AuthController(AuthService authService) {
        this.authService = authService;
    }

    private Map<String, Object> formatUserResponse(User user) {
        Map<String, Object> userMap = new HashMap<>();
        userMap.put("id", user.getId());
        userMap.put("name", user.getName());
        userMap.put("email", user.getEmail());
        userMap.put("subscriptionPlan", user.getSubscriptionPlan());
        userMap.put("apiKey", user.getApiKey());

        Map<String, Object> response = new HashMap<>();
        response.put("success", true);
        response.put("token", user.getId()); // Using ID as token in this mock
        response.put("user", userMap);
        return response;
    }

    @PostMapping("/register")
    public ResponseEntity<?> register(@RequestBody Map<String, String> body) {
        try {
            String name = body.get("name");
            String email = body.get("email");
            String password = body.get("password");
            
            if (name == null || email == null || password == null) {
                return ResponseEntity.badRequest().body(Map.of("error", "All profile fields are required."));
            }
            
            User newUser = authService.registerUser(name, email, password);
            return ResponseEntity.ok(formatUserResponse(newUser));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    @PostMapping("/login")
    public ResponseEntity<?> login(@RequestBody Map<String, String> body) {
        try {
            String email = body.get("email");
            String password = body.get("password");
            
            if (email == null || password == null) {
                return ResponseEntity.badRequest().body(Map.of("error", "Email and password are required."));
            }
            
            User user = authService.loginUser(email, password);
            return ResponseEntity.ok(formatUserResponse(user));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    @GetMapping("/me")
    public ResponseEntity<?> getMe(HttpServletRequest request) {
        User user = (User) request.getAttribute("user");
        if (user == null) return ResponseEntity.status(401).body(Map.of("error", "Not logged in"));
        return ResponseEntity.ok(formatUserResponse(user));
    }

    @PostMapping("/profile")
    public ResponseEntity<?> updateProfile(@RequestBody Map<String, String> body, HttpServletRequest request) {
        User user = (User) request.getAttribute("user");
        if (user == null) return ResponseEntity.status(401).body(Map.of("error", "Not logged in"));
        
        try {
            User updated = authService.updateUserProfile(user.getId(), body.get("name"), body.get("email"), body.get("subscriptionPlan"));
            return ResponseEntity.ok(formatUserResponse(updated));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("error", "Update failed."));
        }
    }

    @PostMapping("/key-rotate")
    public ResponseEntity<?> rotateKey(HttpServletRequest request) {
        User user = (User) request.getAttribute("user");
        if (user == null) return ResponseEntity.status(401).body(Map.of("error", "Not logged in"));
        
        User updated = authService.rotateApiKey(user.getId());
        return ResponseEntity.ok(Map.of("success", true, "apiKey", updated.getApiKey()));
    }
}
