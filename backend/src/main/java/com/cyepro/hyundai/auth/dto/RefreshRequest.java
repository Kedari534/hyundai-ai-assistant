package com.cyepro.hyundai.auth.dto;

import jakarta.validation.constraints.NotBlank;

/**
 * Request body for POST /api/auth/refresh.
 */
public record RefreshRequest(

    @NotBlank(message = "Refresh token is required")
    String refreshToken

) {}
