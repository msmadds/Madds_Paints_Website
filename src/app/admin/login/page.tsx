import { redirect } from "next/navigation";
import { getAdminSession } from "@/lib/auth";
import { LoginForm } from "./login-form";

export const metadata = { title: "Sign in" };

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  if (await getAdminSession().catch(() => null)) redirect("/admin");
  const { next = "/admin" } = await searchParams;
  return (
    <div className="mx-auto max-w-sm px-5 pt-20">
      <p className="display text-[2.5rem]">MedePaints</p>
      <h1 className="mt-2 text-stone">Admin sign in</h1>
      <LoginForm next={next} />
    </div>
  );
}
