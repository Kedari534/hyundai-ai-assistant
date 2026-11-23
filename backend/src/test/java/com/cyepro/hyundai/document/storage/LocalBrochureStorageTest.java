package com.cyepro.hyundai.document.storage;

import com.cyepro.hyundai.common.exception.BusinessException;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.util.FileSystemUtils;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class LocalBrochureStorageTest {

    private Path tempDir;
    private LocalBrochureStorage storage;

    @BeforeEach
    void setUp() throws IOException {
        tempDir = Files.createTempDirectory("brochure-test-");
        storage = new LocalBrochureStorage(tempDir.toString());
    }

    @AfterEach
    void tearDown() throws IOException {
        FileSystemUtils.deleteRecursively(tempDir);
    }

    @Test
    void saveAndReadBrochure() {
        String path = "alcazar/brochure.pdf";
        byte[] content = "%PDF-1.4 test brochure content".getBytes();

        storage.save(path, content);
        byte[] readBack = storage.read(path);

        assertThat(readBack).isEqualTo(content);
    }

    @Test
    void deleteBrochure() {
        String path = "creta/brochure.pdf";
        byte[] content = "%PDF-1.4 sample".getBytes();

        storage.save(path, content);
        assertThat(Files.exists(tempDir.resolve(path))).isTrue();

        storage.delete(path);
        assertThat(Files.exists(tempDir.resolve(path))).isFalse();
    }

    @Test
    void readMissingFileThrowsNotFound() {
        assertThatThrownBy(() -> storage.read("missing/notfound.pdf"))
                .isInstanceOf(BusinessException.class)
                .hasMessageContaining("missing from storage");
    }

    @Test
    void pathTraversalAttemptIsRejected() {
        assertThatThrownBy(() -> storage.save("../outside.pdf", "malicious".getBytes()))
                .isInstanceOf(BusinessException.class)
                .hasMessageContaining("Invalid storage path");

        assertThatThrownBy(() -> storage.read("../../etc/passwd"))
                .isInstanceOf(BusinessException.class)
                .hasMessageContaining("Invalid storage path");
    }
}
