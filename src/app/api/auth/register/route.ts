import { NextRequest, NextResponse } from "next/server";
import { registerCustomer, AuthError } from "@/lib/auth/service";
import { setSessionCookie } from "@/lib/auth/session";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || req.headers.get("x-real-ip") || "127.0.0.1";
    const userAgent = req.headers.get("user-agent") || "";

    const result = await registerCustomer(body, ip, userAgent);

    await setSessionCookie(result.user);

    return NextResponse.json(
      {
        success: true,
        user: result.user,
        message: "Account successfully created.",
        verificationToken: result.verificationToken,
      },
      { status: 201 }
    );
  } catch (err: unknown) {
    if (err instanceof AuthError) {
      return NextResponse.json(
        { success: false, error: err.message, code: err.code },
        { status: err.statusCode }
      );
    }
    return NextResponse.json(
      { success: false, error: "Registration failed" },
      { status: 500 }
    );
  }
}
