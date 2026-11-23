package com.cyepro.hyundai.document.dto;

import com.cyepro.hyundai.document.entity.BrochureDocument;

import java.time.Instant;
import java.util.UUID;

public record DocumentResponse(
        UUID id,
        String originalFilename,
        String displayName,
        String vehicleModel,
        String status,
        String errorMessage,
        Integer totalPages,
        Integer chunksCount,
        long fileSizeBytes,
        Instant uploadedAt,
        Instant processedAt
) {
    public static DocumentResponse from(BrochureDocument document) {
        return new DocumentResponse(
                document.getId(),
                document.getOriginalFilename(),
                document.getDisplayName(),
                document.getVehicleModel(),
                document.getStatus(),
                document.getErrorMessage(),
                document.getTotalPages(),
                document.getChunksCount(),
                document.getFileSizeBytes(),
                document.getUploadedAt(),
                document.getProcessedAt()
        );
    }
}
