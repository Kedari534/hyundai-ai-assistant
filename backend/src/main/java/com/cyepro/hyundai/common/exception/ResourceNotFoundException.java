package com.cyepro.hyundai.common.exception;

/**
 * Thrown when a requested resource (document, session, etc.) doesn't exist.
 * GlobalExceptionHandler maps this to HTTP 404.
 *
 * Usage:
 *   throw new ResourceNotFoundException("Document not found with ID: " + id);
 */
public class ResourceNotFoundException extends RuntimeException {

    public ResourceNotFoundException(String message) {
        super(message);
    }
}
