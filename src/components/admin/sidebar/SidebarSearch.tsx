"use client";

import React, { useState, useEffect, useRef, useSyncExternalStore } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";

const emptySubscribe = () => () => {};
import {
  Search,
  LayoutDashboard,
  UtensilsCrossed,
  FolderTree,
  ShoppingBag,
  CalendarCheck,
  FileText,
  Image as ImageIcon,
  QrCode,
  Settings,
  Trash2,
  ExternalLink,
  ArrowRight,
} from "lucide-react";

type SearchItem = {
  title: string;
  category: string;
  href: string;
  icon: React.ComponentType<{ className?: string; strokeWidth?: number }>;
  keywords?: string[];
};

const COMMAND_ITEMS: SearchItem[] = [
  { title: "Tableau de bord", category: "Aperçu", href: "/admin", icon: LayoutDashboard, keywords: ["stats", "accueil", "vue"] },
  { title: "Plats & Menu", category: "Gestion Restaurant", href: "/admin/menu", icon: UtensilsCrossed, keywords: ["carte", "dishes", "plats", "prix"] },
  { title: "Catégories", category: "Gestion Restaurant", href: "/admin/categories", icon: FolderTree, keywords: ["sections", "groupes"] },
  { title: "Commandes", category: "Gestion Restaurant", href: "/admin/orders", icon: ShoppingBag, keywords: ["orders", "livraison", "clients"] },
  { title: "Réservations", category: "Gestion Restaurant", href: "/admin/reservations", icon: CalendarCheck, keywords: ["booking", "tables", "couverts"] },
  { title: "Page d'accueil", category: "Contenu & Marque", href: "/admin/content", icon: FileText, keywords: ["textes", "hero", "bannière"] },
  { title: "Galerie Photos", category: "Contenu & Marque", href: "/admin/gallery", icon: ImageIcon, keywords: ["images", "photos", "visuels"] },
  { title: "Menu QR Code", category: "Configuration", href: "/admin/qr", icon: QrCode, keywords: ["tables", "qr", "flash"] },
  { title: "Paramètres", category: "Configuration", href: "/admin/settings", icon: Settings, keywords: ["heures", "fermeture", "téléphone"] },
  { title: "Corbeille", category: "Configuration", href: "/admin/trash", icon: Trash2, keywords: ["supprimés", "archive", "restauration"] },
  { title: "Voir le site public", category: "Navigation", href: "/", icon: ExternalLink, keywords: ["site", "client", "front"] },
];

type SidebarSearchProps = {
  isCollapsed: boolean;
};

export function SidebarSearch({ isCollapsed }: SidebarSearchProps) {
  const [isOpen, setIsOpen] = useState(false);
  const mounted = useSyncExternalStore(emptySubscribe, () => true, () => false);
  const [query, setQuery] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);

  const openSearch = () => {
    setQuery("");
    setSelectedIndex(0);
    setIsOpen(true);
  };

  const closeSearch = () => {
    setIsOpen(false);
  };

  // Global ⌘K / Ctrl+K shortcut
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setIsOpen((prev) => {
          if (!prev) {
            setQuery("");
            setSelectedIndex(0);
          }
          return !prev;
        });
      } else if (e.key === "Escape" && isOpen) {
        e.preventDefault();
        setIsOpen(false);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen]);

  // Focus input when dialog opens
  useEffect(() => {
    if (isOpen) {
      const timer = setTimeout(() => inputRef.current?.focus(), 50);
      return () => clearTimeout(timer);
    }
  }, [isOpen]);

  const trimmed = query.trim();
  const dynamicItems: SearchItem[] = trimmed.length > 0 ? [
    {
      title: `Réservations: chercher "${trimmed}" (nom, tél, date)`,
      category: "Recherche directe",
      href: `/admin/reservations?search=${encodeURIComponent(trimmed)}`,
      icon: CalendarCheck,
    },
    {
      title: `Commandes: chercher "${trimmed}" (client, code)`,
      category: "Recherche directe",
      href: `/admin/orders?search=${encodeURIComponent(trimmed)}`,
      icon: ShoppingBag,
    },
    {
      title: `Menu: chercher "${trimmed}" (plat, catégorie)`,
      category: "Recherche directe",
      href: `/admin/menu?search=${encodeURIComponent(trimmed)}`,
      icon: UtensilsCrossed,
    },
  ] : [];

  const matchedCommandItems = COMMAND_ITEMS.filter((item) => {
    if (!trimmed) return true;
    const q = trimmed.toLowerCase();
    const inTitle = item.title.toLowerCase().includes(q);
    const inCat = item.category.toLowerCase().includes(q);
    const inKeywords = item.keywords?.some((k) => k.toLowerCase().includes(q));
    return inTitle || inCat || inKeywords;
  });

  const filteredItems = [...dynamicItems, ...matchedCommandItems];

  const handleSelect = (href: string) => {
    setIsOpen(false);
    router.push(href);
  };

  const handleKeyDownInInput = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelectedIndex((prev) => (prev + 1) % Math.max(1, filteredItems.length));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelectedIndex((prev) => (prev - 1 + filteredItems.length) % Math.max(1, filteredItems.length));
    } else if (e.key === "Enter" && filteredItems[selectedIndex]) {
      e.preventDefault();
      handleSelect(filteredItems[selectedIndex].href);
    }
  };

  return (
    <>
      {/* Trigger Button with Smooth Morphing Width */}
      <div className="px-3 pt-3 pb-1">
        <button
          type="button"
          onClick={openSearch}
          className={`flex items-center h-10 rounded-xl text-xs font-normal text-[#C8D8CE] bg-white/[0.04] hover:bg-white/[0.08] hover:text-white border border-white/[0.08] transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] outline-none focus-visible:ring-2 focus-visible:ring-[#C9A24B] ${
            isCollapsed ? "w-10 mx-auto justify-center px-0" : "w-full justify-between px-3"
          }`}
          title="Rechercher… (⌘K)"
          aria-label="Rechercher une page ou action (Raccourci ⌘K)"
        >
          <div className="flex items-center min-w-0">
            <Search className="h-4 w-4 text-[#A8BCAE] flex-shrink-0" strokeWidth={1.5} />
            <span
              className={`ms-2.5 whitespace-nowrap overflow-hidden transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] ${
                isCollapsed ? "max-w-0 opacity-0 pointer-events-none -translate-x-2" : "max-w-[120px] opacity-100 translate-x-0"
              }`}
            >
              Rechercher…
            </span>
          </div>
          <kbd
            className={`inline-flex items-center rounded px-1.5 py-0.5 text-[10px] font-mono text-[#A8BCAE] bg-white/[0.05] border border-white/[0.08] transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] ${
              isCollapsed ? "max-w-0 opacity-0 pointer-events-none scale-75 overflow-hidden" : "max-w-[36px] opacity-100 scale-100"
            }`}
          >
            ⌘K
          </kbd>
        </button>
      </div>

      {/* Accessible Command Palette Dialog (Portaled to body to escape sidebar stacking context) */}
      {mounted &&
        isOpen &&
        createPortal(
          <div
            className="fixed inset-0 flex items-start justify-center pt-24 px-4 sm:px-6 bg-black/75 backdrop-blur-md transition-opacity animate-fadeIn"
            style={{ zIndex: "var(--z-modal)" }}
            onClick={closeSearch}
            role="dialog"
            aria-modal="true"
            aria-label="Recherche et commandes rapides"
          >
            <div
              className="w-full max-w-xl rounded-2xl overflow-hidden border shadow-2xl transition-all"
              style={{
                background: "linear-gradient(180deg, #0A1B14 0%, #06110D 100%)",
                borderColor: "rgba(201, 162, 75, 0.25)",
                boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.7), 0 0 25px rgba(201, 162, 75, 0.15)",
              }}
              onClick={(e) => e.stopPropagation()}
            >
              {/* Input Header */}
              <div
                className="flex items-center gap-3 px-4 py-3.5 border-b"
                style={{ borderColor: "var(--sidebar-border)" }}
              >
                <Search className="h-5 w-5 text-[var(--sidebar-accent)]" strokeWidth={1.5} />
                <input
                  ref={inputRef}
                  type="text"
                  value={query}
                  onChange={(e) => {
                    setQuery(e.target.value);
                    setSelectedIndex(0);
                  }}
                  onKeyDown={handleKeyDownInInput}
                  placeholder="Rechercher une réservation, un client, un plat ou une page…"
                  className="flex-1 bg-transparent text-sm text-[var(--sidebar-text-primary)] placeholder-[var(--sidebar-text-muted)] outline-none"
                />
                <button
                  type="button"
                  onClick={closeSearch}
                  className="text-xs text-[var(--sidebar-text-muted)] hover:text-[var(--sidebar-text-primary)] px-1.5 py-0.5 rounded border border-white/10"
                >
                  ESC
                </button>
              </div>

              {/* Results List */}
              <div className="max-h-80 overflow-y-auto p-2 sidebar-scrollbar" role="listbox">
                {filteredItems.length === 0 ? (
                  <div className="py-8 text-center text-xs text-[var(--sidebar-text-muted)]">
                    Aucun résultat pour &ldquo;{query}&rdquo;
                  </div>
                ) : (
                  filteredItems.map((item, idx) => {
                    const Icon = item.icon;
                    const isSelected = idx === selectedIndex;
                    return (
                      <div
                        key={item.href}
                        role="option"
                        aria-selected={isSelected}
                        onMouseEnter={() => setSelectedIndex(idx)}
                        onClick={() => handleSelect(item.href)}
                        className={`flex items-center justify-between px-3 py-2.5 rounded-xl cursor-pointer transition-all duration-150 ${
                          isSelected
                            ? "bg-[var(--sidebar-accent-tint)] text-[var(--sidebar-text-primary)]"
                            : "text-[var(--sidebar-text-secondary)] hover:bg-[var(--sidebar-surface)]"
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <div
                            className={`flex h-8 w-8 items-center justify-center rounded-lg transition-colors ${
                              isSelected
                                ? "bg-[rgba(201,162,75,0.2)] text-[var(--sidebar-accent)]"
                                : "bg-[var(--sidebar-surface)] text-[var(--sidebar-text-muted)]"
                            }`}
                          >
                            <Icon className="h-4 w-4" strokeWidth={1.5} />
                          </div>
                          <div className="flex flex-col">
                            <span className="text-sm font-medium">{item.title}</span>
                            <span className="text-[11px] text-[var(--sidebar-text-muted)]">{item.category}</span>
                          </div>
                        </div>
                        {isSelected && (
                          <ArrowRight className="h-4 w-4 text-[var(--sidebar-accent)]" strokeWidth={1.5} />
                        )}
                      </div>
                    );
                  })
                )}
              </div>

              {/* Footer Hints */}
              <div
                className="flex items-center justify-between px-4 py-2 border-t text-[11px] text-[var(--sidebar-text-muted)]"
                style={{ borderColor: "var(--sidebar-border)" }}
              >
                <span>Navigation: ↑ / ↓ pour choisir, Entrée pour valider</span>
                <span>ESC pour fermer</span>
              </div>
            </div>
          </div>,
          document.body
        )}
    </>
  );
}
