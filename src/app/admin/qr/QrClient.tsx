"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import {
  QrCode,
  Download,
  ExternalLink,
  Copy,
  Check,
  Sparkles,
  Link,
} from "lucide-react";
import { adminFetch } from "@/lib/apiClient";
import { Button } from "@/components/ui/Button";

export function QrClient() {
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const [menuUrl, setMenuUrl] = useState<string>("");
  const [copied, setCopied] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchQr() {
      try {
        const res = await adminFetch("/api/qr");
        const data = await res.json();
        if (data.success) {
          setQrDataUrl(data.qrDataUrl);
          setMenuUrl(data.menuUrl);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    fetchQr();
  }, []);

  const handleCopy = () => {
    if (!menuUrl) return;
    navigator.clipboard.writeText(menuUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    window.location.href = "/api/qr?format=png";
  };

  return (
    <div className="w-full space-y-8 pb-16 animate-fadeIn">
      {/* Premium Page Header */}
      <section className="relative overflow-hidden rounded-3xl p-6 sm:p-8 lg:p-10 card-elevated group">
        <div className="absolute inset-0 -z-10 opacity-0 group-hover:opacity-100 transition-opacity duration-700" aria-hidden="true">
          <div className="absolute -top-1/4 -right-1/4 h-[300px] w-[300px] rounded-full" style={{ background: "var(--color-brand-primary-tint)", filter: "blur(96px)" }} />
          <div className="absolute -bottom-1/4 -left-1/4 h-[200px] w-[200px] rounded-full" style={{ background: "var(--color-success-tint)", filter: "blur(96px)", animationDelay: "1s" }} />
        </div>

        <div className="relative z-10 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 badge badge-success px-2.5 py-1 text-[10px] font-bold shadow-success-sm">
              <Link className="h-3 w-3" aria-hidden="true" />
              <span>Lien permanent stable</span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-primary flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-brand-primary-bg border border-brand-primary-border text-brand-primary shadow-gold-md">
                <QrCode className="h-5.5 w-5.5" aria-hidden="true" />
              </div>
              <span>QR Code du Menu Digital</span>
            </h2>
            <p className="text-sm text-quaternary leading-relaxed">
              Imprimez ce QR code sur vos tables, flyers et présentoirs. Il redirige instantanément vos clients vers le menu digital interactif de Dar Zitoun.
            </p>
          </div>
        </div>
      </section>

      <div className="grid gap-6 lg:grid-cols-12">
        {/* QR Code Preview Card */}
        <div className="lg:col-span-5 flex flex-col items-center">
          <div className="card p-8 space-y-6 w-full">
            <div className="relative rounded-3xl overflow-hidden bg-color-brand-primary-dark border border-color-brand-primary-border shadow-xl shadow-gold-lg group">
              <div className="absolute inset-0 -z-10 opacity-0 group-hover:opacity-60 transition-opacity duration-700" aria-hidden="true">
                <div className="absolute -top-1/4 -right-1/4 h-[200px] w-[200px] rounded-full" style={{ background: "var(--color-success-tint)", filter: "blur(64px)" }} />
                <div className="absolute -bottom-1/4 -left-1/4 h-[160px] w-[160px] rounded-full" style={{ background: "var(--color-brand-primary-tint)", filter: "blur(64px)", animationDelay: "1s" }} />
              </div>

              <div className="relative z-10 flex h-64 w-64 flex-col items-center justify-center sm:h-72 sm:w-72">
                {loading ? (
                  <div className="flex flex-col items-center justify-center gap-2 opacity-50 animate-pulse">
                    <div className="flex h-8 w-8 rounded-full border-4 border-border-subtle border-t-brand-primary animate-spin" />
                    <span className="text-xs text-tertiary font-medium">Génération…</span>
                  </div>
                ) : qrDataUrl ? (
                  <Image
                    src={qrDataUrl}
                    alt="QR Code Menu Dar Zitoun"
                    width={300}
                    height={300}
                    className="rounded-xl shadow-2xl"
                    priority
                  />
                ) : (
                  <div className="flex h-64 w-64 flex-col items-center justify-center rounded-xl bg-border-subtle text-tertiary">
                    <span className="text-xs font-medium">Erreur de chargement</span>
                  </div>
                )}
              </div>

              {/* Corner decorative accent */}
              <div className="absolute top-4 right-4 h-8 w-8 rounded-full bg-status-success-bg/30 border border-status-success-border/30 flex items-center justify-center">
                <span className="text-[10px] text-status-success font-bold">LIVE</span>
              </div>
            </div>

            <div className="space-y-2">
              <span className="text-xs font-semibold uppercase tracking-wider text-status-success">
                URL Permanente et Stable
              </span>
              <p className="text-xs text-tertiary leading-relaxed">
                Ce QR code reste valide en permanence, même si vous modifiez vos plats, vos prix ou votre disponibilité depuis le tableau de bord.
              </p>
            </div>

            <Button
              type="button"
              variant="primary"
              fullWidth
              onClick={handleDownload}
              leadingIcon={<Download className="h-4 w-4" aria-hidden="true" />}
            >
              Télécharger l'image PNG (Haute Définition)
            </Button>
          </div>
        </div>

        {/* Instructions & Links */}
        <div className="lg:col-span-7 space-y-6">
          {/* Stable URL Card */}
          <div className="card p-6 space-y-3">
            <div className="flex items-center gap-2 mb-1">
              <Link className="h-4 w-4 text-brand-primary" aria-hidden="true" />
              <h3 className="text-xs font-semibold uppercase tracking-wider text-brand-primary">
                Lien Direct vers votre Menu Public
              </h3>
            </div>
            <div className="flex items-center gap-2 card border-border-default p-3 hover:border-brand-primary-border hover:bg-brand-primary-bg/30 transition-all duration-300">
              <span className="truncate font-mono text-xs font-semibold text-primary flex-1">
                {menuUrl || "Chargement de l'URL..."}
              </span>
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={handleCopy}
                leadingIcon={copied ? <Check className="h-3.5 w-3.5" aria-hidden="true" /> : <Copy className="h-3.5 w-3.5" aria-hidden="true" />}
              >
                {copied ? "Copié !" : "Copier"}
              </Button>
            </div>
            <a
              href={menuUrl || "/fr/menu"}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-xs font-medium text-status-success hover:underline hover:text-status-success/80 pt-1"
            >
              <span>Tester et ouvrir le menu public dans un nouvel onglet</span>
              <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
            </a>
          </div>

          {/* Practical Tips */}
          <div className="card p-6 space-y-4">
            <div className="flex items-center gap-2 mb-1">
              <Sparkles className="h-4 w-4 text-brand-primary" aria-hidden="true" />
              <h3 className="text-xs font-semibold uppercase tracking-wider text-brand-primary">
                Avantages pour votre Restaurant
              </h3>
            </div>
            <ul className="space-y-3">
              {[
                "Zéro réimpression : Changez un prix ou marquez un plat comme épuisé sans réimprimer vos supports physiques.",
                "Accès instantané : Aucun téléchargement ni inscription pour vos clients ; le menu s'ouvre directement dans leur navigateur.",
                "Optimisé mobile : Présentation fluide, photos appétissantes, descriptions et commande en un clic.",
                "Lien éternel : Même si vous changez de nom de domaine ou de structure, le QR code redirigera toujours vers votre menu à jour.",
              ].map((tip, i) => (
                <li key={i} className="flex items-start gap-3 text-xs text-tertiary">
                  <span className="text-status-success shrink-0 mt-0.5">✓</span>
                  <span>{tip}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Usage Ideas */}
          <div className="card p-6 space-y-4 border border-brand-primary-border/30 bg-brand-primary-bg/30">
            <div className="flex items-center gap-2 mb-1">
              <Sparkles className="h-4 w-4 text-gold" aria-hidden="true" />
              <h3 className="text-xs font-semibold uppercase tracking-wider text-brand-primary">
                Où l'afficher ?
              </h3>
            </div>
            <ul className="space-y-3">
              {[
                "Sets de table et sous-verres sur chaque table",
                "Vitrine et porte d'entrée du restaurant",
                "Flyers et dépliants promotionnels",
                "Factures et tickets de caisse",
                "Profils sociaux et carte de visite digitale",
              ].map((idea, i) => (
                <li key={i} className="flex items-start gap-3 text-xs text-tertiary">
                  <span className="text-gold shrink-0 mt-0.5">•</span>
                  <span>{idea}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}