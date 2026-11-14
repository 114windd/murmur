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
