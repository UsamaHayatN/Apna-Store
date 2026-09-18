import Link from "next/link";
import { getSessionUser } from "@/lib/auth/session";

export async function AdminHeader() {
  const user = await getSessionUser();

  return (
    <header className="h-16 border-b border-neutral-200 bg-white px-8 flex items-center justify-between">
      <div className="flex items-center space-x-2">
        <span className="text-xs font-semibold uppercase tracking-wider text-neutral-500">
          Management Console
        </span>
      </div>

      <div className="flex items-center space-x-4">
        {user ? (
          <div className="flex items-center space-x-3 text-xs text-neutral-800">
            <span className="font-medium">{user.firstName} {user.lastName}</span>
            <span className="bg-neutral-100 text-neutral-700 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider">
              {user.role}
            </span>
          </div>
        ) : (
          <span className="text-xs text-neutral-400">
            Role Authorization: Server Enforced
          </span>
        )}
      </div>
    </header>
  );
}
