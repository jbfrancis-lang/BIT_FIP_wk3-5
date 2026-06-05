"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Building2, FileText, MailPlus, Route, Sparkles, UsersRound } from "lucide-react";

const navItems = [
  { href: "/profile", label: "학회 프로필", icon: Sparkles },
  { href: "/companies", label: "기업 찾기", icon: Building2 }
];

const workflowSteps = [
  { label: "학회 프로필", icon: Sparkles },
  { label: "기업 찾기", icon: Building2 },
  { label: "프로젝트 제안", icon: FileText },
  { label: "콜드메일 생성", icon: MailPlus }
];

export function DashboardShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <main className="min-h-screen px-4 py-5 text-slate-950 md:px-8">
      <div className="mx-auto grid max-w-7xl gap-5 lg:grid-cols-[272px_1fr]">
        <aside className="h-fit rounded-lg border border-slate-200 bg-white p-4 shadow-sm lg:sticky lg:top-5">
          <Link href="/profile" className="flex items-center gap-3">
            <div className="grid h-10 w-10 place-items-center rounded-lg bg-slate-950 text-white shadow-sm">
              <UsersRound size={20} />
            </div>
            <div className="min-w-0">
              <p className="truncate text-lg font-bold">SocietyBridge AI</p>
              <p className="text-xs font-medium text-slate-500">학회용 산학협력 아웃리치</p>
            </div>
          </Link>

          <nav className="mt-6 grid gap-2">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`);

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex min-h-11 items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-semibold transition ${
                    isActive
                      ? "bg-slate-950 text-white shadow-sm"
                      : "text-slate-600 hover:bg-slate-100 hover:text-slate-950"
                  }`}
                >
                  <span className={`grid h-7 w-7 place-items-center rounded-md ${isActive ? "bg-white/10" : "bg-white"}`}>
                    <Icon size={17} />
                  </span>
                  <span className="truncate">{item.label}</span>
                </Link>
              );
            })}
          </nav>

          <div className="mt-6 rounded-lg border border-teal-100 bg-teal-50/70 p-3 text-xs leading-5 text-slate-700">
            <p className="font-bold text-teal-900">운영 원칙</p>
            <p className="mt-1">최상위 작업은 학회 프로필 입력과 기업 찾기입니다. 제안서와 콜드메일은 기업 찾기 이후의 하위 흐름에서 작성합니다.</p>
          </div>

          <div className="mt-3 rounded-lg border border-slate-200 bg-slate-50 p-3">
            <div className="flex items-center gap-2 text-xs font-bold text-slate-900">
              <Route size={15} className="text-teal-800" />
              산학협력 작업 흐름
            </div>
            <div className="mt-3 grid gap-2">
              {workflowSteps.map((step, index) => {
                const Icon = step.icon;
                return (
                <div key={step.label} className="flex items-center gap-2 text-xs font-semibold text-slate-600">
                  <span className="grid h-5 w-5 shrink-0 place-items-center rounded-full bg-white text-[11px] text-teal-800 ring-1 ring-slate-200">
                    {index + 1}
                  </span>
                  <Icon size={13} className="text-slate-400" />
                  <span>{step.label}</span>
                </div>
              );
              })}
            </div>
          </div>
        </aside>

        <section className="min-w-0 pb-8">{children}</section>
      </div>
    </main>
  );
}
