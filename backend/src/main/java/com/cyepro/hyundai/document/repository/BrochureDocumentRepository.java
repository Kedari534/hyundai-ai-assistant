package com.cyepro.hyundai.document.repository;

import com.cyepro.hyundai.document.entity.BrochureDocument;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.UUID;

public interface BrochureDocumentRepository extends JpaRepository<BrochureDocument, UUID> {

    List<BrochureDocument> findAllByOrderByUploadedAtDesc();

    List<BrochureDocument> findByStatus(String status);
}
