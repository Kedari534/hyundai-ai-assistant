package com.cyepro.hyundai.document.service;

import com.cyepro.hyundai.common.exception.BusinessException;
import com.cyepro.hyundai.common.exception.ResourceNotFoundException;
import com.cyepro.hyundai.common.util.SecurityUtils;
import com.cyepro.hyundai.document.VehicleModel;
import com.cyepro.hyundai.document.dto.DocumentResponse;
import com.cyepro.hyundai.document.entity.BrochureDocument;
import com.cyepro.hyundai.document.repository.BrochureDocumentRepository;
import com.cyepro.hyundai.document.storage.BrochureStorage;
import com.cyepro.hyundai.ingestion.IngestionOrchestrator;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.support.TransactionSynchronization;
import org.springframework.transaction.support.TransactionSynchronizationManager;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.util.List;
import java.util.Locale;
import java.util.UUID;

@Service
public class DocumentService {

    private static final byte[] PDF_MAGIC = new byte[]{'%', 'P', 'D', 'F', '-'};

    private final BrochureDocumentRepository documents;
    private final BrochureStorage storage;
    private final IngestionOrchestrator ingestion;
    private final String bucket;
    private final long maxBytes;

    public DocumentService(BrochureDocumentRepository documents,
                           BrochureStorage storage,
                           IngestionOrchestrator ingestion,
                           @Value("${app.supabase.storage-bucket:brochures}") String bucket,
                           @Value("${app.ingestion.max-file-size-mb:20}") long maxMb) {
        this.documents = documents;
        this.storage = storage;
        this.ingestion = ingestion;
        this.bucket = bucket;
        this.maxBytes = maxMb * 1024 * 1024;
    }

    @Transactional
    public DocumentResponse upload(MultipartFile file, String vehicleModel, String displayName) {
        VehicleModel model = VehicleModel.parse(vehicleModel);
        byte[] bytes = read(file);
        validatePdf(file, bytes);

        String original = sanitizeFilename(file.getOriginalFilename());
        String name = (displayName == null || displayName.isBlank())
                ? stripExtension(original)
                : displayName.trim();
        UUID id = UUID.randomUUID();
        String path = id + "/" + original;

        BrochureDocument document = BrochureDocument.builder()
                .id(id)
                .uploadedBy(SecurityUtils.getCurrentUser().getId())
                .originalFilename(original)
                .displayName(name)
                .vehicleModel(model.name())
                .storagePath(path)
                .storageBucket(bucket)
                .fileSizeBytes(bytes.length)
                .mimeType("application/pdf")
                .status("UPLOADED")
                .build();

        storage.save(path, bytes);
        documents.save(document);
        runAfterCommit(id);
        return DocumentResponse.from(document);
    }

    public List<DocumentResponse> list() {
        return documents.findAllByOrderByUploadedAtDesc().stream()
                .map(DocumentResponse::from)
                .toList();
    }

    public DocumentResponse get(UUID id) {
        return DocumentResponse.from(require(id));
    }

    public byte[] file(UUID id) {
        return storage.read(require(id).getStoragePath());
    }

    @Transactional
    public DocumentResponse reprocess(UUID id) {
        BrochureDocument document = require(id);
        if ("PROCESSING".equals(document.getStatus())) {
            throw new BusinessException("This brochure is already being processed.", HttpStatus.CONFLICT);
        }
        document.setStatus("UPLOADED");
        document.setErrorMessage(null);
        document.setChunksCount(null);
        document.setProcessedAt(null);
        documents.save(document);
        runAfterCommit(id);
        return DocumentResponse.from(document);
    }

    @Transactional
    public void delete(UUID id) {
        BrochureDocument document = require(id);
        storage.delete(document.getStoragePath());
        documents.delete(document);
    }

    private BrochureDocument require(UUID id) {
        return documents.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Brochure not found."));
    }

    private void runAfterCommit(UUID id) {
        if (TransactionSynchronizationManager.isSynchronizationActive()) {
            TransactionSynchronizationManager.registerSynchronization(new TransactionSynchronization() {
                @Override
                public void afterCommit() {
                    ingestion.process(id);
                }
            });
        } else {
            ingestion.process(id);
        }
    }

    private byte[] read(MultipartFile file) {
        if (file == null || file.isEmpty()) {
            throw new BusinessException("Choose a PDF brochure to upload.", HttpStatus.BAD_REQUEST);
        }
        try {
            return file.getBytes();
        } catch (IOException ex) {
            throw new BusinessException("The upload could not be read.", HttpStatus.BAD_REQUEST);
        }
    }

    private void validatePdf(MultipartFile file, byte[] bytes) {
        if (bytes.length > maxBytes) {
            throw new BusinessException("Uploaded file exceeds the maximum allowed size of 20 MB.", HttpStatus.PAYLOAD_TOO_LARGE);
        }
        String filename = file.getOriginalFilename() == null ? "" : file.getOriginalFilename().toLowerCase(Locale.ROOT);
        if (!filename.endsWith(".pdf")) {
            throw new BusinessException("Only PDF brochures are accepted.", HttpStatus.BAD_REQUEST);
        }
        if (bytes.length < PDF_MAGIC.length) {
            throw new BusinessException("The file is not a valid PDF.", HttpStatus.BAD_REQUEST);
        }
        for (int i = 0; i < PDF_MAGIC.length; i++) {
            if (bytes[i] != PDF_MAGIC[i]) {
                throw new BusinessException("The file is not a valid PDF.", HttpStatus.BAD_REQUEST);
            }
        }
    }

    static String sanitizeFilename(String raw) {
        String name = (raw == null || raw.isBlank()) ? "brochure.pdf" : raw;
        name = name.replace('\\', '/');
        int slash = name.lastIndexOf('/');
        if (slash >= 0) {
            name = name.substring(slash + 1);
        }
        name = name.replaceAll("[^A-Za-z0-9._-]", "_");
        if (!name.toLowerCase(Locale.ROOT).endsWith(".pdf")) {
            name = name + ".pdf";
        }
        return name.length() > 180 ? name.substring(name.length() - 180) : name;
    }

    private static String stripExtension(String filename) {
        int dot = filename.toLowerCase(Locale.ROOT).lastIndexOf(".pdf");
        return dot > 0 ? filename.substring(0, dot).replace('_', ' ') : filename;
    }
}
