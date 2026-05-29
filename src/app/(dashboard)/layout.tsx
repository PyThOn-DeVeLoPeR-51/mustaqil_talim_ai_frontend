import { TeacherGuard } from "@/components/guards/TeacherGuard";
import { AppSidebar } from "@/components/shell/app-sidebar";
import { Topbar } from "@/components/shell/topbar";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <TeacherGuard>
      <div className="min-h-screen bg-muted/30">
        <div className="mx-auto flex w-full max-w-[1800px] gap-4 px-4 py-6 xl:px-6">
          <aside className="hidden w-64 shrink-0 md:block">
            <AppSidebar />
          </aside>

          <div className="flex min-w-0 flex-1 flex-col gap-4">
            <Topbar />
            <div className="rounded-xl border bg-background p-5 shadow-sm lg:p-6">{children}</div>
          </div>
        </div>
      </div>
    </TeacherGuard>
  );
}
