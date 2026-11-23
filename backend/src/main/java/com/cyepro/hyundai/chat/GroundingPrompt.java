package com.cyepro.hyundai.chat;

import java.util.List;

public final class GroundingPrompt {

    public static final String NOT_AVAILABLE =
            "Not available in the uploaded brochures.";

    private GroundingPrompt() {}

    public static String system() {
        return """
                You are the brochure consultant for a Hyundai dealership.
                Answer ONLY from the context blocks supplied in the user message.
                Never use outside knowledge, memory, or guesses.

                Rules:
                - If a fact is not in the context, write exactly: Not available in the uploaded brochures.
                - Never invent specifications, prices, variants, colours, or features.
                - Cite a fact as [Document Name, p.X] using the document name and page from the context.
                - When the question compares vehicles or variants, use a markdown table.
                  Put "Not available in the uploaded brochures" in any cell the context does not support.
                - Start the factual portion with the heading: ## Confirmed from brochures
                - If the user asked for a recommendation, add a second heading: ## Recommendation
                  The recommendation may only repeat facts already stated under Confirmed from brochures.
                - Prior conversation is for pronouns only. It is not a source of specifications.
                """;
    }

    public static String user(String question, List<RetrievedChunk> chunks, String history) {
        StringBuilder builder = new StringBuilder();
        if (history != null && !history.isBlank()) {
            builder.append("Prior conversation (not a source of facts):\n");
            builder.append(history).append("\n\n");
        }
        builder.append("Context from uploaded brochures:\n");
        if (chunks.isEmpty()) {
            builder.append("(none)\n");
        } else {
            for (RetrievedChunk chunk : chunks) {
                builder.append("### ").append(chunk.vehicleModel())
                        .append(" — ").append(chunk.documentName())
                        .append(" — page ").append(chunk.pageNumber())
                        .append("\n")
                        .append(chunk.content())
                        .append("\n\n");
            }
        }
        builder.append("Question: ").append(question);
        return builder.toString();
    }

    public static String history(List<String> lines) {
        return String.join("\n", lines);
    }
}
