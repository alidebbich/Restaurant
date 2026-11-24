import { getHomepageContent } from "@/lib/db/queries";
import { ContentClient } from "./ContentClient";

export const dynamic = "force-dynamic";

const plain = <T,>(v: T): T => JSON.parse(JSON.stringify(v));

export default async function AdminContentPage() {
  const content = plain(getHomepageContent());
  return <ContentClient initialContent={content} />;
}
