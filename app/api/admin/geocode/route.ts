import { NextResponse } from "next/server";
import { getAdminAuth, getAdminDb } from "@/lib/firebase/admin";

async function requireAdmin(request: Request) {
  const authHeader = request.headers.get("authorization") ?? "";
  const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : null;
  if (!token) return null;

  const decoded = await getAdminAuth().verifyIdToken(token).catch(() => null);
  if (!decoded) return null;

  const callerDoc = await getAdminDb().collection("users").doc(decoded.uid).get();
  if (!callerDoc.exists || callerDoc.data()?.role !== "admin") return null;

  return decoded;
}

export async function POST(request: Request) {
  const caller = await requireAdmin(request);
  if (!caller) {
    return NextResponse.json({ error: "Non autorisé." }, { status: 403 });
  }

  const body = await request.json().catch(() => null);
  const address = body?.address;
  if (!address || typeof address !== "string") {
    return NextResponse.json({ error: "Adresse requise." }, { status: 400 });
  }

  const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(
    address
  )}&format=json&limit=1`;

  const res = await fetch(url, {
    headers: { "User-Agent": "gk-employes-app/1.0 (gestion@gkgroupeinc.com)" },
  });
  const results = await res.json().catch(() => []);

  if (!Array.isArray(results) || results.length === 0) {
    return NextResponse.json({ error: "Adresse introuvable." }, { status: 404 });
  }

  const { lat, lon, display_name } = results[0];
  return NextResponse.json({
    lat: parseFloat(lat),
    lng: parseFloat(lon),
    displayName: display_name as string,
  });
}
