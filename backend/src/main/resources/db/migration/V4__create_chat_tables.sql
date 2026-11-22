-- ============================================================
-- V4: Create chat tables
-- ============================================================

CREATE TABLE chat_sessions (
    id          UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id     UUID         NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title       VARCHAR(255) NOT NULL DEFAULT 'New Conversation',
    is_archived BOOLEAN      NOT NULL DEFAULT false,
    created_at  TIMESTAMPTZ  NOT NULL DEFAULT now(),
    updated_at  TIMESTAMPTZ  NOT NULL DEFAULT now()
);

CREATE INDEX idx_sessions_user_id    ON chat_sessions (user_id);
CREATE INDEX idx_sessions_created_at ON chat_sessions (created_at DESC);

-- sources JSONB schema (array):
-- [{"documentName":"Alcazar Brochure","vehicleModel":"ALCAZAR","pageNumber":12,"snippet":"..."}]
CREATE TABLE chat_messages (
    id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id    UUID        NOT NULL REFERENCES chat_sessions(id) ON DELETE CASCADE,
    role          VARCHAR(10) NOT NULL CHECK (role IN ('USER', 'ASSISTANT')),
    content       TEXT        NOT NULL,
    sources       JSONB,                              -- citations from retrieved chunks
    input_tokens  INTEGER,
    output_tokens INTEGER,
    created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_messages_session_id ON chat_messages (session_id);
CREATE INDEX idx_messages_created_at ON chat_messages (created_at);
-- GIN index for JSONB queries on sources (find messages citing a document)
CREATE INDEX idx_messages_sources_gin ON chat_messages USING gin (sources);

COMMENT ON TABLE  chat_sessions              IS 'User conversation sessions';
COMMENT ON TABLE  chat_messages              IS 'Individual messages in a chat session';
COMMENT ON COLUMN chat_messages.sources      IS 'JSON array of source citations from retrieved chunks';
COMMENT ON COLUMN chat_messages.role         IS 'USER = human question, ASSISTANT = AI response';
