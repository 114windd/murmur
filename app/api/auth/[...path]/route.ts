import { auth } from "@/lib/auth/server";
import { isSameOriginRequest, readBoundedBody } from "@/lib/http";
const handlers = auth.handler();
export const GET = handlers.GET;
export const PUT = handlers.PUT;
export const PATCH = handlers.PATCH;
export const DELETE = handlers.DELETE;
export async function POST(req: Request, context: unknown) {
  try {
    if (!isSameOriginRequest(req))
      return Response.json(
        { error: { message: "Open Murmur directly to sign in." } },
        { status: 403 },
      );
    const bytes = await readBoundedBody(req, 16000);
    let body: Record<string, unknown> = {};
    try {
      body = JSON.parse(new TextDecoder().decode(bytes));
    } catch {
      /* Let the managed auth service validate non-JSON endpoint payloads. */
    }
    if (
      typeof body.email === "string" &&
      body.email.trim().toLowerCase() !==
        process.env.OWNER_EMAIL?.trim().toLowerCase()
    )
      return Response.json(
        { error: { message: "This notebook is private." } },
        { status: 403 },
      );
    return handlers.POST(
      new Request(req, { body: bytes.buffer as ArrayBuffer }),
      context as never,
    );
  } catch {
    return Response.json(
      { error: { message: "Sign-in could not finish. Please try again." } },
      { status: 400 },
    );
  }
}
