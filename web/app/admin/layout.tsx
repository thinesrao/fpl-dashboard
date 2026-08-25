import { createClient } from "@/lib/supabase/server";
import { signOut } from "./actions";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  return (
    <div>
      <header className="border-b border-[--line]">
        <div className="mx-auto flex h-14 max-w-3xl items-center justify-between px-5">
          <span className="font-display">PepRoulette™ Admin</span>
          {user && (
            <form action={signOut}>
              <button className="text-sm text-[--muted] hover:text-[--ink]">Sign out</button>
            </form>
          )}
        </div>
      </header>
      {children}
    </div>
  );
}
