ALTER TABLE chat_messages
    ADD COLUMN rating SMALLINT;

ALTER TABLE chat_messages
    ADD CONSTRAINT chat_messages_rating_check CHECK (rating IS NULL OR rating IN (-1, 1));
