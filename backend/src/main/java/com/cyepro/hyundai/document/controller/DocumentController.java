package com.cyepro.hyundai.document.controller;

import com.cyepro.hyundai.document.VehicleModel;
import com.cyepro.hyundai.document.dto.DocumentResponse;
import com.cyepro.hyundai.document.service.DocumentService;
import org.springframework.http.ContentDisposition;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

import java.nio.charset.StandardCharsets;
import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/documents")
public class DocumentController {

    private final DocumentService documents;

    public DocumentController(DocumentService documents) {
        this.documents = documents;
    }

    @GetMapping("/models")
    public List<String> models() {
        return VehicleModel.labels();
    }

    @PostMapping(consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<DocumentResponse> upload(
            @RequestParam("file") MultipartFile file,
            @RequestParam("vehicleModel") String vehicleModel,
            @RequestParam(value = "displayName", required = false) String displayName) {
        return ResponseEntity.status(HttpStatus.ACCEPTED)
                .body(documents.upload(file, vehicleModel, displayName));
    }

    @GetMapping
    public List<DocumentResponse> list() {
        return documents.list();
    }

    @GetMapping("/{id}")
    public DocumentResponse get(@PathVariable UUID id) {
        return documents.get(id);
    }

    @GetMapping("/{id}/status")
    public DocumentResponse status(@PathVariable UUID id) {
        return documents.get(id);
    }

    @GetMapping("/{id}/file")
    public ResponseEntity<byte[]> file(@PathVariable UUID id) {
        DocumentResponse document = documents.get(id);
        byte[] bytes = documents.file(id);
        ContentDisposition disposition = ContentDisposition.inline()
                .filename(document.originalFilename(), StandardCharsets.UTF_8)
                .build();
        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION, disposition.toString())
                .contentType(MediaType.APPLICATION_PDF)
                .body(bytes);
    }

    @PostMapping("/{id}/reprocess")
    public ResponseEntity<DocumentResponse> reprocess(@PathVariable UUID id) {
        return ResponseEntity.status(HttpStatus.ACCEPTED).body(documents.reprocess(id));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable UUID id) {
        documents.delete(id);
        return ResponseEntity.noContent().build();
    }
}
