import bcrypt from "bcryptjs";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { createSession } from "@/lib/auth/session";
import { handleApiError, jsonError } from "@/lib/http/api";
import { loginSchema } from "@/lib/validation/auth";

export async function POST(request: Request) {
  try {
    const input = loginSchema.parse(await request.json());
    const user = await prisma.user.findUnique({ where: { email: input.email.toLowerCase() } });
    if (!user || user.deletedAt || user.disabledAt) return jsonError("Invalid email or password.", 401, "INVALID_LOGIN");

    const valid = await bcrypt.compare(input.password, user.passwordHash);
    if (!valid) return jsonError("Invalid email or password.", 401, "INVALID_LOGIN");

    const sessionUser = { id: user.id, email: user.email, name: user.name, role: user.role };
    await createSession(sessionUser);
    return NextResponse.json({ user: sessionUser });
  } catch (error) {
    return handleApiError(error);
  }
}
