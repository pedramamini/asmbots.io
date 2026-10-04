-- A bot page's activity reads a bot's hill events by its versions (`listBotHillEvents`).
CREATE INDEX hill_history_version ON hill_history (bot_version_id);
