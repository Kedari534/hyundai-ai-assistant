package com.cyepro.hyundai.chat;

import org.springframework.stereotype.Component;

import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;

/**
 * Decides which brochures to search. A comparison runs one search per
 * vehicle so the longer brochure cannot crowd the other one out.
 */
@Component
public class VehicleQueryPlanner {

    private static final Map<String, String> ALIASES = new LinkedHashMap<>();

    static {
        ALIASES.put("grand i10 nios", "GRAND_I10_NIOS");
        ALIASES.put("grand i10", "GRAND_I10_NIOS");
        ALIASES.put("alcazar", "ALCAZAR");
        ALIASES.put("creta", "CRETA");
        ALIASES.put("venue", "VENUE");
        ALIASES.put("verna", "VERNA");
        ALIASES.put("exter", "EXTER");
        ALIASES.put("tucson", "TUCSON");
        ALIASES.put("aura", "AURA");
        ALIASES.put("i20", "I20");
        ALIASES.put("i-20", "I20");
    }

    public RetrievalPlan plan(String question) {
        String lower = question == null ? "" : question.toLowerCase(Locale.ROOT);
        List<AliasHit> hits = new ArrayList<>();
        for (Map.Entry<String, String> alias : ALIASES.entrySet()) {
            int index = lower.indexOf(alias.getKey());
            if (index >= 0) {
                hits.add(new AliasHit(index, alias.getKey().length(), alias.getValue()));
            }
        }
        hits.sort((left, right) -> {
            int byIndex = Integer.compare(left.index(), right.index());
            return byIndex != 0 ? byIndex : Integer.compare(right.length(), left.length());
        });
        List<String> vehicles = new ArrayList<>();
        for (AliasHit hit : hits) {
            if (!vehicles.contains(hit.code())) {
                vehicles.add(hit.code());
            }
        }
        boolean comparison = vehicles.size() >= 2
                || lower.contains(" vs ")
                || lower.contains("versus")
                || lower.contains("compare")
                || lower.contains("comparison")
                || lower.contains("variant");
        boolean recommendation = lower.contains("recommend")
                || lower.contains("suggest")
                || lower.contains("which car")
                || lower.contains("best car")
                || lower.contains("for my family")
                || lower.contains("should i");
        return new RetrievalPlan(List.copyOf(vehicles), aspect(lower), comparison, recommendation);
    }

    public String searchText(String question, RetrievalPlan plan) {
        StringBuilder text = new StringBuilder(question == null ? "" : question.trim());
        if (!plan.aspect().isBlank()) {
            text.append(' ').append(plan.aspect()).append(" specifications features");
        }
        return text.toString();
    }

    private String aspect(String lower) {
        List<String> aspects = new ArrayList<>();
        if (containsAny(lower, "engine", "torque", "power", "transmission", "diesel", "petrol", "mileage", "performance")) {
            aspects.add("engine performance transmission");
        }
        if (containsAny(lower, "safety", "airbag", "ncap", "adas", "brake")) {
            aspects.add("safety");
        }
        if (containsAny(lower, "comfort", "seat", "boot", "climate", "suspension", "space")) {
            aspects.add("comfort seating space");
        }
        if (containsAny(lower, "technology", "tech", "screen", "display", "wireless", "sunroof", "camera", "infotainment")) {
            aspects.add("technology features");
        }
        return String.join(" ", aspects);
    }

    private boolean containsAny(String text, String... words) {
        for (String word : words) {
            if (text.contains(word)) {
                return true;
            }
        }
        return false;
    }

    public record RetrievalPlan(List<String> vehicles, String aspect, boolean comparison, boolean recommendation) {}

    private record AliasHit(int index, int length, String code) {}
}
