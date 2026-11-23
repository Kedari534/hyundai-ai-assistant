package com.cyepro.hyundai.auth.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

/**
 * Request body for POST /api/auth/register.
 *
 * WHY a record?
 * - Java records are immutable value objects — perfect for DTOs.
 * - Auto-generates constructor, getters, equals/hashCode/toString.
 * - Less boilerplate than a class with Lombok.
 *
 * WHY Bean Validation annotations here (not in the service)?
 * - Spring MVC runs validation before the controller method executes.
 * - If validation fails, GlobalExceptionHandler converts it to a 422 response.
 * - The service receives already-validated data — no defensive null checks needed.
 */
public record RegisterRequest(

    @NotBlank(message = "Email is required")
    @Email(message = "Must be a valid email address")
    String email,

    @NotBlank(message = "Password is required")
    @Size(min = 8, max = 72, message = "Password must be 8–72 characters")
    // 72 chars: BCrypt's internal limit — anything beyond is silently truncated
    String password,

    @NotBlank(message = "Full name is required")
    @Size(min = 2, max = 100, message = "Full name must be 2–100 characters")
    String fullName

) {}
