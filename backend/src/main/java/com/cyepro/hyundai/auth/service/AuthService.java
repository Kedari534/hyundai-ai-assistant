package com.cyepro.hyundai.auth.service;

import com.cyepro.hyundai.auth.dto.AuthResponse;
import com.cyepro.hyundai.auth.dto.LoginRequest;
import com.cyepro.hyundai.auth.dto.RefreshRequest;
import com.cyepro.hyundai.auth.dto.RegisterRequest;
import com.cyepro.hyundai.common.exception.BusinessException;
import com.cyepro.hyundai.user.dto.UserDTO;
import com.cyepro.hyundai.user.entity.User;
import com.cyepro.hyundai.user.repository.UserRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * Authentication business logic.
 *
 * WHY use AuthenticationManager for login (not check password directly)?
 * - AuthenticationManager is Spring Security's standard authentication pipeline.
 * - It automatically handles: BCrypt verify, account-locked/disabled checks,
 *   and fires the right events (e.g. for audit logging, brute-force protection).
 * - Calling passwordEncoder.matches() directly would bypass all of that.
 *
 * WHY is register @Transactional?
 * - If anything fails after existsByEmail check but before save completes,
 *   the whole operation rolls back. No orphaned/partial records.
 */
@Service
@Transactional(readOnly = true)
public class AuthService {

    private static final Logger log = LoggerFactory.getLogger(AuthService.class);

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final AuthenticationManager authenticationManager;
    private final JwtService jwtService;

    public AuthService(UserRepository userRepository,
                       PasswordEncoder passwordEncoder,
                       AuthenticationManager authenticationManager,
                       JwtService jwtService) {
        this.userRepository = userRepository;
        this.passwordEncoder = passwordEncoder;
        this.authenticationManager = authenticationManager;
        this.jwtService = jwtService;
    }

    // ── Register ────────────────────────────────────────────────────────

    @Transactional
    public AuthResponse register(RegisterRequest request) {
        // Normalize email to lowercase — "User@Example.com" and "user@example.com" are the same
        String email = request.email().toLowerCase().trim();

        if (userRepository.existsByEmail(email)) {
            // 409 Conflict — not 400 Bad Request, because the input is valid but conflicts with existing state
            throw new BusinessException("An account with this email already exists.", HttpStatus.CONFLICT);
        }

        User user = User.builder()
                .email(email)
                .passwordHash(passwordEncoder.encode(request.password()))
                .fullName(request.fullName().trim())
                .role("USER")
                .build();

        userRepository.save(user);
        log.info("Registered new user: {}", email);

        return buildAuthResponse(user);
    }

    // ── Login ───────────────────────────────────────────────────────────

    public AuthResponse login(LoginRequest request) {
        String email = request.email().toLowerCase().trim();

        try {
            // authenticate() throws BadCredentialsException if wrong password,
            // DisabledException if account disabled, etc.
            authenticationManager.authenticate(
                    new UsernamePasswordAuthenticationToken(email, request.password())
            );
        } catch (BadCredentialsException e) {
            // Use a generic message — don't tell attacker whether email or password is wrong
            throw new BusinessException("Invalid email or password.", HttpStatus.UNAUTHORIZED);
        }

        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new BusinessException("User not found.", HttpStatus.NOT_FOUND));

        log.info("User logged in: {}", email);
        return buildAuthResponse(user);
    }

    // ── Refresh ─────────────────────────────────────────────────────────

    public AuthResponse refresh(RefreshRequest request) {
        String token = request.refreshToken();

        if (!jwtService.isRefreshTokenValid(token)) {
            throw new BusinessException("Invalid or expired refresh token.", HttpStatus.UNAUTHORIZED);
        }

        String email = jwtService.extractEmail(token);
        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new BusinessException("User not found.", HttpStatus.NOT_FOUND));

        // Issue a new access token; keep the same refresh token (rotation is optional for MVP)
        String newAccessToken = jwtService.generateToken(user);
        UserDTO userDTO = toUserDTO(user);

        return new AuthResponse(newAccessToken, token, jwtService.getExpiryMs(), userDTO);
    }

    // ── Current User ────────────────────────────────────────────────────

    public UserDTO getCurrentUser(String email) {
        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new BusinessException("User not found.", HttpStatus.NOT_FOUND));
        return toUserDTO(user);
    }

    // ── Private Helpers ─────────────────────────────────────────────────

    private AuthResponse buildAuthResponse(User user) {
        String accessToken = jwtService.generateToken(user);
        String refreshToken = jwtService.generateRefreshToken(user);
        return new AuthResponse(accessToken, refreshToken, jwtService.getExpiryMs(), toUserDTO(user));
    }

    private UserDTO toUserDTO(User user) {
        return new UserDTO(user.getId(), user.getEmail(), user.getFullName(),
                user.getRole(), user.getCreatedAt());
    }
}
