import { Sidebar } from "@/components/away/sidebar";
import { MobileNav } from "@/components/away/mobile-nav";
import { SlackBanner } from "@/components/away/slack-banner";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen min-h-dvh">
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0">
        <MobileNav />
        <main className="flex-1 px-4 py-6 lg:px-8 lg:py-8 max-w-7xl w-full mx-auto">
          <SlackBanner />
          {children}
        </main>
      </div>
    </div>
  );
}
