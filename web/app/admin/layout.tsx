import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { signOut } from "./actions";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  return (
    <div>
      <header className="border-b border-[--line]">
        <div className="mx-auto flex h-14 max-w-3xl items-center justify-between px-5">
          <Link href="/" className="font-display hover:text-[--accent]">PepRoulette™ Admin</Link>
          <div className="flex items-center gap-4">
            <Link href="/" className="text-sm text-[--muted] hover:text-[--ink]">← Dashboard</Link>
            {user && (
              <form action={signOut}>
                <button className="text-sm text-[--muted] hover:text-[--ink]">Sign out</button>
              </form>
            )}
          </div>
        </div>
      </header>
      {children}
    </div>
  );
}
