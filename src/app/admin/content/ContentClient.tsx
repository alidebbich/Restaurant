"use client";

import { useState, useId, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  Upload,
  Save,
  CheckCircle2,
  AlertCircle,
  Sparkles,
  ImageIcon,
  TextQuote,
  Palette,
  ExternalLink,
  Globe,
  Eye,
  RefreshCw,
  Layers,
  Check,
  ArrowRight,
  Info,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/Button";
import { adminFetch } from "@/lib/apiClient";
import type { HomepageContent } from "@/lib/db/queries";

type Props = {
  initialContent: HomepageContent;
};

type ActiveSection = "hero" | "story" | "preview";
type Language = "fr" | "ar" | "en";

export function ContentClient({ initialContent }: Props) {
  const [content, setContent] = useState<HomepageContent>(initialContent);
  const [savedSnapshot, setSavedSnapshot] = useState<string>(JSON.stringify(initialContent));
  const [activeSection, setActiveSection] = useState<ActiveSection>("hero");
  const [activeLang, setActiveLang] = useState<Language>("fr");

  const [uploadingHero, setUploadingHero] = useState(false);
  const [uploadingStory, setUploadingStory] = useState(false);
  const [uploadingSecondary, setUploadingSecondary] = useState(false);

  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState<{ message: string; type: "success" | "error" } | null>(null);

  const isDirty = JSON.stringify(content) !== savedSnapshot;

  const handleUpload = async (file: File, target: "hero" | "story" | "secondary") => {
    if (!file.type.startsWith("image/")) {
      toast.error("Veuillez sélectionner un fichier image valide (JPG, PNG, WebP)");
      return;
    }

    const formData = new FormData();
    formData.append("file", file);

    if (target === "hero") setUploadingHero(true);
    if (target === "story") setUploadingStory(true);
    if (target === "secondary") setUploadingSecondary(true);

    try {
      const res = await adminFetch("/api/upload", {
        method: "POST",
        body: formData,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Erreur de téléversement");

      if (target === "hero") setContent((prev) => ({ ...prev, hero_image: data.url }));
      if (target === "story") setContent((prev) => ({ ...prev, story_image: data.url }));
      if (target === "secondary") setContent((prev) => ({ ...prev, story_secondary_image: data.url }));
      toast.success("Image téléversée et mise à jour avec succès");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Erreur lors du téléversement";
      toast.error(msg);
    } finally {
      setUploadingHero(false);
      setUploadingStory(false);
      setUploadingSecondary(false);
    }
  };

  const handleSave = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setSaving(true);
    setFeedback(null);

    try {
      const res = await adminFetch("/api/admin/content", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(content),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Erreur de sauvegarde");
      }

      setSavedSnapshot(JSON.stringify(content));
      toast.success("Contenu de la vitrine enregistré avec succès !");
      setFeedback({ message: "Contenu mis à jour et synchronisé en direct sur le site public.", type: "success" });
      setTimeout(() => setFeedback(null), 4000);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Échec de l'enregistrement";
      toast.error(msg);
      setFeedback({ message: msg, type: "error" });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="w-full space-y-8 pb-16 animate-fadeIn">
      {/* ── Top Header Toolbar ── */}
      <section className="relative overflow-hidden rounded-3xl p-6 sm:p-8 bg-surface-card border border-line shadow-card group">
        <div className="relative z-10 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-brand-primary-bg border border-brand-primary-border text-brand-primary">
                <Palette className="h-3 w-3" aria-hidden="true" />
                <span>Studio Éditorial</span>
              </span>
              {isDirty ? (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-amber-500/10 border border-amber-500/30 text-amber-700 dark:text-amber-400">
                  <span className="h-1.5 w-1.5 rounded-full bg-amber-500 animate-pulse" />
                  <span>Modifications non enregistrées</span>
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-500/10 border border-emerald-500/30 text-emerald-700 dark:text-emerald-400">
                  <Check className="h-3 w-3 text-emerald-600" />
                  <span>Synchronisé en direct</span>
                </span>
              )}
            </div>

            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-primary">
              Vitrine & Contenu de la Page d'Accueil
            </h2>
            <p className="text-sm text-quaternary max-w-2xl">
              Personnalisez les titres d'accroche, les récits culturels et les photographies éditoriales dans les trois langues du restaurant.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2 shrink-0">
            <Button
              variant="secondary"
              size="sm"
              href={`/${activeLang}`}
              target="_blank"
              rel="noopener noreferrer"
              leadingIcon={<ExternalLink className="h-3.5 w-3.5" />}
            >
              Voir le site public
            </Button>

            <Button
              variant="primary"
              size="sm"
              onClick={() => handleSave()}
              loading={saving}
              leadingIcon={<Save className="h-4 w-4" />}
            >
              Enregistrer
            </Button>
          </div>
        </div>
      </section>

      {/* Feedback banner */}
      {feedback && (
        <div
          className={`p-4 rounded-2xl text-sm font-medium border flex items-center gap-3 animate-fadeIn ${
            feedback.type === "success"
              ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-800 dark:text-emerald-300"
              : "border-red-500/30 bg-red-500/10 text-red-800 dark:text-red-300"
          }`}
          role="alert"
        >
          {feedback.type === "success" ? (
            <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-600" aria-hidden="true" />
          ) : (
            <AlertCircle className="h-5 w-5 shrink-0 text-red-600" aria-hidden="true" />
          )}
          <span>{feedback.message}</span>
        </div>
      )}

      {/* ── Section Tabs ── */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border-default pb-4">
        <div className="flex items-center gap-1.5 p-1 rounded-2xl bg-border-subtle/50 border border-border-default" role="tablist">
          <button
            type="button"
            onClick={() => setActiveSection("hero")}
            role="tab"
            aria-selected={activeSection === "hero"}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition-all duration-200 ${
              activeSection === "hero"
                ? "bg-surface-card text-brand-primary shadow-sm border border-brand-primary-border/40 font-bold"
                : "text-quaternary hover:text-primary hover:bg-surface-card/60"
            }`}
          >
            <Sparkles className="h-3.5 w-3.5 text-brand-primary" />
            <span>1. Bannière Hero</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveSection("story")}
            role="tab"
            aria-selected={activeSection === "story"}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition-all duration-200 ${
              activeSection === "story"
                ? "bg-surface-card text-brand-primary shadow-sm border border-brand-primary-border/40 font-bold"
                : "text-quaternary hover:text-primary hover:bg-surface-card/60"
            }`}
          >
            <TextQuote className="h-3.5 w-3.5 text-brand-primary" />
            <span>2. Notre Histoire</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveSection("preview")}
            role="tab"
            aria-selected={activeSection === "preview"}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition-all duration-200 ${
              activeSection === "preview"
                ? "bg-surface-card text-brand-primary shadow-sm border border-brand-primary-border/40 font-bold"
                : "text-quaternary hover:text-primary hover:bg-surface-card/60"
            }`}
          >
            <Eye className="h-3.5 w-3.5 text-brand-primary" />
            <span>3. Aperçu en Direct</span>
          </button>
        </div>

        {/* Global Language Pill Switcher */}
        <div className="flex items-center gap-1 bg-surface-card p-1 rounded-2xl border border-border-default shadow-xs" role="group" aria-label="Langue active">
          {[
            { id: "fr", label: "Français", flag: "🇫🇷" },
            { id: "ar", label: "العربية", flag: "🇹🇳" },
            { id: "en", label: "English", flag: "🇬🇧" },
          ].map((l) => (
            <button
              key={l.id}
              type="button"
              onClick={() => setActiveLang(l.id as Language)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium transition-colors ${
                activeLang === l.id
                  ? "bg-brand-primary text-cream font-semibold shadow-xs"
                  : "text-quaternary hover:text-primary hover:bg-surface-soft"
              }`}
            >
              <span>{l.flag}</span>
              <span>{l.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* ── TAB 1: HERO BANNER ── */}
      {activeSection === "hero" && (
        <div className="grid gap-6 lg:grid-cols-12">
          {/* Left Column: Multilingual Headings */}
          <div className="lg:col-span-7 space-y-6">
            <div className="card p-6 sm:p-7 space-y-6">
              <div className="flex items-center justify-between pb-3 border-b border-border-default">
                <div>
                  <h3 className="text-base font-bold text-primary flex items-center gap-2">
                    <Sparkles className="h-4 w-4 text-brand-gold" />
                    <span>Titre d'Accroche Hero</span>
                  </h3>
                  <p className="text-xs text-quaternary mt-0.5">
                    Le premier message aperçu par vos visiteurs au chargement du site
                  </p>
                </div>
                <span className="text-xs font-mono px-2 py-0.5 rounded-md bg-border-subtle text-tertiary uppercase">
                  {activeLang}
                </span>
              </div>

              {/* Dynamic language input based on activeLang */}
              {activeLang === "fr" && (
                <div className="space-y-4">
                  <div>
                    <label htmlFor="hero-fr" className="block text-xs font-semibold uppercase tracking-wider text-quaternary mb-2">
                      Titre Principal (Français)
                    </label>
                    <input
                      id="hero-fr"
                      type="text"
                      value={content.hero_title_fr || ""}
                      onChange={(e) => setContent({ ...content, hero_title_fr: e.target.value })}
                      placeholder="L'Âme Culinaire de Tunis — Médina depuis 2015"
                      className="input w-full text-base font-semibold focus:border-brand-primary focus:ring-2 focus:ring-brand-primary/20"
                    />
                    <p className="text-[11px] text-quaternary mt-1.5 flex items-center gap-1">
                      <Info className="h-3 w-3 text-tertiary" />
                      <span>Idéalement 35 à 60 caractères pour un impact visuel optimal.</span>
                    </p>
                  </div>
                </div>
              )}

              {activeLang === "ar" && (
                <div className="space-y-4">
                  <div>
                    <label htmlFor="hero-ar" className="block text-xs font-semibold uppercase tracking-wider text-quaternary mb-2 font-arabic text-end">
                      العنوان الرئيسي (العربية)
                    </label>
                    <input
                      id="hero-ar"
                      type="text"
                      dir="rtl"
                      value={content.hero_title_ar || ""}
                      onChange={(e) => setContent({ ...content, hero_title_ar: e.target.value })}
                      placeholder="أصالة الطبخ التونسي العريق — في قلب المدينة منذ 2015"
                      className="input w-full text-lg font-arabic font-bold text-end focus:border-brand-primary focus:ring-2 focus:ring-brand-primary/20"
                    />
                    <p className="text-[11px] text-quaternary mt-1.5 text-end font-arabic">
                      العنوان الموجه للزوار الناطقين باللغة العربية مع دعم الخط التونسي الأصيل.
                    </p>
                  </div>
                </div>
              )}

              {activeLang === "en" && (
                <div className="space-y-4">
                  <div>
                    <label htmlFor="hero-en" className="block text-xs font-semibold uppercase tracking-wider text-quaternary mb-2">
                      Headline Tagline (English)
                    </label>
                    <input
                      id="hero-en"
                      type="text"
                      value={content.hero_title_en || ""}
                      onChange={(e) => setContent({ ...content, hero_title_en: e.target.value })}
                      placeholder="Authentic Tunisian Cuisine — Tunis Since 2015"
                      className="input w-full text-base font-semibold focus:border-brand-primary focus:ring-2 focus:ring-brand-primary/20"
                    />
                    <p className="text-[11px] text-quaternary mt-1.5 flex items-center gap-1">
                      <Info className="h-3 w-3 text-tertiary" />
                      <span>Shown to international and English-speaking tourists.</span>
                    </p>
                  </div>
                </div>
              )}

              {/* Language overview switcher pills */}
              <div className="pt-4 border-t border-border-default">
                <span className="text-[11px] font-semibold text-tertiary block mb-2 uppercase tracking-wider">
                  Traductions configurées :
                </span>
                <div className="grid gap-2 sm:grid-cols-3">
                  <div className="p-2.5 rounded-xl border border-border-default bg-surface-soft/40 text-xs">
                    <span className="font-semibold text-primary block">Français :</span>
                    <p className="text-quaternary truncate mt-0.5">{content.hero_title_fr || "Par défaut"}</p>
                  </div>
                  <div className="p-2.5 rounded-xl border border-border-default bg-surface-soft/40 text-xs">
                    <span className="font-semibold text-primary block font-arabic">العربية :</span>
                    <p className="text-quaternary truncate mt-0.5 font-arabic">{content.hero_title_ar || "افتراضي"}</p>
                  </div>
                  <div className="p-2.5 rounded-xl border border-border-default bg-surface-soft/40 text-xs">
                    <span className="font-semibold text-primary block">English :</span>
                    <p className="text-quaternary truncate mt-0.5">{content.hero_title_en || "Default"}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Right Column: Hero Cover Photo Curation */}
          <div className="lg:col-span-5 space-y-6">
            <div className="card p-6 sm:p-7 space-y-5">
              <div className="flex items-center justify-between pb-3 border-b border-border-default">
                <h3 className="text-base font-bold text-primary flex items-center gap-2">
                  <ImageIcon className="h-4 w-4 text-brand-primary" />
                  <span>Grande Photo de Couverture</span>
                </h3>
                <span className="badge badge-gold text-[10px] font-bold">16:9 Paysage</span>
              </div>

              {/* Real Photo Preview — Full 100% Opacity */}
              <div className="relative aspect-video w-full rounded-2xl overflow-hidden border border-line bg-surface-dark shadow-md group">
                <Image
                  src={content.hero_image || "/images/hero-main.jpg"}
                  alt="Aperçu Hero"
                  fill
                  sizes="400px"
                  className="object-cover transition-transform duration-700 ease-out group-hover:scale-102"
                />

                {/* Dark gradient overlay simulation */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/30 to-transparent pointer-events-none" />

                {/* Live Headline Badge Over Image */}
                <div className="absolute bottom-3 start-3 end-3 text-white pointer-events-none">
                  <span className="text-[10px] text-brand-gold font-serif italic block">Dar Zitoun</span>
                  <p className="text-xs font-semibold font-display line-clamp-1 mt-0.5">
                    {content[`hero_title_${activeLang}` as keyof HomepageContent] || "Authentic Tunisian Cuisine"}
                  </p>
                </div>

                {uploadingHero && (
                  <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/60 backdrop-blur-xs z-20 text-white gap-2">
                    <div className="flex h-8 w-8 rounded-full border-3 border-cream border-t-brand-gold animate-spin" />
                    <span className="text-xs font-medium">Téléversement en cours…</span>
                  </div>
                )}
              </div>

              {/* Upload Action */}
              <div className="space-y-3">
                <label
                  htmlFor="hero-image-file"
                  className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border border-dashed border-brand-primary-border bg-brand-primary-bg/20 text-brand-primary text-xs font-semibold hover:bg-brand-primary-bg/40 cursor-pointer transition-colors shadow-xs"
                >
                  <Upload className="h-4 w-4 text-brand-primary" />
                  <span>{uploadingHero ? "Téléversement…" : "Téléverser une nouvelle photo (JPG, PNG)"}</span>
                  <input
                    id="hero-image-file"
                    type="file"
                    accept="image/*"
                    onChange={(e) => e.target.files?.[0] && handleUpload(e.target.files[0], "hero")}
                    disabled={uploadingHero}
                    className="hidden"
                  />
                </label>

                <div className="space-y-1">
                  <label htmlFor="hero-image-url" className="text-[11px] font-semibold text-quaternary uppercase tracking-wider block">
                    Ou chemin direct de l'image :
                  </label>
                  <input
                    id="hero-image-url"
                    type="text"
                    value={content.hero_image || ""}
                    onChange={(e) => setContent({ ...content, hero_image: e.target.value })}
                    placeholder="/images/hero-main.jpg"
                    className="input input-sm text-xs font-mono w-full"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── TAB 2: NOTRE HISTOIRE ── */}
      {activeSection === "story" && (
        <div className="grid gap-6 lg:grid-cols-12">
          {/* Left: Narrative Texts */}
          <div className="lg:col-span-7 space-y-6">
            <div className="card p-6 sm:p-7 space-y-6">
              <div className="flex items-center justify-between pb-3 border-b border-border-default">
                <div>
                  <h3 className="text-base font-bold text-primary flex items-center gap-2">
                    <TextQuote className="h-4 w-4 text-brand-primary" />
                    <span>Récit & Histoire du Restaurant</span>
                  </h3>
                  <p className="text-xs text-quaternary mt-0.5">
                    Présentez l'héritage, les valeurs et les origines de Dar Zitoun
                  </p>
                </div>
                <span className="text-xs font-mono px-2 py-0.5 rounded-md bg-border-subtle text-tertiary uppercase">
                  {activeLang}
                </span>
              </div>

              {activeLang === "fr" && (
                <div className="space-y-4">
                  <div>
                    <label htmlFor="story-heading-fr" className="block text-xs font-semibold uppercase tracking-wider text-quaternary mb-1.5">
                      Titre de la Section (Français)
                    </label>
                    <input
                      id="story-heading-fr"
                      type="text"
                      value={content.story_heading_fr || ""}
                      onChange={(e) => setContent({ ...content, story_heading_fr: e.target.value })}
                      placeholder="L'Amour du Terroir et des Saveurs Méditerranéennes"
                      className="input w-full font-semibold focus:border-brand-primary focus:ring-2 focus:ring-brand-primary/20"
                    />
                  </div>

                  <div>
                    <label htmlFor="story-body-fr" className="block text-xs font-semibold uppercase tracking-wider text-quaternary mb-1.5">
                      Corps du Récit (Français)
                    </label>
                    <textarea
                      id="story-body-fr"
                      rows={6}
                      value={content.story_body_fr || ""}
                      onChange={(e) => setContent({ ...content, story_body_fr: e.target.value })}
                      placeholder="Depuis 2015, au cœur de la Médina de Tunis, Dar Zitoun perpétue l'art culinaire des familles tunisiennes..."
                      className="input w-full text-sm leading-relaxed focus:border-brand-primary focus:ring-2 focus:ring-brand-primary/20 resize-none"
                    />
                  </div>
                </div>
              )}

              {activeLang === "ar" && (
                <div className="space-y-4">
                  <div>
                    <label htmlFor="story-heading-ar" className="block text-xs font-semibold uppercase tracking-wider text-quaternary mb-1.5 font-arabic text-end">
                      عنوان القسم (العربية)
                    </label>
                    <input
                      id="story-heading-ar"
                      type="text"
                      dir="rtl"
                      value={content.story_heading_ar || ""}
                      onChange={(e) => setContent({ ...content, story_heading_ar: e.target.value })}
                      placeholder="شغف الأصالة وعراقة النكهات التونسية"
                      className="input w-full font-arabic font-bold text-end focus:border-brand-primary focus:ring-2 focus:ring-brand-primary/20"
                    />
                  </div>

                  <div>
                    <label htmlFor="story-body-ar" className="block text-xs font-semibold uppercase tracking-wider text-quaternary mb-1.5 font-arabic text-end">
                      نص القصة (العربية)
                    </label>
                    <textarea
                      id="story-body-ar"
                      rows={6}
                      dir="rtl"
                      value={content.story_body_ar || ""}
                      onChange={(e) => setContent({ ...content, story_body_ar: e.target.value })}
                      placeholder="منذ عام 2015 في قلب المدينة العتيقة بتونس، يجسد دار الزيتون كرم الضيافة وعراقة المطبخ التونسي الأصيل..."
                      className="input w-full font-arabic text-base leading-loose text-end focus:border-brand-primary focus:ring-2 focus:ring-brand-primary/20 resize-none"
                    />
                  </div>
                </div>
              )}

              {activeLang === "en" && (
                <div className="space-y-4">
                  <div>
                    <label htmlFor="story-heading-en" className="block text-xs font-semibold uppercase tracking-wider text-quaternary mb-1.5">
                      Section Heading (English)
                    </label>
                    <input
                      id="story-heading-en"
                      type="text"
                      value={content.story_heading_en || ""}
                      onChange={(e) => setContent({ ...content, story_heading_en: e.target.value })}
                      placeholder="A Passion for Heritage and Mediterranean Flavours"
                      className="input w-full font-semibold focus:border-brand-primary focus:ring-2 focus:ring-brand-primary/20"
                    />
                  </div>

                  <div>
                    <label htmlFor="story-body-en" className="block text-xs font-semibold uppercase tracking-wider text-quaternary mb-1.5">
                      Story Narrative (English)
                    </label>
                    <textarea
                      id="story-body-en"
                      rows={6}
                      value={content.story_body_en || ""}
                      onChange={(e) => setContent({ ...content, story_body_en: e.target.value })}
                      placeholder="Since 2015, nestled in the historic Medina of Tunis, Dar Zitoun honours the culinary secrets of generations..."
                      className="input w-full text-sm leading-relaxed focus:border-brand-primary focus:ring-2 focus:ring-brand-primary/20 resize-none"
                    />
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Right: Dual Photo Curation */}
          <div className="lg:col-span-5 space-y-6">
            <div className="card p-6 sm:p-7 space-y-6">
              <div className="pb-3 border-b border-border-default">
                <h3 className="text-base font-bold text-primary flex items-center gap-2">
                  <ImageIcon className="h-4 w-4 text-brand-primary" />
                  <span>Duo de Photographies de Présentation</span>
                </h3>
                <p className="text-xs text-quaternary mt-0.5">
                  Une photo principale complétée par un cadre en arche architecturale
                </p>
              </div>

              {/* Photo 1: Main Story */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-primary">1. Photo Principale (Ambiance)</span>
                  <span className="text-[10px] font-mono text-tertiary">4:3 Recommandé</span>
                </div>

                <div className="relative aspect-[4/3] w-full rounded-2xl overflow-hidden border border-line bg-surface-dark shadow-sm group">
                  <Image
                    src={content.story_image || "/images/story-main.jpg"}
                    alt="Story Main"
                    fill
                    sizes="350px"
                    className="object-cover transition-transform duration-700 ease-out group-hover:scale-102"
                  />
                  {uploadingStory && (
                    <div className="absolute inset-0 flex items-center justify-center bg-black/60 z-20 text-white">
                      <div className="flex h-7 w-7 rounded-full border-3 border-cream border-t-brand-gold animate-spin" />
                    </div>
                  )}
                </div>

                <label
                  htmlFor="story-file"
                  className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-xl border border-dashed border-border-default bg-surface-soft text-primary text-xs font-semibold hover:border-brand-primary-border hover:text-brand-primary cursor-pointer transition-colors"
                >
                  <Upload className="h-3.5 w-3.5" />
                  <span>{uploadingStory ? "Envoi…" : "Remplacer la photo principale"}</span>
                  <input
                    id="story-file"
                    type="file"
                    accept="image/*"
                    onChange={(e) => e.target.files?.[0] && handleUpload(e.target.files[0], "story")}
                    disabled={uploadingStory}
                    className="hidden"
                  />
                </label>
              </div>

              {/* Photo 2: Secondary Arch Frame */}
              <div className="space-y-3 pt-4 border-t border-border-default">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-primary">2. Photo en Arche Traditionnelle</span>
                  <span className="text-[10px] font-mono text-tertiary">3:4 Portrait</span>
                </div>

                <div className="relative aspect-[3/4] w-40 mx-auto rounded-t-full rounded-b-2xl overflow-hidden border-2 border-brand-gold/40 bg-surface-dark shadow-md group">
                  <Image
                    src={content.story_secondary_image || "/images/gal-1.jpg"}
                    alt="Story Secondary"
                    fill
                    sizes="200px"
                    className="object-cover transition-transform duration-700 ease-out group-hover:scale-102"
                  />
                  {uploadingSecondary && (
                    <div className="absolute inset-0 flex items-center justify-center bg-black/60 z-20 text-white">
                      <div className="flex h-7 w-7 rounded-full border-3 border-cream border-t-brand-gold animate-spin" />
                    </div>
                  )}
                </div>

                <label
                  htmlFor="secondary-file"
                  className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-xl border border-dashed border-border-default bg-surface-soft text-primary text-xs font-semibold hover:border-brand-primary-border hover:text-brand-primary cursor-pointer transition-colors"
                >
                  <Upload className="h-3.5 w-3.5" />
                  <span>{uploadingSecondary ? "Envoi…" : "Remplacer la photo en arche"}</span>
                  <input
                    id="secondary-file"
                    type="file"
                    accept="image/*"
                    onChange={(e) => e.target.files?.[0] && handleUpload(e.target.files[0], "secondary")}
                    disabled={uploadingSecondary}
                    className="hidden"
                  />
                </label>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── TAB 3: LIVE INTERACTIVE PREVIEW CANVAS ── */}
      {activeSection === "preview" && (
        <div className="space-y-8 animate-fadeIn">
          <div className="flex items-center justify-between card p-4">
            <div className="flex items-center gap-2">
              <Eye className="h-4 w-4 text-brand-primary" />
              <span className="text-xs font-semibold text-primary">
                Aperçu instantané tel qu'affiché aux visiteurs ({activeLang.toUpperCase()})
              </span>
            </div>
            <Button
              variant="secondary"
              size="sm"
              href={`/${activeLang}`}
              target="_blank"
              rel="noopener noreferrer"
              leadingIcon={<ExternalLink className="h-3.5 w-3.5" />}
            >
              Ouvrir dans un nouvel onglet
            </Button>
          </div>

          {/* Hero Simulation Card */}
          <div className="relative overflow-hidden rounded-3xl min-h-[420px] flex items-end p-8 sm:p-12 border border-line shadow-2xl bg-surface-dark text-white">
            <Image
              src={content.hero_image || "/images/hero-main.jpg"}
              alt="Hero Preview"
              fill
              className="object-cover"
              priority
            />
            <div className="absolute inset-0 bg-gradient-to-t from-[rgba(9,37,31,0.92)] via-[rgba(9,37,31,0.45)] to-transparent" />

            <div className="relative z-10 max-w-2xl space-y-4">
              <p className="font-display italic text-brand-gold text-lg md:text-xl">
                Dar Zitoun
              </p>
              <h1 className="text-3xl sm:text-5xl font-bold font-display tracking-tight text-cream leading-tight">
                {content[`hero_title_${activeLang}` as keyof HomepageContent] || "Authentic Tunisian Cuisine"}
              </h1>

              <div className="flex flex-wrap items-center gap-3 pt-4">
                <button
                  type="button"
                  className="h-11 px-6 rounded-xl bg-cta text-cta-ink font-semibold text-sm shadow-md"
                >
                  {activeLang === "ar" ? "حجز طاولة" : activeLang === "en" ? "Reserve a table" : "Réserver une table"}
                </button>
                <button
                  type="button"
                  className="h-11 px-6 rounded-xl border border-cream/40 text-cream bg-black/25 backdrop-blur-md font-semibold text-sm"
                >
                  {activeLang === "ar" ? "قائمة الطعام" : activeLang === "en" ? "View menu" : "Voir le menu"}
                </button>
              </div>
            </div>
          </div>

          {/* Story Simulation Card */}
          <div className="card p-8 sm:p-12 rounded-3xl border border-line bg-surface">
            <div className="grid gap-12 lg:grid-cols-2 items-center">
              <div className="space-y-4 max-w-lg">
                <p className="font-display italic text-terracotta text-lg">
                  {activeLang === "ar" ? "أصالة وشغف" : activeLang === "en" ? "Heritage & Passion" : "Tradition & Passion"}
                </p>
                <h2 className="text-2xl sm:text-4xl font-bold font-display text-ink tracking-tight">
                  {content[`story_heading_${activeLang}` as keyof HomepageContent] || "L'Amour du Terroir"}
                </h2>
                <p className="text-ink-muted text-sm sm:text-base leading-relaxed">
                  {content[`story_body_${activeLang}` as keyof HomepageContent] || "Depuis 2015, au cœur de la Médina de Tunis..."}
                </p>
              </div>

              <div className="relative grid grid-cols-2 gap-4">
                <div className="relative aspect-[4/3] rounded-2xl overflow-hidden shadow-lg border border-line">
                  <Image
                    src={content.story_image || "/images/story-main.jpg"}
                    alt="Story Preview"
                    fill
                    className="object-cover"
                  />
                </div>
                <div className="relative aspect-[3/4] rounded-t-full rounded-b-2xl overflow-hidden shadow-lg border-2 border-brand-gold/40">
                  <Image
                    src={content.story_secondary_image || "/images/gal-1.jpg"}
                    alt="Story Arch Preview"
                    fill
                    className="object-cover"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
