package com.cyepro.hyundai.ingestion;

import org.apache.pdfbox.Loader;
import org.apache.pdfbox.pdmodel.PDDocument;
import org.apache.pdfbox.text.PDFTextStripper;
import org.springframework.stereotype.Component;

import java.io.IOException;
import java.util.ArrayList;
import java.util.List;

/**
 * Reads one page at a time so every chunk can keep a real page number.
 * A scanned brochure has almost no characters; we fail it instead of
 * indexing an empty document.
 */
@Component
public class PdfTextExtractor {

    private static final int MIN_LETTERS = 80;

    public List<PageText> extract(byte[] pdf) {
        try (PDDocument document = Loader.loadPDF(pdf)) {
            int pageCount = document.getNumberOfPages();
            if (pageCount == 0) {
                throw new IngestionException("The PDF has no pages.");
            }
            PDFTextStripper stripper = new PDFTextStripper();
            List<PageText> pages = new ArrayList<>();
            int letters = 0;
            for (int page = 1; page <= pageCount; page++) {
                stripper.setStartPage(page);
                stripper.setEndPage(page);
                String text = clean(stripper.getText(document));
                letters += countLetters(text);
                pages.add(new PageText(page, text));
            }
            if (letters < MIN_LETTERS) {
                throw new IngestionException(
                        "This PDF looks image-only or scanned. No text could be extracted. Upload a text-based brochure.");
            }
            return pages;
        } catch (IOException ex) {
            throw new IngestionException("The file could not be read as a PDF.", ex);
        }
    }

    static String clean(String raw) {
        if (raw == null) {
            return "";
        }
        return raw.replace('\u0000', ' ')
                .replace("\r\n", "\n")
                .replace('\r', '\n')
                .replaceAll("[\\t\\f]+", " ")
                .replaceAll("\n{3,}", "\n\n")
                .trim();
    }

    private static int countLetters(String text) {
        int count = 0;
        for (int i = 0; i < text.length(); i++) {
            if (Character.isLetterOrDigit(text.charAt(i))) {
                count++;
            }
        }
        return count;
    }
}
