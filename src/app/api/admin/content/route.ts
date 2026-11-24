import { NextRequest, NextResponse } from "next/server";
import { getHomepageContent, updateHomepageContent } from "@/lib/db/queries";
import { withAdminAuth, adminAuth } from "@/lib/auth-middleware";

export const GET = withAdminAuth(async () => {
  try {
    const content = getHomepageContent();
    return NextResponse.json({ success: true, content });
  } catch (error) {
    console.error("Get content error:", error);
    return NextResponse.json({ error: "Failed to fetch content" }, { status: 500 });
  }
}, { requiredModule: "content" });

export const PUT = withAdminAuth(async (req: NextRequest) => {
  try {
    const body = await req.json();
    updateHomepageContent(body);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Update content error:", error);
    return NextResponse.json({ error: "Failed to update content" }, { status: 500 });
  }
}, { requiredModule: "content" });

