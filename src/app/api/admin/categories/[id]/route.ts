import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser, hasPermission } from "@/lib/auth";
import { getCategoryById, updateCategory, deleteCategory } from "@/lib/db/queries";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const category = getCategoryById(id);
    if (!category) {
      return NextResponse.json({ error: "Category not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true, category });
  } catch (error) {
    console.error("Get category error:", error);
    return NextResponse.json({ error: "Failed to get category" }, { status: 500 });
  }
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Non authentifié", code: "UNAUTHORIZED" }, { status: 401 });
    }
    if (!hasPermission(user.role, "menu")) {
      return NextResponse.json({ error: "Action non autorisée pour ce rôle", code: "FORBIDDEN" }, { status: 403 });
    }

    const { id } = await params;
    const body = await req.json();

    updateCategory(id, body);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Update category error:", error);
    return NextResponse.json({ error: "Failed to update category" }, { status: 500 });
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Non authentifié", code: "UNAUTHORIZED" }, { status: 401 });
    }
    if (!hasPermission(user.role, "menu")) {
      return NextResponse.json({ error: "Action non autorisée pour ce rôle", code: "FORBIDDEN" }, { status: 403 });
    }

    const { id } = await params;
    const result = deleteCategory(id);
    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Delete category error:", error);
    return NextResponse.json({ error: "Failed to delete category" }, { status: 500 });
  }
}

