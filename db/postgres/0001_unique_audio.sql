CREATE UNIQUE INDEX IF NOT EXISTS thoughts_audio_unique ON thoughts(audio_key) WHERE audio_key IS NOT NULL;
