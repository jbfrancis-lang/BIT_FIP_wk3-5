"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BarChart3, Bookmark, Building2, FileText, MailPlus, Route, Sparkles, UsersRound } from "lucide-react";

const navItems = [
  { href: "/profile", label: "학회 프로필", icon: Sparkles },
  { href: "/analysis", label: "기업 문제 분석", icon: BarChart3 },
  { href: "/companies", label: "기업 찾기", icon: Building2 },
  { href: "/proposal", label: "프로젝트 제안", icon: FileText },
  { href: "/email", label: "콜드 이메일", icon: MailPlus },
  { href: "/saved", label: "저장한 기업", icon: Bookmark }
];

const workflowSteps = ["기업 발굴", "담당자/연락 루트", "제안/메일 생성", "저장/후속 관리"];

export function DashboardShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <main className="min-h-screen px-4 py-5 text-slate-950 md:px-8">
      <div className="mx-auto grid max-w-7xl gap-5 lg:grid-cols-[272px_1fr]">
        <aside className="h-fit rounded-lg border border-slate-200 bg-white p-4 shadow-sm lg:sticky lg:top-5">
          <Link href="/" className="flex items-center gap-3">
            <div className="grid h-10 w-10 place-items-center rounded-lg bg-slate-950 text-white shadow-sm">
              <UsersRound size={20} />
            </div>
            <div className="min-w-0">
              <p className="truncate text-lg font-bold">SocietyBridge AI</p>
              <p className="text-xs font-medium text-slate-500">학회용 기업 협업 발굴</p>
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
            <p className="mt-1">학회와 학생 조직의 기업 협업 컨택에 집중합니다. 공개된 정보와 사용자가 제공한 자료만 활용합니다.</p>
          </div>

          <div className="mt-3 rounded-lg border border-slate-200 bg-slate-50 p-3">
            <div className="flex items-center gap-2 text-xs font-bold text-slate-900">
              <Route size={15} className="text-teal-800" />
              산학협력 수주 흐름
            </div>
            <div className="mt-3 grid gap-2">
              {workflowSteps.map((step, index) => (
                <div key={step} className="flex items-center gap-2 text-xs font-semibold text-slate-600">
                  <span className="grid h-5 w-5 shrink-0 place-items-center rounded-full bg-white text-[11px] text-teal-800 ring-1 ring-slate-200">
                    {index + 1}
                  </span>
                  <span>{step}</span>
                </div>
              ))}
            </div>
          </div>
        </aside>

        <section className="min-w-0 pb-8">{children}</section>
      </div>
    </main>
  );
}
