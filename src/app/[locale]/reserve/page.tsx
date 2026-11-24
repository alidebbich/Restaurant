import { getMessages } from "next-intl/server";
import { type Locale } from "@/config/site.config";
import { Nav } from "@/components/sections/Nav";
import { Footer } from "@/components/sections/Footer";
import { ReserveForm } from "@/components/sections/ReserveForm";

export default async function ReservePage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const messages = await getMessages() as Record<string, Record<string, string>>;

  return (
    <>
      <Nav locale={locale as Locale} messages={messages} />
      <div className="pt-20">
        <ReserveForm locale={locale as Locale} messages={messages} />
      </div>
      <Footer locale={locale as Locale} messages={messages} />
    </>
  );
}

