import { NextRequest, NextResponse } from "next/server";
import { getNetworkStats } from "@/lib/server/proof-storage";
import { checkRateLimit, getRequestIp } from "@/lib/server/rate-limit";
import { withPublicCors, publicCorsOptions } from "@/lib/server/cors";

export const runtime = "nodejs";

export async function OPTIONS() {
  return publicCorsOptions("GET, OPTIONS");
}

export async function GET(req: NextRequest) {
  try {
    const ip = getRequestIp(req);
    const rate = await checkRateLimit({
      key: `stats:${ip}`,
      limit: 120,
      windowSeconds: 60,
    });
    if (!rate.ok) {
      return withPublicCors(
        NextResponse.json(
          { error: "Too many requests. Please retry shortly." },
          {
            status: 429,
            headers: { "Retry-After": String(rate.retryAfterSeconds || 60) },
          }
        ),
        "GET, OPTIONS"
      );
    }

    const stats = await getNetworkStats();
    return withPublicCors(NextResponse.json(stats), "GET, OPTIONS");
  } catch {
    return withPublicCors(
      NextResponse.json({ wallets: 0, proofs: 0, platforms: 3 }),
      "GET, OPTIONS"
    );
  }
}
