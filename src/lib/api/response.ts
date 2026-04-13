import { NextResponse } from "next/server";
import { AppError } from "./errors";

export function success<T>(data: T, status = 200) {
  return NextResponse.json({ success: true, data }, { status });
}

export function error(err: unknown) {
  if (err instanceof AppError) {
    return NextResponse.json(
      { success: false, error: { code: err.code, message: err.message } },
      { status: err.status }
    );
  }

  console.error("Unhandled error:", err);
  return NextResponse.json(
    { success: false, error: { code: "INTERNAL_ERROR", message: "Something went wrong" } },
    { status: 500 }
  );
}
