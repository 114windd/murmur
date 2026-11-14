export class BodyLimitError extends Error {}
// Limit the stream itself, including chunked uploads without Content-Length.
export async function readBoundedBody(
  req: Request,
  limit: number,
): Promise<Uint8Array> {
  if (Number(req.headers.get("content-length")) > limit)
    throw new BodyLimitError("This request is too large.");
  if (!req.body) return new Uint8Array();
  const reader = req.body.getReader();
  const chunks: Uint8Array[] = [];
  let size = 0;
  try {
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > limit) {
        await reader.cancel();
        throw new BodyLimitError("This request is too large.");
      }
      chunks.push(value);
    }
  } finally {
    reader.releaseLock();
  }
  const bytes = new Uint8Array(size);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return bytes;
}

// Next.js can normalize req.url to localhost in development. The Host header
// retains the actual address the browser used, including 127.0.0.1 and its port.
export function isSameOriginRequest(req: Request): boolean {
  if (req.headers.get("sec-fetch-site") === "cross-site") return false;
  const origin = req.headers.get("origin");
  if (!origin) return true;
  try {
    const url = new URL(req.url);
    const host = req.headers.get("host") || url.host;
    const protocol =
      req.headers.get("x-forwarded-proto")?.split(",")[0].trim() ||
      url.protocol.slice(0, -1);
    return origin === new URL(protocol + "://" + host).origin;
  } catch {
    return false;
  }
}
