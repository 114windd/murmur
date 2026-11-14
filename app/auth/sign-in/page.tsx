"use client";
import { useState } from "react";
import { CloudMark, CloudGarden } from "@/components/art";
import { authClient } from "@/lib/auth/client";
import { LoaderCircle, ArrowUpRight, LockKeyhole } from "lucide-react";
type Mode = "in" | "up" | "verify" | "reset" | "reset-code";
export default function SignIn() {
  const [mode, setMode] = useState<Mode>("in");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  async function sendCode(type: "email-verification" | "forget-password") {
    const result = await authClient.emailOtp.sendVerificationOtp({
      email,
      type,
    });
    if (result.error)
      throw new Error(result.error.message || "The code could not be sent.");
    setMessage("A verification code is on its way. Check your email.");
  }
  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    setMessage("");
    try {
      if (mode === "reset") {
        await sendCode("forget-password");
        setMode("reset-code");
        return;
      }
      if (mode === "reset-code") {
        const result = await authClient.emailOtp.resetPassword({
          email,
          otp: code,
          password,
        });
        if (result.error) throw new Error(result.error.message);
        setMode("in");
        setCode("");
        setMessage("Your password is updated. You can sign in now.");
        return;
      }
      if (mode === "verify") {
        const verified = await authClient.emailOtp.verifyEmail({
          email,
          otp: code,
        });
        if (verified.error) throw new Error(verified.error.message);
        const signedIn = await authClient.signIn.email({ email, password });
        if (signedIn.error) {
          setMode("in");
          throw new Error(signedIn.error.message);
        }
        location.assign("/");
        return;
      }
      const result =
        mode === "up"
          ? await authClient.signUp.email({
              email,
              password,
              name: name.trim() || email.split("@")[0],
            })
          : await authClient.signIn.email({ email, password });
      if (result.error) {
        if (result.error.code === "EMAIL_NOT_VERIFIED") {
          await sendCode("email-verification");
          setMode("verify");
          return;
        }
        throw new Error(result.error.message || "Sign-in could not finish.");
      }
      if (result.data?.user && !result.data.user.emailVerified) {
        await sendCode("email-verification");
        setMode("verify");
      } else location.assign("/");
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  const codeMode = mode === "verify" || mode === "reset-code";
  return (
    <main className="auth-page">
      <div className="auth-art">
        <a className="brand" href="/">
          <CloudMark />
          <span>
            murmur<span className="brand-dot">.</span>
          </span>
        </a>
        <div>
          <h1>
            A little room
            <br />
            for your thoughts.
          </h1>
          <p>
            Catch the ideas. Keep the little things.
            <br />
            Come back when you’re ready.
          </p>
          <CloudGarden />
        </div>
        <span>A notebook, just for you.</span>
      </div>
      <div className="auth-form-wrap">
        <form onSubmit={submit}>
          <div className="dialog-symbol">
            <CloudMark small />
          </div>
          <h2>
            {mode === "up"
              ? "Make yourself at home."
              : codeMode
                ? "Check your inbox."
                : mode === "reset"
                  ? "A way back in."
                  : "Welcome back."}
          </h2>
          <p className="muted">
            {mode === "up"
              ? "Create your private notebook account."
              : codeMode
                ? "Enter the code from your email."
                : mode === "reset"
                  ? "We’ll email you a code to reset your password."
                  : "Your thoughts are right where you left them."}
          </p>
          {mode === "up" && (
            <>
              <label className="field-label" htmlFor="auth-name">
                Your name
              </label>
              <input
                id="auth-name"
                autoComplete="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                maxLength={80}
              />
            </>
          )}
          <label className="field-label" htmlFor="auth-email">
            Email
          </label>
          <input
            id="auth-email"
            type="email"
            autoComplete="email"
            required
            value={email}
            readOnly={codeMode}
            onChange={(e) => setEmail(e.target.value.trim())}
          />
          {codeMode && (
            <>
              <label className="field-label" htmlFor="auth-code">
                Verification code
              </label>
              <input
                id="auth-code"
                inputMode="numeric"
                autoComplete="one-time-code"
                required
                value={code}
                onChange={(e) => setCode(e.target.value.trim())}
              />
            </>
          )}
          {(mode === "in" || mode === "up" || mode === "reset-code") && (
            <>
              <label className="field-label" htmlFor="auth-password">
                {mode === "reset-code" ? "New password" : "Password"}
              </label>
              <input
                id="auth-password"
                type="password"
                autoComplete={
                  mode === "in" ? "current-password" : "new-password"
                }
                required
                minLength={mode === "in" ? 1 : 12}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </>
          )}
          {error && (
            <p className="error" role="alert">
              {error}
            </p>
          )}
          {message && (
            <p className="auth-message" role="status">
              {message}
            </p>
          )}
          <button className="primary-button auth-submit" disabled={busy}>
            {busy ? (
              <LoaderCircle size={17} className="spin" />
            ) : (
              <ArrowUpRight size={17} />
            )}{" "}
            {mode === "up"
              ? "Create account"
              : mode === "verify"
                ? "Verify and open notebook"
                : mode === "reset"
                  ? "Send reset code"
                  : mode === "reset-code"
                    ? "Save new password"
                    : "Open my notebook"}
          </button>
          <div className="auth-links">
            {codeMode && (
              <button
                className="text-button"
                type="button"
                disabled={busy}
                onClick={async () => {
                  setError("");
                  try {
                    await sendCode(
                      mode === "verify"
                        ? "email-verification"
                        : "forget-password",
                    );
                  } catch (e) {
                    setError((e as Error).message);
                  }
                }}
              >
                Send a new code
              </button>
            )}
            <button
              className="text-button"
              type="button"
              onClick={() => {
                setMode(mode === "in" ? "up" : "in");
                setError("");
                setMessage("");
                setCode("");
              }}
            >
              {mode === "up"
                ? "Already have an account? Sign in"
                : mode === "in"
                  ? "First visit? Create your account"
                  : "Back to sign in"}
            </button>
            {mode === "in" && (
              <button
                className="text-button"
                type="button"
                onClick={() => {
                  setMode("reset");
                  setError("");
                }}
              >
                Forgot password?
              </button>
            )}
          </div>
          <p className="auth-private">
            <LockKeyhole size={12} /> Your own notebook. Your thoughts stay private.
          </p>
        </form>
      </div>
    </main>
  );
}
