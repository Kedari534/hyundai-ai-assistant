package com.cyepro.hyundai.ingestion;

/**
 * Fits a model vector to the column width and L2-normalizes it.
 * Cosine search compares direction. A shortened gemini-embedding-001
 * vector is not normalized by the API, so we normalize here.
 */
public final class VectorMath {

    private VectorMath() {}

    public static float[] fitAndNormalize(float[] raw, int width) {
        if (raw == null || raw.length == 0) {
            throw new IllegalArgumentException("Embedding was empty");
        }
        float[] fitted = new float[width];
        int copy = Math.min(width, raw.length);
        System.arraycopy(raw, 0, fitted, 0, copy);
        return normalize(fitted);
    }

    public static float[] normalize(float[] values) {
        double sum = 0d;
        for (float value : values) {
            sum += (double) value * value;
        }
        double norm = Math.sqrt(sum);
        float[] out = new float[values.length];
        if (norm == 0d) {
            return out;
        }
        for (int i = 0; i < values.length; i++) {
            out[i] = (float) (values[i] / norm);
        }
        return out;
    }

    public static String toPgVector(float[] values) {
        StringBuilder builder = new StringBuilder(values.length * 8);
        builder.append('[');
        for (int i = 0; i < values.length; i++) {
            if (i > 0) {
                builder.append(',');
            }
            if (Float.isNaN(values[i]) || Float.isInfinite(values[i])) {
                throw new IllegalArgumentException("Embedding contained a non-finite number");
            }
            builder.append(Float.toString(values[i]));
        }
        builder.append(']');
        return builder.toString();
    }
}
