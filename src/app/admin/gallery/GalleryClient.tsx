"use client";

import { useState } from "react";
import Image from "next/image";
import {
  Upload,
  Trash2,
  Plus,
  ArrowRight,
  ImageIcon,
  Loader2,
  CheckCircle2,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/Button";
import { adminFetch } from "@/lib/apiClient";
import type { GalleryImage } from "@/lib/db/queries";

type Props = {
  initialImages: GalleryImage[];
};

export function GalleryClient({ initialImages }: Props) {
  const [images, setImages] = useState<GalleryImage[]>(initialImages);
  const [uploading, setUploading] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [captionFr, setCaptionFr] = useState("");
  const [captionAr, setCaptionAr] = useState("");

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    const formData = new FormData();
    formData.append("file", file);

    try {
      const uploadRes = await adminFetch("/api/upload", { method: "POST", body: formData });
      const uploadData = await uploadRes.json();
      if (!uploadRes.ok) throw new Error(uploadData.error || "Erreur de téléversement");

      const res = await adminFetch("/api/admin/gallery", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          image_url: uploadData.url,
          caption_fr: captionFr.trim() || "Ambiance restaurant",
          caption_ar: captionAr.trim() || "أجواء المطعم",
          display_order: images.length,
          is_featured: 1,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Erreur d'ajout");

      setImages((prev) => [
        ...prev,
        {
          id: data.id,
          image_url: uploadData.url,
          caption_fr: captionFr.trim() || "Ambiance restaurant",
          caption_ar: captionAr.trim() || "أجواء المطعم",
          caption_en: "Atmosphere",
          display_order: images.length,
          is_featured: 1,
          created_at: new Date().toISOString(),
        },
      ]);

      setCaptionFr("");
      setCaptionAr("");
      toast.success("Photo ajoutée à la galerie !");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Erreur";
      toast.error(msg);
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (id: string) => {
    setDeletingId(id);
    try {
      const res = await adminFetch(`/api/admin/gallery?id=${encodeURIComponent(id)}`, { method: "DELETE" });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Erreur de suppression");
      }

      setImages((prev) => prev.filter((img) => img.id !== id));
      toast.success("Photo supprimée de la galerie");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Échec de suppression";
      toast.error(msg);
    } finally {
      setDeletingId(null);
    }
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
            <span className="inline-flex items-center gap-2 badge badge-success px-2.5 py-1 text-[10px] font-bold shadow-success-sm">
              <ImageIcon className="h-3 w-3" aria-hidden="true" />
              <span>Galerie Photos</span>
            </span>
            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-primary flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-brand-primary-bg border border-brand-primary-border text-brand-primary shadow-gold-md">
                <ImageIcon className="h-5.5 w-5.5" aria-hidden="true" />
              </div>
              <span>Galerie Photos du Restaurant</span>
            </h2>
            <p className="text-sm text-quaternary leading-relaxed">
              Gérez les photos d'ambiance, d'architecture et de tables affichées sur le site web de Dar Zitoun.
            </p>
          </div>

          <Button
            type="button"
            variant="primary"
            size="md"
            leadingIcon={<Plus className="h-4 w-4" />}
            trailingIcon={<ArrowRight className="h-4 w-4" />}
          >
            Ajouter une photo
          </Button>
        </div>
      </section>

      {/* Upload Card */}
      <div className="card p-6 space-y-4 rounded-3xl">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-brand-primary flex items-center gap-2">
            <Upload className="h-3.5 w-3.5" aria-hidden="true" />
            <span>Ajouter une nouvelle photo</span>
          </h3>
          <span className="text-xs text-tertiary">
            {images.length} photo(s) dans la galerie
          </span>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <label htmlFor="caption-fr" className="mb-1 block text-xs font-semibold uppercase tracking-wider text-tertiary">
            Légende (Français)
          </label>
          <input
            id="caption-fr"
            type="text"
            value={captionFr}
            onChange={(e) => setCaptionFr(e.target.value)}
            placeholder="Légende en français (ex: Table en terrasse)"
            className="input focus:border-brand-primary focus:ring-2 focus:ring-brand-primary-bg"
          />
          <label htmlFor="caption-ar" className="mb-1 block text-xs font-semibold uppercase tracking-wider text-tertiary font-arabic">
            العنوان بالعربية
          </label>
          <input
            id="caption-ar"
            type="text"
            dir="rtl"
            value={captionAr}
            onChange={(e) => setCaptionAr(e.target.value)}
            placeholder="التعليق بالعربية (مثال: جلسة تقليدية دافئة)"
            className="input font-arabic focus:border-brand-primary focus:ring-2 focus:ring-brand-primary-bg"
          />
        </div>

        <div>
          <label htmlFor="gallery-image-upload" className="cursor-pointer btn-primary w-full sm:w-auto gap-2 justify-center shadow-gold-md">
            <Upload className="h-4 w-4" aria-hidden="true" />
            <span>{uploading ? "Envoi de la photo…" : "Sélectionner et ajouter une photo"}</span>
            <input
              id="gallery-image-upload"
              type="file"
              accept="image/*"
              onChange={handleUpload}
              disabled={uploading}
              className="hidden"
            />
            {uploading && <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />}
          </label>
        </div>
      </div>

      {/* Gallery Grid */}
      <div className="grid gap-4 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
        {images.map((img) => (
          <div
            key={img.id}
            className="group relative overflow-hidden rounded-3xl card border-border-default shadow-md transition-all duration-300"
          >
            <div className="relative aspect-[4/3] w-full bg-border-subtle overflow-hidden">
              <Image
                src={img.image_url}
                alt={img.caption_fr || "Photo galerie"}
                fill
                sizes="250px"
                className="object-cover transition-transform duration-700 group-hover:scale-110 group-hover:grayscale-20"
                priority={img.is_featured === 1}
                loading={img.is_featured === 1 ? "eager" : "lazy"}
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-black/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
              <button
                type="button"
                onClick={() => handleDelete(img.id)}
                disabled={deletingId === img.id}
                className="absolute top-3 end-3 rounded-xl p-1.5 text-status-error hover:bg-status-error hover:text-on-error transition-all opacity-0 group-hover:opacity-100 focus:opacity-100 focus:outline-none focus:ring-2 focus:ring-gold shadow-lg"
                style={{ background: "rgba(0, 0, 0, 0.6)" }}
                title="Supprimer la photo"
                aria-label={`Supprimer la photo ${img.caption_fr}`}
              >
                {deletingId === img.id ? (
                  <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                ) : (
                  <Trash2 className="h-4 w-4" aria-hidden="true" />
                )}
              </button>
              {img.is_featured === 1 && (
                <span className="absolute top-3 start-3 badge badge-gold px-2 py-0.5 text-[10px] font-bold shadow-gold-sm">
                  En vedette
                </span>
              )}
            </div>
            {img.caption_fr && (
              <div className="p-4">
                <p className="truncate text-xs font-medium text-primary">{img.caption_fr}</p>
                <span className="text-[10px] text-tertiary block mt-1">
                  {img.caption_ar || ""}
                </span>
              </div>
            )}
          </div>
        ))}
        {images.length === 0 && (
          <div className="col-span-full card border-dashed border-border-default p-16 text-center rounded-3xl">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-border-subtle/50 border border-border-subtle/50 text-tertiary mx-auto mb-4 shadow-sm">
              <ImageIcon className="h-8 w-8" aria-hidden="true" />
            </div>
            <p className="text-sm text-tertiary">Aucune photo dans la galerie</p>
            <p className="text-xs text-tertiary mt-1">Ajoutez votre première photo ci-dessus</p>
          </div>
        )}
      </div>
    </div>
  );
}