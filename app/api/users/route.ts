import { NextResponse } from "next/server";
import { syncCurrentUser } from "@/lib/syncUser";
import { connectToDatabase } from "@/lib/db";
import { User } from "@/models/User";

export async function GET(req: Request) {
  try {
    const currentUser = await syncCurrentUser();
    await connectToDatabase();

    const { searchParams } = new URL(req.url);
    const roleFilter = searchParams.get("role");

    const query: any = {};
    if (roleFilter) {
      query.role = roleFilter;
    }

    const users = await User.find(query)
      .select("_id name clerkId role createdAt")
      .sort({ name: 1 })
      .lean();

    return NextResponse.json({
      success: true,
      count: users.length,
      users,
    });
  } catch (error: any) {
    const status = error.message?.startsWith("Unauthorized") ? 401 : 500;
    return NextResponse.json(
      { success: false, error: error.message || "Internal server error" },
      { status }
    );
  }
}
