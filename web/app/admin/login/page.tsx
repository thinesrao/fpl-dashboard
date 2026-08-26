import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { signIn } from "../actions";

export default async function LoginPage({
  searchParams,
}: { searchParams: Promise<{ error?: string }> }) {
  const { error } = await searchParams;

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (user && !user.is_anonymous) redirect("/admin/penalties");
  return (
    <main className="mx-auto flex min-h-screen max-w-sm flex-col justify-center px-5">
      <h1 className="font-display mb-6 text-2xl">Admin sign in</h1>
      {error && (
        <p className="mb-4 rounded-lg border border-[--live] bg-[rgba(255,77,109,0.1)] px-3 py-2 text-sm text-[#ff8ba3]">
          {error === "auth" ? "Wrong email or password." : "Please enter a valid email and password."}
        </p>
      )}
      <form action={signIn} className="space-y-3">
        <input name="email" type="email" placeholder="Email" required
          className="w-full rounded-lg border border-[--line] bg-[--panel] px-3 py-2 text-[--ink]" />
        <input name="password" type="password" placeholder="Password" required
          className="w-full rounded-lg border border-[--line] bg-[--panel] px-3 py-2 text-[--ink]" />
        <button type="submit"
          className="w-full rounded-lg bg-[--accent] px-4 py-2 font-semibold text-[#06231a]">
          Sign in
        </button>
      </form>
    </main>
  );
}
