import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(request: NextRequest) {
  const response = NextResponse.next();

  // Force browsers to revalidate HTML pages on every visit
  // so new deploys (with updated GA tags, etc.) are picked up immediately.
  // This does NOT affect localStorage — only HTTP cache.
  if (request.headers.get("accept")?.includes("text/html")) {
    response.headers.set(
      "Cache-Control",
      "no-cache, no-store, must-revalidate"
    );
  }

  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|icon.png|apple-touch-icon.png).*)"],
};
