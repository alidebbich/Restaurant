import { getGalleryImages } from "@/lib/db/queries";
import { GalleryClient } from "./GalleryClient";

export const dynamic = "force-dynamic";

const plain = <T,>(v: T): T => JSON.parse(JSON.stringify(v));

export default async function AdminGalleryPage() {
  const images = plain(getGalleryImages());
  return <GalleryClient initialImages={images} />;
}
