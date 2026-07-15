import { NextResponse } from "next/server";
import { FieldValue } from "firebase-admin/firestore";
import { adminAuth, adminDb } from "@/lib/firebase/admin";

async function requireAdmin(request: Request) {
  const authHeader = request.headers.get("authorization") ?? "";
  const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : null;
  if (!token) return null;

  const decoded = await adminAuth.verifyIdToken(token).catch(() => null);
  if (!decoded) return null;

  const callerDoc = await adminDb.collection("users").doc(decoded.uid).get();
  if (!callerDoc.exists || callerDoc.data()?.role !== "admin") return null;

  return decoded;
}

export async function POST(request: Request) {
  const caller = await requireAdmin(request);
  if (!caller) {
    return NextResponse.json({ error: "Non autorisé." }, { status: 403 });
  }

  const body = await request.json().catch(() => null);
  const {
    firstName,
    lastName,
    email,
    password,
    department,
    phone,
    workplaceAddress,
    workplaceLat,
    workplaceLng,
  } = body ?? {};

  if (!firstName || !lastName || !email || !password) {
    return NextResponse.json(
      { error: "Prénom, nom, courriel et mot de passe sont requis." },
      { status: 400 }
    );
  }
  if (typeof password !== "string" || password.length < 6) {
    return NextResponse.json(
      { error: "Le mot de passe doit contenir au moins 6 caractères." },
      { status: 400 }
    );
  }

  try {
    const userRecord = await adminAuth.createUser({
      email,
      password,
      displayName: `${firstName} ${lastName}`,
    });

    await adminDb.collection("users").doc(userRecord.uid).set({
      firstName,
      lastName,
      email,
      role: "employee",
      department: department ?? "",
      phone: phone ?? "",
      status: "active",
      createdAt: FieldValue.serverTimestamp(),
      workplaceAddress: workplaceAddress ?? "",
      workplaceLat: workplaceLat ?? null,
      workplaceLng: workplaceLng ?? null,
    });

    return NextResponse.json({ uid: userRecord.uid });
  } catch (error) {
    const code = (error as { code?: string })?.code ?? "";
    if (code === "auth/email-already-exists") {
      return NextResponse.json({ error: "Ce courriel est déjà utilisé." }, { status: 409 });
    }
    return NextResponse.json({ error: "Impossible de créer l'employé." }, { status: 500 });
  }
}
