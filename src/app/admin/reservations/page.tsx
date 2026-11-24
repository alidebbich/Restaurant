import { getReservations, getReservationRules, getWaitlist } from "@/lib/db/queries";
import { getCurrentUser } from "@/lib/auth";
import { ReservationsClient } from "./ReservationsClient";

export const dynamic = "force-dynamic";

const plain = <T,>(v: T): T => JSON.parse(JSON.stringify(v));

export default async function AdminReservationsPage() {
  const user = await getCurrentUser();
  const reservations = plain(getReservations());
  const rules = plain(getReservationRules());
  const waitlist = plain(getWaitlist());

  return (
    <ReservationsClient
      initialReservations={reservations}
      rules={rules}
      initialWaitlist={waitlist}
      currentUserRole={user?.role || "manager"}
    />
  );
}
