// ─────────────────────────────────────────────────────────────────────────────
// MENU DATA — All text localized. Prices in TND decimal.
// Replace SAMPLE dishes with real menu content.
// ─────────────────────────────────────────────────────────────────────────────

export type Locale = "fr" | "ar" | "en";
export type L10n = Record<Locale, string>;

export type Dish = {
  id: string;
  name: L10n;
  description?: L10n;
  price: number;
  image?: string;
  tags?: ("vegetarian" | "spicy" | "signature" | "new" | "halal")[];
  available?: boolean;
};

export type Category = {
  id: string;
  title: L10n;
  dishes: Dish[];
};

export const menu: Category[] = [
  {
    id: "entrees",
    title: { fr: "Entrées", ar: "مقبلات", en: "Starters" },
    dishes: [
      {
        id: "brik",
        name: { fr: "Brik à l'œuf", ar: "بريك بالبيض", en: "Egg Brik" },
        description: {
          fr: "Feuille de brik croustillante, œuf coulant, thon, câpres et persil.",
          ar: "ورق بريك مقرمش مع بيض، تونة، كبر والبقدونس.",
          en: "Crispy brik pastry with runny egg, tuna, capers and parsley.",
        },
        price: 8.5,
        image: "/images/menu/dish-brik.jpg",
        tags: ["signature", "halal"],
      },
      {
        id: "salade-mechouia",
        name: { fr: "Salade Mechouia", ar: "سلطة مشوية", en: "Mechouia Salad" },
        description: {
          fr: "Poivrons et tomates grillés, harissa maison, œuf dur, thon.",
          ar: "فلفل وطماطم مشوية، هريسة منزلية، بيض مسلوق، تونة.",
          en: "Grilled peppers and tomatoes, house harissa, hard-boiled egg, tuna.",
        },
        price: 9,
        image: "/images/menu/dish-mechouia.jpg",
        tags: ["spicy", "halal"],
      },
      {
        id: "chorba",
        name: { fr: "Chorba Frik", ar: "شوربة الفريك", en: "Frik Soup" },
        description: {
          fr: "Soupe traditionnelle à l'agneau, freekeh, coriandre et citron.",
          ar: "شوربة تقليدية بلحم الغنم والفريك والكزبرة والليمون.",
          en: "Traditional lamb soup with freekeh, coriander and lemon.",
        },
        price: 10,
        image: "/images/menu/dish-chorba.jpg",
        tags: ["signature", "halal"],
      },
    ],
  },
  {
    id: "plats",
    title: { fr: "Plats Principaux", ar: "الأطباق الرئيسية", en: "Main Courses" },
    dishes: [
      {
        id: "couscous-agneau",
        name: { fr: "Couscous Agneau", ar: "كسكسي بالغنم", en: "Lamb Couscous" },
        description: {
          fr: "Couscous fin, épaule d'agneau confite, légumes de saison, bouillon parfumé.",
          ar: "كسكسي ناعم مع كتف غنم مطهو ببطء وخضروات موسمية ومرق عطري.",
          en: "Fine couscous with slow-braised lamb shoulder, seasonal vegetables, aromatic broth.",
        },
        price: 32,
        image: "/images/menu/dish-couscous.jpg",
        tags: ["signature", "halal"],
      },
      {
        id: "tajine-kefta",
        name: { fr: "Tajine Kefta", ar: "طاجين كفتة", en: "Kefta Tagine" },
        description: {
          fr: "Boulettes de bœuf épicées, sauce tomate au cumin, œufs pochés.",
          ar: "كرات لحم بقري متبلة، صلصة طماطم بالكمون، بيض مسلوق.",
          en: "Spiced beef meatballs, cumin tomato sauce, poached eggs.",
        },
        price: 28,
        image: "/images/menu/dish-tajine.jpg",
        tags: ["spicy", "halal"],
      },
      {
        id: "poisson-chermoula",
        name: { fr: "Poisson Chermoula", ar: "سمك بالشرمولة", en: "Fish Chermoula" },
        description: {
          fr: "Loup de mer grillé, marinade chermoula maison, légumes du jardin.",
          ar: "سمك مشوي بتتبيلة الشرمولة المنزلية وخضروات طازجة.",
          en: "Grilled sea bass, house chermoula marinade, garden vegetables.",
        },
        price: 38,
        image: "/images/menu/dish-fish.jpg",
        tags: ["signature", "halal"],
      },
      {
        id: "vegetarian-couscous",
        name: { fr: "Couscous Végétarien", ar: "كسكسي نباتي", en: "Vegetarian Couscous" },
        description: {
          fr: "Couscous aux légumes rôtis, pois chiches, raisins secs et ras el hanout.",
          ar: "كسكسي بالخضروات المحمصة والحمص والزبيب ورأس الحانوت.",
          en: "Couscous with roasted vegetables, chickpeas, raisins and ras el hanout.",
        },
        price: 24,
        image: "/images/menu/dish-veg-couscous.jpg",
        tags: ["vegetarian", "halal"],
      },
    ],
  },
  {
    id: "desserts",
    title: { fr: "Desserts", ar: "حلويات", en: "Desserts" },
    dishes: [
      {
        id: "baklawa",
        name: { fr: "Baklawa Maison", ar: "بقلاوة منزلية", en: "House Baklawa" },
        description: {
          fr: "Feuilletés de pâte filo aux amandes et pistaches, sirop de fleur d'oranger.",
          ar: "عجينة فيلو باللوز والفستق وشراب ماء الزهر.",
          en: "Filo layers with almonds and pistachios, orange blossom syrup.",
        },
        price: 9,
        image: "/images/menu/dish-baklawa.jpg",
        tags: ["vegetarian"],
      },
      {
        id: "makroud",
        name: { fr: "Makroud au Miel", ar: "مقروض بالعسل", en: "Honey Makroud" },
        description: {
          fr: "Gâteaux de semoule farcis aux dattes, frits et enrobés de miel.",
          ar: "حلوى السميد محشوة بالتمر مقلية ومغطاة بالعسل.",
          en: "Semolina pastries stuffed with dates, fried and dipped in honey.",
        },
        price: 7.5,
        image: "/images/menu/dish-makroud.jpg",
        tags: ["vegetarian"],
      },
    ],
  },
  {
    id: "boissons",
    title: { fr: "Boissons", ar: "مشروبات", en: "Drinks" },
    dishes: [
      {
        id: "thé-menthe",
        name: { fr: "Thé à la Menthe", ar: "شاي بالنعناع", en: "Mint Tea" },
        description: {
          fr: "Thé vert infusé à la menthe fraîche, pignons de pin.",
          ar: "شاي أخضر بالنعناع الطازج وحبوب الصنوبر.",
          en: "Green tea steeped with fresh mint and pine nuts.",
        },
        price: 4,
        image: "/images/menu/dish-tea.jpg",
        tags: ["vegetarian"],
      },
      {
        id: "citronnade-geranium",
        name: { fr: "Citronnade Géranium", ar: "ليمون بماء الورد", en: "Geranium Lemonade" },
        description: {
          fr: "Citrons frais pressés, sirop de géranium, eau pétillante.",
          ar: "عصير ليمون طازج مع شراب الجيرانيوم ومياه غازية.",
          en: "Fresh-squeezed lemons, geranium syrup, sparkling water.",
        },
        price: 6,
        image: "/images/menu/dish-lemonade.jpg",
        tags: ["vegetarian"],
      },
    ],
  },
];

/** Flat list of signature dishes (tagged "signature") for the homepage */
export const signatureDishes: Dish[] = menu
  .flatMap((c) => c.dishes)
  .filter((d) => d.tags?.includes("signature"))
  .slice(0, 5);

