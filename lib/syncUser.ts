import { currentUser } from "@clerk/nextjs/server";
import { connectToDatabase } from "./db";
import { User, IUser } from "@/models/User";
import { getUserRole } from "./roles";

/**
 * Synchronizes the currently authenticated Clerk user with MongoDB User model.
 * Creates the user if not exists, or updates role/name if changed.
 */
export async function syncCurrentUser(): Promise<IUser> {
  await connectToDatabase();

  const clerkUser = await currentUser();
  if (!clerkUser) {
    throw new Error("Unauthorized: No Clerk user found");
  }

  const role = await getUserRole();

  const nameParts = [clerkUser.firstName, clerkUser.lastName].filter(Boolean);
  const fullName =
    nameParts.length > 0
      ? nameParts.join(" ")
      : clerkUser.username ||
        clerkUser.emailAddresses[0]?.emailAddress ||
        "User";

  const email = clerkUser.emailAddresses?.[0]?.emailAddress || "";
  const imageUrl = clerkUser.imageUrl || "";

  let dbUser = await User.findOne({ clerkId: clerkUser.id });

  if (!dbUser) {
    dbUser = await User.create({
      clerkId: clerkUser.id,
      name: fullName,
      email: email,
      imageUrl: imageUrl,
      role: role,
    });
  } else {
    // Update name, email, imageUrl, or role if they changed
    let hasChanges = false;
    if (dbUser.role !== role) {
      dbUser.role = role;
      hasChanges = true;
    }
    if (dbUser.name !== fullName && fullName !== "User") {
      dbUser.name = fullName;
      hasChanges = true;
    }
    if (email && dbUser.email !== email) {
      dbUser.email = email;
      hasChanges = true;
    }
    if (imageUrl && dbUser.imageUrl !== imageUrl) {
      dbUser.imageUrl = imageUrl;
      hasChanges = true;
    }
    if (hasChanges) {
      await dbUser.save();
    }
  }

  return dbUser;
}
