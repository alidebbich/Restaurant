import { NextRequest, NextResponse } from "next/server";
import { destroySession } from "@/lib/auth";

export async function POST(req: NextRequest) {
  // Always destroy session in database and delete cookies
  await destroySession();

  const response = NextResponse.json({ success: true });
  response.cookies.delete("restaurant_admin_token");
  response.cookies.set("restaurant_admin_token", "", {
    path: "/",
    maxAge: 0,
    expires: new Date(0),
    httpOnly: true,
  });

  return response;
}

export async function GET(req: NextRequest) {
  await destroySession();
  const url = req.nextUrl.clone();
  url.pathname = "/admin/login";
  url.search = "";
  
  const response = NextResponse.redirect(url);
  response.cookies.delete("restaurant_admin_token");
  response.cookies.set("restaurant_admin_token", "", {
    path: "/",
    maxAge: 0,
    expires: new Date(0),
    httpOnly: true,
  });

  return response;
}
