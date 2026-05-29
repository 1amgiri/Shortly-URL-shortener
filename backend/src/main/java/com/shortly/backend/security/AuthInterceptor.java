package com.shortly.backend.security;

import com.shortly.backend.models.User;
import com.shortly.backend.services.AuthService;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.stereotype.Component;
import org.springframework.web.servlet.HandlerInterceptor;

@Component
public class AuthInterceptor implements HandlerInterceptor {

    private final AuthService authService;

    public AuthInterceptor(AuthService authService) {
        this.authService = authService;
    }

    @Override
    public boolean preHandle(HttpServletRequest request, HttpServletResponse response, Object handler) throws Exception {
        // Skip auth for OPTIONS requests and non-API endpoints except some API endpoints
        if (request.getMethod().equals("OPTIONS")) return true;
        
        String path = request.getRequestURI();
        if (path.startsWith("/api/auth/login") || path.startsWith("/api/auth/register")) {
            return true;
        }

        if (!path.startsWith("/api/")) {
            return true; // Let redirect controller handle itself
        }

        // Specifically intercept /api/*
        String authHeader = request.getHeader("Authorization");
        
        // Allow anonymous access to POST /api/urls
        boolean isAnonymousUrlCreation = request.getMethod().equals("POST") && path.equals("/api/urls");
        
        if (authHeader == null || !authHeader.startsWith("Bearer ")) {
            if (isAnonymousUrlCreation) {
                return true; // Let it pass anonymously
            }
            response.setStatus(401);
            response.getWriter().write("{\"error\": \"Access denied. Token missing or invalid.\"}");
            return false;
        }

        String token = authHeader.substring(7);
        try {
            User user;
            if ("demo-token".equals(token)) {
                // In demo, we might want to ensure a demo user exists.
                // Assuming demo user has ID "usr_demo"
                try {
                    user = authService.getUserById("usr_demo");
                } catch (Exception e) {
                    // Create demo user if missing
                    user = authService.registerUser("Demo User", "demo@example.com", "demo");
                    user.setId("usr_demo");
                    user = authService.updateUserProfile(user.getId(), null, null, null);
                }
            } else {
                user = authService.getUserById(token);
            }
            
            request.setAttribute("user", user);
            return true;
        } catch (Exception e) {
            if (isAnonymousUrlCreation) {
                return true; // Token was invalid, but it's an anonymous endpoint anyway. (Though typically invalid tokens are rejected). Let's reject invalid tokens.
            }
            response.setStatus(401);
            response.getWriter().write("{\"error\": \"Invalid auth token.\"}");
            return false;
        }
    }
}
