package com.cyepro.hyundai.auth;

import com.cyepro.hyundai.auth.dto.LoginRequest;
import com.cyepro.hyundai.auth.dto.RefreshRequest;
import com.cyepro.hyundai.auth.dto.RegisterRequest;
import com.cyepro.hyundai.auth.service.AuthService;
import com.cyepro.hyundai.auth.service.JwtService;
import com.cyepro.hyundai.common.exception.BusinessException;
import com.cyepro.hyundai.user.entity.User;
import com.cyepro.hyundai.user.repository.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.HttpStatus;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.crypto.password.PasswordEncoder;

import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

/**
 * Unit tests for AuthService.
 *
 * Uses @ExtendWith(MockitoExtension.class) — no Spring context needed.
 * All dependencies are mocked, so tests are fast (no DB, no Spring boot).
 *
 * Pattern: Arrange → Act → Assert (AAA)
 */
@ExtendWith(MockitoExtension.class)
class AuthServiceTest {

    @Mock private UserRepository userRepository;
    @Mock private PasswordEncoder passwordEncoder;
    @Mock private AuthenticationManager authenticationManager;
    @Mock private JwtService jwtService;

    @InjectMocks
    private AuthService authService;

    private User testUser;

    @BeforeEach
    void setUp() {
        testUser = User.builder()
                .id(UUID.randomUUID())
                .email("test@hyundai.com")
                .passwordHash("$2a$12$hashed")
                .fullName("Test User")
                .role("USER")
                .build();
    }

    // ── register ────────────────────────────────────────────────────────

    @Test
    @DisplayName("register: success — new email creates user and returns tokens")
    void register_success() {
        // Arrange
        RegisterRequest request = new RegisterRequest("test@hyundai.com", "Password123!", "Test User");
        when(userRepository.existsByEmail("test@hyundai.com")).thenReturn(false);
        when(passwordEncoder.encode("Password123!")).thenReturn("$2a$12$hashed");
        when(userRepository.save(any(User.class))).thenReturn(testUser);
        when(jwtService.generateToken(any())).thenReturn("access.token.here");
        when(jwtService.generateRefreshToken(any())).thenReturn("refresh.token.here");
        when(jwtService.getExpiryMs()).thenReturn(3600000L);

        // Act
        var response = authService.register(request);

        // Assert
        assertThat(response.token()).isEqualTo("access.token.here");
        assertThat(response.refreshToken()).isEqualTo("refresh.token.here");
        assertThat(response.user().email()).isEqualTo("test@hyundai.com");
        verify(userRepository).save(any(User.class));
    }

    @Test
    @DisplayName("register: duplicate email — throws 409 Conflict")
    void register_duplicateEmail_throwsConflict() {
        // Arrange
        RegisterRequest request = new RegisterRequest("taken@hyundai.com", "Password123!", "Test User");
        when(userRepository.existsByEmail("taken@hyundai.com")).thenReturn(true);

        // Act + Assert
        assertThatThrownBy(() -> authService.register(request))
                .isInstanceOf(BusinessException.class)
                .satisfies(ex -> {
                    BusinessException be = (BusinessException) ex;
                    assertThat(be.getStatus()).isEqualTo(HttpStatus.CONFLICT);
                    assertThat(be.getMessage()).contains("already exists");
                });

        // Verify no user was saved
        verify(userRepository, never()).save(any());
    }

    @Test
    @DisplayName("register: email is normalized to lowercase")
    void register_emailNormalizedToLowercase() {
        // Arrange
        RegisterRequest request = new RegisterRequest("UPPER@Hyundai.COM", "Password123!", "Test User");
        when(userRepository.existsByEmail("upper@hyundai.com")).thenReturn(false);
        when(passwordEncoder.encode(any())).thenReturn("hashed");
        when(userRepository.save(any(User.class))).thenReturn(testUser);
        when(jwtService.generateToken(any())).thenReturn("token");
        when(jwtService.generateRefreshToken(any())).thenReturn("refresh");
        when(jwtService.getExpiryMs()).thenReturn(3600000L);

        // Act
        authService.register(request);

        // Assert: existsByEmail was called with lowercase
        verify(userRepository).existsByEmail("upper@hyundai.com");
    }

    // ── login ───────────────────────────────────────────────────────────

    @Test
    @DisplayName("login: success — correct credentials return tokens")
    void login_success() {
        // Arrange
        LoginRequest request = new LoginRequest("test@hyundai.com", "Password123!");
        when(authenticationManager.authenticate(any())).thenReturn(
                new UsernamePasswordAuthenticationToken("test@hyundai.com", null)
        );
        when(userRepository.findByEmail("test@hyundai.com")).thenReturn(Optional.of(testUser));
        when(jwtService.generateToken(testUser)).thenReturn("access.token");
        when(jwtService.generateRefreshToken(testUser)).thenReturn("refresh.token");
        when(jwtService.getExpiryMs()).thenReturn(3600000L);

        // Act
        var response = authService.login(request);

        // Assert
        assertThat(response.token()).isEqualTo("access.token");
        assertThat(response.user().email()).isEqualTo("test@hyundai.com");
    }

    @Test
    @DisplayName("login: bad credentials — throws 401 Unauthorized with generic message")
    void login_badCredentials_throwsUnauthorized() {
        // Arrange
        LoginRequest request = new LoginRequest("test@hyundai.com", "WrongPassword");
        when(authenticationManager.authenticate(any()))
                .thenThrow(new BadCredentialsException("Bad credentials"));

        // Act + Assert
        assertThatThrownBy(() -> authService.login(request))
                .isInstanceOf(BusinessException.class)
                .satisfies(ex -> {
                    BusinessException be = (BusinessException) ex;
                    assertThat(be.getStatus()).isEqualTo(HttpStatus.UNAUTHORIZED);
                    // Generic message — doesn't reveal which field was wrong
                    assertThat(be.getMessage()).isEqualTo("Invalid email or password.");
                });
    }

    // ── refresh ─────────────────────────────────────────────────────────

    @Test
    @DisplayName("refresh: valid token — returns new access token")
    void refresh_validToken_returnsNewAccessToken() {
        // Arrange
        RefreshRequest request = new RefreshRequest("valid.refresh.token");
        when(jwtService.isRefreshTokenValid("valid.refresh.token")).thenReturn(true);
        when(jwtService.extractEmail("valid.refresh.token")).thenReturn("test@hyundai.com");
        when(userRepository.findByEmail("test@hyundai.com")).thenReturn(Optional.of(testUser));
        when(jwtService.generateToken(testUser)).thenReturn("new.access.token");
        when(jwtService.getExpiryMs()).thenReturn(3600000L);

        // Act
        var response = authService.refresh(request);

        // Assert
        assertThat(response.token()).isEqualTo("new.access.token");
        assertThat(response.refreshToken()).isEqualTo("valid.refresh.token"); // same refresh token
    }

    @Test
    @DisplayName("refresh: invalid token — throws 401 Unauthorized")
    void refresh_invalidToken_throwsUnauthorized() {
        // Arrange
        RefreshRequest request = new RefreshRequest("bad.token");
        when(jwtService.isRefreshTokenValid("bad.token")).thenReturn(false);

        // Act + Assert
        assertThatThrownBy(() -> authService.refresh(request))
                .isInstanceOf(BusinessException.class)
                .satisfies(ex -> assertThat(((BusinessException) ex).getStatus())
                        .isEqualTo(HttpStatus.UNAUTHORIZED));
    }
}
