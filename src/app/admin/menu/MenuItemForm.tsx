"use client";

import { useState, useCallback } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import {
  Upload,
  Plus,
  Trash2,
  Save,
  ArrowLeft,
  AlertCircle,
  Sparkles,
  Layers,
  Globe,
  Tag,
  DollarSign,
  Info,
  X,
  ChevronRight,
} from "lucide-react";
import { toast } from "sonner";
import { adminFetch } from "@/lib/apiClient";
import { Button } from "@/components/ui/Button";
import type { MenuItem, Category, MenuItemOption } from "@/lib/db/queries";
import { formatPrice, parsePriceInput } from "@/lib/format";

type Props = {
  initialItem?: MenuItem & { options?: MenuItemOption[] };
  categories: Category[];
  isEdit?: boolean;
};

const COMMON_ALLERGENS = [
  "Gluten",
  "Lactose / Lait",
  "Œufs",
  "Poissons",
  "Fruits de mer",
  "Arachides",
  "Fruits à coque",
  "Sésame",
  "Moutarde",
  "Céleri",
];

const DIETARY_TAGS = [
  { id: "signature", label: "Plat Signature", color: "gold" },
  { id: "halal", label: "Halal", color: "success" },
  { id: "spicy", label: "Épicé / Harissa", color: "error" },
  { id: "vegetarian", label: "Végétarien", color: "info" },
  { id: "new", label: "Nouveauté", color: "pending" },
];

export function MenuItemForm({ initialItem, categories, isEdit = false }: Props) {
  const router = useRouter();

  // Active language tab: "fr" | "ar" | "en"
  const [activeTab, setActiveTab] = useState<"fr" | "ar" | "en">("fr");

  // Localised texts
  const [nameFr, setNameFr] = useState(initialItem?.name_fr || "");
  const [nameAr, setNameAr] = useState(initialItem?.name_ar || "");
  const [nameEn, setNameEn] = useState(initialItem?.name_en || "");

  const [descFr, setDescFr] = useState(initialItem?.description_fr || "");
  const [descAr, setDescAr] = useState(initialItem?.description_ar || "");
  const [descEn, setDescEn] = useState(initialItem?.description_en || "");

  const [ingredientsFr, setIngredientsFr] = useState(initialItem?.ingredients_fr || "");
  const [ingredientsAr, setIngredientsAr] = useState(initialItem?.ingredients_ar || "");
  const [ingredientsEn, setIngredientsEn] = useState(initialItem?.ingredients_en || "");

  // Category
  const [categoryId, setCategoryId] = useState(
    initialItem?.category_id || categories[0]?.id || ""
  );

  // Pricing (human string input)
  const initialPriceStr = initialItem?.price ? initialItem.price.toString() : "";
  const initialPromoStr = initialItem?.promo_price ? initialItem.promo_price.toString() : "";
  const [priceInput, setPriceInput] = useState(initialPriceStr);
  const [promoPriceInput, setPromoPriceInput] = useState(initialPromoStr);

  // Image & Upload
  const [image, setImage] = useState(
    initialItem?.image || "/images/menu/dish-couscous.jpg"
  );
  const [uploading, setUploading] = useState(false);

  // Flags & Order
  const [isAvailable, setIsAvailable] = useState(
    initialItem ? initialItem.is_available === 1 : true
  );
  const [isFeatured, setIsFeatured] = useState(
    initialItem ? initialItem.is_featured === 1 : false
  );
  const [displayOrder, setDisplayOrder] = useState<number>(
    initialItem?.display_order || 0
  );

  // Allergens & Tags
  const initialAllergens: string[] = initialItem?.allergens
    ? JSON.parse(initialItem.allergens)
    : [];
  const [selectedAllergens, setSelectedAllergens] = useState<string[]>(initialAllergens);

  const initialTags: string[] = initialItem?.dietary_tags
    ? JSON.parse(initialItem.dietary_tags)
    : [];
  const [selectedTags, setSelectedTags] = useState<string[]>(initialTags);

  // Options & Portions
  const [options, setOptions] = useState<MenuItemOption[]>(initialItem?.options || []);

  const [submitting, setSubmitting] = useState(false);

  // Calculated parsed prices
  const parsedPriceMillimes = parsePriceInput(priceInput);
  const parsedPromoMillimes = promoPriceInput ? parsePriceInput(promoPriceInput) : null;

  // Translation missing check indicators (amber dots)
  const missingAr = !nameAr.trim();
  const missingEn = !nameEn.trim();

  const handleFileUpload = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    const formData = new FormData();
    formData.append("file", file);

    try {
      const res = await adminFetch("/api/upload", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Échec du téléversement");

      setImage(data.url);
      toast.success("Photo téléversée avec succès");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erreur de téléversement");
    } finally {
      setUploading(false);
    }
  }, []);

  const toggleAllergen = useCallback((item: string) => {
    setSelectedAllergens((prev) =>
      prev.includes(item) ? prev.filter((a) => a !== item) : [...prev, item]
    );
  }, []);

  const toggleTag = useCallback((item: string) => {
    setSelectedTags((prev) =>
      prev.includes(item) ? prev.filter((t) => t !== item) : [...prev, item]
    );
  }, []);

  // Option groups
  const addOptionGroup = useCallback(() => {
    const newOpt: MenuItemOption = {
      id: "opt_" + Date.now(),
      menu_item_id: initialItem?.id || "",
      name_fr: "Taille / Option",
      name_ar: "الحجم / خيارات",
      name_en: "Size / Option",
      option_type: "single",
      is_required: 0,
      display_order: options.length,
      values: [
        {
          id: "val_" + Date.now() + "_1",
          option_id: "opt_" + Date.now(),
          name_fr: "Normale",
          name_ar: "عادي",
          name_en: "Standard",
          price_modifier: 0,
          is_default: 1,
          display_order: 0,
        },
      ],
    };
    setOptions((prev) => [...prev, newOpt]);
  }, [options.length]);

  const removeOptionGroup = useCallback((optId: string) => {
    setOptions((prev) => prev.filter((o) => o.id !== optId));
  }, []);

  const addOptionValue = useCallback((optId: string) => {
    setOptions((prev) =>
      prev.map((opt) => {
        if (opt.id !== optId) return opt;
        const currentVals = opt.values || [];
        return {
          ...opt,
          values: [
            ...currentVals,
            {
              id: "val_" + Date.now(),
              option_id: optId,
              name_fr: "Grande (+5 DT)",
              name_ar: "كبير (+5 د)",
              name_en: "Large (+5 DT)",
              price_modifier: 5,
              is_default: 0,
              display_order: currentVals.length,
            },
          ],
        };
      })
    );
  }, []);

  const removeOptionValue = useCallback((optId: string, valId: string) => {
    setOptions((prev) =>
      prev.map((opt) => {
        if (opt.id !== optId) return opt;
        return {
          ...opt,
          values: (opt.values || []).filter((v) => v.id !== valId),
        };
      })
    );
  }, []);

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();

    if (!nameFr.trim()) {
      toast.error("Le nom en français est obligatoire");
      return;
    }

    if (parsedPriceMillimes === null || parsedPriceMillimes <= 0) {
      toast.error("Veuillez saisir un prix valide en dinars (ex: 12.500)");
      return;
    }

    setSubmitting(true);

    const priceDT = parsedPriceMillimes / 1000;
    const promoDT = parsedPromoMillimes ? parsedPromoMillimes / 1000 : null;

    const payload = {
      name_fr: nameFr.trim(),
      name_ar: (nameAr || nameFr).trim(),
      name_en: (nameEn || nameFr).trim(),
      category_id: categoryId,
      description_fr: descFr.trim(),
      description_ar: descAr.trim(),
      description_en: descEn.trim(),
      price: priceDT,
      promo_price: promoDT,
      price_millimes: parsedPriceMillimes,
      promo_price_millimes: parsedPromoMillimes,
      image,
      is_available: isAvailable ? 1 : 0,
      is_featured: isFeatured ? 1 : 0,
      display_order: displayOrder,
      ingredients_fr: ingredientsFr.trim(),
      ingredients_ar: ingredientsAr.trim(),
      ingredients_en: ingredientsEn.trim(),
      allergens: selectedAllergens,
      dietary_tags: selectedTags,
      options,
    };

    try {
      const url = isEdit ? `/api/admin/menu/${initialItem!.id}` : "/api/admin/menu";
      const method = isEdit ? "PUT" : "POST";

      const res = await adminFetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Erreur d'enregistrement");

      toast.success(isEdit ? "Plat mis à jour !" : "Plat créé avec succès !");
      router.push("/admin/menu");
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erreur inattendue");
      setSubmitting(false);
    }
  }, [
    nameFr,
    nameAr,
    nameEn,
    descFr,
    descAr,
    descEn,
    ingredientsFr,
    ingredientsAr,
    ingredientsEn,
    categoryId,
    parsedPriceMillimes,
    parsedPromoMillimes,
    image,
    isAvailable,
    isFeatured,
    displayOrder,
    selectedAllergens,
    selectedTags,
    options,
    isEdit,
    initialItem,
    router,
  ]);

  const getTagBadgeClass = (active: boolean, color: string) => {
    if (!active) return "badge-outline btn-sm px-3 py-1 text-xs text-tertiary hover:bg-brand-primary-bg/40";
    const base = `badge px-3 py-1 text-xs font-semibold text-white shadow-`;
    switch (color) {
      case "gold": return base + "gold-sm bg-status-warning-bg text-status-warning-border";
      case "success": return base + "success-sm bg-status-success-bg text-white";
      case "error": return base + "error-sm bg-status-error-bg text-white";
      case "info": return base + "info-sm bg-color-brand-primary-bg text-white";
      case "pending": return base + "warning-sm bg-status-warning-bg text-status-warning-border";
      default: return base + "neutral bg-tertiary text-white";
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Top action bar */}
      <section className="relative overflow-hidden rounded-3xl p-6 sm:p-8 card-elevated group">
        <div className="absolute inset-0 -z-10 opacity-0 group-hover:opacity-100 transition-opacity duration-700" aria-hidden="true">
          <div className="absolute -top-1/4 -right-1/4 h-[300px] w-[300px] rounded-full" style={{ background: "var(--color-brand-primary-tint)", filter: "blur(96px)" }} />
          <div className="absolute -bottom-1/4 -left-1/4 h-[200px] w-[200px] rounded-full" style={{ background: "var(--color-success-tint)", filter: "blur(96px)", animationDelay: "1s" }} />
        </div>

        <div className="relative z-10 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 badge badge-gold px-2.5 py-1 text-[10px] font-bold shadow-gold-sm">
              <Layers className="h-3 w-3" aria-hidden="true" />
              <span>{isEdit ? "Édition" : "Création"}</span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-primary flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-brand-primary-bg border border-brand-primary-border text-brand-primary shadow-gold-md">
                <Plus className="h-5.5 w-5.5" aria-hidden="true" />
              </div>
              <span>{isEdit ? "Modifier le Plat" : "Nouveau Plat au Menu"}</span>
            </h2>
            <p className="text-sm text-quaternary leading-relaxed">
              Renseignez les noms, descriptions et labels dans les trois langues, puis configurez les options et la photo.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => router.back()}
              leadingIcon={<ArrowLeft className="h-4 w-4" aria-hidden="true" />}
            >
              Retour au menu
            </Button>

            <Button
              type="submit"
              variant="primary"
              size="md"
              loading={submitting}
              leadingIcon={<Save className="h-4 w-4" aria-hidden="true" />}
            >
              {isEdit ? "Mettre à jour" : "Créer le plat"}
            </Button>
          </div>
        </div>
      </section>

      <div className="grid gap-6 lg:grid-cols-12">
        {/* Left Column: Multilingual Details & Pricing */}
        <div className="lg:col-span-8 space-y-6">
          {/* Multilingual Card */}
          <section className="card p-6 space-y-6 rounded-3xl shadow-sm" aria-labelledby="translations-title">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-border-default">
              <div>
                <h3 id="translations-title" className="flex items-center gap-2 text-base font-semibold text-primary">
                  <Globe className="h-4 w-4 text-gold" aria-hidden="true" />
                  <span>Informations & Traductions</span>
                </h3>
                <p className="text-xs text-tertiary mt-0.5">
                  Gérez le contenu dans les 3 langues supportées
                </p>
              </div>

              {/* Language Tabs */}
              <div className="flex rounded-xl p-1 gap-1 border border-brand-primary-border bg-brand-primary-bg/30" role="tablist" aria-label="Langues">
                {(["fr", "ar", "en"] as const).map((lang) => {
                  const labels = { fr: "Français", ar: "العربية", en: "English" };
                  const missing = lang === "ar" ? missingAr : lang === "en" ? missingEn : false;
                  return (
                    <button
                      key={lang}
                      type="button"
                      onClick={() => setActiveTab(lang)}
                      role="tab"
                      aria-selected={activeTab === lang}
                      className={`relative rounded-lg px-3 py-1.5 text-xs font-semibold transition-all ${
                        activeTab === lang
                          ? "bg-brand-primary text-brand-primary border-transparent shadow-gold-sm"
                          : "text-tertiary hover:text-primary hover:bg-brand-primary-bg/20"
                      }`}
                    >
                      {labels[lang]}
                      {missing && (
                        <span className="absolute top-1 end-1 h-2 w-2 rounded-full bg-warning shadow-gold-sm" title={`Traduction ${labels[lang]} manquante`} aria-label={`Traduction ${labels[lang]} manquante`} />
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Tab Content */}
            <div role="tabpanel" aria-label={activeTab === "fr" ? "Français" : activeTab === "ar" ? "Arabe" : "Anglais"}>
              {activeTab === "fr" && (
                <div className="space-y-4">
                  <div>
                    <label htmlFor="name-fr" className="mb-1 block text-xs font-semibold uppercase tracking-wider text-tertiary">
                      Nom du Plat (Français) <span className="text-gold" aria-hidden="true">*</span>
                    </label>
                    <input
                      id="name-fr"
                      type="text"
                      required
                      value={nameFr}
                      onChange={(e) => setNameFr(e.target.value)}
                      placeholder="Ex: Couscous à l'Agneau"
                      className="w-full rounded-xl px-4 py-2.5 text-sm text-primary placeholder-tertiary focus:border-brand-primary focus:ring-2 focus:ring-brand-primary-bg"
                    />
                  </div>

                  <div>
                    <label htmlFor="desc-fr" className="mb-1 block text-xs font-semibold uppercase tracking-wider text-tertiary">
                      Description & Présentation
                    </label>
                    <textarea
                      id="desc-fr"
                      rows={3}
                      value={descFr}
                      onChange={(e) => setDescFr(e.target.value)}
                      placeholder="Semoule fine cuite à la vapeur, agneau braisé, légumes de saison..."
                      className="w-full rounded-xl px-4 py-2.5 text-xs text-primary placeholder-tertiary focus:border-brand-primary focus:ring-2 focus:ring-brand-primary-bg resize-none"
                    />
                  </div>

                  <div>
                    <label htmlFor="ingredients-fr" className="mb-1 block text-xs font-semibold uppercase tracking-wider text-tertiary">
                      Ingrédients Clés
                    </label>
                    <input
                      id="ingredients-fr"
                      type="text"
                      value={ingredientsFr}
                      onChange={(e) => setIngredientsFr(e.target.value)}
                      placeholder="Semoule, agneau de Sidi Bouzid, courgettes, pois chiches..."
                      className="w-full rounded-xl px-4 py-2.5 text-xs text-primary placeholder-tertiary focus:border-brand-primary focus:ring-2 focus:ring-brand-primary-bg"
                    />
                  </div>
                </div>
              )}

              {activeTab === "ar" && (
                <div className="space-y-4" dir="rtl">
                  <div>
                    <label htmlFor="name-ar" className="mb-1 block text-xs font-semibold uppercase tracking-wider text-tertiary font-arabic">
                      اسم الطبق (بالعربية)
                    </label>
                    <input
                      id="name-ar"
                      type="text"
                      value={nameAr}
                      onChange={(e) => setNameAr(e.target.value)}
                      placeholder="مثال: كسكسي بلحم الخروف"
                      className="w-full rounded-xl px-4 py-2.5 text-sm font-arabic text-primary placeholder-tertiary focus:border-brand-primary focus:ring-2 focus:ring-brand-primary-bg font-arabic"
                    />
                  </div>

                  <div>
                    <label htmlFor="desc-ar" className="mb-1 block text-xs font-semibold uppercase tracking-wider text-tertiary font-arabic">
                      الوصف وطريقة التقديم
                    </label>
                    <textarea
                      id="desc-ar"
                      rows={3}
                      value={descAr}
                      onChange={(e) => setDescAr(e.target.value)}
                      placeholder="كسكسي تونسي تقليدي مفور مع لحم خروف طري وخضار طازجة..."
                      className="w-full rounded-xl px-4 py-2.5 text-xs font-arabic text-primary placeholder-tertiary focus:border-brand-primary focus:ring-2 focus:ring-brand-primary-bg resize-none font-arabic"
                    />
                  </div>

                  <div>
                    <label htmlFor="ingredients-ar" className="mb-1 block text-xs font-semibold uppercase tracking-wider text-tertiary font-arabic">
                      المكونات
                    </label>
                    <input
                      id="ingredients-ar"
                      type="text"
                      value={ingredientsAr}
                      onChange={(e) => setIngredientsAr(e.target.value)}
                      placeholder="سميد، لحم خروف سيدي بوزيد، قرع، حمص..."
                      className="w-full rounded-xl px-4 py-2.5 text-xs font-arabic text-primary placeholder-tertiary focus:border-brand-primary focus:ring-2 focus:ring-brand-primary-bg font-arabic"
                    />
                  </div>
                </div>
              )}

              {activeTab === "en" && (
                <div className="space-y-4">
                  <div>
                    <label htmlFor="name-en" className="mb-1 block text-xs font-semibold uppercase tracking-wider text-tertiary">
                      Dish Name (English)
                    </label>
                    <input
                      id="name-en"
                      type="text"
                      value={nameEn}
                      onChange={(e) => setNameEn(e.target.value)}
                      placeholder="Ex: Traditional Lamb Couscous"
                      className="w-full rounded-xl px-4 py-2.5 text-sm text-primary placeholder-tertiary focus:border-brand-primary focus:ring-2 focus:ring-brand-primary-bg"
                    />
                  </div>

                  <div>
                    <label htmlFor="desc-en" className="mb-1 block text-xs font-semibold uppercase tracking-wider text-tertiary">
                      Description
                    </label>
                    <textarea
                      id="desc-en"
                      rows={3}
                      value={descEn}
                      onChange={(e) => setDescEn(e.target.value)}
                      placeholder="Steamed fine semolina with slow-braised pasture-raised lamb..."
                      className="w-full rounded-xl px-4 py-2.5 text-xs text-primary placeholder-tertiary focus:border-brand-primary focus:ring-2 focus:ring-brand-primary-bg resize-none"
                    />
                  </div>

                  <div>
                    <label htmlFor="ingredients-en" className="mb-1 block text-xs font-semibold uppercase tracking-wider text-tertiary">
                      Key Ingredients
                    </label>
                    <input
                      id="ingredients-en"
                      type="text"
                      value={ingredientsEn}
                      onChange={(e) => setIngredientsEn(e.target.value)}
                      placeholder="Fine semolina, Sidi Bouzid lamb, zucchini, chickpeas..."
                      className="w-full rounded-xl px-4 py-2.5 text-xs text-primary placeholder-tertiary focus:border-brand-primary focus:ring-2 focus:ring-brand-primary-bg"
                    />
                  </div>
                </div>
              )}
            </div>
          </section>

          {/* Pricing & Millimes Card */}
          <section className="card p-6 space-y-4 rounded-3xl shadow-sm" aria-labelledby="pricing-title">
            <div className="flex items-center justify-between pb-3 border-b border-border-default">
              <h3 id="pricing-title" className="flex items-center gap-2 text-base font-semibold text-primary">
                <DollarSign className="h-4 w-4 text-gold" aria-hidden="true" />
                <span>Tarification (Dinars Tunisiens — TND)</span>
              </h3>
              <span className="text-xs text-tertiary">Stockage en millimes (aucune perte d&apos;arrondi)</span>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label htmlFor="price" className="mb-1 block text-xs font-semibold uppercase tracking-wider text-tertiary">
                  Prix Normal (DT) <span className="text-gold" aria-hidden="true">*</span>
                </label>
                <input
                  id="price"
                  type="text"
                  required
                  value={priceInput}
                  onChange={(e) => setPriceInput(e.target.value)}
                  placeholder="Ex: 24.500 ou 24,5"
                  className="w-full rounded-xl px-4 py-2.5 text-sm font-mono text-primary placeholder-tertiary focus:border-brand-primary focus:ring-2 focus:ring-brand-primary-bg"
                />
                {parsedPriceMillimes !== null && (
                  <p className="mt-1 text-xs text-gold flex items-center gap-1">
                    <span>Affichage :</span>
                    <strong className="text-primary">{formatPrice(parsedPriceMillimes)}</strong>
                    <span className="text-tertiary">({parsedPriceMillimes} millimes)</span>
                  </p>
                )}
              </div>

              <div>
                <label htmlFor="promo-price" className="mb-1 block text-xs font-semibold uppercase tracking-wider text-tertiary">
                  Prix Promo (Optionnel)
                </label>
                <input
                  id="promo-price"
                  type="text"
                  value={promoPriceInput}
                  onChange={(e) => setPromoPriceInput(e.target.value)}
                  placeholder="Ex: 19.900"
                  className="w-full rounded-xl px-4 py-2.5 text-sm font-mono text-primary placeholder-tertiary focus:border-brand-primary focus:ring-2 focus:ring-brand-primary-bg"
                />
                {parsedPromoMillimes !== null && (
                  <p className="mt-1 text-xs text-success flex items-center gap-1">
                    <span>Promo :</span>
                    <strong className="text-primary">{formatPrice(parsedPromoMillimes)}</strong>
                  </p>
                )}
              </div>
            </div>
          </section>

          {/* Options & Portions Customization */}
          <section className="card p-6 space-y-4 rounded-3xl shadow-sm" aria-labelledby="options-title">
            <div className="flex items-center justify-between pb-3 border-b border-border-default">
              <div>
                <h3 id="options-title" className="flex items-center gap-2 text-base font-semibold text-primary">
                  <Layers className="h-4 w-4 text-gold" aria-hidden="true" />
                  <span>Options, Tailles & Suppléments</span>
                </h3>
                <p className="text-xs text-tertiary mt-0.5">
                  Permet au client de personnaliser sa commande (ex: Petite/Grande portion, fromage extra)
                </p>
              </div>
              <button
                type="button"
                onClick={addOptionGroup}
                className="btn-outline btn-sm gap-1.5 shadow-gold-sm"
              >
                <Plus className="h-3.5 w-3.5" aria-hidden="true" />
                <span>Ajouter un groupe</span>
              </button>
            </div>

            {options.length === 0 ? (
              <p className="py-4 text-center text-xs text-tertiary">
                Aucune option définie. Le plat sera vendu au prix standard unique.
              </p>
            ) : (
              <div className="space-y-4">
                {options.map((opt) => (
                  <div key={opt.id} className="rounded-3xl p-4 space-y-3 border border-brand-primary-border bg-brand-primary-bg/20 shadow-sm">
                    <div className="flex items-center justify-between gap-3">
                      <label htmlFor={`option-group-name-${opt.id}`} className="sr-only">Nom du groupe d'options</label>
                      <input
                        id={`option-group-name-${opt.id}`}
                        type="text"
                        value={opt.name_fr}
                        onChange={(e) =>
                          setOptions((prev) =>
                            prev.map((o) => (o.id === opt.id ? { ...o, name_fr: e.target.value } : o))
                          )
                        }
                        placeholder="Nom du groupe (ex: Taille)"
                        className="flex-1 rounded-xl px-3 py-1.5 text-xs font-semibold text-primary focus:border-brand-primary focus:ring-2 focus:ring-brand-primary-bg"
                        aria-label="Nom du groupe d'options"
                      />
                      <button
                        type="button"
                        onClick={() => removeOptionGroup(opt.id)}
                        className="btn-ghost btn-sm p-1.5 h-8 w-8 text-error hover:bg-error-bg/50"
                        title="Supprimer le groupe"
                        aria-label="Supprimer le groupe d'options"
                      >
                        <Trash2 className="h-4 w-4" aria-hidden="true" />
                      </button>
                    </div>

                    {/* Values list */}
                    <div className="space-y-2 ps-3 border-s-2 border-border-default">
                      {(opt.values || []).map((val) => (
                        <div key={val.id} className="flex items-center gap-2">
                          <label htmlFor={`option-name-${opt.id}-${val.id}`} className="sr-only">Nom de l'option</label>
                          <input
                            id={`option-name-${opt.id}-${val.id}`}
                            type="text"
                            value={val.name_fr}
                            onChange={(e) =>
                              setOptions((prev) =>
                                prev.map((o) =>
                                  o.id === opt.id
                                    ? {
                                        ...o,
                                        values: (o.values || []).map((v) =>
                                          v.id === val.id ? { ...v, name_fr: e.target.value } : v
                                        ),
                                      }
                                    : o
                                )
                              )
                            }
                            placeholder="Nom (ex: Grande)"
                            className="flex-1 rounded-xl px-3 py-1 text-xs text-primary focus:border-brand-primary focus:ring-2 focus:ring-brand-primary-bg"
                            aria-label="Nom de l'option"
                          />
                          <div className="flex items-center gap-1">
                            <span className="text-xs text-tertiary">+</span>
                            <label htmlFor={`option-price-${opt.id}-${val.id}`} className="sr-only">Prix supplémentaire</label>
                            <input
                              id={`option-price-${opt.id}-${val.id}`}
                              type="number"
                              step="0.5"
                              value={val.price_modifier}
                              onChange={(e) =>
                                setOptions((prev) =>
                                  prev.map((o) =>
                                    o.id === opt.id
                                      ? {
                                          ...o,
                                          values: (o.values || []).map((v) =>
                                            v.id === val.id ? { ...v, price_modifier: parseFloat(e.target.value) || 0 } : v
                                          ),
                                        }
                                      : o
                                  )
                                )
                              }
                              placeholder="0"
                              className="w-20 rounded-xl px-2 py-1 text-xs font-mono text-gold text-center focus:border-brand-primary focus:ring-2 focus:ring-brand-primary-bg"
                              aria-label="Prix supplémentaire en DT"
                            />
                            <span className="text-xs text-tertiary">DT</span>
                          </div>
                          <button
                            type="button"
                            onClick={() => removeOptionValue(opt.id, val.id)}
                            className="btn-ghost btn-sm p-1 h-7 w-7 text-tertiary hover:text-error hover:bg-error-bg/50"
                            aria-label="Supprimer cette option"
                          >
                            <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                          </button>
                        </div>
                      ))}

                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => addOptionValue(opt.id)}
                        leadingIcon={<Plus className="h-3 w-3" aria-hidden="true" />}
                      >
                        Ajouter un choix
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>

        {/* Right Column: Category, Photo, Allergens, Visibility */}
        <div className="lg:col-span-4 space-y-6">
          {/* Category & Status Card */}
          <section className="card p-6 space-y-4 rounded-3xl shadow-sm" aria-labelledby="organization-title">
            <h3 id="organization-title" className="text-xs font-semibold uppercase tracking-wider text-tertiary pb-2 border-b border-border-default">
              Organisation & Visibilité
            </h3>

            <div>
              <label htmlFor="category" className="mb-1 block text-xs font-semibold uppercase tracking-wider text-tertiary">
                Catégorie <span className="text-gold" aria-hidden="true">*</span>
              </label>
              <select
                id="category"
                value={categoryId}
                onChange={(e) => setCategoryId(e.target.value)}
                className="w-full rounded-xl px-3.5 py-2.5 text-sm text-primary focus:border-brand-primary focus:ring-2 focus:ring-brand-primary-bg"
              >
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name_fr} ({c.name_ar})
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-3 pt-2">
              <label htmlFor="is-available" className="flex items-center justify-between cursor-pointer">
                <span className="text-sm text-primary">Plat disponible (en stock)</span>
                <input id="is-available" type="checkbox" checked={isAvailable} onChange={(e) => setIsAvailable(e.target.checked)} className="h-4 w-4 rounded accent-gold" />
              </label>

              <label htmlFor="is-featured" className="flex items-center justify-between cursor-pointer">
                <span className="text-sm text-primary">Mettre en Vedette (Accueil)</span>
                <input id="is-featured" type="checkbox" checked={isFeatured} onChange={(e) => setIsFeatured(e.target.checked)} className="h-4 w-4 rounded accent-gold" />
              </label>
            </div>
          </section>

          {/* Photo Upload Card */}
          <section className="card p-6 space-y-4 rounded-3xl shadow-sm" aria-labelledby="photo-title">
            <h3 id="photo-title" className="text-xs font-semibold uppercase tracking-wider text-tertiary pb-2 border-b border-border-default">
              Photographie du Plat
            </h3>

            <div className="relative aspect-video w-full overflow-hidden rounded-2xl card border-border-default bg-border-subtle group">
              <Image
                src={image}
                alt="Aperçu"
                fill
                sizes="350px"
                className="object-cover transition-transform duration-700 group-hover:scale-105"
              />
              {uploading && (
                <div className="absolute inset-0 flex items-center justify-center backdrop-blur-sm z-20" style={{ background: "var(--bg-modal-backdrop)" }}>
                  <div className="flex h-8 w-8 rounded-full border-4 border-border-default border-t-brand-primary animate-spin" />
                </div>
              )}
            </div>

            <div>
              <label htmlFor="dish-image-upload" className="btn-outline btn-md w-full gap-2 justify-center cursor-pointer shadow-gold-sm">
                <Upload className="h-4 w-4" aria-hidden="true" />
                <span>{uploading ? "Téléversement…" : "Changer la photo"}</span>
                <input
                  id="dish-image-upload"
                  type="file"
                  accept="image/*"
                  onChange={handleFileUpload}
                  disabled={uploading}
                  className="hidden"
                />
              </label>
            </div>
          </section>

          {/* Dietary Tags Card */}
          <section className="card p-6 space-y-3 rounded-3xl shadow-sm" aria-labelledby="dietary-title">
            <h3 id="dietary-title" className="text-xs font-semibold uppercase tracking-wider text-tertiary pb-2 border-b border-border-default">
              Labels & Régimes
            </h3>
            <div className="flex flex-wrap gap-1.5" role="group" aria-label="Labels alimentaires">
              {DIETARY_TAGS.map((tag) => {
                const active = selectedTags.includes(tag.id);
                return (
                  <button
                    key={tag.id}
                    type="button"
                    onClick={() => toggleTag(tag.id)}
                    className={getTagBadgeClass(active, tag.color)}
                    aria-pressed={active}
                  >
                    {tag.label}
                  </button>
                );
              })}
            </div>
          </section>

          {/* Allergens Card */}
          <section className="card p-6 space-y-3 rounded-3xl shadow-sm" aria-labelledby="allergens-title">
            <h3 id="allergens-title" className="text-xs font-semibold uppercase tracking-wider text-tertiary pb-2 border-b border-border-default">
              Allergènes Présents
            </h3>
            <div className="flex flex-wrap gap-1.5" role="group" aria-label="Allergènes">
              {COMMON_ALLERGENS.map((all) => {
                const active = selectedAllergens.includes(all);
                return (
                  <button
                    key={all}
                    type="button"
                    onClick={() => toggleAllergen(all)}
                    className={`rounded-full px-2.5 py-1 text-xs font-medium transition-all border ${
                      active
                        ? "bg-status-error-bg border-status-error-border text-status-error"
                        : "bg-border-subtle border-border-subtle text-tertiary hover:bg-status-error-bg/30 hover:text-status-error/90"
                    }`}
                    aria-pressed={active}
                  >
                    {all}
                  </button>
                );
              })}
            </div>
          </section>
        </div>
      </div>
    </form>
  );
}