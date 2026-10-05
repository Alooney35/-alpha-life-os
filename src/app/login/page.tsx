"use client";
import { useActionState } from "react";
import { passwordLogin, signInWithGoogle } from "@/app/auth/actions";
import { Button, Input } from "@/components/ui/button";

export default function LoginPage() {
  const [state, action, pending] = useActionState(passwordLogin, null);
  return (
    <main className="mx-auto flex min-h-dvh max-w-sm flex-col justify-center px-6">
      <h1 className="font-display text-6xl font-bold leading-[0.9]">Alpha<br />Life OS</h1>
      <p className="mt-3 text-muted">Training, nutrition, and money on one scoreboard.</p>

      <form action={action} className="mt-10 space-y-3">
        <Input name="email" type="email" autoComplete="email" placeholder="you@example.com" required aria-label="Email" />
        <Input name="password" type="password" autoComplete="current-password" placeholder="Password" required aria-label="Password" />
        <Button className="w-full" disabled={pending}>{pending ? "Signing in…" : "Sign in"}</Button>
        {state?.error && <p className="text-sm text-warn">{state.error}</p>}
      </form>

      <form action={signInWithGoogle} className="mt-3">
        <Button variant="ghost" className="w-full">Continue with Google</Button>
      </form>
    </main>
  );
}
