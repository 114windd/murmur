import { createNeonAuth } from "@neon/auth/next/server";
import { isAllowedUser } from "../platform-rules.ts";
export const auth = createNeonAuth({
  baseUrl: process.env.NEON_AUTH_BASE_URL!,
  cookies: { secret: process.env.NEON_AUTH_COOKIE_SECRET! },
  logLevel: "silent",
});
export async function getCurrentUser() {
  const { data: session } = await auth.getSession();
  const user = session?.user;
  if (
    !user ||
    !isAllowedUser({ email: user.email, emailVerified: user.emailVerified })
  )
    return null;
  return {
    userId: user.id,
    email: user.email,
    displayName: user.name || "Your",
    fullName: user.name || null,
  };
}
