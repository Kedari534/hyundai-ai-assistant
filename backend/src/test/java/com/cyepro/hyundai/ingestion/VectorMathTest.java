package com.cyepro.hyundai.ingestion;

import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.within;

class VectorMathTest {

    @Test
    void shortensToColumnWidthAndNormalizes() {
        float[] raw = new float[3072];
        for (int i = 0; i < raw.length; i++) {
            raw[i] = i == 0 ? 3f : 0f;
        }
        float[] fitted = VectorMath.fitAndNormalize(raw, 1536);
        assertThat(fitted).hasSize(1536);
        double norm = 0;
        for (float value : fitted) {
            norm += value * value;
        }
        assertThat(Math.sqrt(norm)).isCloseTo(1d, within(0.001));
        assertThat(fitted[0]).isCloseTo(1f, within(0.001f));
    }

    @Test
    void pgVectorLiteralUsesDotDecimals() {
        assertThat(VectorMath.toPgVector(new float[]{0.5f, 1f})).isEqualTo("[0.5,1.0]");
    }
}
