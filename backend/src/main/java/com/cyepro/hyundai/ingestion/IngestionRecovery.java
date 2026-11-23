package com.cyepro.hyundai.ingestion;

import com.cyepro.hyundai.document.entity.BrochureDocument;
import com.cyepro.hyundai.document.repository.BrochureDocumentRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Component;

import java.util.List;

@Component
@Order(0)
public class IngestionRecovery implements ApplicationRunner {

    private static final Logger log = LoggerFactory.getLogger(IngestionRecovery.class);

    private final BrochureDocumentRepository documents;

    public IngestionRecovery(BrochureDocumentRepository documents) {
        this.documents = documents;
    }

    @Override
    public void run(ApplicationArguments args) {
        if (EmbeddingDimensions.WIDTH != 1536) {
            throw new IllegalStateException("Embedding width must stay 1536 to match Flyway V3");
        }
        List<BrochureDocument> stuck = documents.findByStatus("PROCESSING");
        for (BrochureDocument document : stuck) {
            document.setStatus("FAILED");
            document.setErrorMessage("Server restarted during processing. Please reprocess.");
            documents.save(document);
        }
        if (!stuck.isEmpty()) {
            log.warn("Marked {} document(s) FAILED after a restart mid-ingestion", stuck.size());
        }
    }
}
