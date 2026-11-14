import { handleUpload, type HandleUploadBody } from "@vercel/blob/client";
import { getCurrentUser } from "@/lib/auth/server";
import { isSameOriginRequest, readBoundedBody } from "@/lib/http";
import { isOwnedAudioPath } from "@/lib/platform-rules";
import { bucket, database } from "@/lib/storage";
export const maxDuration = 120;
export async function POST(req: Request) {
  try {
    if (!isSameOriginRequest(req))
      return Response.json({ error: "Open Murmur directly." }, { status: 403 });
    const body = JSON.parse(
      new TextDecoder().decode(await readBoundedBody(req, 16000)),
    ) as HandleUploadBody;
    const result = await handleUpload({
      body,
      request: req,
      onBeforeGenerateToken: async (pathname) => {
        const user = await getCurrentUser();
        if (!user || !isOwnedAudioPath(pathname, user.userId))
          throw new Error("Not authorized");
        await database()
          .prepare(
            "INSERT INTO audio_uploads(pathname,owner_id,created_at) VALUES(?,?,?) ON CONFLICT DO NOTHING",
          )
          .bind(pathname, user.userId, Date.now())
          .run();
        return {
          allowedContentTypes: [
            "audio/webm",
            "audio/mp4",
            "audio/wav",
            "audio/ogg",
            "audio/mpeg",
          ],
          maximumSizeInBytes: 24 * 1024 * 1024,
          validUntil: Date.now() + 15 * 60000,
          addRandomSuffix: false,
          allowOverwrite: false,
        };
      },
    });
    return Response.json(result);
  } catch {
    return Response.json(
      { error: "This recording could not be uploaded. Please try again." },
      { status: 400 },
    );
  }
}
export async function DELETE(req: Request) {
  try {
    const user = await getCurrentUser();
    if (!user)
      return Response.json({ error: "Sign in first." }, { status: 401 });
    if (!isSameOriginRequest(req))
      return Response.json({ error: "Open Murmur directly." }, { status: 403 });
    const { audioPath } = JSON.parse(
      new TextDecoder().decode(await readBoundedBody(req, 2000)),
    );
    if (
      typeof audioPath !== "string" ||
      !isOwnedAudioPath(audioPath, user.userId)
    )
      return Response.json({ error: "Recording not found." }, { status: 404 });
    // The foreign key serializes this deletion against attachment creation.
    const claim = await database()
      .prepare(
        "DELETE FROM audio_uploads WHERE pathname=? AND owner_id=? AND NOT EXISTS(SELECT 1 FROM thoughts WHERE audio_key=?) RETURNING pathname",
      )
      .bind(audioPath, user.userId, audioPath)
      .first();
    if (!claim)
      return Response.json(
        { error: "This recording is saved or already removed." },
        { status: 409 },
      );
    await bucket().delete(audioPath);
    return Response.json({ deleted: true });
  } catch {
    return Response.json(
      { error: "Draft cleanup could not finish." },
      { status: 500 },
    );
  }
}
