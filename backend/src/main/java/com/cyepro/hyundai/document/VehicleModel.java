package com.cyepro.hyundai.document;

import com.cyepro.hyundai.common.exception.BusinessException;
import org.springframework.http.HttpStatus;

import java.util.Arrays;
import java.util.List;

public enum VehicleModel {
    ALCAZAR("Alcazar"),
    CRETA("Creta"),
    I20("i20"),
    AURA("Aura"),
    VENUE("Venue"),
    VERNA("Verna"),
    EXTER("Exter"),
    TUCSON("Tucson"),
    GRAND_I10_NIOS("Grand i10 Nios");

    private final String label;

    VehicleModel(String label) {
        this.label = label;
    }

    public String label() {
        return label;
    }

    public static VehicleModel parse(String raw) {
        if (raw == null || raw.isBlank()) {
            throw new BusinessException("Choose a vehicle model.", HttpStatus.BAD_REQUEST);
        }
        String key = raw.trim().toUpperCase().replace('-', '_').replace(' ', '_');
        if ("I_20".equals(key) || "I20".equals(key)) {
            return I20;
        }
        if (key.contains("GRAND") && key.contains("I10")) {
            return GRAND_I10_NIOS;
        }
        try {
            return VehicleModel.valueOf(key);
        } catch (IllegalArgumentException ex) {
            throw new BusinessException(
                    "Unknown vehicle model. Choose one of: " + labels(),
                    HttpStatus.BAD_REQUEST);
        }
    }

    public static List<String> labels() {
        return Arrays.stream(values()).map(VehicleModel::label).toList();
    }
}
