package com.cyepro.hyundai.chat;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.util.List;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;

class GroundingPromptTest {

    @Test
    @DisplayName("System prompt mandates strict grounding and forbids outside knowledge")
    void systemPromptEnforcesGroundingRules() {
        String prompt = GroundingPrompt.system();

        assertThat(prompt)
                .contains("Answer ONLY from the context blocks")
                .contains("Never use outside knowledge")
                .contains("Not available in the uploaded brochures")
                .contains("## Confirmed from brochures")
                .contains("## Recommendation");
    }

    @Test
    @DisplayName("User prompt formats context blocks with vehicle, document, and page citations")
    void userPromptIncludesFormattedContext() {
        RetrievedChunk chunk = new RetrievedChunk(
                UUID.randomUUID(),
                "Hyundai_Alcazar_Brochure.pdf",
                "ALCAZAR",
                12,
                "Boot space is 180 litres with all three rows up, expandable to 579 litres.",
                0.88
        );

        String prompt = GroundingPrompt.user("What is the boot space of Alcazar?", List.of(chunk), null);

        assertThat(prompt)
                .contains("ALCAZAR — Hyundai_Alcazar_Brochure.pdf — page 12")
                .contains("Boot space is 180 litres")
                .contains("Question: What is the boot space of Alcazar?");
    }

    @Test
    @DisplayName("User prompt flags empty context as (none)")
    void userPromptWithEmptyChunks() {
        String prompt = GroundingPrompt.user("What is the battery warranty of Ioniq 5?", List.of(), null);

        assertThat(prompt)
                .contains("(none)")
                .contains("Question: What is the battery warranty of Ioniq 5?");
    }
}
