"use client";
import { useActionState } from "react";
import { signInWithEmail, signInWithGoogle } from "@/app/auth/actions";
import { Button, Input } from "@/components/ui/button";

export default function LoginPage() {
  const [state, action, pending] = useActionState(signInWithEmail, null);
  return (
    <main className="mx-auto flex min-h-dvh max-w-sm flex-col justify-center px-6">
      <h1 className="font-display text-6xl font-bold leading-[0.9]">Alpha<br />Life OS</h1>
      <p className="mt-3 text-muted">Training, nutrition, and money on one scoreboard.</p>

      {state && "sent" in state ? (
        <p className="glass mt-10 rounded-2xl p-4">Check {state.sent} for your sign-in link.</p>
      ) : (
        <form action={action} className="mt-10 space-y-3">
          <Input name="email" type="email" autoComplete="email" placeholder="you@example.com" required aria-label="Email" />
          <Button className="w-full" disabled={pending}>{pending ? "Sending link…" : "Email me a sign-in link"}</Button>
          {state && "error" in state && <p className="text-sm text-warn">{state.error}</p>}
        </form>
      )}

      <form action={signInWithGoogle} className="mt-3">
        <Button variant="ghost" className="w-full">Continue with Google</Button>
      </form>
    </main>
  );
}
