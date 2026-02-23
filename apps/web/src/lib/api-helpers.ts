import "server-only";
import { NextResponse, type NextRequest } from "next/server";
import type { ApiErrorResponse, UserDocument } from "@swimhub-scanner/shared";

export interface AuthenticatedRequest {
  uid: string;
  email: string | undefined;
}

/**
 * Verify the Firebase ID token from the Authorization header.
 */
export async function verifyAuth(
  request: NextRequest,
): Promise<{ auth: AuthenticatedRequest } | { error: NextResponse<ApiErrorResponse> }> {
  const authHeader = request.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return {
      error: NextResponse.json(
        { error: "認証が必要です", code: "UNAUTHORIZED" as const },
        { status: 401 },
      ),
    };
  }

  const idToken = authHeader.slice(7);

  // Mock mode for development without Firebase
  if (process.env.NODE_ENV === "development" && process.env.FIREBASE_PROJECT_ID === "mock") {
    return {
      auth: {
        uid: "dev-user-001",
        email: "dev@example.com",
      },
    };
  }

  try {
    const { adminAuth } = await import("@/lib/firebase/admin");
    const decoded = await adminAuth.verifyIdToken(idToken);
    return {
      auth: {
        uid: decoded.uid,
        email: decoded.email,
      },
    };
  } catch {
    return {
      error: NextResponse.json(
        { error: "認証が必要です", code: "UNAUTHORIZED" as const },
        { status: 401 },
      ),
    };
  }
}

/**
 * Ensure a user document exists in Firestore.
 * Creates a new document with default "free" plan on first login.
 */
export async function ensureUserDocument(uid: string): Promise<UserDocument> {
  // Mock mode
  if (process.env.NODE_ENV === "development" && process.env.FIREBASE_PROJECT_ID === "mock") {
    return {
      plan: "free",
      premiumExpiresAt: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
  }

  const { adminDb } = await import("@/lib/firebase/admin");
  const userRef = adminDb.collection("users").doc(uid);
  const userDoc = await userRef.get();

  if (userDoc.exists) {
    return userDoc.data() as UserDocument;
  }

  const newUser: UserDocument = {
    plan: "free",
    premiumExpiresAt: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  await userRef.set(newUser);
  return newUser;
}
