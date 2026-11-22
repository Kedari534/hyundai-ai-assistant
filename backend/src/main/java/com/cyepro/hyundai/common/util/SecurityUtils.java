package com.cyepro.hyundai.common.util;

import com.cyepro.hyundai.user.entity.User;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;

/**
 * Utility to get the current authenticated user from Spring Security context.
 * Used in service layer to scope operations to the calling user.
 */
public final class SecurityUtils {

    private SecurityUtils() {} // utility class — no instantiation

    public static User getCurrentUser() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth == null || !auth.isAuthenticated()) {
            throw new IllegalStateException("No authenticated user in security context");
        }
        return (User) auth.getPrincipal();
    }
}
