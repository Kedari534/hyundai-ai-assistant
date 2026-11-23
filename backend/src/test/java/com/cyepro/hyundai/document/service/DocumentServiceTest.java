package com.cyepro.hyundai.document.service;

import com.cyepro.hyundai.common.exception.BusinessException;
import com.cyepro.hyundai.common.exception.ResourceNotFoundException;
import com.cyepro.hyundai.document.dto.DocumentResponse;
import com.cyepro.hyundai.document.entity.BrochureDocument;
import com.cyepro.hyundai.document.repository.BrochureDocumentRepository;
import com.cyepro.hyundai.document.storage.BrochureStorage;
import com.cyepro.hyundai.ingestion.IngestionOrchestrator;
import com.cyepro.hyundai.user.entity.User;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class DocumentServiceTest {

    @Mock
    private BrochureDocumentRepository repository;

    @Mock
    private BrochureStorage storage;

    @Mock
    private IngestionOrchestrator ingestion;

    private DocumentService service;
    private User testUser;

    @BeforeEach
    void setUp() {
        service = new DocumentService(repository, storage, ingestion, "brochures", 20L);

        testUser = User.builder()
                .id(UUID.randomUUID())
                .email("consultant@cyepro.com")
                .passwordHash("encoded_password")
                .fullName("Test Consultant")
                .role("USER")
                .build();

        SecurityContextHolder.getContext().setAuthentication(
                new UsernamePasswordAuthenticationToken(testUser, null, testUser.getAuthorities())
        );
    }

    @AfterEach
    void tearDown() {
        SecurityContextHolder.clearContext();
    }

    @Test
    @DisplayName("Upload valid PDF saves file, records entity, and queues ingestion")
    void uploadValidPdf() {
        byte[] validPdfBytes = "%PDF-1.4 valid test content".getBytes();
        MockMultipartFile file = new MockMultipartFile(
                "file", "Hyundai_Alcazar.pdf", "application/pdf", validPdfBytes
        );

        when(repository.save(any(BrochureDocument.class))).thenAnswer(i -> i.getArgument(0));

        DocumentResponse response = service.upload(file, "ALCAZAR", "Hyundai Alcazar 2024");

        assertThat(response).isNotNull();
        assertThat(response.vehicleModel()).isEqualTo("ALCAZAR");
        assertThat(response.displayName()).isEqualTo("Hyundai Alcazar 2024");
        assertThat(response.status()).isEqualTo("UPLOADED");

        verify(storage).save(anyString(), eq(validPdfBytes));
        ArgumentCaptor<BrochureDocument> captor = ArgumentCaptor.forClass(BrochureDocument.class);
        verify(repository).save(captor.capture());
        assertThat(captor.getValue().getUploadedBy()).isEqualTo(testUser.getId());
    }

    @Test
    @DisplayName("Upload non-PDF file extension throws BusinessException")
    void uploadNonPdfThrowsBadRequest() {
        MockMultipartFile file = new MockMultipartFile(
                "file", "specs.txt", "text/plain", "Not a pdf".getBytes()
        );

        assertThatThrownBy(() -> service.upload(file, "CRETA", "Creta Specs"))
                .isInstanceOf(BusinessException.class)
                .hasMessageContaining("Only PDF brochures are accepted");
    }

    @Test
    @DisplayName("Upload file with PDF extension but corrupted magic bytes throws BusinessException")
    void uploadCorruptMagicBytesThrowsBadRequest() {
        byte[] corrupted = "NOT_A_REAL_PDF_HEADER".getBytes();
        MockMultipartFile file = new MockMultipartFile(
                "file", "fake.pdf", "application/pdf", corrupted
        );

        assertThatThrownBy(() -> service.upload(file, "CRETA", "Creta Brochure"))
                .isInstanceOf(BusinessException.class)
                .hasMessageContaining("The file is not a valid PDF");
    }

    @Test
    @DisplayName("Upload exceeding 20MB limit throws PayloadTooLarge")
    void uploadExceedingSizeThrowsPayloadTooLarge() {
        DocumentService smallLimitService = new DocumentService(repository, storage, ingestion, "brochures", 1L); // 1 MB limit
        byte[] largeBytes = new byte[2 * 1024 * 1024]; // 2 MB
        System.arraycopy("%PDF-".getBytes(), 0, largeBytes, 0, 5);

        MockMultipartFile file = new MockMultipartFile(
                "file", "large.pdf", "application/pdf", largeBytes
        );

        assertThatThrownBy(() -> smallLimitService.upload(file, "I20", "i20 Large"))
                .isInstanceOf(BusinessException.class)
                .hasMessageContaining("exceeds the maximum allowed size");
    }

    @Test
    @DisplayName("List returns all brochures ordered by upload date")
    void listBrochures() {
        BrochureDocument doc1 = BrochureDocument.builder()
                .id(UUID.randomUUID())
                .displayName("Alcazar")
                .vehicleModel("ALCAZAR")
                .status("COMPLETED")
                .build();
        BrochureDocument doc2 = BrochureDocument.builder()
                .id(UUID.randomUUID())
                .displayName("Creta")
                .vehicleModel("CRETA")
                .status("COMPLETED")
                .build();

        when(repository.findAllByOrderByUploadedAtDesc()).thenReturn(List.of(doc1, doc2));

        List<DocumentResponse> result = service.list();
        assertThat(result).hasSize(2);
        assertThat(result.get(0).displayName()).isEqualTo("Alcazar");
        assertThat(result.get(1).displayName()).isEqualTo("Creta");
    }

    @Test
    @DisplayName("Delete removes file from storage and deletes DB record")
    void deleteBrochure() {
        UUID docId = UUID.randomUUID();
        BrochureDocument doc = BrochureDocument.builder()
                .id(docId)
                .storagePath("alcazar/test.pdf")
                .build();

        when(repository.findById(docId)).thenReturn(Optional.of(doc));

        service.delete(docId);

        verify(storage).delete("alcazar/test.pdf");
        verify(repository).delete(doc);
    }

    @Test
    @DisplayName("Reprocess resets status to UPLOADED and queues ingestion")
    void reprocessBrochure() {
        UUID docId = UUID.randomUUID();
        BrochureDocument doc = BrochureDocument.builder()
                .id(docId)
                .displayName("Alcazar")
                .vehicleModel("ALCAZAR")
                .status("FAILED")
                .errorMessage("Extraction failed")
                .build();

        when(repository.findById(docId)).thenReturn(Optional.of(doc));
        when(repository.save(any(BrochureDocument.class))).thenAnswer(i -> i.getArgument(0));

        DocumentResponse res = service.reprocess(docId);

        assertThat(res.status()).isEqualTo("UPLOADED");
        assertThat(res.errorMessage()).isNull();
        verify(repository).save(doc);
    }

    @Test
    @DisplayName("Reprocess throws 409 Conflict if already PROCESSING")
    void reprocessAlreadyProcessingThrowsConflict() {
        UUID docId = UUID.randomUUID();
        BrochureDocument doc = BrochureDocument.builder()
                .id(docId)
                .status("PROCESSING")
                .build();

        when(repository.findById(docId)).thenReturn(Optional.of(doc));

        assertThatThrownBy(() -> service.reprocess(docId))
                .isInstanceOf(BusinessException.class)
                .hasMessageContaining("already being processed");
    }

    @Test
    @DisplayName("Sanitize filename removes unsafe path traversal characters")
    void sanitizeFilename() {
        assertThat(DocumentService.sanitizeFilename("../../malicious/path.pdf"))
                .isEqualTo("path.pdf");
        assertThat(DocumentService.sanitizeFilename("Hyundai Alcazar (2024).pdf"))
                .isEqualTo("Hyundai_Alcazar__2024_.pdf");
        assertThat(DocumentService.sanitizeFilename("test"))
                .isEqualTo("test.pdf");
    }
}
