import Link from "next/link";
import { ArrowRight, Building2, FileText, MailPlus, Sparkles } from "lucide-react";

import { DashboardShell } from "@/components/DashboardShell";
import { PageHeader } from "@/components/ui";

const primaryActions = [
  {
    href: "/profile",
    title: "학회 프로필",
    description: "학회 소개, 활동 이력, 역량, 관심 산업을 입력하고 기업 협업 관점의 기본 분석을 만듭니다.",
    icon: Sparkles,
    cta: "프로필 입력하기"
  },
  {
    href: "/companies",
    title: "기업 찾기",
    description: "기업 분석을 확인하고, 각 기업별 프로젝트 제안과 콜드메일 생성으로 이어집니다.",
    icon: Building2,
    cta: "기업 후보 보기"
  }
];

const nestedFlow = [
  { label: "기업 분석", description: "문제 상황, 추천 부서, 컨택 루트 확인" },
  { label: "프로젝트 제안", description: "내외부 환경 근거를 바탕으로 제안서 작성" },
  { label: "콜드메일 생성", description: "동일한 근거를 바탕으로 공식 메시지 작성" }
];

export default function HomePage() {
  return (
    <DashboardShell>
      <PageHeader
        eyebrow="작업 시작"
        title="학회 프로필을 정리하고, 바로 기업을 찾습니다"
        description="랜딩 페이지 없이 핵심 작업만 남겼습니다. 먼저 학회 정보를 입력한 뒤 기업 찾기에서 기업 분석, 프로젝트 제안, 콜드메일 생성으로 내려가세요."
      />

      <div className="grid gap-4 lg:grid-cols-2">
        {primaryActions.map((item) => {
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className="group rounded-lg border border-slate-200 bg-white p-6 shadow-sm transition hover:-translate-y-0.5 hover:border-teal-200 hover:shadow-md"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="grid h-12 w-12 place-items-center rounded-lg bg-slate-950 text-white">
                  <Icon size={22} />
                </div>
                <ArrowRight className="text-slate-300 transition group-hover:translate-x-1 group-hover:text-teal-700" size={20} />
              </div>
              <h2 className="mt-5 text-2xl font-bold text-slate-950">{item.title}</h2>
              <p className="mt-3 text-sm leading-6 text-slate-600">{item.description}</p>
              <p className="mt-5 inline-flex items-center gap-2 text-sm font-bold text-teal-800">
                {item.cta}
                <ArrowRight size={15} />
              </p>
            </Link>
          );
        })}
      </div>

      <section className="mt-5 rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex items-center gap-2 text-sm font-bold text-slate-950">
          <Building2 size={17} className="text-teal-800" />
          기업 찾기 하위 구조
        </div>
        <div className="mt-4 grid gap-3 md:grid-cols-3">
          {nestedFlow.map((item, index) => (
            <div key={item.label} className="rounded-md border border-slate-200 bg-slate-50 p-4">
              <div className="flex items-center gap-2">
                <span className="grid h-6 w-6 place-items-center rounded-full bg-white text-xs font-bold text-teal-800 ring-1 ring-slate-200">
                  {index + 1}
                </span>
                <p className="text-sm font-bold text-slate-950">{item.label}</p>
              </div>
              <p className="mt-2 text-sm leading-6 text-slate-600">{item.description}</p>
            </div>
          ))}
        </div>
        <div className="mt-4 flex flex-wrap gap-2 text-xs font-semibold text-slate-500">
          <span className="inline-flex items-center gap-1 rounded-md bg-slate-50 px-2.5 py-1">
            <FileText size={13} /> 제안서는 기업별 세부 작업
          </span>
          <span className="inline-flex items-center gap-1 rounded-md bg-slate-50 px-2.5 py-1">
            <MailPlus size={13} /> 콜드메일도 기업별 세부 작업
          </span>
        </div>
      </section>
    </DashboardShell>
  );
}
