import { Suspense } from "react";
import { getMessages } from "next-intl/server";
import { type Locale } from "@/config/site.config";
import { Nav } from "@/components/sections/Nav";
import { Footer } from "@/components/sections/Footer";
import { ManageClient } from "./ManageClient";

type Props = {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ token?: string }>;
};

export const dynamic = "force-dynamic";

export default async function ManageReservationPage({ params, searchParams }: Props) {
  const { locale } = await params;
  const { token } = await searchParams;
  const messages = (await getMessages()) as Record<string, Record<string, string>>;

  return (
    <>
      <Nav locale={locale as Locale} messages={messages} />
      <div className="pt-20">
        <Suspense
          fallback={
            <div className="min-h-[60vh] bg-[#0B251D] flex items-center justify-center text-gold">
              Chargement...
            </div>
          }
        >
          <ManageClient locale={locale as Locale} messages={messages} initialToken={token} />
        </Suspense>
      </div>
      <Footer locale={locale as Locale} messages={messages} />
    </>
  );
}
