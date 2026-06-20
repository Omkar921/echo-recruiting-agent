import { NextResponse } from "next/server";

export function jsonError(err: unknown, status = 500) {
  console.error(err);
  return NextResponse.json(
    { error: err instanceof Error ? err.message : "Unknown error" },
    { status },
  );
}
