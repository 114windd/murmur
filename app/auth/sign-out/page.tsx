"use client";
import { useEffect } from "react";
import { authClient } from "@/lib/auth/client";
export default function SignOut() {
  useEffect(() => {
    authClient.signOut().then(() => location.replace("/auth/sign-in"));
  }, []);
  return (
    <main className="auth-simple">
      <p>Closing your notebook…</p>
    </main>
  );
}
