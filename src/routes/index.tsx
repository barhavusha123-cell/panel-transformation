import { createFileRoute } from "@tanstack/react-router";
import { AllNetProvider, useAllNet } from "@/lib/allnet/store";
import { LoginScreen } from "@/components/allnet/LoginScreen";
import { TopBar } from "@/components/allnet/TopBar";
import { EmployeePortal } from "@/components/allnet/EmployeePortal";
import { AdminConsole } from "@/components/allnet/AdminConsole";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "AllNet — מערכת ניהול פרויקטים ותפעול" },
      {
        name: "description",
        content:
          "מערכת AllNet לניהול פרויקטים, דיווח שעות, ניהול קבלני משנה ומסמכים ארגוניים בממשק מתקדם.",
      },
      { property: "og:title", content: "AllNet — מערכת ניהול פרויקטים ותפעול" },
      {
        property: "og:description",
        content: "ניהול פרויקטים, דיווח שעות ומסמכים בממשק מתקדם ומאובטח.",
      },
    ],
  }),
  component: Index,
});

function Shell() {
  const { session, hydrated } = useAllNet();

  if (!hydrated) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="shimmer-line size-14 rounded-2xl bg-surface-2" />
      </div>
    );
  }

  if (!session) return <LoginScreen />;

  return (
    <div className="min-h-screen">
      <TopBar />
      <div className="animate-fade mx-auto w-full max-w-7xl px-4 pb-16 pt-6">
        {session.kind === "admin" ? <AdminConsole /> : <EmployeePortal />}
      </div>
    </div>
  );
}

function Index() {
  return (
    <AllNetProvider>
      <Shell />
    </AllNetProvider>
  );
}
