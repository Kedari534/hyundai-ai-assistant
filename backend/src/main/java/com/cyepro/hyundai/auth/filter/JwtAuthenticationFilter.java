package com.cyepro.hyundai.auth.filter;

import com.cyepro.hyundai.auth.service.JwtService;
import io.jsonwebtoken.JwtException;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.lang.NonNull;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.web.authentication.WebAuthenticationDetailsSource;
import org.springframework.stereotype.Component;
import org.springframework.util.StringUtils;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;

/**
 * JWT authentication filter — runs ONCE per HTTP request.
 *
 * WHY OncePerRequestFilter?
 * - Spring's filter chain can call the same filter multiple times (e.g. during
 *   forward dispatches). OncePerRequestFilter guarantees exactly one execution.
 *
 * Flow for every incoming request:
 *   1. Extract "Authorization: Bearer <token>" header.
 *   2. If missing/not Bearer → skip (let Spring Security deny it later if needed).
 *   3. Extract email from token → load UserDetails from DB.
 *   4. Validate token (signature + expiry + email match).
 *   5. Set UsernamePasswordAuthenticationToken in SecurityContextHolder.
 *   6. Continue the filter chain.
 *
 * WHY store auth in SecurityContextHolder?
 * - SecurityContextHolder is Spring Security's thread-local request state.
 * - Everything downstream (controllers, @PreAuthorize, etc.) reads from here.
 * - It's cleared automatically at the end of the request.
 */
@Component
public class JwtAuthenticationFilter extends OncePerRequestFilter {

    private static final Logger log = LoggerFactory.getLogger(JwtAuthenticationFilter.class);
    private static final String BEARER_PREFIX = "Bearer ";

    private final JwtService jwtService;
    private final UserDetailsService userDetailsService;

    public JwtAuthenticationFilter(JwtService jwtService, UserDetailsService userDetailsService) {
        this.jwtService = jwtService;
        this.userDetailsService = userDetailsService;
    }

    @Override
    protected void doFilterInternal(
            @NonNull HttpServletRequest request,
            @NonNull HttpServletResponse response,
            @NonNull FilterChain filterChain) throws ServletException, IOException {

        // Skip filter for public endpoints — saves a DB lookup on every health check
        if (shouldSkip(request)) {
            filterChain.doFilter(request, response);
            return;
        }

        String token = extractBearerToken(request);
        if (token == null) {
            filterChain.doFilter(request, response);
            return;
        }

        try {
            String email = jwtService.extractEmail(token);

            // Only authenticate if not already authenticated (idempotent)
            if (email != null && SecurityContextHolder.getContext().getAuthentication() == null) {
                UserDetails userDetails = userDetailsService.loadUserByUsername(email);

                if (jwtService.isTokenValid(token, userDetails)) {
                    // Build Spring Security's auth token and store it
                    var authToken = new UsernamePasswordAuthenticationToken(
                            userDetails,
                            null,                        // credentials — null after authentication
                            userDetails.getAuthorities()
                    );
                    authToken.setDetails(new WebAuthenticationDetailsSource().buildDetails(request));
                    SecurityContextHolder.getContext().setAuthentication(authToken);
                    log.debug("Authenticated user '{}' via JWT", email);
                }
            }
        } catch (JwtException e) {
            // Invalid/tampered/expired token — don't set auth; let Spring Security deny access
            log.debug("JWT filter rejected token: {}", e.getMessage());
        }

        filterChain.doFilter(request, response);
    }

    // ── Helpers ─────────────────────────────────────────────────────────

    private boolean shouldSkip(HttpServletRequest request) {
        String path = request.getServletPath();
        return path.startsWith("/api/auth/")
            || path.startsWith("/api/health")
            || path.startsWith("/actuator/");
    }

    private String extractBearerToken(HttpServletRequest request) {
        String authHeader = request.getHeader("Authorization");
        if (StringUtils.hasText(authHeader) && authHeader.startsWith(BEARER_PREFIX)) {
            return authHeader.substring(BEARER_PREFIX.length());
        }
        return null;
    }
}
