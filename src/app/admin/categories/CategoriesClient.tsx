"use client";

import { useState, useEffect } from "react";
import {
  FolderTree,
  Plus,
  Edit,
  Trash2,
  X,
  Save,
  GripVertical,
  AlertTriangle,
  Sparkles,
  ArrowRight,
  RefreshCw,
  Download,
  Printer,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/Button";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { adminFetch } from "@/lib/apiClient";
import type { Category } from "@/lib/db/queries";
import { StatusPill } from "@/components/admin/ui/StatusPill";

type Props = {
  initialCategories: Category[];
};

function SortableCategoryRow({
  cat,
  onEdit,
  onDeleteRequest,
  index,
  reduceMotion,
}: {
  cat: Category;
  onEdit: (cat: Category) => void;
  onDeleteRequest: (cat: Category) => void;
  index: number;
  reduceMotion: boolean;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: cat.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition: reduceMotion ? "none" : transition,
    opacity: isDragging ? 0.4 : 1,
  };

  return (
    <tr
      ref={setNodeRef}
      style={style}
      className={`transition-all duration-300 hover:bg-[var(--color-brand-primary-tint)] group ${reduceMotion ? "transition-none" : ""}`}
    >
      <td className="py-3 px-2 text-center w-8">
        <button
          type="button"
          {...attributes}
          {...listeners}
          className="cursor-grab p-1 text-[var(--text-quaternary)] hover:text-[var(--color-brand-primary)] active:cursor-grabbing focus:outline-none focus:ring-2 focus:ring-[var(--color-brand-primary-bg)] focus:ring-offset-2 rounded-xl transition-all duration-200 group-hover:scale-110 group-hover:bg-[var(--color-brand-primary-tint)]"
          title="Glisser pour réorganiser"
          aria-label={`Réorganiser la catégorie ${cat.name_fr}`}
        >
          <GripVertical className="h-4 w-4" aria-hidden="true" />
        </button>
      </td>
      <td className="py-3 px-4 font-mono text-[var(--text-quaternary)]">
        {cat.display_order}
      </td>
      <td className="py-3 px-4 font-semibold text-[var(--text-primary)]">
        {cat.name_fr}
      </td>
      <td className="py-3 px-4 text-[var(--text-secondary)] font-arabic" dir="rtl">
        {cat.name_ar}
      </td>
      <td className="py-3 px-4 text-[var(--text-quaternary)]">
        {cat.name_en}
      </td>
      <td className="py-3 px-4 text-center">
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-[var(--color-brand-primary-bg)]/50 border border-[var(--color-brand-primary-border)]/50 text-[var(--color-brand-primary)]">
          <span className="h-1.5 w-1.5 rounded-full" style={{ background: "var(--color-brand-primary)" }} aria-hidden="true" />
          {cat.items_count ?? 0} plats
        </span>
      </td>
      <td className="py-3 px-4 text-center">
        <span
          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium transition-all duration-200 ${
            cat.is_active === 1
              ? "badge-success hover:bg-[var(--status-success)]/10 hover:border-[var(--status-success)]/30"
              : "badge-neutral hover:bg-[var(--bg-surface-hover)] hover:border-[var(--border-strong)]"
          }`}
        >
          <span className="h-1.5 w-1.5 rounded-full" style={{ background: cat.is_active === 1 ? "var(--status-success)" : "var(--text-quaternary)" }} aria-hidden="true" />
          {cat.is_active === 1 ? "Active" : "Masquée"}
        </span>
      </td>
      <td className="py-3 px-4 text-end">
        <div className="flex items-center justify-end gap-1.5">
          <Button
            type="button"
            variant="outline"
            size="icon-sm"
            onClick={() => onEdit(cat)}
            title="Modifier"
            aria-label={`Modifier la catégorie ${cat.name_fr}`}
          >
            <Edit className="h-3.5 w-3.5" aria-hidden="true" />
          </Button>
          <Button
            type="button"
            variant="destructive"
            size="icon-sm"
            onClick={() => onDeleteRequest(cat)}
            title="Mettre en corbeille"
            aria-label={`Mettre la catégorie ${cat.name_fr} en corbeille`}
          >
            <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
          </Button>
        </div>
      </td>
    </tr>
  );
}

export function CategoriesClient({ initialCategories }: Props) {
  const [categories, setCategories] = useState<Category[]>(initialCategories);
  const [editingCat, setEditingCat] = useState<Category | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [deleteConfirmCat, setDeleteConfirmCat] = useState<Category | null>(null);
  const [reduceMotion, setReduceMotion] = useState(false);

  // Form fields
  const [nameFr, setNameFr] = useState("");
  const [nameAr, setNameAr] = useState("");
  const [nameEn, setNameEn] = useState("");
  const [displayOrder, setDisplayOrder] = useState<number>(0);
  const [isActive, setIsActive] = useState(true);
  const [loading, setLoading] = useState(false);

  // Respect prefers-reduced-motion
  useEffect(() => {
    const mediaQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    const handleChange = (e: MediaQueryListEvent) => setReduceMotion(e.matches);
    setReduceMotion(mediaQuery.matches);
    mediaQuery.addEventListener("change", handleChange);
    return () => mediaQuery.removeEventListener("change", handleChange);
  }, []);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const openCreateModal = () => {
    setEditingCat(null);
    setNameFr("");
    setNameAr("");
    setNameEn("");
    setDisplayOrder(categories.length);
    setIsActive(true);
    setIsCreating(true);
  };

  const openEditModal = (cat: Category) => {
    setIsCreating(false);
    setEditingCat(cat);
    setNameFr(cat.name_fr);
    setNameAr(cat.name_ar);
    setNameEn(cat.name_en);
    setDisplayOrder(cat.display_order);
    setIsActive(cat.is_active === 1);
  };

  const closeModal = () => {
    setEditingCat(null);
    setIsCreating(false);
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = categories.findIndex((c) => c.id === active.id);
    const newIndex = categories.findIndex((c) => c.id === over.id);
    if (oldIndex === -1 || newIndex === -1) return;

    const reordered = arrayMove(categories, oldIndex, newIndex).map((cat, idx) => ({
      ...cat,
      display_order: idx,
    }));
    setCategories(reordered);

    try {
      const res = await adminFetch("/api/admin/categories/reorder", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids: reordered.map((c) => c.id) }),
      });
      if (!res.ok) throw new Error();
      toast.success("Ordre des catégories mis à jour");
    } catch {
      toast.error("Erreur de sauvegarde");
      setCategories(initialCategories);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nameFr.trim()) return;

    setLoading(true);
    const payload = {
      name_fr: nameFr.trim(),
      name_ar: (nameAr || nameFr).trim(),
      name_en: (nameEn || nameFr).trim(),
      display_order: displayOrder,
      is_active: isActive ? 1 : 0,
    };

    try {
      if (isCreating) {
        const id = "cat_" + Date.now();
        const res = await adminFetch("/api/admin/categories", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ...payload, id }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Erreur de création");

        setCategories([
          ...categories,
          {
            ...payload,
            id,
            slug: id,
            description_fr: null,
            description_ar: null,
            description_en: null,
            image: null,
            items_count: 0,
            created_at: "",
            updated_at: "",
          },
        ]);
        toast.success("Catégorie créée avec succès !");
      } else if (editingCat) {
        const res = await adminFetch(`/api/admin/categories/${editingCat.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        if (!res.ok) throw new Error("Erreur de modification");

        setCategories(
          categories.map((c) =>
            c.id === editingCat.id ? { ...c, ...payload } : c
          )
        );
        toast.success("Catégorie mise à jour !");
      }
      closeModal();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erreur");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteConfirmCat) return;
    const { id, name_fr } = deleteConfirmCat;
    setDeleteConfirmCat(null);

    try {
      const res = await adminFetch(`/api/admin/categories/${id}`, { method: "DELETE" });
      const data = await res.json();

      if (!res.ok) throw new Error(data.error || "Échec de suppression");

      setCategories(categories.filter((c) => c.id !== id));
      toast.success(`Catégorie « ${name_fr} » mise à la corbeille`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erreur");
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const handleExportCsv = () => {
    const headers = [
      "Ordre",
      "Nom Français",
      "Nom Arabe",
      "Nom Anglais",
      "Plats Associés",
      "Statut",
    ];
    const rows = categories.map((c) => [
      c.display_order,
      `"${c.name_fr.replace(/"/g, '""')}"`,
      `"${c.name_ar.replace(/"/g, '""')}"`,
      `"${c.name_en.replace(/"/g, '""')}"`,
      c.items_count ?? 0,
      c.is_active === 1 ? "Active" : "Masquée",
    ]);

    const csvContent = "data:text/csv;charset=utf-8,﻿" + [headers.join(","), ...rows.map((e) => e.join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `categories-${new Date().toISOString().split("T")[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6 lg:space-y-8 animate-fadeIn">
      {/* PRINT-ONLY STYLES */}
      <style dangerouslySetInnerHTML={{ __html: `
        @media print {
          body { background: white !important; color: black !important; }
          header, nav, aside, .no-print, button, input, select { display: none !important; }
          .print-table { width: 100% !important; border-collapse: collapse !important; font-size: 10pt !important; }
          .print-table th, .print-table td { border: 1px solid #333 !important; padding: 6px 8px !important; }
          .print-table th { background: #eee !important; font-weight: bold !important; }
        }
        @media screen {
          .print-only { display: none; }
        }
      `}} />

      {/* PRINT-ONLY TABLE */}
      <div className="print-only">
        <h1 className="text-xl font-bold text-text-primary mb-2">Dar Zitoun — Catégories du Menu</h1>
        <p className="text-sm text-text-secondary mb-4">Total: {categories.length} catégories</p>
        <table className="print-table">
          <thead>
            <tr>
              <th>Ordre</th>
              <th>Français</th>
              <th>Arabe</th>
              <th>Anglais</th>
              <th>Plats</th>
              <th>Statut</th>
            </tr>
          </thead>
          <tbody>
            {categories.map((c) => (
              <tr key={c.id}>
                <td className="text-center font-mono">{c.display_order}</td>
                <td className="font-bold">{c.name_fr}</td>
                <td className="font-arabic" dir="rtl">{c.name_ar}</td>
                <td>{c.name_en}</td>
                <td className="text-center">{c.items_count ?? 0}</td>
                <td className="text-center">{c.is_active === 1 ? "Active" : "Masquée"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* SCREEN DASHBOARD */}
      <div className="no-print space-y-6">

        {/* ── PREMIUM HEADER ── */}
        <section className="relative overflow-hidden rounded-3xl p-6 sm:p-8 lg:p-10" style={{
          background: "linear-gradient(180deg, var(--bg-card) 0%, var(--bg-surface-elevated) 100%)",
          border: "1px solid var(--border-default)",
          boxShadow: "var(--shadow-card)",
        }}>
          <div className="absolute inset-0 -z-10 opacity-0 group-hover:opacity-100 transition-opacity duration-700" aria-hidden="true">
            <div className="absolute -top-1/4 -right-1/4 h-[300px] w-[300px] rounded-full bg-[var(--color-brand-primary)]/10 blur-3xl" style={{ animation: "pulse-slow 4s ease-in-out infinite" }} />
            <div className="absolute -bottom-1/4 -left-1/4 h-[200px] w-[200px] rounded-full bg-[var(--status-success)]/10 blur-3xl" style={{ animation: "pulse-slow 4s ease-in-out infinite", animationDelay: "1s" }} />
          </div>

          <div className="relative z-10 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
            <div className="space-y-2">
              <div className="inline-flex items-center gap-2 badge badge-success px-2.5 py-1 text-[10px] font-bold shadow-[var(--shadow-success-sm)]">
                <Sparkles className="h-3 w-3" aria-hidden="true" />
                <span>Structure du Menu</span>
              </div>
              <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-[var(--text-primary)] flex items-center gap-3" style={{
                fontFamily: '"Cormorant Garamond", "Playfair Display", Georgia, serif',
                letterSpacing: "0.01em",
              }}>
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[var(--color-brand-primary-tint)] border border-[var(--color-brand-primary-border)] text-[var(--color-brand-primary)] shadow-[var(--shadow-gold-md)]">
                  <FolderTree className="h-5.5 w-5.5" aria-hidden="true" />
                </div>
                <span>Catégories du Menu</span>
              </h2>
              <p className="text-sm text-[var(--text-quaternary)] leading-relaxed">
                Structure et organisation des rayons du menu digital • Glissez pour ordonner
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                onClick={() => {
                  setCategories(initialCategories);
                  toast.success("Données actualisées");
                }}
                title="Actualiser"
                aria-label="Actualiser les données"
              >
                <RefreshCw className="h-4 w-4" aria-hidden="true" />
              </Button>

              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handlePrint}
                leadingIcon={<Printer className="h-3.5 w-3.5" />}
              >
                Imprimer
              </Button>

              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleExportCsv}
                leadingIcon={<Download className="h-3.5 w-3.5" />}
              >
                Export CSV
              </Button>

              <Button
                type="button"
                variant="primary"
                size="md"
                onClick={openCreateModal}
                leadingIcon={<Plus className="h-4 w-4" />}
                trailingIcon={<ArrowRight className="h-4 w-4" />}
              >
                Nouvelle Catégorie
              </Button>
            </div>
          </div>
        </section>

        {/* ── KPI CARDS ── */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="card p-3.5 rounded-2xl shadow-sm border-l-4 border-[var(--color-brand-primary)]" style={{
            background: "var(--bg-surface-elevated)",
            border: "1px solid var(--border-default)",
            borderLeft: "4px solid var(--color-brand-primary)",
            borderRadius: "var(--radius-2xl)",
            boxShadow: "var(--shadow-card)",
          }}>
            <span className="text-xs font-semibold uppercase tracking-wider text-[var(--text-tertiary)] block">Total Catégories</span>
            <p className="text-xl font-bold text-[var(--text-primary)] mt-1">{categories.length}</p>
          </div>

          <div className="card p-3.5 rounded-2xl shadow-sm border-l-4 border-[var(--status-success)]" style={{
            background: "var(--bg-surface-elevated)",
            border: "1px solid var(--border-default)",
            borderLeft: "4px solid var(--status-success)",
            borderRadius: "var(--radius-2xl)",
            boxShadow: "var(--shadow-card)",
          }}>
            <span className="text-xs font-semibold uppercase tracking-wider text-[var(--status-success)] block">Actives</span>
            <p className="text-xl font-bold text-[var(--status-success)] mt-1">{categories.filter((c) => c.is_active === 1).length}</p>
          </div>

          <div className="card p-3.5 rounded-2xl shadow-sm border-l-4 border-[var(--color-brand-gold)]" style={{
            background: "var(--bg-surface-elevated)",
            border: "1px solid var(--border-default)",
            borderLeft: "4px solid var(--color-brand-gold)",
            borderRadius: "var(--radius-2xl)",
            boxShadow: "var(--shadow-card)",
          }}>
            <span className="text-xs font-semibold uppercase tracking-wider text-[var(--color-brand-gold)] block">Plats Total</span>
            <p className="text-xl font-bold text-[var(--color-brand-gold)] mt-1">{categories.reduce((sum, c) => sum + (c.items_count ?? 0), 0)}</p>
          </div>

          <div className="card p-3.5 rounded-2xl shadow-sm border-l-4 border-[var(--status-warning)]" style={{
            background: "var(--bg-surface-elevated)",
            border: "1px solid var(--border-default)",
            borderLeft: "4px solid var(--status-warning)",
            borderRadius: "var(--radius-2xl)",
            boxShadow: "var(--shadow-card)",
          }}>
            <span className="text-xs font-semibold uppercase tracking-wider text-[var(--status-warning)] block">Masquées</span>
            <p className="text-xl font-bold text-[var(--status-warning)] mt-1">{categories.filter((c) => c.is_active !== 1).length}</p>
          </div>
        </div>

        {/* ── CATEGORIES TABLE WITH DRAG & DROP ── */}
        <section className="card overflow-hidden relative" style={{
          background: "var(--bg-surface-elevated)",
          border: "1px solid var(--border-default)",
          borderRadius: "var(--radius-2xl)",
          boxShadow: "var(--shadow-card)",
        }}>
          <div className="overflow-x-auto">
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragEnd={handleDragEnd}
            >
              <table className="w-full text-start" role="table" aria-label="Liste des catégories">
                <thead className="bg-[var(--border-subtle)] border-b border-[var(--border-subtle)]">
                  <tr>
                    <th className="py-3.5 px-2 text-center w-8" scope="col">
                      <span className="text-xs font-semibold uppercase tracking-widest text-[var(--text-tertiary)]">Ordre</span>
                    </th>
                    <th className="py-3.5 px-4 text-start" scope="col">
                      <span className="text-xs font-semibold uppercase tracking-widest text-[var(--text-tertiary)]">N°</span>
                    </th>
                    <th className="py-3.5 px-4 text-start" scope="col">
                      <span className="text-xs font-semibold uppercase tracking-widest text-[var(--text-tertiary)]">Nom Français</span>
                    </th>
                    <th className="py-3.5 px-4 text-start" scope="col">
                      <span className="text-xs font-semibold uppercase tracking-widest text-[var(--text-tertiary)] font-arabic" dir="rtl">الاسم بالعربية</span>
                    </th>
                    <th className="py-3.5 px-4 text-start" scope="col">
                      <span className="text-xs font-semibold uppercase tracking-widest text-[var(--text-tertiary)]">English</span>
                    </th>
                    <th className="py-3.5 px-4 text-center" scope="col">
                      <span className="text-xs font-semibold uppercase tracking-widest text-[var(--text-tertiary)]">Plats Associés</span>
                    </th>
                    <th className="py-3.5 px-4 text-center" scope="col">
                      <span className="text-xs font-semibold uppercase tracking-widest text-[var(--text-tertiary)]">Statut</span>
                    </th>
                    <th className="py-3.5 px-4 text-end" scope="col">
                      <span className="text-xs font-semibold uppercase tracking-widest text-[var(--text-tertiary)]">Actions</span>
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--border-subtle)]">
                  <SortableContext
                    items={categories.map((c) => c.id)}
                    strategy={verticalListSortingStrategy}
                  >
                    {categories.map((cat, index) => (
                      <SortableCategoryRow
                        key={cat.id}
                        cat={cat}
                        onEdit={openEditModal}
                        onDeleteRequest={(c) => setDeleteConfirmCat(c)}
                        index={index}
                        reduceMotion={reduceMotion}
                      />
                    ))}
                  </SortableContext>
                </tbody>
              </table>
            </DndContext>
          </div>
        </section>

        {/* ── DELETE CONFIRMATION MODAL ── */}
        {deleteConfirmCat && (
          <div
            className="fixed inset-0 z-50 bg-[var(--bg-modal-backdrop)] backdrop-blur-sm"
            onClick={() => setDeleteConfirmCat(null)}
            aria-hidden="true"
          />
        )}

        {deleteConfirmCat && (
          <div
            className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-50 w-[420px] max-w-[90vw] animate-slideUp"
            role="dialog"
            aria-modal="true"
            aria-labelledby="delete-modal-title"
          >
            <div className="relative overflow-hidden" style={{
              background: "linear-gradient(180deg, var(--bg-modal) 0%, var(--bg-surface-elevated) 100%)",
              backdropFilter: "blur(20px)",
              border: "1px solid var(--border-default)",
              borderRadius: "var(--radius-3xl)",
              boxShadow: "var(--shadow-2xl), var(--shadow-gold-lg), inset 0 1px 0 rgba(255,255,255,0.03)",
            }}>
              <div className="p-6">
                <div className="text-center">
                  <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl" style={{ background: "var(--status-error-bg)", border: "1px solid var(--status-error-border)" }}>
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl" style={{ background: "var(--status-error)", boxShadow: "var(--shadow-error-sm)" }}>
                      <AlertTriangle className="h-6 w-6 text-white" aria-hidden="true" />
                    </div>
                  </div>
                  <h3 id="delete-modal-title" className="text-xl font-semibold text-[var(--text-primary)] mb-2">
                    Mettre la catégorie à la corbeille ?
                  </h3>
                  <p className="mb-6 text-sm text-[var(--text-quaternary)]">
                    La catégorie{" "}
                    <span className="font-semibold text-[var(--text-primary)]">« {deleteConfirmCat.name_fr} »</span>
                    sera retirée de l&apos;affichage.
                    {(deleteConfirmCat.items_count ?? 0) > 0 && (
                      <span className="block mt-2 text-sm font-medium text-[var(--status-error)]">
                        Attention : cette catégorie contient {deleteConfirmCat.items_count} plats. Veuillez d&apos;abord déplacer ou supprimer ces plats.
                      </span>
                    )}
                  </p>
                  <div className="flex gap-3 justify-center pt-1">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setDeleteConfirmCat(null)}
                    >
                      Annuler
                    </Button>
                    <Button
                      type="button"
                      variant="destructive"
                      size="sm"
                      onClick={handleDelete}
                    >
                      Mettre en corbeille
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ── CREATE / EDIT MODAL ── */}
        {(isCreating || editingCat) && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[var(--bg-modal-backdrop)] backdrop-blur-sm"
            role="dialog"
            aria-modal="true"
            aria-labelledby="category-modal-title"
          >
            <div className="modal modal-lg" style={{
              background: "linear-gradient(180deg, var(--bg-modal) 0%, var(--bg-surface-elevated) 100%)",
              backdropFilter: "blur(20px)",
              border: "1px solid var(--border-default)",
              borderRadius: "var(--radius-3xl)",
              boxShadow: "var(--shadow-2xl), var(--shadow-gold-lg), inset 0 1px 0 rgba(255,255,255,0.03)",
            }}>
              <div className="flex items-center justify-between pb-4 border-b border-[var(--border-default)]">
                <h3 id="category-modal-title" className="text-base font-semibold text-[var(--text-primary)]">
                  {isCreating ? "Créer une catégorie" : `Modifier « ${editingCat?.name_fr} »`}
                </h3>
                <button
                  type="button"
                  onClick={closeModal}
                  className="btn-ghost btn-sm p-1.5 rounded-xl hover:bg-[var(--bg-surface)]"
                  aria-label="Fermer la fenêtre"
                >
                  <X className="h-5 w-5" aria-hidden="true" />
                </button>
              </div>

              <form onSubmit={handleSave} className="space-y-5">
                <div>
                  <label htmlFor="cat-name-fr" className="mb-1.5 block text-xs font-semibold uppercase tracking-widest text-[var(--text-quaternary)]">
                    Nom (Français) <span className="text-[var(--color-brand-primary)]" aria-hidden="true">*</span>
                  </label>
                  <input
                    id="cat-name-fr"
                    type="text"
                    required
                    value={nameFr}
                    onChange={(e) => setNameFr(e.target.value)}
                    placeholder="Ex: Entrées & Salades"
                    className="input focus:border-[var(--color-brand-primary)] focus:ring-2 focus:ring-[var(--color-brand-primary-bg)]"
                    aria-required="true"
                  />
                </div>

                <div>
                  <label htmlFor="cat-name-ar" className="mb-1.5 block text-xs font-semibold uppercase tracking-widest text-[var(--text-quaternary)] font-arabic">
                    الاسم بالعربية
                  </label>
                  <input
                    id="cat-name-ar"
                    type="text"
                    dir="rtl"
                    value={nameAr}
                    onChange={(e) => setNameAr(e.target.value)}
                    placeholder="مثال: المقبلات والسلطات"
                    className="input font-arabic focus:border-[var(--color-brand-primary)] focus:ring-2 focus:ring-[var(--color-brand-primary-bg)]"
                  />
                </div>

                <div>
                  <label htmlFor="cat-name-en" className="mb-1.5 block text-xs font-semibold uppercase tracking-widest text-[var(--text-quaternary)]">
                    Name (English)
                  </label>
                  <input
                    id="cat-name-en"
                    type="text"
                    value={nameEn}
                    onChange={(e) => setNameEn(e.target.value)}
                    placeholder="Ex: Starters & Salads"
                    className="input focus:border-[var(--color-brand-primary)] focus:ring-2 focus:ring-[var(--color-brand-primary-bg)]"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="cat-order" className="mb-1.5 block text-xs font-semibold uppercase tracking-widest text-[var(--text-quaternary)]">
                      Ordre d&apos;affichage
                    </label>
                    <input
                      id="cat-order"
                      type="number"
                      value={displayOrder}
                      onChange={(e) => setDisplayOrder(parseInt(e.target.value) || 0)}
                      className="input focus:border-[var(--color-brand-primary)] focus:ring-2 focus:ring-[var(--color-brand-primary-bg)]"
                    />
                  </div>
                  <div className="flex items-center gap-2 pt-6">
                    <input
                      type="checkbox"
                      id="catActive"
                      checked={isActive}
                      onChange={(e) => setIsActive(e.target.checked)}
                      className="h-4 w-4 rounded border-[var(--border-default)] accent-[var(--color-brand-primary)] focus:ring-2 focus:ring-[var(--color-brand-primary-bg)]"
                    />
                    <label htmlFor="catActive" className="text-sm text-[var(--text-primary)] cursor-pointer">
                      Catégorie active
                    </label>
                  </div>
                </div>

                <div className="flex justify-end gap-3 pt-4 border-t border-[var(--border-subtle)]">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={closeModal}
                  >
                    Annuler
                  </Button>
                  <Button
                    type="submit"
                    variant="primary"
                    size="sm"
                    loading={loading}
                    disabled={loading}
                    leadingIcon={<Save className="h-4 w-4" />}
                  >
                    Enregistrer
                  </Button>
                </div>
              </form>
            </div>
          </div>
        )}

        <style jsx global>{`
          @keyframes pulse-slow {
            0%, 100% { opacity: 0.4; transform: scale(1); }
            50% { opacity: 0.8; transform: scale(1.05); }
          }
          @keyframes fadeIn {
            from { opacity: 0; transform: translateY(8px); }
            to { opacity: 1; transform: translateY(0); }
          }
          @keyframes slideUp {
            from { opacity: 0; transform: translate(-50%, -48%); }
            to { opacity: 1; transform: translate(-50%, -50%); }
          }
          .animate-pulse-slow { animation: pulse-slow 4s ease-in-out infinite; }
          .animate-fadeIn { animation: fadeIn 300ms ease-out; }
          .animate-slideUp { animation: slideUp 250ms var(--ease-standard); }
          @media (prefers-reduced-motion: reduce) {
            .animate-pulse-slow,
            .animate-fadeIn,
            .animate-slideUp {
              animation: none !important;
            }
          }
        `}</style>
      </div>
    </div>
  );
}