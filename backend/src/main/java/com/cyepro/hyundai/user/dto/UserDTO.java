package com.cyepro.hyundai.user.dto;

import java.time.Instant;
import java.util.UUID;

/**
 * DTO for returning user info in API responses.
 * Never return the User entity directly (leaks password hash).
 *
 * Using Java 16+ record — immutable, auto-generates equals/hashCode/toString.
 */
public record UserDTO(
    UUID id,
    String email,
    String fullName,
    String role,
    Instant createdAt
) {}
