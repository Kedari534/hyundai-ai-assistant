package com.cyepro.hyundai.common.exception;

import org.springframework.http.HttpStatus;

/**
 * Base exception for business rule violations.
 * Controllers throw this; GlobalExceptionHandler catches it and
 * converts it to a proper RFC 7807 response — no try/catch in controllers.
 *
 * Usage:
 *   throw new BusinessException("Email already registered.", HttpStatus.CONFLICT);
 *   throw new BusinessException("Only PDF files are accepted.", HttpStatus.BAD_REQUEST);
 */
public class BusinessException extends RuntimeException {

    private final HttpStatus status;

    public BusinessException(String message, HttpStatus status) {
        super(message);
        this.status = status;
    }

    public HttpStatus getStatus() {
        return status;
    }
}
