"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/Button";
import {
  Trash2,
  RotateCcw,
  AlertTriangle,
  UtensilsCrossed,
  FolderTree,
  CheckCircle2,
} from "lucide-react";
import { adminFetch } from "@/lib/apiClient";
import type { MenuItem, Category } from "@/lib/db/queries";

type Props = {
  dishes: MenuItem[];
  categories: Category[];
};

export function TrashClient({ dishes, categories }: Props) {
  const router = useRouter();
  const [loading, setLoading] = useState<string | null>(null);
  const [confirmHardDelete, setConfirmHardDelete] = useState<{ id: string; name: string; type: "dish" | "category" } | null>(null);

  const handleRestore = async (id: string, type: "dish" | "category") => {
    setLoading(id);
    try {
      const res = await adminFetch(`/api/admin/trash/${type}/${encodeURIComponent(id)}/restore`, { method: "POST" });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Erreur lors de la restauration");
      }
      toast.success(type === "dish" ? "Plat restauré avec succès" : "Catégorie restaurée avec succès");
      router.refresh();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Erreur lors de la restauration");
    } finally {
      setLoading(null);
    }
  };

  const handleHardDelete = async () => {
    if (!confirmHardDelete) return;
    const { id, type } = confirmHardDelete;
    setLoading(id);
    setConfirmHardDelete(null);
    try {
      const res = await adminFetch(`/api/admin/trash/${type}/${encodeURIComponent(id)}`, { method: "DELETE" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Erreur de suppression");
      toast.success("Supprimé définitivement");
      router.refresh();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Erreur de suppression");
    } finally {
      setLoading(null);
    }
  };

  const isEmpty = dishes.length === 0 && categories.length === 0;

  return (
    <div className="w-full space-y-8 pb-16 animate-fadeIn">
      {/* Premium Page Header */}
      <section className="relative overflow-hidden rounded-3xl p-6 sm:p-8 lg:p-10 card-elevated group">
        <div className="absolute inset-0 -z-10 opacity-0 group-hover:opacity-100 transition-opacity duration-700" aria-hidden="true">
          <div className="absolute -top-1/4 -right-1/4 h-[300px] w-[300px] rounded-full" style={{ background: "var(--color-error-tint)", filter: "blur(96px)" }} />
          <div className="absolute -bottom-1/4 -left-1/4 h-[200px] w-[200px] rounded-full" style={{ background: "var(--color-brand-primary-tint)", filter: "blur(96px)", animationDelay: "1s" }} />
        </div>

        <div className="relative z-10 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="space-y-2">
            <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-status-error uppercase tracking-wider bg-status-error-bg/30 border border-status-error-border/30 px-2.5 py-1 rounded-full shadow-error-sm">
              <AlertTriangle className="h-3 w-3" aria-hidden="true" />
              <span>Corbeille</span>
            </span>
            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-primary flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-status-error-bg border border-status-error-border/30 text-status-error shadow-error-sm">
                <Trash2 className="h-5.5 w-5.5" aria-hidden="true" />
              </div>
              <span>Gestion des Éléments Supprimés</span>
            </h2>
            <p className="text-sm text-quaternary leading-relaxed">
              Les éléments supprimés sont conservés ici en attente. Restaurez-les en un clic ou supprimez-les définitivement.
            </p>
          </div>
        </div>
      </section>

      {isEmpty && (
        <div className="rounded-2xl py-20 text-center border-dashed border-border-subtle bg-surface shadow-sm">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-status-success-bg/20 border border-status-success-border/30 text-status-success mx-auto mb-4">
            <CheckCircle2 className="h-6 w-6 text-status-success" aria-hidden="true" />
          </div>
          <h3
            className="text-lg font-medium text-primary"
            style={{
              fontFamily: '"Cormorant Garamond", "Playfair Display", Georgia, serif',
            }}
          >
            Rien ici, tout est en ordre
          </h3>
          <p className="text-xs text-tertiary mt-1 max-w-sm mx-auto">
            Aucun plat ni catégorie n&apos;a été supprimé récemment. Vos données sont saines et sauvegardées.
          </p>
        </div>
      )}

      {!isEmpty && (
        <>
          {/* Warning banner */}
          <div className="flex items-start gap-3 card border-status-error-border/30 bg-status-error-bg/50 p-4 rounded-2xl">
            <AlertTriangle className="h-5 w-5 text-status-error mt-0.5 shrink-0" aria-hidden="true" />
            <div>
              <p className="text-sm font-medium text-status-error">
                La suppression définitive est irréversible.
              </p>
              <p className="text-xs text-tertiary mt-0.5">
                Les commandes passées conservent l'intégrité de leur historique même si le plat ou la catégorie associé est supprimé.
              </p>
            </div>
          </div>

          {/* Deleted Dishes */}
          {dishes.length > 0 && (
            <section className="space-y-6">
              <div className="flex items-center justify-between">
                <h2 className="flex items-center gap-2 text-sm font-semibold text-primary uppercase tracking-widest">
                  <div className="flex h-6 w-6 items-center justify-center rounded-lg bg-status-error-bg border border-status-error-border/30 text-status-error">
                    <UtensilsCrossed className="h-3 w-3" aria-hidden="true" />
                  </div>
                  <span>Plats supprimés ({dishes.length})</span>
                </h2>
                <span className="badge badge-error">{dishes.length}</span>
              </div>
              <div className="card overflow-hidden rounded-2xl divide-y divide-border-subtle shadow-sm">
                {dishes.map((dish) => (
                  <div
                    key={dish.id}
                    className="flex items-center gap-4 p-4 hover:bg-brand-primary-bg/20 transition-all duration-200 group"
                  >
                    {dish.image && (
                      <img
                        src={dish.image}
                        alt=""
                        className="h-12 w-12 rounded-xl object-cover shrink-0 opacity-80 group-hover:opacity-100 transition-opacity border border-border-subtle"
                      />
                    )}
                    <div className="min-w-0 flex-1">
                      <p className="font-medium text-primary truncate">{dish.name_fr}</p>
                      <p className="text-[11px] text-tertiary truncate">
                        {dish.category_name_fr} · Supprimé le {new Date(dish.deleted_at!).toLocaleDateString("fr-FR")}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <Button
                        type="button"
                        variant="secondary"
                        size="sm"
                        onClick={() => handleRestore(dish.id, "dish")}
                        loading={loading === dish.id}
                        disabled={loading === dish.id}
                        leadingIcon={<RotateCcw className="h-3.5 w-3.5" />}
                      >
                        Restaurer
                      </Button>
                      <Button
                        type="button"
                        variant="destructive"
                        size="sm"
                        onClick={() => setConfirmHardDelete({ id: dish.id, name: dish.name_fr, type: "dish" })}
                        disabled={loading === dish.id}
                        leadingIcon={<Trash2 className="h-3.5 w-3.5" />}
                      >
                        Supprimer
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Deleted Categories */}
          {categories.length > 0 && (
            <section className="space-y-6">
              <div className="flex items-center justify-between">
                <h2 className="flex items-center gap-2 text-sm font-semibold text-primary uppercase tracking-widest">
                  <div className="flex h-6 w-6 items-center justify-center rounded-lg bg-status-success-bg border border-status-success-border/30 text-status-success">
                    <FolderTree className="h-3 w-3" aria-hidden="true" />
                  </div>
                  <span>Catégories supprimées ({categories.length})</span>
                </h2>
                <span className="badge badge-success">{categories.length}</span>
              </div>
              <div className="card overflow-hidden rounded-2xl divide-y divide-border-subtle shadow-sm">
                {categories.map((cat) => (
                  <div
                    key={cat.id}
                    className="flex items-center gap-4 p-4 hover:bg-brand-primary-bg/20 transition-all duration-200 group"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="font-medium text-primary truncate">{cat.name_fr}</p>
                      <p className="text-[11px] text-tertiary">
                        Supprimée le {new Date(cat.deleted_at!).toLocaleDateString("fr-FR")}
                        {(cat.items_count ?? 0) > 0 && (
                          <span className="ml-2 text-xs font-medium text-status-error">
                            ({cat.items_count} plat(s) associé(s))
                          </span>
                        )}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <Button
                        type="button"
                        variant="secondary"
                        size="sm"
                        onClick={() => handleRestore(cat.id, "category")}
                        loading={loading === cat.id}
                        disabled={loading === cat.id}
                        leadingIcon={<RotateCcw className="h-3.5 w-3.5" />}
                      >
                        Restaurer
                      </Button>
                      <Button
                        type="button"
                        variant="destructive"
                        size="sm"
                        onClick={() => setConfirmHardDelete({ id: cat.id, name: cat.name_fr, type: "category" })}
                        disabled={loading === cat.id}
                        leadingIcon={<Trash2 className="h-3.5 w-3.5" />}
                      >
                        Supprimer
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}
        </>
      )}

      {/* Hard-delete confirmation dialog */}
      {confirmHardDelete && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-modal-backdrop backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
          aria-labelledby="hard-delete-title"
        >
          <div className="modal modal-sm">
            <div className="space-y-4">
              <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-status-error-bg border border-status-error-border/30">
                <AlertTriangle className="h-7 w-7 text-status-error" aria-hidden="true" />
              </div>
              <h3 id="hard-delete-title" className="mb-2 text-base font-semibold text-primary">
                Suppression définitive
              </h3>
              <p className="mb-6 text-sm text-tertiary">
                <span className="font-medium text-primary">&ldquo;{confirmHardDelete.name}&rdquo;</span>
                sera supprimé définitivement de la base de données.
                {confirmHardDelete.type === "category" && (
                  <span className="block mt-2 text-sm font-medium text-status-error">
                    Attention : cette catégorie contient des plats. Veuillez d'abord déplacer ou supprimer ces plats.
                  </span>
                )}
              </p>
              <div className="flex gap-3 justify-end pt-1">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setConfirmHardDelete(null)}
                >
                  Annuler
                </Button>
                <Button
                  type="button"
                  variant="destructive"
                  size="sm"
                  onClick={handleHardDelete}
                >
                  Supprimer définitivement
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}