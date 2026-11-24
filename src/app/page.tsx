import { redirect } from "next/navigation";
import { site } from "@/config/site.config";

// Root → redirect to default locale
export default function RootPage() {
  redirect(`/${site.defaultLocale}`);
}

