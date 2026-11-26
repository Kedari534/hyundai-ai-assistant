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
import com.cyepro.hyundai.user.entity.User;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.ai.chat.client.ChatClient;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

import java.time.Instant;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import java.util.concurrent.Executor;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class ChatServiceTest {

    @Mock
    private ChatSessionRepository sessionRepository;

    @Mock
    private ChatMessageRepository messageRepository;

    @Mock
    private VehicleQueryPlanner planner;

    @Mock
    private RetrievalService retrieval;

    @Mock
    private ChatClient chatClient;

    private ChatService chatService;
    private User testUser;
    private final Executor directExecutor = Runnable::run;

    @BeforeEach
    void setUp() {
        chatService = new ChatService(
                sessionRepository,
                messageRepository,
                planner,
                retrieval,
                chatClient,
                new ObjectMapper(),
                directExecutor
        );

        testUser = User.builder()
                .id(UUID.randomUUID())
                .email("test@example.com")
                .fullName("Test Consultant")
                .role("USER")
                .build();
    }

    @Test
    @DisplayName("Create session generates new ID and sets default title if blank")
    void createSessionWithDefaultTitle() {
        when(sessionRepository.save(any(ChatSession.class))).thenAnswer(i -> i.getArgument(0));

        ChatSession session = chatService.create(testUser, null);

        assertThat(session.getTitle()).isEqualTo("New conversation");
        assertThat(session.getUserId()).isEqualTo(testUser.getId());
        verify(sessionRepository).save(any(ChatSession.class));
    }

    @Test
    @DisplayName("Rename session updates title when owned by user")
    void renameSessionSuccess() {
        UUID sessionId = UUID.randomUUID();
        ChatSession session = ChatSession.builder()
                .id(sessionId)
                .userId(testUser.getId())
                .title("Old Title")
                .build();

        when(sessionRepository.findById(sessionId)).thenReturn(Optional.of(session));
        when(sessionRepository.save(any(ChatSession.class))).thenAnswer(i -> i.getArgument(0));

        ChatSession updated = chatService.rename(testUser, sessionId, "New Title");

        assertThat(updated.getTitle()).isEqualTo("New Title");
        verify(sessionRepository).save(session);
    }

    @Test
    @DisplayName("Delete session deletes all session messages and session itself")
    void deleteSessionCascadesMessages() {
        UUID sessionId = UUID.randomUUID();
        ChatSession session = ChatSession.builder()
                .id(sessionId)
                .userId(testUser.getId())
                .build();

        ChatMessage msg1 = ChatMessage.builder().id(UUID.randomUUID()).sessionId(sessionId).build();
        ChatMessage msg2 = ChatMessage.builder().id(UUID.randomUUID()).sessionId(sessionId).build();

        when(sessionRepository.findById(sessionId)).thenReturn(Optional.of(session));
        when(messageRepository.findBySessionIdOrderByCreatedAtAsc(sessionId)).thenReturn(List.of(msg1, msg2));

        chatService.delete(testUser, sessionId);

        verify(messageRepository).delete(msg1);
        verify(messageRepository).delete(msg2);
        verify(sessionRepository).delete(session);
    }

    @Test
    @DisplayName("Rating only allowed on ASSISTANT role messages")
    void ratingRejectsUserRoleMessage() {
        UUID messageId = UUID.randomUUID();
        UUID sessionId = UUID.randomUUID();
        ChatSession session = ChatSession.builder().id(sessionId).userId(testUser.getId()).build();
        ChatMessage userMsg = ChatMessage.builder()
                .id(messageId)
                .sessionId(sessionId)
                .role("USER")
                .build();

        when(messageRepository.findById(messageId)).thenReturn(Optional.of(userMsg));
        when(sessionRepository.findById(sessionId)).thenReturn(Optional.of(session));

        assertThatThrownBy(() -> chatService.rate(testUser, messageId, 1))
                .isInstanceOf(BusinessException.class)
                .hasMessageContaining("Only an assistant answer can be rated");
    }

    @Test
    @DisplayName("When retrieval yields NO chunks, LLM is NEVER called and fixed message is returned")
    void emptyChunksSkipsLlmCallAndReturnsNotAvailable() {
        UUID sessionId = UUID.randomUUID();
        ChatSession session = ChatSession.builder()
                .id(sessionId)
                .userId(testUser.getId())
                .title("Alcazar Inquiry")
                .build();

        when(sessionRepository.findById(sessionId)).thenReturn(Optional.of(session));
        when(messageRepository.save(any(ChatMessage.class))).thenAnswer(i -> {
            ChatMessage m = i.getArgument(0);
            m.setId(UUID.randomUUID());
            return m;
        });

        VehicleQueryPlanner.RetrievalPlan plan = new VehicleQueryPlanner.RetrievalPlan(
                List.of("ALCAZAR"), "transmission", false, false
        );
        when(planner.plan(anyString())).thenReturn(plan);
        when(planner.searchText(anyString(), eq(plan))).thenReturn("transmission");
        when(retrieval.retrieve(eq("transmission"), eq(plan))).thenReturn(List.of()); // No chunks found

        SseEmitter emitter = chatService.stream(testUser, sessionId, "What is the gear ratio of 4th gear?", false);

        assertThat(emitter).isNotNull();

        // ChatClient must NEVER be called
        verifyNoInteractions(chatClient);

        // Assistant message saved with NOT_AVAILABLE content
        ArgumentCaptor<ChatMessage> captor = ArgumentCaptor.forClass(ChatMessage.class);
        verify(messageRepository, atLeast(2)).save(captor.capture());

        List<ChatMessage> savedMessages = captor.getAllValues();
        ChatMessage assistantMessage = savedMessages.get(savedMessages.size() - 1);
        assertThat(assistantMessage.getRole()).isEqualTo("ASSISTANT");
        assertThat(assistantMessage.getContent()).contains(GroundingPrompt.NOT_AVAILABLE);
    }

    @Test
    @DisplayName("Greetings return immediate welcome message without retrieval or LLM call")
    void greetingsReturnWelcomeDirectly() {
        UUID sessionId = UUID.randomUUID();
        ChatSession session = ChatSession.builder()
                .id(sessionId)
                .userId(testUser.getId())
                .title("New conversation")
                .build();

        when(sessionRepository.findById(sessionId)).thenReturn(Optional.of(session));
        when(messageRepository.save(any(ChatMessage.class))).thenAnswer(i -> {
            ChatMessage m = i.getArgument(0);
            m.setId(UUID.randomUUID());
            return m;
        });

        SseEmitter emitter = chatService.stream(testUser, sessionId, "Hi", false);

        assertThat(emitter).isNotNull();

        // Retrieval and ChatClient must NEVER be called for a greeting
        verifyNoInteractions(planner);
        verifyNoInteractions(retrieval);
        verifyNoInteractions(chatClient);

        ArgumentCaptor<ChatMessage> captor = ArgumentCaptor.forClass(ChatMessage.class);
        verify(messageRepository, atLeast(2)).save(captor.capture());

        List<ChatMessage> savedMessages = captor.getAllValues();
        ChatMessage assistantMessage = savedMessages.get(savedMessages.size() - 1);
        assertThat(assistantMessage.getRole()).isEqualTo("ASSISTANT");
        assertThat(assistantMessage.getContent()).contains("Hyundai Automotive AI Consultant");
    }
}
