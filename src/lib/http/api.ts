import { NextResponse } from "next/server";
import { ZodError } from "zod";

export function jsonError(message: string, status = 400, code = "BAD_REQUEST") {
  return NextResponse.json({ error: { code, message } }, { status });
}

export function handleApiError(error: unknown) {
  if (error instanceof ZodError) {
    return NextResponse.json(
      { error: { code: "VALIDATION_ERROR", message: "Please check the submitted fields.", issues: error.flatten() } },
      { status: 422 }
    );
  }

  console.error(error);
  return jsonError("Something went wrong. Please try again.", 500, "INTERNAL_ERROR");
}
