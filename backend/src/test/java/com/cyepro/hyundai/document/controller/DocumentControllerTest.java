package com.cyepro.hyundai.document.controller;

import com.cyepro.hyundai.common.exception.GlobalExceptionHandler;
import com.cyepro.hyundai.document.dto.DocumentResponse;
import com.cyepro.hyundai.document.service.DocumentService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.MediaType;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

import static org.hamcrest.Matchers.containsString;
import static org.hamcrest.Matchers.hasSize;
import static org.hamcrest.Matchers.is;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@ExtendWith(MockitoExtension.class)
class DocumentControllerTest {

    private MockMvc mockMvc;

    @Mock
    private DocumentService documentService;

    @InjectMocks
    private DocumentController documentController;

    @BeforeEach
    void setUp() {
        mockMvc = MockMvcBuilders.standaloneSetup(documentController)
                .setControllerAdvice(new GlobalExceptionHandler())
                .build();
    }

    @Test
    @DisplayName("GET /api/documents/models returns supported Hyundai vehicle model names")
    void getModelsReturnsList() throws Exception {
        mockMvc.perform(get("/api/documents/models"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$", hasSize(9)))
                .andExpect(jsonPath("$[0]", is("Alcazar")))
                .andExpect(jsonPath("$[1]", is("Creta")))
                .andExpect(jsonPath("$[2]", is("i20")))
                .andExpect(jsonPath("$[3]", is("Aura")));
    }

    @Test
    @DisplayName("POST /api/documents accepts PDF brochure upload and returns 202 Accepted")
    void uploadDocument() throws Exception {
        UUID docId = UUID.randomUUID();
        MockMultipartFile file = new MockMultipartFile(
                "file", "Hyundai_Alcazar.pdf", "application/pdf", "%PDF-1.4 content".getBytes()
        );

        DocumentResponse response = new DocumentResponse(
                docId, "Hyundai_Alcazar.pdf", "Alcazar 2024", "ALCAZAR",
                "UPLOADED", null, null, null, 1024L, Instant.now(), null
        );

        when(documentService.upload(any(), eq("ALCAZAR"), eq("Alcazar 2024"))).thenReturn(response);

        mockMvc.perform(multipart("/api/documents")
                        .file(file)
                        .param("vehicleModel", "ALCAZAR")
                        .param("displayName", "Alcazar 2024"))
                .andExpect(status().isAccepted())
                .andExpect(jsonPath("$.id", is(docId.toString())))
                .andExpect(jsonPath("$.vehicleModel", is("ALCAZAR")))
                .andExpect(jsonPath("$.status", is("UPLOADED")));
    }

    @Test
    @DisplayName("GET /api/documents returns list of all uploaded brochures")
    void listDocuments() throws Exception {
        UUID docId = UUID.randomUUID();
        DocumentResponse response = new DocumentResponse(
                docId, "creta.pdf", "Creta 2024", "CRETA",
                "COMPLETED", null, 10, 24, 2048L, Instant.now(), Instant.now()
        );

        when(documentService.list()).thenReturn(List.of(response));

        mockMvc.perform(get("/api/documents"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$", hasSize(1)))
                .andExpect(jsonPath("$[0].displayName", is("Creta 2024")))
                .andExpect(jsonPath("$[0].vehicleModel", is("CRETA")));
    }

    @Test
    @DisplayName("GET /api/documents/{id}/file returns inline PDF bytes with UTF-8 filename")
    void getDocumentFile() throws Exception {
        UUID docId = UUID.randomUUID();
        byte[] pdfContent = "%PDF-1.4 test document".getBytes();

        DocumentResponse response = new DocumentResponse(
                docId, "Alcazar.pdf", "Alcazar", "ALCAZAR",
                "COMPLETED", null, 5, 12, (long) pdfContent.length, Instant.now(), Instant.now()
        );

        when(documentService.get(docId)).thenReturn(response);
        when(documentService.file(docId)).thenReturn(pdfContent);

        mockMvc.perform(get("/api/documents/{id}/file", docId))
                .andExpect(status().isOk())
                .andExpect(content().contentType(MediaType.APPLICATION_PDF))
                .andExpect(header().string("Content-Disposition", containsString("Alcazar.pdf")))
                .andExpect(content().bytes(pdfContent));
    }

    @Test
    @DisplayName("POST /api/documents/{id}/reprocess triggers reprocessing and returns 202 Accepted")
    void reprocessDocument() throws Exception {
        UUID docId = UUID.randomUUID();
        DocumentResponse response = new DocumentResponse(
                docId, "aura.pdf", "Aura", "AURA",
                "UPLOADED", null, null, null, 500L, Instant.now(), null
        );

        when(documentService.reprocess(docId)).thenReturn(response);

        mockMvc.perform(post("/api/documents/{id}/reprocess", docId))
                .andExpect(status().isAccepted())
                .andExpect(jsonPath("$.status", is("UPLOADED")));
    }

    @Test
    @DisplayName("DELETE /api/documents/{id} deletes brochure and returns 204 No Content")
    void deleteDocument() throws Exception {
        UUID docId = UUID.randomUUID();

        mockMvc.perform(delete("/api/documents/{id}", docId))
                .andExpect(status().isNoContent());

        verify(documentService).delete(docId);
    }
}
