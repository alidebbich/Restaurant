import { getMessages } from "next-intl/server";
import { notFound } from "next/navigation";
import { type Locale } from "@/config/site.config";
import { features } from "@/config/features";
import { Nav } from "@/components/sections/Nav";
import { Footer } from "@/components/sections/Footer";
import { OrderView } from "@/components/sections/OrderView";
import { getPublicMenu } from "@/lib/db/menuAdapter";

export default async function OrderPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;

  // If ordering feature is turned off, respond with notFound
  if (!features.ordering) {
    notFound();
  }

  const messages = (await getMessages()) as Record<string, Record<string, string>>;
  const categories = getPublicMenu();

  return (
    <div className="min-h-screen bg-[#0B251D] text-cream">
      <Nav locale={locale as Locale} messages={messages} />
      <OrderView locale={locale as Locale} messages={messages} initialCategories={categories} />
      <Footer locale={locale as Locale} messages={messages} />
    </div>
  );
}
