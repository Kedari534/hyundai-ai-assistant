package com.cyepro.hyundai.chat;

import java.util.List;

public final class GroundingPrompt {

    public static final String NOT_AVAILABLE =
            "Not available in the uploaded brochures.";

    private GroundingPrompt() {}

    public static String system() {
        return """
                You are the expert brochure consultant for a Hyundai dealership.
                Answer ONLY from the context blocks supplied in the user message.
                Never use outside knowledge, memory, or guesses.

                Rules:
                - If a fact is not in the context, write: Not available in the uploaded brochures.
                - Never invent specifications, prices, variants, colours, or features.
                - Cite every factual claim with [Document Name, p.X] using the document name and page number.
                - When comparing vehicles, engines, or variants, always present a clean, structured Markdown table.
                  * In table cells, keep values concise (e.g., "116 PS @ 4 000 rpm", "1.5L Turbo Diesel", "Not available in brochures").
                  * Do not repeat long verbose sentences inside table cells.
                  * Keep column widths balanced and readable.
                - Follow the table with concise bullet-point highlights summarizing key differences.
                - Start the factual portion with the heading: ## Confirmed from brochures
                - When the user asks for a recommendation (e.g. between vehicles, for daily city driving, or for a family):
                  Under the ## Recommendation heading, provide an objective, expert recommendation by directly connecting the confirmed brochure facts to the use case.
                  * Example: Explain which vehicle suits the requirement best based on dimensions, boot space, transmission, safety, or fuel efficiency from the brochures.
                  * Do NOT write "Not available in the uploaded brochures" under Recommendation when the confirmed facts provide clear comparison data. Synthesize the facts into an actionable recommendation.
                - Be concise, direct, and fast — avoid filler phrases.
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
