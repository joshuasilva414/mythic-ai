"use client";
import { Button } from "@/components/ui/button";
import { signOut } from "@/lib/auth-client";

export default function SignOutButton() {
  return <Button onClick={() => signOut()}>Sign Out</Button>;
}
