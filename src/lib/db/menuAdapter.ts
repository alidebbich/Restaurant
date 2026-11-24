import { getCategories, getMenuItems, getRestaurantSettings, getHomepageContent, getOperatingHours, getGalleryImages } from "./queries";
import type { Locale } from "@/config/site.config";

export type PublicDish = {
  id: string;
  name: { fr: string; ar: string; en: string };
  description?: { fr: string; ar: string; en: string };
  price: number;
  promo_price?: number | null;
  image: string;
  tags?: string[];
  is_available: boolean;
  is_featured: boolean;
};

export type PublicCategory = {
  id: string;
  title: { fr: string; ar: string; en: string };
  dishes: PublicDish[];
};

export function getPublicMenu(): PublicCategory[] {
  try {
    const categories = getCategories(false); // active only
    const items = getMenuItems({ isPublishedOnly: true });

    return categories.map((cat) => {
      const categoryDishes = items
        .filter((item) => item.category_id === cat.id)
        .map((item) => ({
          id: item.id,
          name: {
            fr: item.name_fr,
            ar: item.name_ar || item.name_fr,
            en: item.name_en || item.name_fr,
          },
          description: {
            fr: item.description_fr || "",
            ar: item.description_ar || "",
            en: item.description_en || "",
          },
          price: item.promo_price ?? item.price,
          promo_price: item.promo_price,
          image: item.image || "/images/menu/dish-couscous.jpg",
          tags: item.dietary_tags ? JSON.parse(item.dietary_tags) : [],
          is_available: item.is_available === 1,
          is_featured: item.is_featured === 1,
        }));

      return {
        id: cat.id,
        title: {
          fr: cat.name_fr,
          ar: cat.name_ar || cat.name_fr,
          en: cat.name_en || cat.name_fr,
        },
        dishes: categoryDishes,
      };
    });
  } catch (error) {
    console.error("Error loading public menu from database:", error);
    return [];
  }
}

export function getPublicSignatureDishes(): PublicDish[] {
  try {
    const items = getMenuItems({ isPublishedOnly: true, isFeatured: true, isAvailable: true });
    return items.map((item) => ({
      id: item.id,
      name: {
        fr: item.name_fr,
        ar: item.name_ar || item.name_fr,
        en: item.name_en || item.name_fr,
      },
      description: {
        fr: item.description_fr || "",
        ar: item.description_ar || "",
        en: item.description_en || "",
      },
      price: item.promo_price ?? item.price,
      promo_price: item.promo_price,
      image: item.image || "/images/menu/dish-couscous.jpg",
      tags: item.dietary_tags ? JSON.parse(item.dietary_tags) : [],
      is_available: item.is_available === 1,
      is_featured: item.is_featured === 1,
    }));
  } catch (error) {
    console.error("Error loading signature dishes:", error);
    return [];
  }
}

