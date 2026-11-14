CREATE TABLE audio_uploads (
 pathname text PRIMARY KEY,owner_id text NOT NULL,created_at double precision NOT NULL
);
ALTER TABLE thoughts ADD CONSTRAINT thoughts_audio_upload_fk FOREIGN KEY (audio_key) REFERENCES audio_uploads(pathname) ON DELETE RESTRICT;
