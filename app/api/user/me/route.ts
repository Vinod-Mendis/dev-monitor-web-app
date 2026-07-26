import { NextResponse } from "next/server";
import { syncCurrentUser } from "@/lib/syncUser";

export async function GET() {
  try {
    const currentUser = await syncCurrentUser();
    return NextResponse.json({
      success: true,
      user: {
        _id: currentUser._id,
        clerkId: currentUser.clerkId,
        name: currentUser.name,
        role: currentUser.role,
      },
    });
  } catch (error: any) {
    const status = error.message?.startsWith("Unauthorized") ? 401 : 500;
    return NextResponse.json(
      { success: false, error: error.message || "Internal server error" },
      { status }
    );
  }
}
