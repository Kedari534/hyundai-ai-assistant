package com.cyepro.hyundai.document.storage;

import com.cyepro.hyundai.common.exception.BusinessException;
import org.springframework.http.HttpStatus;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;

/** Dev storage. Production hosts wipe local disk, so they use Supabase. */
public class LocalBrochureStorage implements BrochureStorage {

    private final Path root;

    public LocalBrochureStorage(String directory) {
        this.root = Path.of(directory).toAbsolutePath().normalize();
    }

    @Override
    public void save(String path, byte[] bytes) {
        Path target = resolve(path);
        try {
            Files.createDirectories(target.getParent());
            Files.write(target, bytes);
        } catch (IOException ex) {
            throw new BusinessException("The brochure could not be stored.", HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }

    @Override
    public byte[] read(String path) {
        try {
            return Files.readAllBytes(resolve(path));
        } catch (IOException ex) {
            throw new BusinessException("The brochure file is missing from storage.", HttpStatus.NOT_FOUND);
        }
    }

    @Override
    public void delete(String path) {
        try {
            Files.deleteIfExists(resolve(path));
        } catch (IOException ex) {
            throw new BusinessException("The brochure file could not be deleted.", HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }

    private Path resolve(String path) {
        if (path == null || path.contains("..")) {
            throw new BusinessException("Invalid storage path.", HttpStatus.BAD_REQUEST);
        }
        Path target = root.resolve(path).normalize();
        if (!target.startsWith(root)) {
            throw new BusinessException("Invalid storage path.", HttpStatus.BAD_REQUEST);
        }
        return target;
    }
}
