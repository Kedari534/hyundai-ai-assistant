package com.cyepro.hyundai.ingestion;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import java.util.ArrayList;
import java.util.List;

/**
 * Splits each page into chunks while keeping bullet lists and spec tables
 * together. A table that is cut in half is how one model's number gets
 * attached to another model's name.
 */
@Component
public class TextChunker {

    private final int chunkSize;
    private final int overlap;
    private static final int MAX_BLOCK = 5000;

    public TextChunker(
            @Value("${app.ingestion.chunk-size:1600}") int chunkSize,
            @Value("${app.ingestion.chunk-overlap:200}") int overlap) {
        this.chunkSize = Math.max(400, chunkSize);
        this.overlap = Math.max(0, Math.min(overlap, this.chunkSize / 2));
    }

    public List<ChunkDraft> chunk(List<PageText> pages) {
        List<ChunkDraft> drafts = new ArrayList<>();
        int index = 0;
        for (PageText page : pages) {
            if (page.text() == null || page.text().isBlank()) {
                continue;
            }
            List<String> pageBlocks = blocks(page.text());
            for (int i = 0; i < pageBlocks.size(); i++) {
                String block = pageBlocks.get(i);
                if (block.length() < 80 && !isStructured(block)
                        && i + 1 < pageBlocks.size() && isStructured(pageBlocks.get(i + 1))) {
                    block = block + "\n" + pageBlocks.get(++i);
                }
                if (isStructured(block) && block.length() <= MAX_BLOCK) {
                    drafts.add(new ChunkDraft(page.pageNumber(), index++, block.trim()));
                    continue;
                }
                index = splitProse(page.pageNumber(), block, drafts, index);
            }
        }
        return drafts;
    }

    private int splitProse(int pageNumber, String block, List<ChunkDraft> drafts, int index) {
        String remaining = block.trim();
        while (!remaining.isEmpty()) {
            if (remaining.length() <= chunkSize) {
                drafts.add(new ChunkDraft(pageNumber, index++, remaining));
                break;
            }
            int cut = findCut(remaining, chunkSize);
            String piece = remaining.substring(0, cut).trim();
            drafts.add(new ChunkDraft(pageNumber, index++, piece));
            int start = Math.max(0, cut - overlap);
            remaining = remaining.substring(start).trim();
        }
        return index;
    }

    private int findCut(String text, int preferred) {
        int searchFrom = Math.max(0, preferred - 200);
        int newline = text.lastIndexOf('\n', preferred);
        if (newline >= searchFrom) {
            return newline + 1;
        }
        int space = text.lastIndexOf(' ', preferred);
        if (space >= searchFrom) {
            return space + 1;
        }
        return preferred;
    }

    static List<String> blocks(String page) {
        String[] lines = page.split("\n", -1);
        List<String> blocks = new ArrayList<>();
        StringBuilder current = new StringBuilder();
        String mode = "prose";
        for (String line : lines) {
            String kind = lineKind(line);
            if (line.isBlank()) {
                flush(blocks, current);
                mode = "prose";
                continue;
            }
            if (!mode.equals(kind) && !current.isEmpty() && !("prose".equals(mode) && "prose".equals(kind))) {
                if (!("prose".equals(kind) && "prose".equals(mode))) {
                    flush(blocks, current);
                }
            }
            if (!current.isEmpty() && !kind.equals(mode)) {
                flush(blocks, current);
            }
            mode = kind;
            if (!current.isEmpty()) {
                current.append('\n');
            }
            current.append(line.strip());
        }
        flush(blocks, current);
        return blocks;
    }

    private static void flush(List<String> blocks, StringBuilder current) {
        if (!current.isEmpty()) {
            blocks.add(current.toString());
            current.setLength(0);
        }
    }

    static String lineKind(String line) {
        String trimmed = line.strip();
        if (trimmed.startsWith("- ") || trimmed.startsWith("• ") || trimmed.startsWith("* ")) {
            return "list";
        }
        if (trimmed.contains(" | ") || trimmed.chars().filter(ch -> ch == '|').count() >= 2) {
            return "table";
        }
        if (trimmed.matches(".*\\s{2,}\\S+.*\\s{2,}\\S+.*")) {
            return "table";
        }
        return "prose";
    }

    static boolean isStructured(String block) {
        String[] lines = block.split("\n");
        if (lines.length < 2) {
            return false;
        }
        int structured = 0;
        for (String line : lines) {
            String kind = lineKind(line);
            if ("list".equals(kind) || "table".equals(kind)) {
                structured++;
            }
        }
        return structured >= lines.length - 1;
    }
}
