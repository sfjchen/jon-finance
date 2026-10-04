import { requireOwner } from "@/lib/auth";
import { AppSidebar } from "@/components/app-sidebar";

export default async function DashboardLayout({ children }: LayoutProps<"/">) {
  const { user } = await requireOwner();
  return (
    <div className="flex min-h-screen">
      <AppSidebar email={user.email ?? ""} />
      <main className="flex-1 min-w-0 pb-20 md:pb-0">
        <div className="mx-auto w-full max-w-[1280px] px-4 py-6 md:px-8 md:py-8">{children}</div>
      </main>
    </div>
  );
}
