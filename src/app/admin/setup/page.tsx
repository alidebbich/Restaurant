"use client";

import { useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { UtensilsCrossed, Lock, User, Mail, Shield, ArrowRight, AlertCircle, CheckCircle } from "lucide-react";

function getSafeNextPath(searchParam: string | null): string {
  if (!searchParam) return "/admin";
  const trimmed = searchParam.trim();
  if (!trimmed.startsWith("/admin")) return "/admin";
  if (trimmed.startsWith("//") || trimmed.includes(":") || trimmed.includes("\\")) return "/admin";
  return trimmed;
}

function SetupForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [bootstrapSecret, setBootstrapSecret] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [step, setStep] = useState<"check" | "form" | "complete">("check");

  const checkBootstrapStatus = async () => {
    try {
      const res = await fetch("/api/auth/bootstrap", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ secret: "check" }),
      });
      const data = await res.json();
      if (res.status === 409 || data.code === "BOOTSTRAP_COMPLETED") {
        setStep("complete");
        return;
      }
      setStep("form");
    } catch {
      setStep("form");
    }
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    if (password !== confirmPassword) {
      setError("Les mots de passe ne correspondent pas");
      setLoading(false);
      return;
    }

    if (password.length < 12) {
      setError("Le mot de passe doit contenir au moins 12 caractères");
      setLoading(false);
      return;
    }

    const formData = new FormData(e.currentTarget);
    const secret = ((formData.get("bootstrapSecret") as string) || bootstrapSecret).trim();

    try {
      const res = await fetch("/api/auth/bootstrap", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          secret,
          username: username.trim(),
          email: email.trim(),
          password,
          full_name: fullName.trim(),
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Échec de la création du compte");
      }

      setSuccess(true);
      setStep("complete");

      // Redirect to login after 2 seconds
      setTimeout(() => {
        const targetPath = getSafeNextPath(searchParams.get("next"));
        router.push(targetPath);
        router.refresh();
      }, 2000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur inattendue");
      setLoading(false);
    }
  };

  if (step === "check") {
    return (
      <div className="flex min-h-screen items-center justify-center p-4 md:p-8 relative overflow-hidden bg-gradient-to-br from-deep via-forest to-charcoal text-primary">
        <div className="absolute -top-20 -left-20 h-[500px] w-[500px] rounded-full bg-gold/20 blur-3xl opacity-40 animate-pulse-slow" />
        <div className="absolute -bottom-20 -right-20 h-[400px] w-[400px] rounded-full bg-brand-primary/15 blur-3xl opacity-40 animate-pulse-slow" style={{ animationDelay: "2s" }} />

        <div className="relative z-10 w-full max-w-md text-center">
          <div className="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-3xl shadow-xl shadow-gold-lg border border-gold/40 bg-brand-primary-bg">
            <UtensilsCrossed className="h-9 w-9 text-gold" aria-hidden="true" />
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-primary">
            Configuration Initiale
          </h1>
          <p className="mt-1.5 text-sm text-tertiary">
            Vérification du statut de configuration…
          </p>
        </div>
      </div>
    );
  }

  if (step === "complete") {
    return (
      <div className="flex min-h-screen items-center justify-center p-4 md:p-8 relative overflow-hidden bg-gradient-to-br from-deep via-forest to-charcoal text-primary">
        <div className="absolute -top-20 -left-20 h-[500px] w-[500px] rounded-full bg-success/15 blur-3xl opacity-40 animate-pulse-slow" />
        <div className="absolute -bottom-20 -right-20 h-[400px] w-[400px] rounded-full bg-brand-primary/15 blur-3xl opacity-40 animate-pulse-slow" style={{ animationDelay: "2s" }} />

        <div className="relative z-10 w-full max-w-md text-center">
          <div className="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-3xl shadow-xl shadow-success-lg border border-success/40 bg-success-bg">
            <CheckCircle className="h-9 w-9 text-success" aria-hidden="true" />
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-primary">
            Compte Administrateur Créé
          </h1>
          <p className="mt-1.5 text-sm text-tertiary">
            {success ? "Redirection vers la page de connexion…" : "Un compte administrateur existe déjà."}
          </p>
          {!success && (
            <a
              href="/admin/login"
              className="mt-8 inline-flex items-center gap-2 text-sm font-medium text-gold hover:text-gold-light transition-colors"
            >
              Aller à la connexion →
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </a>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center p-4 md:p-8 relative overflow-hidden bg-gradient-to-br from-deep via-forest to-charcoal text-primary">
      <div className="absolute -top-20 -left-20 h-[500px] w-[500px] rounded-full bg-gold/20 blur-3xl opacity-40 animate-pulse-slow" />
      <div className="absolute -bottom-20 -right-20 h-[400px] w-[400px] rounded-full bg-brand-primary/15 blur-3xl opacity-40 animate-pulse-slow" style={{ animationDelay: "2s" }} />

      <div className="relative z-10 w-full max-w-md flex flex-col items-center justify-center">
        {/* Brand Card */}
        <div className="text-center mb-8">
          <div className="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-3xl shadow-xl shadow-gold-lg border border-gold/40 bg-brand-primary-bg">
            <UtensilsCrossed className="h-9 w-9 text-gold" aria-hidden="true" />
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-primary">
            Configuration Initiale
          </h1>
          <p className="mt-1.5 text-sm text-tertiary">
            Créez le premier compte administrateur pour Dar Zitoun
          </p>
        </div>

        {/* Setup Box */}
        <div className="card rounded-3xl p-6 sm:p-8 shadow-xl shadow-gold-lg border border-brand-primary-border/50 w-full">
          {error && (
            <div
              className="mb-6 flex items-start gap-3 rounded-xl p-3.5 text-xs border border-error/30 bg-error-bg text-error"
              role="alert"
            >
              <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" aria-hidden="true" />
              <span>{error}</span>
            </div>
          )}

          <form method="POST" onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="bootstrapSecret" className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-tertiary">
                Clé de configuration (ADMIN_BOOTSTRAP_SECRET)
              </label>
              <div className="relative">
                <div className="pointer-events-none absolute inset-y-0 start-0 flex items-center ps-3.5 text-tertiary">
                  <Shield className="h-4 w-4" aria-hidden="true" />
                </div>
                <input
                  id="bootstrapSecret"
                  name="bootstrapSecret"
                  type="password"
                  required
                  value={bootstrapSecret}
                  onChange={(e) => setBootstrapSecret(e.target.value)}
                  placeholder="••••••••••••••••"
                  className="input ps-10 focus:border-brand-primary focus:ring-2 focus:ring-brand-primary-bg"
                />
              </div>
              <p className="mt-1.5 text-[11px] text-tertiary">
                Trouvée dans les variables d'environnement du serveur
              </p>
            </div>

            <div>
              <label htmlFor="fullName" className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-tertiary">
                Nom complet
              </label>
              <div className="relative">
                <div className="pointer-events-none absolute inset-y-0 start-0 flex items-center ps-3.5 text-tertiary">
                  <User className="h-4 w-4" aria-hidden="true" />
                </div>
                <input
                  id="fullName"
                  name="fullName"
                  type="text"
                  required
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="Propriétaire du restaurant"
                  className="input ps-10 focus:border-brand-primary focus:ring-2 focus:ring-brand-primary-bg"
                />
              </div>
            </div>

            <div>
              <label htmlFor="username" className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-tertiary">
                Nom d'utilisateur
              </label>
              <div className="relative">
                <div className="pointer-events-none absolute inset-y-0 start-0 flex items-center ps-3.5 text-tertiary">
                  <User className="h-4 w-4" aria-hidden="true" />
                </div>
                <input
                  id="username"
                  name="username"
                  type="text"
                  required
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="admin"
                  className="input ps-10 focus:border-brand-primary focus:ring-2 focus:ring-brand-primary-bg"
                />
              </div>
            </div>

            <div>
              <label htmlFor="email" className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-tertiary">
                Email
              </label>
              <div className="relative">
                <div className="pointer-events-none absolute inset-y-0 start-0 flex items-center ps-3.5 text-tertiary">
                  <Mail className="h-4 w-4" aria-hidden="true" />
                </div>
                <input
                  id="email"
                  name="email"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="admin@darzitoun.tn"
                  className="input ps-10 focus:border-brand-primary focus:ring-2 focus:ring-brand-primary-bg"
                />
              </div>
            </div>

            <div>
              <label htmlFor="password" className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-tertiary">
                Mot de passe (min. 12 caractères)
              </label>
              <div className="relative">
                <div className="pointer-events-none absolute inset-y-0 start-0 flex items-center ps-3.5 text-tertiary">
                  <Lock className="h-4 w-4" aria-hidden="true" />
                </div>
                <input
                  id="password"
                  name="password"
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••••••"
                  className="input ps-10 focus:border-brand-primary focus:ring-2 focus:ring-brand-primary-bg"
                />
              </div>
            </div>

            <div>
              <label htmlFor="confirmPassword" className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-tertiary">
                Confirmer le mot de passe
              </label>
              <div className="relative">
                <div className="pointer-events-none absolute inset-y-0 start-0 flex items-center ps-3.5 text-tertiary">
                  <Lock className="h-4 w-4" aria-hidden="true" />
                </div>
                <input
                  id="confirmPassword"
                  name="confirmPassword"
                  type="password"
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="••••••••••••"
                  className="input ps-10 focus:border-brand-primary focus:ring-2 focus:ring-brand-primary-bg"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="mt-6 btn-primary btn-md w-full gap-2 justify-center shadow-gold-lg"
            >
              <span>{loading ? "Création du compte…" : "Créer le compte administrateur"}</span>
              {!loading && <ArrowRight className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-1" aria-hidden="true" />}
            </button>
          </form>

          <div className="mt-6 card border-gold/20 bg-gold-bg/50 p-3.5 text-xs text-tertiary rounded-2xl shadow-sm shadow-gold-sm">
            <div className="flex items-center gap-2 font-semibold mb-1 text-gold">
              <Shield className="h-4 w-4" aria-hidden="true" />
              <span>Sécurité</span>
            </div>
            <ul className="space-y-1">
              <li>• Cette page n'est accessible que si aucun compte admin n'existe</li>
              <li>• La clé <code className="text-primary px-1.5 py-0.5 rounded bg-brand-primary-bg/30 border border-brand-primary-border">ADMIN_BOOTSTRAP_SECRET</code> doit être définie sur le serveur</li>
              <li>• Après création, cette page devient inaccessible</li>
              <li>• Utilisez un mot de passe fort (12+ caractères, majuscules, chiffres, symboles)</li>
            </ul>
          </div>
        </div>

        {/* Back to public website */}
        <div className="mt-8 text-center">
          <a
            href="/"
            className="text-xs font-medium text-tertiary hover:text-gold transition-colors underline-offset-4 hover:underline"
          >
            ← Retour au site public du restaurant
          </a>
        </div>
      </div>
    </div>
  );
}

export default function AdminSetupPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-deep flex items-center justify-center" />}>
      <SetupForm />
    </Suspense>
  );
}