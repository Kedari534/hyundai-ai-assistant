package com.cyepro.hyundai.chat.controller;

import com.cyepro.hyundai.chat.entity.ChatMessage;
import com.cyepro.hyundai.chat.entity.ChatSession;
import com.cyepro.hyundai.chat.service.ChatService;
import com.cyepro.hyundai.common.util.SecurityUtils;
import com.cyepro.hyundai.user.entity.User;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/chat")
public class ChatController {

    private final ChatService chat;

    public ChatController(ChatService chat) {
        this.chat = chat;
    }

    @PostMapping("/sessions")
    public ResponseEntity<SessionResponse> create(@RequestBody(required = false) CreateSessionRequest request) {
        User user = SecurityUtils.getCurrentUser();
        ChatSession session = chat.create(user, request == null ? null : request.title());
        return ResponseEntity.status(HttpStatus.CREATED).body(SessionResponse.from(session));
    }

    @GetMapping("/sessions")
    public List<SessionResponse> list() {
        return chat.list(SecurityUtils.getCurrentUser()).stream().map(SessionResponse::from).toList();
    }

    @PatchMapping("/sessions/{id}")
    public SessionResponse rename(@PathVariable UUID id, @Valid @RequestBody RenameRequest request) {
        return SessionResponse.from(chat.rename(SecurityUtils.getCurrentUser(), id, request.title()));
    }

    @DeleteMapping("/sessions/{id}")
    public ResponseEntity<Void> delete(@PathVariable UUID id) {
        chat.delete(SecurityUtils.getCurrentUser(), id);
        return ResponseEntity.noContent().build();
    }

    @GetMapping("/sessions/{id}/messages")
    public List<MessageResponse> messages(@PathVariable UUID id) {
        return chat.messages(SecurityUtils.getCurrentUser(), id).stream().map(MessageResponse::from).toList();
    }

    @PostMapping(value = "/sessions/{id}/messages", produces = MediaType.TEXT_EVENT_STREAM_VALUE)
    public SseEmitter send(@PathVariable UUID id, @RequestBody SendMessageRequest request) {
        boolean regenerate = request != null && Boolean.TRUE.equals(request.regenerate());
        String content = request == null ? null : request.content();
        return chat.stream(SecurityUtils.getCurrentUser(), id, content, regenerate);
    }

    @PatchMapping("/messages/{id}/rating")
    public MessageResponse rate(@PathVariable UUID id, @Valid @RequestBody RatingRequest request) {
        return MessageResponse.from(chat.rate(SecurityUtils.getCurrentUser(), id, request.rating()));
    }

    public record CreateSessionRequest(String title) {}

    public record RenameRequest(@NotBlank @Size(max = 255) String title) {}

    public record SendMessageRequest(String content, Boolean regenerate) {}

    public record RatingRequest(@Min(-1) @Max(1) int rating) {}

    public record SessionResponse(UUID id, String title, Instant createdAt, Instant updatedAt) {
        static SessionResponse from(ChatSession session) {
            return new SessionResponse(session.getId(), session.getTitle(), session.getCreatedAt(), session.getUpdatedAt());
        }
    }

    public record MessageResponse(
            UUID id,
            String role,
            String content,
            String sources,
            Integer rating,
            Instant createdAt
    ) {
        static MessageResponse from(ChatMessage message) {
            return new MessageResponse(
                    message.getId(),
                    message.getRole(),
                    message.getContent(),
                    message.getSources(),
                    message.getRating(),
                    message.getCreatedAt());
        }
    }
}
