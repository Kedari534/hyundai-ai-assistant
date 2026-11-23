package com.cyepro.hyundai.auth;

import com.cyepro.hyundai.auth.controller.AuthController;
import com.cyepro.hyundai.auth.dto.AuthResponse;
import com.cyepro.hyundai.auth.dto.LoginRequest;
import com.cyepro.hyundai.auth.dto.RegisterRequest;
import com.cyepro.hyundai.auth.service.AuthService;
import com.cyepro.hyundai.common.exception.BusinessException;
import com.cyepro.hyundai.common.exception.GlobalExceptionHandler;
import com.cyepro.hyundai.user.dto.UserDTO;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.converter.json.MappingJackson2HttpMessageConverter;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import org.springframework.validation.beanvalidation.LocalValidatorFactoryBean;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.filter.CharacterEncodingFilter;

import java.time.Instant;
import java.util.UUID;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

/**
 * Controller-layer tests using standalone MockMvc — zero Spring context.
 *
 * WHY standaloneSetup (not @WebMvcTest)?
 * - @WebMvcTest loads a Spring context slice which triggers Spring AI and JPA
 *   auto-configurations. Those require a real DB and API key — both unavailable
 *   in unit tests.
 * - MockMvcBuilders.standaloneSetup() creates MockMvc directly with the
 *   controller and GlobalExceptionHandler. No Spring context, no auto-config,
 *   no waiting for HikariCP to timeout.
 * - Downside: we must wire validator manually. That's worth the trade-off.
 *
 * WHY include GlobalExceptionHandler?
 * - Our error responses (422, 409, 401) are produced by GlobalExceptionHandler.
 * - Without it, MockMvc would return 400 for validation errors (default Spring behaviour).
 * - Including it makes the test assert the REAL response format our clients get.
 *
 * Pattern: Arrange (mock) → Act (HTTP request) → Assert (status + JSON)
 */
@ExtendWith(MockitoExtension.class)
class AuthControllerTest {

    private MockMvc mockMvc;

    @Mock
    private AuthService authService;

    @InjectMocks
    private AuthController authController;

    private final ObjectMapper objectMapper = new ObjectMapper()
            .findAndRegisterModules(); // supports java.time types

    @BeforeEach
    void setUp() {
        // Wire up MockMvc without a Spring context.
        // We add:
        //   - Our controller (the thing we're testing)
        //   - GlobalExceptionHandler (to get correct error responses)
        //   - LocalValidatorFactoryBean (to trigger @Valid / Bean Validation)
        //   - MappingJackson2HttpMessageConverter (to parse/serialize JSON)
        LocalValidatorFactoryBean validator = new LocalValidatorFactoryBean();
        validator.afterPropertiesSet();

        mockMvc = MockMvcBuilders
                .standaloneSetup(authController)
                .setControllerAdvice(new GlobalExceptionHandler())
                .setValidator(validator)
                .addFilter(new CharacterEncodingFilter("UTF-8", true))
                .setMessageConverters(new MappingJackson2HttpMessageConverter(objectMapper))
                .build();
    }

    // ── Helper ──────────────────────────────────────────────────────────

    private AuthResponse stubAuthResponse(String email) {
        return new AuthResponse(
                "access.token.jwt",
                "refresh.token.jwt",
                3600000L,
                new UserDTO(UUID.randomUUID(), email, "Test User", "USER", Instant.now())
        );
    }

    // ── POST /api/auth/register ─────────────────────────────────────────

    @Test
    @DisplayName("POST /register: valid request → 201 Created with token")
    void register_validRequest_returns201() throws Exception {
        RegisterRequest req = new RegisterRequest("new@hyundai.com", "Password123!", "New User");
        when(authService.register(any(RegisterRequest.class))).thenReturn(stubAuthResponse("new@hyundai.com"));

        mockMvc.perform(post("/api/auth/register")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(req)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.token").value("access.token.jwt"))
                .andExpect(jsonPath("$.user.email").value("new@hyundai.com"))
                .andExpect(jsonPath("$.expiresIn").value(3600000));
    }

    @Test
    @DisplayName("POST /register: missing email → 422 Unprocessable Entity")
    void register_missingEmail_returns422() throws Exception {
        // No email field
        String body = """
                {"password": "Password123!", "fullName": "Test User"}
                """;

        mockMvc.perform(post("/api/auth/register")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(body))
                .andExpect(status().isUnprocessableEntity());
    }

    @Test
    @DisplayName("POST /register: invalid email format → 422")
    void register_invalidEmail_returns422() throws Exception {
        RegisterRequest req = new RegisterRequest("not-an-email", "Password123!", "Test User");

        mockMvc.perform(post("/api/auth/register")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(req)))
                .andExpect(status().isUnprocessableEntity());
    }

    @Test
    @DisplayName("POST /register: password too short → 422")
    void register_shortPassword_returns422() throws Exception {
        RegisterRequest req = new RegisterRequest("user@hyundai.com", "short", "Test");

        mockMvc.perform(post("/api/auth/register")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(req)))
                .andExpect(status().isUnprocessableEntity());
    }

    @Test
    @DisplayName("POST /register: duplicate email → 409 Conflict")
    void register_duplicateEmail_returns409() throws Exception {
        RegisterRequest req = new RegisterRequest("taken@hyundai.com", "Password123!", "Test User");
        when(authService.register(any())).thenThrow(
                new BusinessException("An account with this email already exists.", HttpStatus.CONFLICT));

        mockMvc.perform(post("/api/auth/register")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(req)))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.detail").value("An account with this email already exists."));
    }

    // ── POST /api/auth/login ────────────────────────────────────────────

    @Test
    @DisplayName("POST /login: valid credentials → 200 OK with token")
    void login_validCredentials_returns200() throws Exception {
        LoginRequest req = new LoginRequest("user@hyundai.com", "Password123!");
        when(authService.login(any(LoginRequest.class))).thenReturn(stubAuthResponse("user@hyundai.com"));

        mockMvc.perform(post("/api/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(req)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.token").value("access.token.jwt"))
                .andExpect(jsonPath("$.user.email").value("user@hyundai.com"));
    }

    @Test
    @DisplayName("POST /login: bad credentials → 401 Unauthorized")
    void login_badCredentials_returns401() throws Exception {
        LoginRequest req = new LoginRequest("user@hyundai.com", "WrongPass");
        when(authService.login(any())).thenThrow(
                new BusinessException("Invalid email or password.", HttpStatus.UNAUTHORIZED));

        mockMvc.perform(post("/api/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(req)))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.detail").value("Invalid email or password."));
    }

    @Test
    @DisplayName("POST /login: missing password → 422")
    void login_missingPassword_returns422() throws Exception {
        String body = """
                {"email": "user@hyundai.com"}
                """;

        mockMvc.perform(post("/api/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(body))
                .andExpect(status().isUnprocessableEntity());
    }
}
