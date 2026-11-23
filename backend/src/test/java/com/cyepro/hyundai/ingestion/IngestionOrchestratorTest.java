package com.cyepro.hyundai.ingestion;

import com.cyepro.hyundai.document.entity.BrochureDocument;
import com.cyepro.hyundai.document.repository.BrochureDocumentRepository;
import com.cyepro.hyundai.document.storage.BrochureStorage;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class IngestionOrchestratorTest {

    @Mock
    private BrochureDocumentRepository documentRepository;

    @Mock
    private BrochureStorage storage;

    @Mock
    private PdfTextExtractor extractor;

    @Mock
    private TextChunker chunker;

    @Mock
    private EmbeddingService embeddings;

    @Mock
    private ChunkStore chunkStore;

    @InjectMocks
    private IngestionOrchestrator orchestrator;

    @Test
    @DisplayName("Successful ingestion flow: read -> extract -> chunk -> embed -> store -> COMPLETED")
    void processSuccess() {
        UUID docId = UUID.randomUUID();
        BrochureDocument doc = BrochureDocument.builder()
                .id(docId)
                .displayName("Hyundai Alcazar")
                .vehicleModel("ALCAZAR")
                .storagePath("alcazar/brochure.pdf")
                .status("UPLOADED")
                .build();

        byte[] fakePdf = "%PDF-1.4 test".getBytes();
        List<PageText> pages = List.of(new PageText(1, "Alcazar features a 1.5L Turbo GDi petrol engine with 160 PS."));
        List<ChunkDraft> drafts = List.of(new ChunkDraft(1, 0, "Alcazar features a 1.5L Turbo GDi petrol engine with 160 PS."));
        float[] vector = new float[1536];

        when(documentRepository.findById(docId)).thenReturn(Optional.of(doc));
        when(storage.read("alcazar/brochure.pdf")).thenReturn(fakePdf);
        when(extractor.extract(fakePdf)).thenReturn(pages);
        when(chunker.chunk(pages)).thenReturn(drafts);
        when(embeddings.embed(anyString())).thenReturn(vector);

        orchestrator.process(docId);

        assertThat(doc.getStatus()).isEqualTo("COMPLETED");
        assertThat(doc.getChunksCount()).isEqualTo(1);
        assertThat(doc.getTotalPages()).isEqualTo(1);
        assertThat(doc.getErrorMessage()).isNull();

        verify(chunkStore).replace(eq(docId), eq("Hyundai Alcazar"), eq("ALCAZAR"), any());
        verify(documentRepository, atLeast(2)).save(doc);
    }

    @Test
    @DisplayName("Ingestion failure: sets status to FAILED and records safe error message")
    void processFailureSetsFailedStatus() {
        UUID docId = UUID.randomUUID();
        BrochureDocument doc = BrochureDocument.builder()
                .id(docId)
                .displayName("Hyundai Creta")
                .vehicleModel("CRETA")
                .storagePath("creta/brochure.pdf")
                .status("UPLOADED")
                .build();

        when(documentRepository.findById(docId)).thenReturn(Optional.of(doc));
        when(storage.read("creta/brochure.pdf")).thenThrow(new RuntimeException("Simulated read error"));

        orchestrator.process(docId);

        assertThat(doc.getStatus()).isEqualTo("FAILED");
        assertThat(doc.getErrorMessage()).isNotNull();
        verify(documentRepository, atLeast(2)).save(doc);
        verifyNoInteractions(chunkStore);
    }
}
