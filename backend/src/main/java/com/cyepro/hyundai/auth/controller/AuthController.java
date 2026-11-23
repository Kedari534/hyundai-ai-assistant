package com.cyepro.hyundai.auth.controller;

import com.cyepro.hyundai.auth.dto.AuthResponse;
import com.cyepro.hyundai.auth.dto.LoginRequest;
import com.cyepro.hyundai.auth.dto.RefreshRequest;
import com.cyepro.hyundai.auth.dto.RegisterRequest;
import com.cyepro.hyundai.auth.service.AuthService;
import com.cyepro.hyundai.user.dto.UserDTO;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;

/**
 * Authentication REST controller — thin by design.
 *
 * WHY thin controllers?
 * - Controllers should only: parse the HTTP request, call the service,
 *   and format the HTTP response. Business logic belongs in services.
 * - This makes the service independently testable without HTTP overhead.
 *
 * Endpoints:
 *   POST /api/auth/register   → 201 Created + AuthResponse
 *   POST /api/auth/login      → 200 OK + AuthResponse
 *   POST /api/auth/refresh    → 200 OK + AuthResponse
 *   GET  /api/auth/me         → 200 OK + UserDTO  [protected]
 */
@RestController
@RequestMapping("/api/auth")
public class AuthController {

    private final AuthService authService;

    public AuthController(AuthService authService) {
        this.authService = authService;
    }

    /**
     * Register a new user account.
     * @Valid triggers Bean Validation on RegisterRequest before the method runs.
     * Returns 201 Created — semantically correct for resource creation.
     */
    @PostMapping("/register")
    public ResponseEntity<AuthResponse> register(@Valid @RequestBody RegisterRequest request) {
        AuthResponse response = authService.register(request);
        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }

    /**
     * Authenticate with email + password, receive JWT tokens.
     */
    @PostMapping("/login")
    public ResponseEntity<AuthResponse> login(@Valid @RequestBody LoginRequest request) {
        AuthResponse response = authService.login(request);
        return ResponseEntity.ok(response);
    }

    /**
     * Exchange a valid refresh token for a new access token.
     */
    @PostMapping("/refresh")
    public ResponseEntity<AuthResponse> refresh(@Valid @RequestBody RefreshRequest request) {
        AuthResponse response = authService.refresh(request);
        return ResponseEntity.ok(response);
    }

    /**
     * Return the currently authenticated user's profile.
     * @AuthenticationPrincipal is injected by Spring Security from the JWT filter.
     * This endpoint is protected — no JWT → 403 (handled by Spring Security).
     */
    @GetMapping("/me")
    public ResponseEntity<UserDTO> me(@AuthenticationPrincipal UserDetails principal) {
        UserDTO user = authService.getCurrentUser(principal.getUsername());
        return ResponseEntity.ok(user);
    }
}
