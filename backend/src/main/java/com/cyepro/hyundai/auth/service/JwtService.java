package com.cyepro.hyundai.auth.service;

import com.cyepro.hyundai.user.entity.User;
import io.jsonwebtoken.Claims;
import io.jsonwebtoken.JwtException;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.stereotype.Service;

import javax.crypto.SecretKey;
import java.nio.charset.StandardCharsets;
import java.util.Date;
import java.util.UUID;

/**
 * JWT creation and validation service using JJWT 0.12.6.
 *
 * WHY JWT?
 * - Stateless: the server doesn't store sessions; every request carries
 *   all the information needed to identify the user.
 * - Scales horizontally with zero shared state between instances.
 *
 * WHY HS256 (not RS256)?
 * - Single backend service. HS256 (symmetric) is simpler and faster.
 * - RS256 (asymmetric) shines in multi-service setups where services need
 *   to verify tokens without the signing secret.
 *
 * Token anatomy:
 *   Header: {"alg":"HS256","typ":"JWT"}
 *   Payload: {"sub":"user@email.com","userId":"uuid","role":"USER","iat":...,"exp":...}
 *   Signature: HMAC-SHA256(base64(header)+"."+base64(payload), secret)
 *
 * Security note: JWT_SECRET must be at least 32 bytes for HS256. We enforce
 * this by using Keys.hmacShaKeyFor() which throws if the key is too short.
 */
@Service
public class JwtService {

    private static final Logger log = LoggerFactory.getLogger(JwtService.class);

    private final SecretKey signingKey;
    private final long expiryMs;
    private final long refreshExpiryMs;

    public JwtService(
            @Value("${app.jwt.secret}") String secret,
            @Value("${app.jwt.expiry-ms}") long expiryMs,
            @Value("${app.jwt.refresh-expiry-ms}") long refreshExpiryMs) {

        // Keys.hmacShaKeyFor validates the key length (≥ 32 bytes for HS256)
        this.signingKey = Keys.hmacShaKeyFor(secret.getBytes(StandardCharsets.UTF_8));
        this.expiryMs = expiryMs;
        this.refreshExpiryMs = refreshExpiryMs;
    }

    // ── Token Generation ────────────────────────────────────────────────

    /**
     * Generate a short-lived access token (default 1 hour).
     * Embeds userId and role as custom claims so the backend can
     * authorise without a DB round-trip on every request.
     */
    public String generateToken(User user) {
        return buildToken(user, expiryMs, false);
    }

    /**
     * Generate a long-lived refresh token (default 7 days).
     * Does NOT embed role — it's only used to issue a new access token.
     */
    public String generateRefreshToken(User user) {
        return buildToken(user, refreshExpiryMs, true);
    }

    private String buildToken(User user, long ttlMs, boolean isRefresh) {
        long now = System.currentTimeMillis();

        var builder = Jwts.builder()
                .subject(user.getEmail())
                .issuedAt(new Date(now))
                .expiration(new Date(now + ttlMs));

        if (!isRefresh) {
            // Access tokens carry userId and role for authorisation
            builder.claim("userId", user.getId().toString())
                   .claim("role", user.getRole());
        } else {
            // Refresh tokens just carry a type marker
            builder.claim("type", "refresh");
        }

        return builder.signWith(signingKey).compact();
    }

    // ── Token Validation ────────────────────────────────────────────────

    /**
     * Validate a token against a known UserDetails.
     * Checks: signature, expiry, and that the subject matches the user.
     */
    public boolean isTokenValid(String token, UserDetails userDetails) {
        try {
            String email = extractEmail(token);
            return email != null && email.equals(userDetails.getUsername()) && !isExpired(token);
        } catch (JwtException e) {
            log.debug("JWT validation failed: {}", e.getMessage());
            return false;
        }
    }

    /**
     * Validate a refresh token (signature + expiry only, no UserDetails needed here).
     */
    public boolean isRefreshTokenValid(String token) {
        try {
            Claims claims = extractAllClaims(token);
            return "refresh".equals(claims.get("type", String.class)) && !claims.getExpiration().before(new Date());
        } catch (JwtException e) {
            log.debug("Refresh token validation failed: {}", e.getMessage());
            return false;
        }
    }

    // ── Claim Extraction ────────────────────────────────────────────────

    public String extractEmail(String token) {
        return extractAllClaims(token).getSubject();
    }

    public UUID extractUserId(String token) {
        String id = extractAllClaims(token).get("userId", String.class);
        return id != null ? UUID.fromString(id) : null;
    }

    public long getExpiryMs() {
        return expiryMs;
    }

    // ── Private Helpers ─────────────────────────────────────────────────

    private Claims extractAllClaims(String token) {
        // parseSignedClaims verifies the signature; throws JwtException if invalid
        return Jwts.parser()
                .verifyWith(signingKey)
                .build()
                .parseSignedClaims(token)
                .getPayload();
    }

    private boolean isExpired(String token) {
        return extractAllClaims(token).getExpiration().before(new Date());
    }
}
