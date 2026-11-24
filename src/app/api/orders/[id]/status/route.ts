import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser, hasPermission, unauthorizedResponse, forbiddenResponse } from "@/lib/auth";
import { updateOrderStatus } from "@/lib/db/queries";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return unauthorizedResponse();
    }
    if (!hasPermission(user.role, "orders")) {
      return forbiddenResponse();
    }

    const { id } = await params;
    const body = await req.json();
    const { status, note } = body;

    if (!status) {
      return NextResponse.json({ error: "Status is required" }, { status: 400 });
    }

    updateOrderStatus(id, status, note, user.full_name);

    return NextResponse.json({ success: true, status });
  } catch (error) {
    console.error("Order status update error:", error);
    return NextResponse.json({ error: "Failed to update order status" }, { status: 500 });
  }
}

