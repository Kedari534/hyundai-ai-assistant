package com.cyepro.hyundai.chat.service;

import com.cyepro.hyundai.chat.GroundingPrompt;
import com.cyepro.hyundai.chat.RetrievalService;
import com.cyepro.hyundai.chat.RetrievedChunk;
import com.cyepro.hyundai.chat.VehicleQueryPlanner;
import com.cyepro.hyundai.chat.entity.ChatMessage;
import com.cyepro.hyundai.chat.entity.ChatSession;
import com.cyepro.hyundai.chat.repository.ChatMessageRepository;
import com.cyepro.hyundai.chat.repository.ChatSessionRepository;
import com.cyepro.hyundai.common.exception.BusinessException;
import com.cyepro.hyundai.common.exception.ResourceNotFoundException;
import com.cyepro.hyundai.user.entity.User;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.ai.chat.client.ChatClient;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

import java.io.IOException;
import java.time.Instant;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.concurrent.Executor;

@Service
public class ChatService {

    private static final Logger log = LoggerFactory.getLogger(ChatService.class);

    private final ChatSessionRepository sessions;
    private final ChatMessageRepository messages;
    private final VehicleQueryPlanner planner;
    private final RetrievalService retrieval;
    private final ChatClient chatClient;
    private final ObjectMapper json;
    private final Executor chatExecutor;

    public ChatService(ChatSessionRepository sessions,
                       ChatMessageRepository messages,
                       VehicleQueryPlanner planner,
                       RetrievalService retrieval,
                       ChatClient chatClient,
                       ObjectMapper json,
                       @Qualifier("chatExecutor") Executor chatExecutor) {
        this.sessions = sessions;
        this.messages = messages;
        this.planner = planner;
        this.retrieval = retrieval;
        this.chatClient = chatClient;
        this.json = json;
        this.chatExecutor = chatExecutor;
    }

    @Transactional
    public ChatSession create(User user, String title) {
        ChatSession session = ChatSession.builder()
                .id(UUID.randomUUID())
                .userId(user.getId())
                .title(title == null || title.isBlank() ? "New conversation" : title.trim())
                .build();
        return sessions.save(session);
    }

    public List<ChatSession> list(User user) {
        return sessions.findByUserIdAndArchivedFalseOrderByUpdatedAtDesc(user.getId());
    }

    @Transactional
    public ChatSession rename(User user, UUID sessionId, String title) {
        ChatSession session = owned(user, sessionId);
        if (title == null || title.isBlank()) {
            throw new BusinessException("A conversation title is required.", HttpStatus.BAD_REQUEST);
        }
        session.setTitle(title.trim());
        return sessions.save(session);
    }

    @Transactional
    public void delete(User user, UUID sessionId) {
        ChatSession session = owned(user, sessionId);
        messages.findBySessionIdOrderByCreatedAtAsc(session.getId()).forEach(messages::delete);
        sessions.delete(session);
    }

    public List<ChatMessage> messages(User user, UUID sessionId) {
        owned(user, sessionId);
        return messages.findBySessionIdOrderByCreatedAtAsc(sessionId);
    }

    @Transactional
    public ChatMessage rate(User user, UUID messageId, int rating) {
        if (rating != 1 && rating != -1) {
            throw new BusinessException("Rating must be 1 or -1.", HttpStatus.BAD_REQUEST);
        }
        ChatMessage message = messages.findById(messageId)
                .orElseThrow(() -> new ResourceNotFoundException("Message not found."));
        owned(user, message.getSessionId());
        if (!"ASSISTANT".equals(message.getRole())) {
            throw new BusinessException("Only an assistant answer can be rated.", HttpStatus.BAD_REQUEST);
        }
        message.setRating(rating);
        return messages.save(message);
    }

    public SseEmitter stream(User user, UUID sessionId, String content, boolean regenerate) {
        ChatSession session = owned(user, sessionId);
        String question = resolveQuestion(session, content, regenerate);
        SseEmitter emitter = new SseEmitter(180_000L);
        chatExecutor.execute(() -> answer(emitter, session, question));
        return emitter;
    }

    public static final String GREETING_MESSAGE = """
            Hello! I am your **Hyundai Automotive AI Consultant** at Cyepro Solutions.

            I can assist you with verified technical specifications, variant matrices, engine details, and side-by-side comparisons directly from our official Hyundai brochures:
            - **Hyundai Alcazar** (Strategic 6/7-Seater Premium SUV)
            - **Hyundai Creta** (India's Best-Selling Midsize SUV)
            - **Hyundai i20** (Premium Hatchback)
            - **Hyundai Aura** (Sub-4m Strategic Family Sedan)

            **How can I assist you today?** You can ask:
            - *"What are the engine specs and mileage of the Alcazar?"*
            - *"Compare Alcazar vs Creta in seating, boot space, and dimensions."*
            - *"Should I recommend the i20 or Aura for daily city driving?"*
            - *"Compare all petrol and diesel engines across models."*
            """;

    private void answer(SseEmitter emitter, ChatSession session, String question) {
        try {
            if (isGreeting(question)) {
                send(emitter, "token", GREETING_MESSAGE);
                ChatMessage saved = saveAssistant(session, GREETING_MESSAGE, List.of());
                send(emitter, "sources", List.of());
                send(emitter, "done", Map.of("messageId", saved.getId().toString(), "content", GREETING_MESSAGE));
                emitter.complete();
                return;
            }

            VehicleQueryPlanner.RetrievalPlan plan = planner.plan(question);
            String search = planner.searchText(question, plan);
            List<RetrievedChunk> chunks;
            try {
                chunks = retrieval.retrieve(search, plan);
            } catch (Exception ex) {
                log.error("Retrieval failed", ex);
                send(emitter, "error", "The brochures could not be searched. Check that indexing finished and the API key is set.");
                emitter.complete();
                return;
            }

            String answer;
            if (chunks.isEmpty()) {
                answer = GroundingPrompt.NOT_AVAILABLE
                        + " Upload a completed brochure that covers this question, then ask again.";
                send(emitter, "token", answer);
            } else {
                answer = streamModel(emitter, question, chunks, history(session.getId()));
            }
            ChatMessage saved = saveAssistant(session, answer, chunks);
            send(emitter, "sources", sources(chunks));
            send(emitter, "done", Map.of("messageId", saved.getId().toString(), "content", answer));
            emitter.complete();
        } catch (Exception ex) {
            log.error("Chat answer failed", ex);
            try {
                send(emitter, "error", "The answer could not be completed. Please try again.");
                emitter.complete();
            } catch (Exception ignored) {
                emitter.completeWithError(ex);
            }
        }
    }

    private String streamModel(SseEmitter emitter, String question, List<RetrievedChunk> chunks, String history) {
        StringBuilder answer = new StringBuilder();
        chatClient.prompt()
                .system(GroundingPrompt.system())
                .user(GroundingPrompt.user(question, chunks, history))
                .stream()
                .content()
                .doOnNext(token -> {
                    answer.append(token);
                    send(emitter, "token", token);
                })
                .blockLast();
        if (answer.isEmpty()) {
            throw new BusinessException("The model returned an empty answer.", HttpStatus.BAD_GATEWAY);
        }
        return answer.toString();
    }

    private String resolveQuestion(ChatSession session, String content, boolean regenerate) {
        if (regenerate) {
            List<ChatMessage> existing = messages.findBySessionIdOrderByCreatedAtAsc(session.getId());
            String question = null;
            ChatMessage lastAssistant = null;
            for (ChatMessage message : existing) {
                if ("USER".equals(message.getRole())) {
                    question = message.getContent();
                }
                if ("ASSISTANT".equals(message.getRole())) {
                    lastAssistant = message;
                }
            }
            if (question == null) {
                throw new BusinessException("There is no question to regenerate.", HttpStatus.BAD_REQUEST);
            }
            if (lastAssistant != null) {
                messages.delete(lastAssistant);
            }
            return question;
        }
        if (content == null || content.isBlank()) {
            throw new BusinessException("Enter a question.", HttpStatus.BAD_REQUEST);
        }
        if (content.length() > 2000) {
            throw new BusinessException("Questions are limited to 2000 characters.", HttpStatus.BAD_REQUEST);
        }
        messages.save(ChatMessage.builder()
                .id(UUID.randomUUID())
                .sessionId(session.getId())
                .role("USER")
                .content(content.trim())
                .createdAt(Instant.now())
                .build());
        if ("New conversation".equals(session.getTitle())) {
            session.setTitle(content.trim().length() > 72 ? content.trim().substring(0, 72) + "…" : content.trim());
        }
        session.setUpdatedAt(Instant.now());
        sessions.save(session);
        return content.trim();
    }

    private ChatMessage saveAssistant(ChatSession session, String answer, List<RetrievedChunk> chunks) {
        session.setUpdatedAt(Instant.now());
        sessions.save(session);
        return messages.save(ChatMessage.builder()
                .id(UUID.randomUUID())
                .sessionId(session.getId())
                .role("ASSISTANT")
                .content(answer)
                .sources(writeSources(chunks))
                .createdAt(Instant.now())
                .build());
    }

    private String history(UUID sessionId) {
        List<ChatMessage> existing = messages.findBySessionIdOrderByCreatedAtAsc(sessionId);
        int from = Math.max(0, existing.size() - 6);
        List<String> lines = new ArrayList<>();
        for (ChatMessage message : existing.subList(from, existing.size())) {
            if ("USER".equals(message.getRole())) {
                String text = message.getContent();
                lines.add("User: " + (text.length() > 400 ? text.substring(0, 400) : text));
            }
        }
        return GroundingPrompt.history(lines);
    }

    private String writeSources(List<RetrievedChunk> chunks) {
        try {
            return json.writeValueAsString(sources(chunks));
        } catch (IOException ex) {
            return "[]";
        }
    }

    private List<Map<String, Object>> sources(List<RetrievedChunk> chunks) {
        List<Map<String, Object>> list = new ArrayList<>();
        for (RetrievedChunk chunk : chunks) {
            Map<String, Object> item = new LinkedHashMap<>();
            item.put("documentId", chunk.documentId().toString());
            item.put("documentName", chunk.documentName());
            item.put("vehicleModel", chunk.vehicleModel());
            item.put("pageNumber", chunk.pageNumber());
            String snippet = chunk.content().replace('\n', ' ');
            item.put("snippet", snippet.length() > 220 ? snippet.substring(0, 220) + "…" : snippet);
            list.add(item);
        }
        return list;
    }

    private void send(SseEmitter emitter, String event, Object data) {
        try {
            emitter.send(SseEmitter.event().name(event).data(json.writeValueAsString(data)));
        } catch (IOException ex) {
            throw new IllegalStateException("Client disconnected", ex);
        }
    }

    private boolean isGreeting(String question) {
        if (question == null) {
            return false;
        }
        String cleaned = question.trim().toLowerCase(java.util.Locale.ROOT)
                .replaceAll("[!.,?]+$", "").trim();
        return switch (cleaned) {
            case "hi", "hello", "hey", "hola", "namaste",
                 "good morning", "good afternoon", "good evening", "good day",
                 "greetings", "hi there", "hello there", "hey there",
                 "help", "who are you", "what can you do", "start" -> true;
            default -> false;
        };
    }

    private ChatSession owned(User user, UUID sessionId) {
        ChatSession session = sessions.findById(sessionId)
                .orElseThrow(() -> new ResourceNotFoundException("Conversation not found."));
        if (!session.getUserId().equals(user.getId())) {
            throw new BusinessException("You do not have access to this conversation.", HttpStatus.FORBIDDEN);
        }
        return session;
    }
}
