import { logout } from "@/app/lib/actions/auth";
import { getUser } from "@/app/lib/session";

export async function LogOutButton() {
  const username = await getUser();
  if (!username) return null;

  return (
    <form action={logout} className="flex items-center gap-3">
      <span className="type-body-sm text-xs text-on-surface-variant">
        Signed in as{" "}
        <strong className="font-semibold text-on-surface">{username}</strong>
      </span>
      <button
        type="submit"
        className="type-label-lg cursor-pointer rounded-full border border-ghost-border-strong bg-surface-container-lowest px-3.5 py-1 text-xs text-on-surface-variant shadow-xs transition-colors hover:bg-surface-container-low hover:text-on-surface"
      >
        Log out
      </button>
    </form>
  );
}
