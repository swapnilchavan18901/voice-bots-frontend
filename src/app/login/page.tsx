"use client";
import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  ArrowRight,
  AudioLines,
  ShieldCheck,
  Globe2,
  Sparkles,
} from "lucide-react";
import { ThemeToggle } from "@/components/theme-toggle";
import { ErrorNotice, Logo, Spinner, Wave } from "@/components/ui";
import { login, register as registerAccount, message } from "@/lib/api";
function LoginForm() {
  const [register, setRegister] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const router = useRouter();
  const search = useSearchParams();
  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    setBusy(true);
    setError("");
    try {
      const credentials = {
        email: String(form.get("email") || ""),
        password: String(form.get("password") || ""),
      };
      if (register) {
        await registerAccount({
          ...credentials,
          name: String(form.get("name") || ""),
        });
      } else {
        await login(credentials);
      }
      router.replace("/clinic");
      router.refresh();
    } catch (e) {
      setError(message(e));
      setBusy(false);
    }
  }
  return (
    <div className="login-page">
      <div className="login-theme-toggle">
        <ThemeToggle />
      </div>
      <section className="login-story">
        <Logo />
        <div className="login-story-main">
          <div className="pill light">
            <Sparkles size={13} /> A little more human.
          </div>
          <h1>
            Great conversations.
            <br />
            <span className="login-accent">Without limits.</span>
          </h1>
          <p>
            Give your business a voice that listens, understands, and makes
            every interaction matter.
          </p>
          <div className="login-wave">
            <Wave />
            <span>
              <i /> The sound of a better experience
            </span>
          </div>
          <div className="login-features">
            <span>
              <Globe2 size={17} /> 11 Indian languages
            </span>
            <span>
              <AudioLines size={17} /> Real-time voice
            </span>
          </div>
        </div>
        <small>YOUR BUSINESS. YOUR CONTEXT. YOUR VOICE.</small>
      </section>
      <section className="login-form-panel">
        <div className="login-form-wrap">
          <span className="eyebrow">WELCOME TO VOXA</span>
          <h2>
            {register ? "Let’s build your voice." : "Good to hear from you."}
          </h2>
          <p>
            {register
              ? "Create an account and your first workspace."
              : "Sign in to your voice agent workspace."}
          </p>
          {search.get("expired") && (
            <div className="notice">
              Your session expired. Please sign in again.
            </div>
          )}
          <form onSubmit={submit}>
            {register && (
              <label className="field">
                Your name
                <input
                  name="name"
                  autoComplete="name"
                  required
                  maxLength={100}
                  placeholder="Alex Morgan"
                />
              </label>
            )}
            <label className="field">
              Email address
              <input
                name="email"
                type="email"
                autoComplete="email"
                required
                maxLength={320}
                placeholder="you@company.com"
              />
            </label>
            <label className="field">
              Password
              <input
                name="password"
                type="password"
                autoComplete={register ? "new-password" : "current-password"}
                required
                minLength={10}
                maxLength={128}
                placeholder={
                  register ? "At least 10 characters" : "Enter your password"
                }
              />
            </label>
            <ErrorNotice text={error} />
            <button className="button primary full" disabled={busy}>
              {busy ? <Spinner /> : null}
              {register ? "Create account" : "Sign in"}
              <ArrowRight size={17} />
            </button>
          </form>
          <div className="auth-switch">
            {register ? "Already have an account?" : "New to Voxa?"}{" "}
            <button
              onClick={() => {
                setRegister(!register);
                setError("");
              }}
            >
              {register ? "Sign in" : "Create an account"}
            </button>
          </div>
          <div className="auth-note">
            <ShieldCheck size={16} /> Your workspace, securely connected.
          </div>
        </div>
        <small className="login-footer">
          Thoughtful voice experiences start here.
        </small>
      </section>
    </div>
  );
}
export default function Login() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  );
}
