import Link from "next/link";
import { AuthForm } from "@/features/auth/auth-form";

export default function RegisterPage() {
  return (
    <main className="mx-auto grid min-h-dvh max-w-6xl items-center gap-10 px-5 py-10 lg:grid-cols-2">
      <div className="space-y-5">
        <Link href="/" className="text-sm font-semibold text-stone-700">
          Luma Album
        </Link>
        <h1 className="text-4xl font-semibold tracking-normal text-stone-950 md:text-6xl">Create your first event album</h1>
        <p className="max-w-xl text-lg leading-8 text-stone-600">
          Start with a host account. Guests will join through a QR link later without installing an app.
        </p>
      </div>
      <AuthForm mode="register" />
    </main>
  );
}
