import { NextResponse } from "next/server";
import { writeFileSync } from "node:fs";
import { join } from "node:path";

export async function POST(req: Request) {
  const { code } = await req.json();
  const filePath = join(process.cwd(), "src", "lib", "photos.ts");
  writeFileSync(filePath, code, "utf8");
  return NextResponse.json({ ok: true });
}
