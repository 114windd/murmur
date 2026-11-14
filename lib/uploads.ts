import { upload } from "@vercel/blob/client";
import { api } from "./client";
export async function uploadRecording(blob: Blob): Promise<string> {
  const { uploadPrefix } = await api<{ uploadPrefix: string }>("/status");
  const ext = blob.type.includes("mp4")
    ? "m4a"
    : blob.type.includes("ogg")
      ? "ogg"
      : "webm";
  const file = new File([blob], "thought." + ext, {
    type: blob.type.split(";")[0],
  });
  const result = await upload(
    uploadPrefix + crypto.randomUUID() + "." + ext,
    file,
    {
      access: "private",
      handleUploadUrl: "/api/uploads",
      // Blob infers video/webm from the extension unless audio is explicit.
      contentType: file.type,
    },
  );
  return result.pathname;
}
export async function discardUpload(audioPath: string) {
  await fetch("/api/uploads", {
    method: "DELETE",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ audioPath }),
    keepalive: true,
  });
}
