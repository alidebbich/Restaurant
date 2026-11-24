import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { AdminLayoutClient } from "./AdminLayoutClient";
import "@/styles/admin-globals.css";

export const metadata = {
  title: "Administration — Dar Zitoun",
  description: "Panneau de gestion du restaurant",
  robots: { index: false, follow: false },
};

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getCurrentUser();

  return <AdminLayoutClient user={user}>{children}</AdminLayoutClient>;
}

