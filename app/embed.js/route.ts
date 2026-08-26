/**
 * GET /embed.js
 *
 * Serves the self-contained Rialink embed widget.
 * The widget is a vanilla JS script with no dependencies.
 */

import { NextResponse } from "next/server";
import { readFile } from "fs/promises";
import { join } from "path";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const filePath = join(process.cwd(), "public", "embed.js");
    const content = await readFile(filePath, "utf8");

    return new NextResponse(content, {
      status: 200,
      headers: {
        "Content-Type": "application/javascript; charset=utf-8",
        "Cache-Control": "public, max-age=3600, s-maxage=86400",
        "Access-Control-Allow-Origin": "*",
      },
    });
  } catch {
    return NextResponse.json({ error: "Widget not found" }, { status: 404 });
  }
}
