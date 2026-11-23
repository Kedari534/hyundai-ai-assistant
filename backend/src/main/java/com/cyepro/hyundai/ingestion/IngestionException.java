package com.cyepro.hyundai.ingestion;

/** A brochure could not be indexed. The message is safe to show in the UI. */
public class IngestionException extends RuntimeException {

    public IngestionException(String message) {
        super(message);
    }

    public IngestionException(String message, Throwable cause) {
        super(message, cause);
    }
}
