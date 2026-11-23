package com.cyepro.hyundai.chat;

import java.util.UUID;

public record RetrievedChunk(
        UUID documentId,
        String documentName,
        String vehicleModel,
        int pageNumber,
        String content,
        double similarity
) {}
