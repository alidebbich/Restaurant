import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser, hasPermission, unauthorizedResponse, forbiddenResponse } from "@/lib/auth";
import { getMenuItemById, updateMenuItem, deleteMenuItem, getMenuItemOptions, saveMenuItemOptions } from "@/lib/db/queries";

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
    const item = getMenuItemById(id);
    if (!item) {
      return NextResponse.json({ error: "Item not found" }, { status: 404 });
    }

    const options = getMenuItemOptions(id);
    return NextResponse.json({ success: true, item: { ...item, options } });
  } catch (error) {
    console.error("Get item error:", error);
    return NextResponse.json({ error: "Failed to fetch item" }, { status: 500 });
  }
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return unauthorizedResponse();
    }
    if (!hasPermission(user.role, "menu")) {
      return forbiddenResponse();
    }

    const { id } = await params;
    const body = await req.json();

    const { options, ...itemData } = body;

    if (Array.isArray(itemData.allergens)) {
      itemData.allergens = JSON.stringify(itemData.allergens);
    }
    if (Array.isArray(itemData.dietary_tags)) {
      itemData.dietary_tags = JSON.stringify(itemData.dietary_tags);
    }
    if (Array.isArray(itemData.additional_images)) {
      itemData.additional_images = JSON.stringify(itemData.additional_images);
    }

    updateMenuItem(id, itemData);

    if (Array.isArray(options)) {
      saveMenuItemOptions(id, options);
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Update item error:", error);
    return NextResponse.json({ error: "Failed to update item" }, { status: 500 });
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return unauthorizedResponse();
    }
    if (!hasPermission(user.role, "menu")) {
      return forbiddenResponse();
    }

    const { id } = await params;
    deleteMenuItem(id);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Delete item error:", error);
    return NextResponse.json({ error: "Failed to delete item" }, { status: 500 });
  }
}

