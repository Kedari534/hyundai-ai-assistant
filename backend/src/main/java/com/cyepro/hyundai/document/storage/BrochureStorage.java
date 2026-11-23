package com.cyepro.hyundai.document.storage;

public interface BrochureStorage {

    void save(String path, byte[] bytes);

    byte[] read(String path);

    void delete(String path);
}
