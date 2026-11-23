package com.cyepro.hyundai.chat.repository;

import com.cyepro.hyundai.chat.entity.ChatMessage;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface ChatMessageRepository extends JpaRepository<ChatMessage, UUID> {

    List<ChatMessage> findBySessionIdOrderByCreatedAtAsc(UUID sessionId);

    Optional<ChatMessage> findFirstBySessionIdOrderByCreatedAtDesc(UUID sessionId);
}
