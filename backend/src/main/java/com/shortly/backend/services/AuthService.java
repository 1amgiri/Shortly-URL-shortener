package com.shortly.backend.services;

import com.shortly.backend.models.User;
import com.shortly.backend.repositories.UserRepository;
import org.springframework.stereotype.Service;

import java.util.Optional;

@Service
public class AuthService {

    private final UserRepository userRepository;

    public AuthService(UserRepository userRepository) {
        this.userRepository = userRepository;
    }

    public User registerUser(String name, String email, String password) {
        if (userRepository.findByEmail(email).isPresent()) {
            throw new RuntimeException("An account with this email already exists.");
        }
        User newUser = User.builder()
                .name(name)
                .email(email)
                .passwordHash(password) // Basic password for demo purposes
                .subscriptionPlan("Free")
                .build();
        return userRepository.save(newUser);
    }

    public User loginUser(String email, String password) {
        Optional<User> userOpt = userRepository.findByEmail(email);
        if (userOpt.isEmpty() || !userOpt.get().getPasswordHash().equals(password)) {
            throw new RuntimeException("Invalid email or password combination.");
        }
        return userOpt.get();
    }

    public User getUserById(String id) {
        return userRepository.findById(id).orElseThrow(() -> new RuntimeException("User not found"));
    }

    public User updateUserProfile(String id, String name, String email, String subscriptionPlan) {
        User user = getUserById(id);
        if (name != null) user.setName(name);
        if (email != null) user.setEmail(email);
        if (subscriptionPlan != null) user.setSubscriptionPlan(subscriptionPlan);
        return userRepository.save(user);
    }

    public User rotateApiKey(String id) {
        User user = getUserById(id);
        user.setApiKey("sk_" + java.util.UUID.randomUUID().toString().replace("-", "").substring(0, 20));
        return userRepository.save(user);
    }
}
