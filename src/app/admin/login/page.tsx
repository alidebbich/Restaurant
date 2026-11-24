"use client";

import { useState, useEffect, Suspense, useCallback, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Lock, User, ArrowRight, AlertCircle, Eye, EyeOff, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/Button";

function getSafeNextPath(searchParam: string | null): string {
  if (!searchParam) return "/admin";
  const trimmed = searchParam.trim();
  if (!trimmed.startsWith("/admin")) return "/admin";
  if (trimmed.startsWith("//") || trimmed.includes(":") || trimmed.includes("\\")) return "/admin";
  return trimmed;
}

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [csrfToken, setCsrfToken] = useState<string | null>(null);
  const [usernameError, setUsernameError] = useState<string | null>(null);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [orbAnimation, setOrbAnimation] = useState(true);
  const formRef = useRef<HTMLFormElement>(null);
  const usernameInputRef = useRef<HTMLInputElement>(null);

  // Fetch or read CSRF token on mount
  useEffect(() => {
    if (typeof document !== "undefined") {
      const match = document.cookie.match(/csrf_token=([^;]+)/);
      if (match && match[1]) {
        setCsrfToken(match[1]);
      }
    }
    fetch("/api/auth/login", { credentials: "include" })
      .then((res) => res.json())
      .then((data) => {
        if (data.csrfToken) {
          setCsrfToken(data.csrfToken);
        }
      })
      .catch(() => {
        // CSRF token fetch failed, but form will still work if cookie exists
      });
  }, []);

  // Auto-focus username input on mount
  useEffect(() => {
    usernameInputRef.current?.focus();
  }, []);

  // Respect prefers-reduced-motion
  useEffect(() => {
    const mediaQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    const handleChange = (e: MediaQueryListEvent) => setOrbAnimation(!e.matches);
    setOrbAnimation(!mediaQuery.matches);
    mediaQuery.addEventListener("change", handleChange);
    return () => mediaQuery.removeEventListener("change", handleChange);
  }, []);

  const validateUsername = useCallback((value: string) => {
    if (!value.trim()) {
      setUsernameError("Nom d'utilisateur ou email requis");
      return false;
    }
    if (value.length < 3) {
      setUsernameError("Au moins 3 caractères");
      return false;
    }
    setUsernameError(null);
    return true;
  }, []);

  const validatePassword = useCallback((value: string) => {
    if (!value) {
      setPasswordError("Mot de passe requis");
      return false;
    }
    if (value.length < 6) {
      setPasswordError("Au moins 6 caractères");
      return false;
    }
    setPasswordError(null);
    return true;
  }, []);

  const handleUsernameChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setUsername(e.target.value);
    if (usernameError) validateUsername(e.target.value);
  }, [usernameError, validateUsername]);

  const handlePasswordChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setPassword(e.target.value);
    if (passwordError) validatePassword(e.target.value);
  }, [passwordError, validatePassword]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const isUsernameValid = validateUsername(username);
    const isPasswordValid = validatePassword(password);

    if (!isUsernameValid || !isPasswordValid) {
      return;
    }

    setLoading(true);

    const formData = new FormData(e.currentTarget as HTMLFormElement);
    const u = ((formData.get("username") as string) || username).trim();
    const p = ((formData.get("password") as string) || password);

    // Resolve CSRF token from state or directly from document.cookie
    let token = csrfToken;
    if (!token && typeof document !== "undefined") {
      const match = document.cookie.match(/csrf_token=([^;]+)/);
      if (match && match[1]) {
        token = match[1];
      }
    }

    try {
      const headers: Record<string, string> = { "Content-Type": "application/json" };
      if (token) {
        headers["x-csrf-token"] = token;
      }

      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers,
        credentials: "include",
        body: JSON.stringify({ username: u, password: p, _csrf: token }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Identifiants invalides. Veuillez réessayer.");
      }

      const targetPath = getSafeNextPath(searchParams.get("next"));
      router.push(targetPath);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur inattendue");
      setLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !loading) {
      handleSubmit(e as unknown as React.FormEvent);
    }
  };

  return (
    <div
      className="flex min-h-screen items-center justify-center p-4 sm:p-6 md:p-8 relative overflow-hidden select-none bg-base"
      style={{
        background: "radial-gradient(ellipse at 50% 15%, var(--bg-surface-elevated) 0%, var(--bg-surface) 45%, var(--bg-card) 100%)",
      }}
      role="main"
    >
      {/* Subtle Warm Olive & Gold Atmospheric Ambient Orbs */}
      {orbAnimation && (
        <>
          <div
            className="pointer-events-none absolute -top-32 -left-32 h-[520px] w-[520px] rounded-full blur-3xl opacity-35 animate-pulse-slow"
            style={{ background: "radial-gradient(circle, var(--color-brand-gold-tint) 0%, transparent 70%)" }}
            aria-hidden="true"
          />
          <div
            className="pointer-events-none absolute -bottom-32 -right-32 h-[480px] w-[480px] rounded-full blur-3xl opacity-25 animate-pulse-slow"
            style={{ background: "radial-gradient(circle, var(--color-brand-primary-tint) 0%, transparent 70%)", animationDelay: "2s" }}
            aria-hidden="true"
          />
        </>
      )}

      {/* Micro-noise / subtle luxury texture overlay */}
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.025]"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.8' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")`,
        }}
        aria-hidden="true"
      />

      {/* Main Container */}
      <div className="relative z-10 w-full max-w-[440px] flex flex-col items-center">
        {/* Brand Header */}
        <div className="text-center mb-6 sm:mb-8 flex flex-col items-center">
          {/* Iconic DZ Monogram Badge */}
          <div
            className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl transition-transform duration-300 hover:scale-105"
            style={{
              background: "linear-gradient(135deg, var(--color-brand-primary, #173D32) 0%, var(--color-brand-primary-dark, #0A231C) 100%)",
              border: "1px solid var(--color-brand-gold-border, rgba(198, 161, 91, 0.28))",
              boxShadow: "var(--shadow-gold-lg), inset 0 1px 0 rgba(255,255,255,0.1)",
            }}
            aria-hidden="true"
          >
            <span
              className="text-2xl font-bold tracking-tight text-gold"
              style={{
                fontFamily: '"Cormorant Garamond", "Playfair Display", Georgia, serif',
              }}
            >
              DZ
            </span>
          </div>

          {/* Restaurant Title */}
          <h1
            className="text-3xl sm:text-4xl font-medium tracking-wide text-primary"
            style={{
              fontFamily: '"Cormorant Garamond", "Playfair Display", Georgia, serif',
              letterSpacing: "0.02em",
            }}
          >
            Dar Zitoun
          </h1>

          {/* Portal Badge */}
          <div className="mt-2 inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full bg-brand-primary/8 border border-brand-primary/15">
            <span className="h-1.5 w-1.5 rounded-full bg-brand-primary animate-pulse" aria-hidden="true" />
            <span className="text-[11px] font-semibold uppercase tracking-[0.12em] text-brand-primary">
              Portail d'Administration
            </span>
          </div>

          <p className="mt-2 text-xs sm:text-sm text-quaternary max-w-xs">
            Gestion du restaurant, réservations et carte gastronomique
          </p>
        </div>

        {/* Elevated Luxury Card */}
        <div
          className="relative w-full rounded-2xl sm:rounded-3xl p-6 sm:p-8 backdrop-blur-sm transition-all"
          style={{
            backgroundColor: "var(--bg-surface-elevated)",
            border: "1px solid var(--border-default)",
            boxShadow: "var(--shadow-2xl), var(--shadow-gold-md), inset 0 1px 0 rgba(255,255,255,0.6)",
          }}
        >
          {/* Subtle Top Gold Highlight Bar */}
          <div
            className="absolute top-0 inset-x-8 h-[2px] rounded-full"
            style={{
              background: "linear-gradient(90deg, transparent 0%, var(--color-brand-gold) 30%, var(--color-brand-gold) 50%, var(--color-brand-gold) 70%, transparent 100%)",
            }}
            aria-hidden="true"
          />

          {/* Error Banner */}
          {error && (
            <div
              className="mb-5 flex items-start gap-3 rounded-xl p-3.5 text-xs text-error bg-error/5 border border-error/20 animate-shake"
              role="alert"
              aria-live="assertive"
            >
              <AlertCircle className="h-4 w-4 shrink-0 mt-0.5 text-error" aria-hidden="true" />
              <div className="flex-1 font-medium leading-relaxed">{error}</div>
            </div>
          )}

          {/* Form */}
          <form
            ref={formRef}
            method="POST"
            onSubmit={handleSubmit}
            onKeyDown={handleKeyDown}
            className="space-y-4 select-text"
            noValidate
          >
            {/* Username / Email */}
            <div>
              <label
                htmlFor="username"
                className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-secondary"
              >
                Nom d'utilisateur ou Email
              </label>
              <div className="relative flex items-center">
                <div
                  className="pointer-events-none absolute inset-y-0 flex items-center text-tertiary transition-colors duration-200"
                  style={{ left: "14px" }}
                  aria-hidden="true"
                >
                  <User className="h-4 w-4" />
                </div>
                <input
                  ref={usernameInputRef}
                  id="username"
                  name="username"
                  type="text"
                  required
                  autoComplete="username"
                  value={username}
                  onChange={handleUsernameChange}
                  onBlur={() => validateUsername(username)}
                  placeholder="Nom d'utilisateur ou email"
                  className={`w-full h-11 rounded-xl text-sm font-medium text-primary bg-surface-hover border transition-all outline-none focus:bg-surface focus:ring-2 focus:ring-brand-primary/15 ${
                    usernameError
                      ? "border-status-error focus:border-status-error focus:ring-status-error/15"
                      : username.trim()
                      ? "border-brand-primary/40"
                      : "border-border-subtle focus:border-brand-primary"
                  }`}
                  style={{ paddingLeft: "44px", paddingRight: "16px" }}
                  aria-invalid={usernameError ? "true" : "false"}
                  aria-describedby={usernameError ? "username-error" : undefined}
                  disabled={loading}
                />
              </div>
              {usernameError && (
                <p id="username-error" className="mt-1.5 text-xs text-status-error flex items-center gap-1" role="alert">
                  <AlertCircle className="h-3 w-3 flex-shrink-0" aria-hidden="true" />
                  {usernameError}
                </p>
              )}
            </div>

            {/* Password */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label
                  htmlFor="password"
                  className="block text-xs font-semibold uppercase tracking-wider text-secondary"
                >
                  Mot de passe
                </label>
              </div>
              <div className="relative flex items-center">
                <div
                  className="pointer-events-none absolute inset-y-0 flex items-center text-tertiary transition-colors duration-200"
                  style={{ left: "14px" }}
                  aria-hidden="true"
                >
                  <Lock className="h-4 w-4" />
                </div>
                <input
                  id="password"
                  name="password"
                  type={showPassword ? "text" : "password"}
                  required
                  autoComplete="current-password"
                  value={password}
                  onChange={handlePasswordChange}
                  onBlur={() => validatePassword(password)}
                  placeholder="Mot de passe"
                  className={`w-full h-11 rounded-xl text-sm font-medium text-primary bg-surface-hover border transition-all outline-none focus:bg-surface focus:ring-2 focus:ring-brand-primary/15 ${
                    passwordError
                      ? "border-status-error focus:border-status-error focus:ring-status-error/15"
                      : password
                      ? "border-brand-primary/40"
                      : "border-border-subtle focus:border-brand-primary"
                  }`}
                  style={{ paddingLeft: "44px", paddingRight: "44px" }}
                  aria-invalid={passwordError ? "true" : "false"}
                  aria-describedby={passwordError ? "password-error" : undefined}
                  disabled={loading}
                />
                {/* Toggle Show / Hide Password */}
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 flex items-center text-tertiary hover:text-primary transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary/20 focus-visible:ring-offset-2 cursor-pointer"
                  style={{ right: "14px" }}
                  aria-label={showPassword ? "Masquer le mot de passe" : "Afficher le mot de passe"}
                  aria-pressed={showPassword}
                  disabled={loading}
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4" strokeWidth={1.5} aria-hidden="true" />
                  ) : (
                    <Eye className="h-4 w-4" strokeWidth={1.5} aria-hidden="true" />
                  )}
                </button>
              </div>
              {passwordError && (
                <p id="password-error" className="mt-1.5 text-xs text-status-error flex items-center gap-1" role="alert">
                  <AlertCircle className="h-3 w-3 flex-shrink-0" aria-hidden="true" />
                  {passwordError}
                </p>
              )}
            </div>

            {/* Security Indicator */}
            <div className="flex items-center gap-1.5 pt-1 text-[11px] text-quaternary">
              <ShieldCheck className="h-3.5 w-3.5 text-brand-primary flex-shrink-0" aria-hidden="true" />
              <span>Chiffrement TLS et protection de session active</span>
            </div>

            {/* Submit Button */}
            <Button
              type="submit"
              variant="secondary"
              size="md"
              fullWidth
              loading={loading}
              disabled={loading}
              trailingIcon={<ArrowRight className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-1" strokeWidth={2} aria-hidden="true" />}
              className="mt-6 group bg-gradient-to-br from-[#173D32] to-[#0A231C] text-white shadow-[0_8px_20px_rgba(23,61,50,0.35),inset_0_1px_0_rgba(255,255,255,0.2)] hover:from-[#1a4538] hover:to-[#0d2a22] aria-busy:opacity-75"
              data-testid="login-submit"
            >
              {loading ? "Connexion en cours…" : "Se connecter à l'administration"}
            </Button>
          </form>
        </div>

        {/* Back to public website & Footer */}
        <div className="mt-8 text-center flex flex-col items-center gap-2">
          <a
            href="/"
            className="text-xs font-medium text-secondary hover:text-brand-primary transition-colors inline-flex items-center gap-1.5 underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary/20 focus-visible:ring-offset-2 rounded"
          >
            <span>← Retour au site public du restaurant</span>
          </a>
          <span className="text-[11px] text-quaternary">
            Dar Zitoun • Espace réservé à l'équipe de direction
          </span>
        </div>
      </div>

      <style jsx global>{`
        @keyframes pulse-slow {
          0%, 100% { opacity: 0.35; transform: scale(1); }
          50% { opacity: 0.2; transform: scale(1.02); }
        }
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          10%, 30%, 50%, 70%, 90% { transform: translateX(-4px); }
          20%, 40%, 60%, 80% { transform: translateX(4px); }
        }
        .animate-pulse-slow { animation: pulse-slow 4s ease-in-out infinite; }
        .animate-shake { animation: shake 0.5s ease-in-out; }
        @media (prefers-reduced-motion: reduce) {
          .animate-pulse-slow,
          .animate-shake {
            animation: none !important;
          }
        }
      `}</style>
    </div>
  );
}

export default function AdminLoginPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-base flex items-center justify-center" aria-busy="true" />}>
      <LoginForm />
    </Suspense>
  );
}