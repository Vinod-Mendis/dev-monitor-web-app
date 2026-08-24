import { NextResponse } from "next/server";
import { clerkClient } from "@clerk/nextjs/server";
import { syncCurrentUser } from "@/lib/syncUser";
import { requireAdmin } from "@/lib/roles";
import { connectToDatabase } from "@/lib/db";
import { User } from "@/models/User";
import { Types } from "mongoose";

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Ensure caller is an admin
    await requireAdmin();
    const currentAdmin = await syncCurrentUser();

    const { id } = await params;
    const body = await req.json();
    const { role } = body;

    if (!role || (role !== "admin" && role !== "intern")) {
      return NextResponse.json(
        { success: false, error: "Invalid role. Role must be 'admin' or 'intern'." },
        { status: 400 }
      );
    }

    await connectToDatabase();

    // Find user by MongoDB _id or clerkId
    let targetUser = null;
    if (Types.ObjectId.isValid(id)) {
      targetUser = await User.findById(id);
    }
    if (!targetUser) {
      targetUser = await User.findOne({ clerkId: id });
    }

    if (!targetUser) {
      return NextResponse.json(
        { success: false, error: "User not found in database" },
        { status: 404 }
      );
    }

    // Safety guard: prevent demoting oneself if they are the only admin
    if (
      targetUser.clerkId === currentAdmin.clerkId &&
      role === "intern"
    ) {
      const adminCount = await User.countDocuments({ role: "admin" });
      if (adminCount <= 1) {
        return NextResponse.json(
          {
            success: false,
            error: "You cannot remove admin privileges from the only remaining admin.",
          },
          { status: 400 }
        );
      }
    }

    // 1. Update Clerk publicMetadata
    try {
      const clerk = await clerkClient();
      await clerk.users.updateUserMetadata(targetUser.clerkId, {
        publicMetadata: {
          role: role,
        },
      });
    } catch (clerkError: any) {
      console.error("Failed to update Clerk user metadata:", clerkError);
      return NextResponse.json(
        {
          success: false,
          error:
            clerkError.message ||
            "Failed to update user role in authentication provider.",
        },
        { status: 502 }
      );
    }

    // 2. Update MongoDB User record
    targetUser.role = role;
    await targetUser.save();

    return NextResponse.json({
      success: true,
      user: {
        _id: targetUser._id,
        clerkId: targetUser.clerkId,
        name: targetUser.name,
        email: targetUser.email,
        imageUrl: targetUser.imageUrl,
        role: targetUser.role,
        updatedAt: targetUser.updatedAt,
      },
    });
  } catch (error: any) {
    const status = error.message?.startsWith("Forbidden")
      ? 403
      : error.message?.startsWith("Unauthorized")
      ? 401
      : 500;
    return NextResponse.json(
      { success: false, error: error.message || "Internal server error" },
      { status }
    );
  }
}
