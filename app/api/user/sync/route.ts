import { NextResponse } from "next/server";
import { syncCurrentUser } from "@/lib/syncUser";

export async function POST() {
  try {
    const user = await syncCurrentUser();
    return NextResponse.json({ success: true, user });
  } catch (error: any) {
    const status = error.message?.startsWith("Unauthorized") ? 401 : 500;
    return NextResponse.json(
      { success: false, error: error.message || "Internal server error" },
      { status }
    );
  }
}

export async function GET() {
  try {
    const user = await syncCurrentUser();
    return NextResponse.json({ success: true, user });
  } catch (error: any) {
    const status = error.message?.startsWith("Unauthorized") ? 401 : 500;
    return NextResponse.json(
      { success: false, error: error.message || "Internal server error" },
      { status }
    );
  }
}
