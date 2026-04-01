import { NextResponse } from "next/server";

export const PUBLIC_CORS_ORIGIN = process.env.PUBLIC_CORS_ORIGIN || "*";

function buildCorsHeaders(methods: string) {
  return {
    "Access-Control-Allow-Origin": PUBLIC_CORS_ORIGIN,
    "Access-Control-Allow-Methods": methods,
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
  } as const;
}

export function withPublicCors(response: NextResponse, methods: string): NextResponse {
  const headers = buildCorsHeaders(methods);
  for (const [key, value] of Object.entries(headers)) {
    response.headers.set(key, value);
  }
  return response;
}

export function publicCorsOptions(methods: string): NextResponse {
  return withPublicCors(new NextResponse(null, { status: 204 }), methods);
}
