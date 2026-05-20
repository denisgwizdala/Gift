import { NextResponse } from "next/server";

/**
 * Reverse geocode using OpenStreetMap Nominatim (free, no API key).
 * POST { lat, lng } → { city, country }
 */
export async function POST(req: Request) {
  const { lat, lng } = await req.json();

  if (!lat || !lng) {
    return NextResponse.json({ city: "", country: "" });
  }

  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json&zoom=14`,
      { headers: { "User-Agent": "TravellyCinematicGift/1.0" } }
    );
    const data = await res.json();
    const addr = data.address || {};

    const city =
      addr.city ||
      addr.town ||
      addr.village ||
      addr.municipality ||
      addr.county ||
      addr.state ||
      "";
    const country = addr.country || "";

    return NextResponse.json({ city, country });
  } catch {
    return NextResponse.json({ city: "", country: "" });
  }
}
