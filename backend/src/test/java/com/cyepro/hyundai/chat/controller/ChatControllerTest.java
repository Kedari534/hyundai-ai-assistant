package com.cyepro.hyundai.chat.controller;

import com.cyepro.hyundai.chat.entity.ChatMessage;
import com.cyepro.hyundai.chat.entity.ChatSession;
import com.cyepro.hyundai.chat.service.ChatService;
import com.cyepro.hyundai.common.exception.GlobalExceptionHandler;
import com.cyepro.hyundai.user.entity.User;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.MediaType;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

import static org.hamcrest.Matchers.hasSize;
import static org.hamcrest.Matchers.is;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@ExtendWith(MockitoExtension.class)
class ChatControllerTest {

    private MockMvc mockMvc;
    private final ObjectMapper json = new ObjectMapper();

    @Mock
    private ChatService chatService;

    @InjectMocks
    private ChatController chatController;

    private User testUser;

    @BeforeEach
    void setUp() {
        mockMvc = MockMvcBuilders.standaloneSetup(chatController)
                .setControllerAdvice(new GlobalExceptionHandler())
                .build();

        testUser = User.builder()
                .id(UUID.randomUUID())
                .email("sales@cyepro.com")
                .fullName("Sales Consultant")
                .role("USER")
                .build();

        SecurityContextHolder.getContext().setAuthentication(
                new UsernamePasswordAuthenticationToken(testUser, null, testUser.getAuthorities())
        );
    }

    @AfterEach
    void tearDown() {
        SecurityContextHolder.clearContext();
    }

    @Test
    @DisplayName("POST /api/chat/sessions creates a new chat session")
    void createSession() throws Exception {
        UUID sessionId = UUID.randomUUID();
        ChatSession session = ChatSession.builder()
                .id(sessionId)
                .userId(testUser.getId())
                .title("Alcazar Inquiry")
                .createdAt(Instant.now())
                .updatedAt(Instant.now())
                .build();

        when(chatService.create(eq(testUser), eq("Alcazar Inquiry"))).thenReturn(session);

        mockMvc.perform(post("/api/chat/sessions")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"title\":\"Alcazar Inquiry\"}"))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.id", is(sessionId.toString())))
                .andExpect(jsonPath("$.title", is("Alcazar Inquiry")));
    }

    @Test
    @DisplayName("GET /api/chat/sessions lists all sessions for current user")
    void listSessions() throws Exception {
        UUID sessionId = UUID.randomUUID();
        ChatSession session = ChatSession.builder()
                .id(sessionId)
                .userId(testUser.getId())
                .title("Creta vs Alcazar")
                .createdAt(Instant.now())
                .updatedAt(Instant.now())
                .build();

        when(chatService.list(testUser)).thenReturn(List.of(session));

        mockMvc.perform(get("/api/chat/sessions"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$", hasSize(1)))
                .andExpect(jsonPath("$[0].title", is("Creta vs Alcazar")));
    }

    @Test
    @DisplayName("PATCH /api/chat/sessions/{id} renames an existing session")
    void renameSession() throws Exception {
        UUID sessionId = UUID.randomUUID();
        ChatSession session = ChatSession.builder()
                .id(sessionId)
                .userId(testUser.getId())
                .title("Updated Title")
                .createdAt(Instant.now())
                .updatedAt(Instant.now())
                .build();

        when(chatService.rename(eq(testUser), eq(sessionId), eq("Updated Title"))).thenReturn(session);

        mockMvc.perform(patch("/api/chat/sessions/{id}", sessionId)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"title\":\"Updated Title\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.title", is("Updated Title")));
    }

    @Test
    @DisplayName("DELETE /api/chat/sessions/{id} deletes conversation and returns 204")
    void deleteSession() throws Exception {
        UUID sessionId = UUID.randomUUID();

        mockMvc.perform(delete("/api/chat/sessions/{id}", sessionId))
                .andExpect(status().isNoContent());

        verify(chatService).delete(testUser, sessionId);
    }

    @Test
    @DisplayName("GET /api/chat/sessions/{id}/messages returns message history")
    void getMessages() throws Exception {
        UUID sessionId = UUID.randomUUID();
        UUID messageId = UUID.randomUUID();
        ChatMessage message = ChatMessage.builder()
                .id(messageId)
                .sessionId(sessionId)
                .role("USER")
                .content("What is the engine power of Creta?")
                .createdAt(Instant.now())
                .build();

        when(chatService.messages(testUser, sessionId)).thenReturn(List.of(message));

        mockMvc.perform(get("/api/chat/sessions/{id}/messages", sessionId))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$", hasSize(1)))
                .andExpect(jsonPath("$[0].role", is("USER")))
                .andExpect(jsonPath("$[0].content", is("What is the engine power of Creta?")));
    }

    @Test
    @DisplayName("PATCH /api/chat/messages/{id}/rating updates feedback rating")
    void rateMessage() throws Exception {
        UUID messageId = UUID.randomUUID();
        ChatMessage message = ChatMessage.builder()
                .id(messageId)
                .sessionId(UUID.randomUUID())
                .role("ASSISTANT")
                .content("Alcazar has 160 PS [Alcazar Brochure, p.4].")
                .rating(1)
                .createdAt(Instant.now())
                .build();

        when(chatService.rate(eq(testUser), eq(messageId), eq(1))).thenReturn(message);

        mockMvc.perform(patch("/api/chat/messages/{id}/rating", messageId)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"rating\":1}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.rating", is(1)));
    }
}
