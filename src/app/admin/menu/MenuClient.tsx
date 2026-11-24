"use client";

import { useState, useCallback, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  PlusCircle,
  Search,
  Edit,
  Trash2,
  CheckCircle2,
  XCircle,
  Star,
  UtensilsCrossed,
  GripVertical,
  CheckSquare,
  Square,
  AlertTriangle,
  ChevronDown,
  MoreHorizontal,
  X,
  AlertCircle,
  Sparkles,
  ArrowRight,
  ExternalLink,
  LayoutGrid,
  List,
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
import type { MenuItem, Category } from "@/lib/db/queries";
import { formatPrice } from "@/lib/format";

type Props = {
  initialItems: MenuItem[];
  categories: Category[];
};

function SortableRow({
  item,
  selected,
  onToggleSelect,
  onToggleAvailability,
  onDeleteRequest,
  onEdit,
  canDrag,
}: {
  item: MenuItem;
  selected: boolean;
  onToggleSelect: (id: string) => void;
  onToggleAvailability: (id: string, current: number) => void;
  onDeleteRequest: (item: MenuItem) => void;
  onEdit: (item: MenuItem) => void;
  canDrag: boolean;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: item.id, disabled: !canDrag });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
    background: isDragging ? "var(--color-brand-primary-tint)" : undefined,
  };

  return (
    <tr
      ref={setNodeRef}
      style={style}
      className={`transition-all duration-300 hover:bg-[var(--color-brand-primary-tint)] ${selected ? "bg-[var(--color-brand-primary-tint)]" : ""} group`}
    >
      {/* Drag handle */}
      <td className="py-3 px-2 text-center w-10">
        {canDrag ? (
          <button
            type="button"
            {...attributes}
            {...listeners}
            className="cursor-grab p-1.5 text-[var(--text-quaternary)] hover:text-[var(--color-brand-primary)] active:cursor-grabbing rounded-xl transition-all duration-200 group-hover:scale-110 group-hover:bg-[var(--color-brand-primary-tint)]"
            title="Glisser pour réorganiser"
            aria-label="Glisser pour réorganiser"
          >
            <GripVertical className="h-4 w-4" aria-hidden="true" />
          </button>
        ) : (
          <span className="text-[var(--text-quaternary)]/30 text-[10px]" aria-hidden="true">—</span>
        )}
      </td>

      {/* Checkbox */}
      <td className="py-3 px-3 text-center w-10">
        <button
          type="button"
          onClick={() => onToggleSelect(item.id)}
          className="text-[var(--text-quaternary)] hover:text-[var(--color-brand-primary)] transition-all duration-200 rounded-xl p-1 group-hover:bg-[var(--color-brand-primary-tint)]"
          aria-label={selected ? "Désélectionner" : "Sélectionner"}
          aria-pressed={selected}
        >
          {selected ? (
            <CheckSquare className="h-4 w-4 text-[var(--color-brand-primary)]" aria-hidden="true" />
          ) : (
            <Square className="h-4 w-4 text-[var(--text-quaternary)]" aria-hidden="true" />
          )}
        </button>
      </td>

      {/* Dish Preview */}
      <td className="py-3 px-4">
        <div className="flex items-center gap-3">
          <div
            className="relative h-12 w-12 shrink-0 overflow-hidden rounded-xl border border-[var(--border-default)] bg-[var(--bg-surface)] shadow-sm group"
          >
            <Image
              src={item.image || "/images/menu/dish-couscous.jpg"}
              alt={item.name_fr}
              fill
              sizes="48px"
              className="object-cover transition-transform duration-500 group-hover:scale-105"
            />
            {item.is_featured === 1 && (
              <div className="absolute bottom-0 right-0 flex h-4 w-4 items-center justify-center rounded-bl-xl bg-[var(--color-brand-primary)] text-[var(--color-text-on-gold)] shadow-[var(--shadow-gold-md)]">
                <Star className="h-2 w-2 fill-current" aria-hidden="true" />
              </div>
            )}
          </div>
          <div className="min-w-0">
            <p className="font-semibold text-[var(--text-primary)] truncate">{item.name_fr}</p>
            <p className="font-arabic text-xs text-[var(--text-quaternary)] truncate" dir="rtl">
              {item.name_ar}
            </p>
            {item.promo_price && item.promo_price < item.price && (
              <span className="text-xs font-bold text-[var(--status-error)]">
                −{Math.round(((item.price - item.promo_price) / item.price) * 100)}%
              </span>
            )}
          </div>
        </div>
      </td>

      {/* Category */}
      <td className="py-3 px-4 text-[var(--text-secondary)]">
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-[var(--color-brand-primary-tint)] border border-[var(--color-brand-primary-border)] text-[var(--color-brand-primary)]">
          <span className="h-1.5 w-1.5 rounded-full bg-[var(--color-brand-primary)]" aria-hidden="true" />
          {item.category_name_fr || item.category_id}
        </span>
      </td>

      {/* Price */}
      <td className="py-3 px-4 font-medium">
        {item.promo_price && item.promo_price < item.price ? (
          <div className="space-y-0.5">
            <span className="font-bold text-[var(--color-brand-primary)]">
              {formatPrice(item.promo_price, "fr")}
            </span>
            <span className="block text-[10px] text-[var(--text-quaternary)] line-through">
              {formatPrice(item.price, "fr")}
            </span>
          </div>
        ) : (
          <span className="font-bold text-[var(--text-primary)]">
            {formatPrice(item.price, "fr")}
          </span>
        )}
      </td>

      {/* Availability Toggle Switch — Fast tap */}
      <td className="py-3 px-4 text-center">
        <button
          type="button"
          onClick={() => onToggleAvailability(item.id, item.is_available)}
          className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold transition-all duration-300 shadow-sm ${
            item.is_available === 1
              ? "bg-[var(--status-success-bg)] text-[var(--status-success)] border border-[var(--status-success-border)] hover:bg-[var(--status-success-bg)] hover:border-[var(--status-success)]"
              : "bg-[var(--status-error-bg)] text-[var(--status-error)] border border-[var(--status-error-border)] hover:bg-[var(--status-error-bg)] hover:border-[var(--status-error)]"
          }`}
          title="Basculer disponibilité (effet immédiat)"
          aria-label={item.is_available === 1 ? "Marquer comme épuisé" : "Marquer comme disponible"}
          aria-pressed={item.is_available === 1}
        >
          {item.is_available === 1 ? (
            <>
              <CheckCircle2 className="h-3.5 w-3.5" aria-hidden="true" />
              <span>Disponible</span>
            </>
          ) : (
            <>
              <XCircle className="h-3.5 w-3.5" aria-hidden="true" />
              <span>Épuisé</span>
            </>
          )}
        </button>
      </td>

      {/* Featured status */}
      <td className="py-3 px-4 text-center">
        {item.is_featured === 1 ? (
          <span className="flex items-center justify-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-[var(--color-brand-primary-tint)] border border-[var(--color-brand-primary-border)] text-[var(--color-brand-primary)] group">
            <Star className="h-3 w-3 fill-current" aria-hidden="true" />
            <span>Vedette</span>
          </span>
        ) : (
          <span className="text-xs text-[var(--text-quaternary)]">—</span>
        )}
      </td>

      {/* Actions */}
      <td className="py-3 px-4 text-end">
        <div className="flex items-center justify-end gap-1.5">
          <Link
            href={`/admin/menu/${item.id}/edit`}
            className="flex h-9 w-9 items-center justify-center rounded-xl bg-[var(--color-brand-primary-tint)] border border-[var(--color-brand-primary-border)] text-[var(--color-brand-primary)] transition-all duration-300 group-hover:bg-[var(--color-brand-primary)] group-hover:text-[var(--color-text-on-gold)] group-hover:shadow-[var(--shadow-gold-md)]"
            title="Modifier le plat"
            aria-label={`Modifier ${item.name_fr}`}
          >
            <Edit className="h-3.5 w-3.5" aria-hidden="true" />
          </Link>
          <button
            type="button"
            onClick={() => onDeleteRequest(item)}
            className="flex h-9 w-9 items-center justify-center rounded-xl bg-[var(--status-error-bg)] border border-[var(--status-error-border)] text-[var(--status-error)] transition-all duration-300 group-hover:bg-[var(--status-error)] group-hover:text-white group-hover:shadow-[0_0_12px_rgba(239,78,78,0.4)]"
            title="Mettre à la corbeille"
            aria-label={`Supprimer ${item.name_fr}`}
          >
            <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
          </button>
        </div>
      </td>
    </tr>
  );
}

export function MenuClient({ initialItems, categories }: Props) {
  const [items, setItems] = useState<MenuItem[]>(initialItems);
  const [viewMode, setViewMode] = useState<"grid" | "table">("grid");
  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [availabilityFilter, setAvailabilityFilter] = useState("all");
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [deleteConfirmItem, setDeleteConfirmItem] = useState<MenuItem | null>(null);
  const [bulkActionLoading, setBulkActionLoading] = useState(false);
  const [moveCatOpen, setMoveCatOpen] = useState(false);
  const [targetCategory, setTargetCategory] = useState(categories[0]?.id || "");
  const [reduceMotion, setReduceMotion] = useState(false);

  // Respect prefers-reduced-motion
  useEffect(() => {
    const mediaQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    const handleChange = (e: MediaQueryListEvent) => setReduceMotion(e.matches);
    setReduceMotion(mediaQuery.matches);
    mediaQuery.addEventListener("change", handleChange);
    return () => mediaQuery.removeEventListener("change", handleChange);
  }, []);

  // DnD sensors
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const filteredItems = items.filter((item) => {
    const matchesSearch =
      search === "" ||
      item.name_fr.toLowerCase().includes(search.toLowerCase()) ||
      item.name_ar.includes(search) ||
      item.name_en.toLowerCase().includes(search.toLowerCase());

    const matchesCategory =
      selectedCategory === "all" || item.category_id === selectedCategory;

    const matchesAvailability =
      availabilityFilter === "all" ||
      (availabilityFilter === "available" && item.is_available === 1) ||
      (availabilityFilter === "unavailable" && item.is_available === 0);

    return matchesSearch && matchesCategory && matchesAvailability;
  });

  // Drag reordering is enabled when viewing a single category without search filters
  const canDrag = selectedCategory !== "all" && search === "" && availabilityFilter === "all";

  const handleDragEnd = useCallback(async (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = items.findIndex((it) => it.id === active.id);
    const newIndex = items.findIndex((it) => it.id === over.id);
    if (oldIndex === -1 || newIndex === -1) return;

    const reordered = arrayMove(items, oldIndex, newIndex);
    setItems(reordered);

    try {
      const orderedIds = reordered
        .filter((it) => it.category_id === selectedCategory)
        .map((it) => it.id);

      const res = await adminFetch("/api/admin/menu/reorder", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids: orderedIds }),
      });

      if (!res.ok) throw new Error();
      toast.success("Ordre des plats mis à jour");
    } catch {
      toast.error("Erreur de sauvegarde de l'ordre");
      setItems(initialItems);
    }
  }, [items, selectedCategory, initialItems]);

  const handleToggleAvailability = useCallback(async (id: string, current: number) => {
    const nextVal = current === 1 ? 0 : 1;

    setItems((prev) =>
      prev.map((it) => (it.id === id ? { ...it, is_available: nextVal } : it))
    );

    try {
      const res = await adminFetch(`/api/admin/menu/${id}/availability`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ is_available: nextVal === 1 }),
      });

      if (!res.ok) throw new Error();
      toast.success(
        nextVal === 1 ? "Plat disponible sur le site public" : "Plat marqué épuisé"
      );
    } catch {
      setItems((prev) =>
        prev.map((it) => (it.id === id ? { ...it, is_available: current } : it))
      );
      toast.error("Échec de mise à jour");
    }
  }, []);

  const handleDelete = useCallback(async () => {
    if (!deleteConfirmItem) return;
    const { id, name_fr } = deleteConfirmItem;
    setDeleteConfirmItem(null);

    try {
      const res = await adminFetch(`/api/admin/menu/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error();

      setItems((prev) => prev.filter((it) => it.id !== id));
      setSelectedIds((prev) => prev.filter((sid) => sid !== id));
      toast.success(`« ${name_fr} » déplacé vers la corbeille`);
    } catch {
      toast.error("Erreur lors de la suppression");
    }
  }, [deleteConfirmItem]);

  const toggleSelectAll = useCallback(() => {
    if (selectedIds.length === filteredItems.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(filteredItems.map((it) => it.id));
    }
  }, [selectedIds, filteredItems]);

  const toggleSelectOne = useCallback((id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((sid) => sid !== id) : [...prev, id]
    );
  }, []);

  const handleBulkAction = useCallback(async (action: "available" | "unavailable" | "delete" | "move_category") => {
    if (selectedIds.length === 0) return;
    setBulkActionLoading(true);

    try {
      const res = await adminFetch("/api/admin/menu/bulk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action,
          ids: selectedIds,
          categoryId: action === "move_category" ? targetCategory : undefined,
        }),
      });

      if (!res.ok) throw new Error();

      if (action === "available") {
        setItems((prev) =>
          prev.map((it) => (selectedIds.includes(it.id) ? { ...it, is_available: 1 } : it))
        );
        toast.success(`${selectedIds.length} plats marqués disponibles`);
      } else if (action === "unavailable") {
        setItems((prev) =>
          prev.map((it) => (selectedIds.includes(it.id) ? { ...it, is_available: 0 } : it))
        );
        toast.success(`${selectedIds.length} plats marqués épuisés`);
      } else if (action === "delete") {
        setItems((prev) => prev.filter((it) => !selectedIds.includes(it.id)));
        toast.success(`${selectedIds.length} plats déplacés vers la corbeille`);
      } else if (action === "move_category") {
        const cat = categories.find((c) => c.id === targetCategory);
        setItems((prev) =>
          prev.map((it) =>
            selectedIds.includes(it.id)
              ? { ...it, category_id: targetCategory, category_name_fr: cat?.name_fr }
              : it
          )
        );
        toast.success(`${selectedIds.length} plats déplacés vers ${cat?.name_fr}`);
        setMoveCatOpen(false);
      }

      setSelectedIds([]);
    } catch {
      toast.error("Erreur lors de l'action groupée");
    } finally {
      setBulkActionLoading(false);
    }
  }, [selectedIds, targetCategory, categories]);

  return (
    <div className="space-y-6 lg:space-y-8 animate-fadeIn">
      {/* Page Header — Premium */}
      <section className="relative overflow-hidden rounded-3xl p-6 sm:p-8 lg:p-10" style={{
        background: "linear-gradient(180deg, var(--bg-card) 0%, var(--bg-surface-elevated) 100%)",
        border: "1px solid var(--border-default)",
        boxShadow: "var(--shadow-card)",
      }}>
        {/* Decorative background glow */}
        <div className="absolute inset-0 -z-10 opacity-0 group-hover:opacity-100 transition-opacity duration-700" aria-hidden="true">
          <div className="absolute -top-1/4 -right-1/4 h-[300px] w-[300px] rounded-full bg-[var(--color-brand-primary)]/10 blur-3xl" style={{ animation: "pulse-slow 4s ease-in-out infinite" }} />
          <div className="absolute -bottom-1/4 -left-1/4 h-[200px] w-[200px] rounded-full bg-[var(--status-success)]/10 blur-3xl" style={{ animation: "pulse-slow 4s ease-in-out infinite", animationDelay: "1s" }} />
        </div>

        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div className="space-y-2">
            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-[var(--text-primary)] flex items-center gap-3" style={{
              fontFamily: '"Cormorant Garamond", "Playfair Display", Georgia, serif',
              letterSpacing: "0.01em",
            }}>
              <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[var(--color-brand-primary-tint)] border border-[var(--color-brand-primary-border)] text-[var(--color-brand-primary)] shadow-[var(--shadow-gold-sm)]">
                <UtensilsCrossed className="h-5 w-5" aria-hidden="true" />
              </div>
              <span>Gestion du Menu & des Plats</span>
            </h2>
            <p className="text-sm text-[var(--text-quaternary)]">
              {items.length} plats • Changements synchronisés instantanément sur le site & le menu QR
            </p>
          </div>

          <Link
            href="/admin/menu/new"
            className="btn-primary btn-md gap-2.5 shadow-[var(--shadow-gold-lg)] group flex items-center"
          >
            <PlusCircle className="h-4 w-4" aria-hidden="true" />
            <span className="text-sm font-semibold">Ajouter un plat</span>
            <ArrowRight className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-1" aria-hidden="true" />
          </Link>
        </div>
      </section>

      {/* Filters Toolbar — Premium Card */}
      <section className="card p-5 lg:p-6 gap-4 sm:grid sm:grid-cols-12 lg:grid-cols-12" style={{
        background: "var(--bg-surface-elevated)",
        border: "1px solid var(--border-default)",
        borderRadius: "var(--radius-2xl)",
        boxShadow: "var(--shadow-card)",
      }}>
        {/* Search */}
        <div className="relative sm:col-span-5 lg:col-span-4">
          <label htmlFor="menu-search" className="sr-only">Rechercher dans le menu</label>
          <Search className="pointer-events-none absolute inset-y-0 start-3 flex items-center h-4 w-4 text-[var(--text-quaternary)]" aria-hidden="true" />
          <input
            id="menu-search"
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Rechercher par nom (FR / AR / EN)..."
            className="w-full rounded-xl py-3 pe-3 ps-10 text-sm text-[var(--text-primary)] placeholder-[var(--text-quaternary)] focus:outline-none focus:border-[var(--color-brand-primary)] focus:ring-2 focus:ring-[var(--color-brand-primary-bg)] transition-all duration-300"
          />
        </div>

        {/* Category filter */}
        <div className="sm:col-span-4 lg:col-span-4">
          <label htmlFor="menu-category-filter" className="sr-only">Filtrer par catégorie</label>
          <select
            id="menu-category-filter"
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="w-full rounded-xl px-4 py-3 text-sm text-[var(--text-primary)] focus:outline-none focus:border-[var(--color-brand-primary)] focus:ring-2 focus:ring-[var(--color-brand-primary-bg)] transition-all duration-300 cursor-pointer"
          >
            <option value="all">Toutes les catégories ({categories.length})</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name_fr} ({c.name_ar})
              </option>
            ))}
          </select>
        </div>

        {/* Availability filter */}
        <div className="sm:col-span-3 lg:col-span-3">
          <label htmlFor="menu-availability-filter" className="sr-only">Filtrer par disponibilité</label>
          <select
            id="menu-availability-filter"
            value={availabilityFilter}
            onChange={(e) => setAvailabilityFilter(e.target.value)}
            className="w-full rounded-xl px-4 py-3 text-sm text-[var(--text-primary)] focus:outline-none focus:border-[var(--color-brand-primary)] focus:ring-2 focus:ring-[var(--color-brand-primary-bg)] transition-all duration-300 cursor-pointer"
          >
            <option value="all">Tous les états</option>
            <option value="available">Disponibles uniquement</option>
            <option value="unavailable">Épuisés / Indisponibles</option>
          </select>
        </div>

        {/* View Mode Toggle: Grid / Table */}
        <div className="sm:col-span-12 lg:col-span-1 flex items-center justify-end">
          <div className="inline-flex rounded-xl p-1 bg-[var(--bg-surface-hover)] border border-[var(--border-subtle)]" role="group" aria-label="Mode d'affichage">
            <button
              type="button"
              onClick={() => setViewMode("grid")}
              className={`p-2 rounded-lg transition-colors ${
                viewMode === "grid"
                  ? "bg-[var(--bg-surface)] text-[var(--color-brand-primary)] shadow-sm font-semibold"
                  : "text-[var(--text-quaternary)] hover:text-[var(--text-primary)]"
              }`}
              title="Vue Grille"
              aria-label="Affichage en grille"
              aria-pressed={viewMode === "grid"}
            >
              <LayoutGrid className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={() => setViewMode("table")}
              className={`p-2 rounded-lg transition-colors ${
                viewMode === "table"
                  ? "bg-[var(--bg-surface)] text-[var(--color-brand-primary)] shadow-sm font-semibold"
                  : "text-[var(--text-quaternary)] hover:text-[var(--text-primary)]"
              }`}
              title="Vue Liste / Table"
              aria-label="Affichage en liste"
              aria-pressed={viewMode === "table"}
            >
              <List className="h-4 w-4" />
            </button>
          </div>
        </div>
      </section>

      {/* Drag tip helper */}
      {canDrag && (
        <div
          className="flex items-center gap-2.5 rounded-xl px-4 py-3 text-sm border border-[var(--color-brand-primary-border)] bg-[var(--color-brand-primary-tint)] text-[var(--color-brand-primary)]"
          role="status"
          aria-live="polite"
        >
          <GripVertical className="h-4 w-4 shrink-0" aria-hidden="true" />
          <span className="font-medium">Glissez l&apos;icône ⋮⋮ pour réorganiser l&apos;ordre des plats dans cette catégorie.</span>
        </div>
      )}

      {/* Bulk action sticky bar */}
      {selectedIds.length > 0 && (
        <div
          className="sticky top-24 z-sticky card card-elevated p-4 border-[var(--color-brand-primary-border)] shadow-xl"
          style={{ borderWidth: "1px" }}
          role="toolbar"
          aria-label="Actions groupées"
        >
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium bg-[var(--color-brand-primary-tint)] border border-[var(--color-brand-primary-border)] text-[var(--color-brand-primary)]">
                <span className="h-2 w-2 rounded-full bg-[var(--color-brand-primary)]" aria-hidden="true" />
                {selectedIds.length} sélectionné{selectedIds.length > 1 ? "s" : ""}
              </span>
              <button
                type="button"
                onClick={() => setSelectedIds([])}
                className="text-sm text-[var(--text-quaternary)] hover:text-[var(--color-brand-primary)] underline decoration-[var(--border-subtle)] hover:decoration-[var(--color-brand-primary)] transition-all duration-300"
              >
                Désélectionner
              </button>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={() => handleBulkAction("available")}
                disabled={bulkActionLoading}
              >
                Marquer disponible
              </Button>
              <Button
                type="button"
                variant="destructive"
                size="sm"
                onClick={() => handleBulkAction("unavailable")}
                disabled={bulkActionLoading}
              >
                Marquer épuisé
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setMoveCatOpen(true)}
                disabled={bulkActionLoading}
              >
                Changer catégorie…
              </Button>
              <Button
                type="button"
                variant="destructive"
                size="sm"
                onClick={() => handleBulkAction("delete")}
                disabled={bulkActionLoading}
              >
                Supprimer
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Move category modal */}
      {moveCatOpen && (
        <div className="modal-backdrop" onClick={() => setMoveCatOpen(false)} aria-hidden="true" />
      )}

      {moveCatOpen && (
        <div className="modal modal-sm" role="dialog" aria-modal="true" aria-labelledby="move-cat-title">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 id="move-cat-title" className="text-lg font-semibold text-[var(--text-primary)]">
                Déplacer les plats
              </h3>
              <button
                type="button"
                onClick={() => setMoveCatOpen(false)}
                className="btn-ghost btn-sm p-1.5 h-9 w-9 rounded-xl hover:bg-[var(--bg-surface)]"
                aria-label="Fermer"
              >
                <X className="h-4 w-4" aria-hidden="true" />
              </button>
            </div>
            <label htmlFor="move-target-category" className="mb-1 block text-xs font-semibold uppercase tracking-widest text-[var(--text-quaternary)]">
              Nouvelle catégorie
            </label>
            <select
              id="move-target-category"
              value={targetCategory}
              onChange={(e) => setTargetCategory(e.target.value)}
              className="w-full rounded-xl px-4 py-3 text-sm text-[var(--text-primary)] focus:outline-none focus:border-[var(--color-brand-primary)] focus:ring-2 focus:ring-[var(--color-brand-primary-bg)] transition-all duration-300 cursor-pointer"
            >
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name_fr} ({c.name_ar})
                </option>
              ))}
            </select>
            <div className="flex gap-3 pt-3">
              <Button
                type="button"
                variant="outline"
                size="md"
                fullWidth
                onClick={() => setMoveCatOpen(false)}
              >
                Annuler
              </Button>
              <Button
                type="button"
                variant="primary"
                size="md"
                fullWidth
                loading={bulkActionLoading}
                disabled={bulkActionLoading}
                onClick={() => handleBulkAction("move_category")}
              >
                Confirmer
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Data Display: Grid or Table */}
      {viewMode === "grid" ? (
        filteredItems.length === 0 ? (
          <div className="card p-16 text-center" style={{
            background: "var(--bg-surface-elevated)",
            border: "1px solid var(--border-default)",
            borderRadius: "var(--radius-2xl)",
            boxShadow: "var(--shadow-card)",
          }}>
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-[var(--color-brand-primary-tint)] border border-[var(--color-brand-primary-border)]/50 text-[var(--color-brand-primary)] shadow-[var(--shadow-gold-sm)]">
              <UtensilsCrossed className="h-8 w-8" aria-hidden="true" />
            </div>
            <h4 className="text-[var(--text-primary)] font-medium mb-2 text-lg">Aucun plat trouvé</h4>
            <p className="text-[var(--text-quaternary)] text-sm max-w-xs mx-auto">
              Essayez de modifier vos filtres ou ajoutez un nouveau plat au menu.
            </p>
          </div>
        ) : (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {filteredItems.map((dish) => (
              <div
                key={dish.id}
                className="group relative rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-surface-elevated)] overflow-hidden hover:border-[var(--color-brand-primary)]/30 hover:-translate-y-0.5 hover:shadow-[var(--shadow-gold-md)] transition-all duration-200 flex flex-col justify-between"
              >
                {/* 4/3 Aspect Ratio Image with Zoom */}
                <div className="relative aspect-[4/3] w-full overflow-hidden bg-[var(--bg-surface-hover)]">
                  <Image
                    src={dish.image || "/images/menu/dish-couscous.jpg"}
                    alt={dish.name_fr}
                    fill
                    sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 25vw"
                    className={`object-cover transition-transform duration-300 group-hover:scale-[1.04] ${reduceMotion ? "transition-none" : ""}`}
                  />
                  {dish.is_featured === 1 && (
                    <div className="absolute top-2.5 start-2.5 flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold bg-[var(--color-brand-gold)] text-[var(--color-text-on-gold)] shadow-md">
                      <Star className="h-2.5 w-2.5 fill-current" />
                      <span>Vedette</span>
                    </div>
                  )}

                  {/* Hover Quick Action Bar */}
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2 backdrop-blur-[2px]">
                    <Link
                      href={`/admin/menu/${dish.id}/edit`}
                      className="flex h-9 w-9 items-center justify-center rounded-xl bg-[var(--bg-surface)] text-[var(--text-primary)] hover:text-[var(--color-brand-primary)] border border-[var(--border-subtle)] shadow-lg transition-transform hover:scale-105"
                      title="Modifier"
                    >
                      <Edit className="h-4 w-4" />
                    </Link>
                    <button
                      type="button"
                      onClick={() => setDeleteConfirmItem(dish)}
                      className="flex h-9 w-9 items-center justify-center rounded-xl bg-[var(--bg-surface)] text-[var(--status-error)] hover:bg-[var(--status-error-bg)] border border-[var(--border-subtle)] shadow-lg transition-transform hover:scale-105"
                      title="Supprimer"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>

                {/* Card Body */}
                <div className="p-4 flex-1 flex flex-col justify-between space-y-3">
                  <div>
                    <div className="flex items-center justify-between gap-2 mb-1">
                      <span className="text-[11px] font-medium px-2 py-0.5 rounded-full bg-[var(--color-brand-primary)]/8 text-[var(--color-brand-primary)] border border-[var(--color-brand-primary)]/15">
                        {dish.category_name_fr || dish.category_id}
                      </span>
                      <span className="font-mono text-sm font-semibold text-[var(--color-brand-gold)]">
                        {formatPrice(dish.promo_price ?? dish.price, "fr")}
                      </span>
                    </div>
                    <h3
                      className="text-base font-medium text-[var(--text-primary)] truncate"
                      style={{
                        fontFamily: '"Cormorant Garamond", "Playfair Display", Georgia, serif',
                      }}
                    >
                      {dish.name_fr}
                    </h3>
                    <p className="text-xs text-[var(--text-quaternary)] truncate font-arabic" dir="rtl">
                      {dish.name_ar}
                    </p>
                  </div>

                  {/* Availability Toggle */}
                  <div className="flex items-center justify-between pt-3 border-t border-[var(--border-subtle)] text-xs">
                    <span className="text-[var(--text-secondary)]">Disponibilité :</span>
                    <button
                      type="button"
                      onClick={() => handleToggleAvailability(dish.id, dish.is_available)}
                      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border transition-colors ${
                        dish.is_available === 1
                          ? "bg-[var(--status-success-bg)] text-[var(--status-success)] border-[var(--status-success-border)]"
                          : "bg-[var(--status-error-bg)] text-[var(--status-error)] border-[var(--status-error-border)]"
                      }`}
                    >
                      {dish.is_available === 1 ? (
                        <>
                          <CheckCircle2 className="h-3 w-3" />
                          <span>Disponible</span>
                        </>
                      ) : (
                        <>
                          <XCircle className="h-3 w-3" />
                          <span>Épuisé</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )
      ) : (
        /* Data Table */
        <section className="card overflow-hidden relative" style={{
          background: "var(--bg-surface-elevated)",
          border: "1px solid var(--border-default)",
          borderRadius: "var(--radius-2xl)",
          boxShadow: "var(--shadow-card)",
        }}>
        {filteredItems.length === 0 ? (
          <div className="p-16 text-center">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-[var(--color-brand-primary-tint)] border border-[var(--color-brand-primary-border)]/50 text-[var(--color-brand-primary)] shadow-[var(--shadow-gold-sm)]">
              <UtensilsCrossed className="h-8 w-8" aria-hidden="true" />
            </div>
            <h4 className="text-[var(--text-primary)] font-medium mb-2 text-lg">Aucun plat trouvé</h4>
            <p className="text-[var(--text-quaternary)] text-sm max-w-xs mx-auto">
              Essayez de modifier vos filtres ou ajoutez un nouveau plat au menu.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragEnd={handleDragEnd}
            >
              <table className="table" role="table">
                <thead>
                  <tr>
                    <th scope="col" className="w-10 text-center">Ordre</th>
                    <th scope="col" className="w-10 text-center">
                      <button
                        type="button"
                        onClick={toggleSelectAll}
                        className="text-[var(--text-quaternary)] hover:text-[var(--color-brand-primary)] transition-all duration-200"
                        aria-label={selectedIds.length === filteredItems.length && filteredItems.length > 0 ? "Tout désélectionner" : "Tout sélectionner"}
                      >
                        {selectedIds.length === filteredItems.length && filteredItems.length > 0 ? (
                          <CheckSquare className="h-4 w-4 text-[var(--color-brand-primary)]" aria-hidden="true" />
                        ) : (
                          <Square className="h-4 w-4 text-[var(--text-quaternary)]" aria-hidden="true" />
                        )}
                      </button>
                    </th>
                    <th scope="col">Plat</th>
                    <th scope="col">Catégorie</th>
                    <th scope="col">Prix</th>
                    <th scope="col" className="text-center">Disponibilité</th>
                    <th scope="col" className="text-center">En Vedette</th>
                    <th scope="col" className="text-end w-24">
                      <span className="sr-only">Actions</span>
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--border-subtle)]">
                  <SortableContext
                    items={filteredItems.map((it) => it.id)}
                    strategy={verticalListSortingStrategy}
                  >
                    {filteredItems.map((item) => (
                      <SortableRow
                        key={item.id}
                        item={item}
                        selected={selectedIds.includes(item.id)}
                        onToggleSelect={toggleSelectOne}
                        onToggleAvailability={handleToggleAvailability}
                        onDeleteRequest={(it) => setDeleteConfirmItem(it)}
                        onEdit={(it) => {}}
                        canDrag={canDrag}
                      />
                    ))}
                  </SortableContext>
                </tbody>
              </table>
            </DndContext>
          </div>
        )}
      </section>
      )}

      {/* Delete Confirmation Modal */}
      {deleteConfirmItem && (
        <div className="modal-backdrop" onClick={() => setDeleteConfirmItem(null)} aria-hidden="true" />
      )}

      {deleteConfirmItem && (
        <div className="modal modal-sm" role="dialog" aria-modal="true" aria-labelledby="delete-title">
          <div className="space-y-4 text-center">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-[var(--status-error-bg)] border border-[var(--status-error-border)]/50">
              <AlertTriangle className="h-6 w-6 text-[var(--status-error)]" aria-hidden="true" />
            </div>
            <h3 id="delete-title" className="text-lg font-semibold text-[var(--text-primary)]">
              Mettre à la corbeille ?
            </h3>
            <p className="text-sm text-[var(--text-quaternary)]">
              Le plat <span className="font-semibold text-[var(--text-primary)]">« {deleteConfirmItem.name_fr} »</span> sera retiré du site public et du menu QR, mais restera restaurable dans la Corbeille.
            </p>
            <div className="flex gap-3 justify-center pt-1">
              <Button
                type="button"
                variant="outline"
                size="md"
                onClick={() => setDeleteConfirmItem(null)}
              >
                Annuler
              </Button>
              <Button
                type="button"
                variant="destructive"
                size="md"
                onClick={handleDelete}
              >
                Mettre en corbeille
              </Button>
            </div>
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
        .animate-pulse-slow { animation: pulse-slow 4s ease-in-out infinite; }
        @media (prefers-reduced-motion: reduce) {
          .animate-pulse-slow,
          .animate-fadeIn {
            animation: none !important;
          }
        }
      `}</style>
    </div>
  );
}