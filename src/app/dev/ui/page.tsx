/**
 * /dev/ui — Button system style guide
 * Only accessible in development (NODE_ENV !== 'production')
 */

import { notFound } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { Loader2, ChevronRight, Plus, Trash2, Mail, ArrowRight } from "lucide-react";

export default function UIStyleGuide() {
  const variants = ["primary", "secondary", "outline", "ghost", "destructive", "link", "outline-inverse"] as const;
  const sizes = ["sm", "md", "lg"] as const;

  return (
    <div className="min-h-screen bg-surface p-10 font-body">
      <h1 className="mb-2 font-display text-4xl font-semibold text-ink">🎨 Button System</h1>
      <p className="mb-10 text-ink-muted text-base">
        Single source of truth — <code className="rounded bg-sand/50 px-1.5 py-0.5 text-sm font-mono">src/components/ui/Button.tsx</code>
      </p>

      {/* ── Variant × Size matrix ──────────────────────────────────────── */}
      <section className="mb-16">
        <h2 className="mb-6 text-2xl font-semibold text-ink border-b border-line pb-3">Variant × Size Matrix</h2>
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="text-left text-ink-muted">
                <th className="pb-3 pr-6 font-medium">Variant</th>
                {sizes.map((s) => (
                  <th key={s} className="pb-3 px-4 font-medium">{s} ({s === "sm" ? "36px" : s === "md" ? "44px" : "52px"})</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-line/40">
              {variants.map((v) => (
                <tr key={v}>
                  <td className="py-4 pr-6 font-mono text-xs text-ink-muted">{v}</td>
                  {sizes.map((s) => (
                    <td
                      key={s}
                      className={`py-4 px-4 ${v === "outline-inverse" ? "bg-surface-dark rounded-lg" : ""}`}
                    >
                      <Button variant={v} size={s}>
                        {v === "primary" ? "Réserver" : v === "secondary" ? "Le Menu" : v === "destructive" ? "Supprimer" : v === "link" ? "En savoir plus" : "Action"}
                      </Button>
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* ── With Icons ─────────────────────────────────────────────────── */}
      <section className="mb-16">
        <h2 className="mb-6 text-2xl font-semibold text-ink border-b border-line pb-3">With Icons</h2>
        <div className="flex flex-wrap gap-4 items-center">
          <Button variant="primary" size="lg" trailingIcon={<ArrowRight className="size-4" />}>
            Réserver une table
          </Button>
          <Button variant="secondary" size="md" leadingIcon={<Plus className="size-4" />}>
            Ajouter un plat
          </Button>
          <Button variant="outline" size="md" leadingIcon={<Mail className="size-4" />}>
            Contacter
          </Button>
          <Button variant="destructive" size="md" leadingIcon={<Trash2 className="size-4" />}>
            Supprimer
          </Button>
          <Button variant="ghost" size="md" trailingIcon={<ChevronRight className="size-4" />}>
            Voir plus
          </Button>
        </div>
      </section>

      {/* ── Icon-only buttons ──────────────────────────────────────────── */}
      <section className="mb-16">
        <h2 className="mb-6 text-2xl font-semibold text-ink border-b border-line pb-3">Icon-only</h2>
        <div className="flex flex-wrap gap-4 items-center">
          <Button variant="primary" size="icon" aria-label="Réserver">
            <Plus className="size-5" />
          </Button>
          <Button variant="secondary" size="icon" aria-label="Ajouter">
            <Plus className="size-5" />
          </Button>
          <Button variant="outline" size="icon" aria-label="Email">
            <Mail className="size-5" />
          </Button>
          <Button variant="ghost" size="icon-sm" aria-label="Supprimer">
            <Trash2 className="size-4" />
          </Button>
        </div>
      </section>

      {/* ── States ─────────────────────────────────────────────────────── */}
      <section className="mb-16">
        <h2 className="mb-6 text-2xl font-semibold text-ink border-b border-line pb-3">States</h2>
        <div className="flex flex-wrap gap-4 items-center">
          <Button variant="primary" size="md">Default</Button>
          <Button variant="primary" size="md" disabled>Disabled</Button>
          <Button variant="primary" size="md" loading>Loading…</Button>
          <Button variant="secondary" size="md" disabled>Disabled</Button>
          <Button variant="secondary" size="md" loading>Loading…</Button>
          <Button variant="destructive" size="md" loading>Suppression…</Button>
        </div>
      </section>

      {/* ── Link buttons ───────────────────────────────────────────────── */}
      <section className="mb-16">
        <h2 className="mb-6 text-2xl font-semibold text-ink border-b border-line pb-3">As Link (href prop)</h2>
        <div className="flex flex-wrap gap-4 items-center">
          <Button href="/fr/reserve" variant="primary" size="lg">Réserver (Link)</Button>
          <Button href="/fr/menu" variant="secondary" size="md">Menu (Link)</Button>
          <Button href="/fr" variant="link" size="md">Accueil →</Button>
        </div>
      </section>

      {/* ── Full width ─────────────────────────────────────────────────── */}
      <section className="mb-16">
        <h2 className="mb-6 text-2xl font-semibold text-ink border-b border-line pb-3">Full Width</h2>
        <div className="max-w-sm space-y-3">
          <Button variant="primary" size="md" fullWidth>Réserver une table</Button>
          <Button variant="secondary" size="md" fullWidth>Voir le menu complet</Button>
          <Button variant="outline" size="md" fullWidth>Annuler</Button>
        </div>
      </section>

      {/* ── Dark surface ────────────────────────────────────────────────── */}
      <section className="mb-16 rounded-3xl bg-surface-dark p-10">
        <h2 className="mb-6 text-2xl font-semibold text-ink-inverse border-b border-cream/20 pb-3">On Dark Surface</h2>
        <div className="flex flex-wrap gap-4 items-center">
          <Button variant="primary" size="lg">Réserver</Button>
          <Button variant="outline-inverse" size="lg">Voir le menu</Button>
          <Button variant="ghost" size="md" className="text-cream hover:bg-cream/10">Annuler</Button>
        </div>
      </section>

      {/* ── Arabic RTL ──────────────────────────────────────────────────── */}
      <section className="mb-16" dir="rtl">
        <h2 className="mb-6 text-2xl font-semibold text-ink border-b border-line pb-3">Arabic RTL</h2>
        <div className="flex flex-wrap gap-4 items-center">
          <Button variant="primary" size="lg">احجز طاولة</Button>
          <Button variant="secondary" size="md">قائمة الطعام</Button>
          <Button variant="outline" size="md" leadingIcon={<ArrowRight className="size-4" />}>
            اكتشف المزيد
          </Button>
        </div>
      </section>

      {/* ── Token reference ─────────────────────────────────────────────── */}
      <section className="mb-16 rounded-2xl bg-sand/20 border border-line p-8">
        <h2 className="mb-4 text-xl font-semibold text-ink">Design Tokens</h2>
        <div className="grid gap-2 font-mono text-sm text-ink-muted sm:grid-cols-2 lg:grid-cols-3">
          {[
            ["--radius-button", "12px"],
            ["--btn-sm-h", "36px"],
            ["--btn-sm-px", "14px"],
            ["--btn-sm-fs", "14px"],
            ["--btn-md-h", "44px"],
            ["--btn-md-px", "20px"],
            ["--btn-md-fs", "15px"],
            ["--btn-lg-h", "52px"],
            ["--btn-lg-px", "28px"],
            ["--btn-lg-fs", "16px"],
            ["--color-cta", "#C5A869 (Gold)"],
            ["--color-cta-ink", "#09251F (Deep Green)"],
            ["--color-forest", "#123C30 (Forest)"],
            ["--color-danger", "#8B3A1E (Dark Terracotta)"],
          ].map(([k, v]) => (
            <div key={k} className="flex justify-between gap-4 rounded-lg bg-surface px-3 py-2">
              <span className="text-brand">{k}</span>
              <span>{v}</span>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
