import { getRestaurantSettings, getOperatingHours, getReservationRules } from "@/lib/db/queries";
import { SettingsClient } from "./SettingsClient";

export const dynamic = "force-dynamic";

const plain = <T,>(v: T): T => JSON.parse(JSON.stringify(v));

export default async function AdminSettingsPage() {
  const settings = plain(getRestaurantSettings());
  const hours = plain(getOperatingHours());
  const rules = plain(getReservationRules());

  return <SettingsClient initialSettings={settings} initialHours={hours} initialRules={rules} />;
}
