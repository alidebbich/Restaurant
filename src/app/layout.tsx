import type { Metadata } from "next";
import {
  Shippori_Mincho,
  Zen_Kaku_Gothic_New,
  Aref_Ruqaa,
  Noto_Kufi_Arabic,
} from "next/font/google";
import "./globals.css";

const shippori = Shippori_Mincho({
  subsets: ["latin", "latin-ext"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
  variable: "--font-shippori",
});

const zenKaku = Zen_Kaku_Gothic_New({
  subsets: ["latin", "latin-ext"],
  weight: ["400", "500", "700"],
  display: "swap",
  variable: "--font-zen-kaku",
});

const arefRuqaa = Aref_Ruqaa({
  subsets: ["arabic", "latin"],
  weight: ["400", "700"],
  display: "swap",
  variable: "--font-aref-ruqaa",
});

const notoKufi = Noto_Kufi_Arabic({
  subsets: ["arabic", "latin"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
  variable: "--font-noto-kufi",
});

export const metadata: Metadata = {
  title: {
    default: "Dar Zitoun — Restaurant & Gastronomie Tunisienne",
    template: "%s — Dar Zitoun",
  },
  description: "Cuisine tunisienne authentique et méditerranéenne raffinée.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      className={`${shippori.variable} ${zenKaku.variable} ${arefRuqaa.variable} ${notoKufi.variable}`}
      data-scroll-behavior="smooth"
      suppressHydrationWarning
    >
      <body
        className="bg-[#0B251D] font-body text-[#F5EFEB] antialiased selection:bg-[#C5A869]/30 selection:text-[#F5EFEB]"
        suppressHydrationWarning
      >
        {children}
      </body>
    </html>
  );
}
