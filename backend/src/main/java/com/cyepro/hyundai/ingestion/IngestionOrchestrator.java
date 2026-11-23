package com.cyepro.hyundai.ingestion;

import com.cyepro.hyundai.document.entity.BrochureDocument;
import com.cyepro.hyundai.document.repository.BrochureDocumentRepository;
import com.cyepro.hyundai.document.storage.BrochureStorage;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;

import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

@Service
public class IngestionOrchestrator {

    private static final Logger log = LoggerFactory.getLogger(IngestionOrchestrator.class);

    private final BrochureDocumentRepository documents;
    private final BrochureStorage storage;
    private final PdfTextExtractor extractor;
    private final TextChunker chunker;
    private final EmbeddingService embeddings;
    private final ChunkStore chunkStore;

    public IngestionOrchestrator(BrochureDocumentRepository documents,
                                 BrochureStorage storage,
                                 PdfTextExtractor extractor,
                                 TextChunker chunker,
                                 EmbeddingService embeddings,
                                 ChunkStore chunkStore) {
        this.documents = documents;
        this.storage = storage;
        this.extractor = extractor;
        this.chunker = chunker;
        this.embeddings = embeddings;
        this.chunkStore = chunkStore;
    }

    @Async("ingestionExecutor")
    public void process(UUID documentId) {
        BrochureDocument document = documents.findById(documentId).orElse(null);
        if (document == null) {
            return;
        }
        document.setStatus("PROCESSING");
        document.setErrorMessage(null);
        documents.save(document);
        try {
            byte[] pdf = storage.read(document.getStoragePath());
            List<PageText> pages = extractor.extract(pdf);
            List<ChunkDraft> drafts = chunker.chunk(pages);
            if (drafts.isEmpty()) {
                throw new IngestionException("No indexable text was found in this brochure.");
            }
            List<ChunkStore.StoredChunk> stored = new ArrayList<>();
            for (ChunkDraft draft : drafts) {
                float[] vector = embeddings.embed(draft.text());
                stored.add(new ChunkStore.StoredChunk(
                        draft.pageNumber(), draft.chunkIndex(), draft.text(), vector));
            }
            chunkStore.replace(document.getId(), document.getDisplayName(), document.getVehicleModel(), stored);
            document.setStatus("COMPLETED");
            document.setErrorMessage(null);
            document.setTotalPages(pages.size());
            document.setChunksCount(stored.size());
            document.setProcessedAt(Instant.now());
            documents.save(document);
            log.info("Indexed {} chunks for document {}", stored.size(), documentId);
        } catch (Exception ex) {
            log.error("Ingestion failed for {}", documentId, ex);
            document.setStatus("FAILED");
            document.setProcessedAt(Instant.now());
            document.setErrorMessage(safeMessage(ex));
            documents.save(document);
        }
    }

    private String safeMessage(Exception ex) {
        if (ex instanceof IngestionException) {
            return ex.getMessage();
        }
        String message = ex.getMessage() == null ? "" : ex.getMessage();
        if (message.contains("vector") || message.contains("dimension")) {
            return "The embedding width does not match the database column. Check the 1536 configuration.";
        }
        if (message.toLowerCase().contains("api key") || message.toLowerCase().contains("permission")) {
            return "The embedding service rejected the request. Check GOOGLE_AI_API_KEY.";
        }
        return "The brochure could not be processed. Try reprocess, or upload a text-based PDF.";
    }
}
