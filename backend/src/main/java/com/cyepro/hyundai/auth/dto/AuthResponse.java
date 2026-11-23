package com.cyepro.hyundai.auth.dto;

import com.cyepro.hyundai.user.dto.UserDTO;

/**
 * Response body for all auth endpoints that return tokens.
 *
 * WHY include expiresIn?
 * - The frontend needs to know when to refresh. It shouldn't decode the JWT
 *   itself to find the expiry — that couples frontend to JWT internals.
 * - Returning expiresIn (epoch millis) lets the frontend set a refresh timer.
 *
 * WHY include the full UserDTO?
 * - Saves the frontend an extra /api/auth/me call right after login.
 * - The user object is needed for displaying name, role, etc. in the UI.
 */
public record AuthResponse(
    String token,
    String refreshToken,
    long expiresIn,       // milliseconds until the access token expires
    UserDTO user
) {}
