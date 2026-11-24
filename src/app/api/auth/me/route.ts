import { NextRequest, NextResponse } from "next/server";
import { destroySession, getCurrentUser } from "@/lib/auth";
import { validateCsrfToken } from "@/lib/csrf";

export async function POST(req: NextRequest) {
  // CSRF validation for logout
  const csrfValid = await validateCsrfToken(req);
  if (!csrfValid) {
    return NextResponse.json(
      { error: "Token CSRF invalide", code: "CSRF_INVALID" },
      { status: 403 }
    );
  }
  await destroySession();
  return NextResponse.json({ success: true });
}

export async function GET() {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ authenticated: false }, { status: 401 });
  }
  return NextResponse.json({ authenticated: true, user });
}

