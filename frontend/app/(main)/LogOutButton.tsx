import { logout } from "@/app/lib/actions/auth";
import { getUser } from "@/app/lib/session";

export async function LogOutButton() {
  const username = await getUser();
  if (!username) return null;
  return (
    <form action={logout} className="mt-2 flex items-center gap-3 text-sm">
      <span className="text-zinc-500 dark:text-zinc-400">
        Signed in as <strong className="text-zinc-800 dark:text-zinc-200">{username}</strong>
      </span>
      <button
        type="submit"
        className="font-medium text-blue-600 hover:underline cursor-pointer"
      >
        Log out
      </button>
    </form>
  );
}
