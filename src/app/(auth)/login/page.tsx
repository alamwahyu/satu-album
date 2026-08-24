import Link from "next/link";
import { AuthForm } from "@/features/auth/auth-form";

export default function LoginPage() {
  return (
    <main className="mx-auto grid min-h-dvh max-w-6xl items-center gap-10 px-5 py-10 lg:grid-cols-2">
      <div className="space-y-5">
        <Link href="/" className="text-sm font-semibold text-stone-700">
          Luma Album
        </Link>
        <h1 className="text-4xl font-semibold tracking-normal text-stone-950 md:text-6xl">Host workspace</h1>
        <p className="max-w-xl text-lg leading-8 text-stone-600">
          Manage event setup, guest limits, reveal mode, QR distribution, and album operations from one focused dashboard.
        </p>
      </div>
      <AuthForm mode="login" />
    </main>
  );
}
