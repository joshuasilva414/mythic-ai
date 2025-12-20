import SignOutButton from "@/components/auth/sign-out-button";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { redirect } from "next/navigation";

export default async function Layout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth.api.getSession({
    headers: await headers(),
  });
  if (!session) {
    return redirect("/sign-in");
  }
  return (
    <div>
      <div>
        <h1>Welcome {session.user.email}</h1>
        <SignOutButton />
      </div>

      {children}
    </div>
  );
}
