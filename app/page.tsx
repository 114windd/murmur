import { getCurrentUser } from "@/lib/auth/server";
import { redirect } from "next/navigation";
import Notebook from "./notebook";
export const dynamic = "force-dynamic";
export default async function Page() {
  const user = await getCurrentUser();
  if (!user) redirect("/auth/sign-in");
  return <Notebook displayName={user.fullName || user.displayName} />;
}
