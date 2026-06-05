"use client";

import { Badge } from "@/components/ui";
import { fallbackAnalyzeEnvironment } from "@/lib/fallbacks";
import type { CompanyLead, CompanyScore, EnvironmentAnalysis, SocietyAnalysis, SocietyProfileInput } from "@/lib/types";

type EvidencePanelProps = {
  society: SocietyProfileInput | null;
  analysis: SocietyAnalysis | null;
  environmentAnalysis: EnvironmentAnalysis | null;
  company: CompanyLead | null;
  scoreContext?: CompanyScore | null;
  mode: "proposal" | "email";
};

export function EvidencePanel({ society, analysis, environmentAnalysis, company, scoreContext, mode }: EvidencePanelProps) {
  const environment = environmentAnalysis || (society && analysis ? fallbackAnalyzeEnvironment(society, analysis) : null);
  const modeLabel = mode === "proposal" ? "프로젝트 제안" : "콜드메일";

  if (!society || !analysis || !company || !environment) {
    return (
      <section className="rounded-lg border border-dashed border-slate-300 bg-white/80 p-5 shadow-sm">
        <p className="text-sm font-bold text-slate-950">내외부 환경 분석 기반 근거 자료</p>
        <p className="mt-2 text-sm leading-6 text-slate-600">
          학회 프로필과 기업을 선택하면 {modeLabel}에 활용할 기업 문제 상황, 외부 시장 압력, 협업 근거가 이 영역에 표시됩니다.
        </p>
      </section>
    );
  }

  const internalSignals = [
    ...environment.internal_environment_analysis.current_growth_challenges.slice(0, 2),
    ...environment.internal_environment_analysis.customer_or_user_frictions.slice(0, 1)
  ];
  const externalSignals = [
    ...environment.external_environment_analysis.market_trends.slice(0, 2),
    ...environment.external_environment_analysis.company_side_pain_points.slice(0, 1)
  ];
  const actionPoints = [
    scoreContext?.solvableArea || `${analysis.core_capabilities.slice(0, 3).join(", ")} 역량으로 문제 정의와 실행 제안까지 연결할 수 있습니다.`,
    scoreContext?.whyOurSociety || analysis.outreach_positioning,
    scoreContext?.recommendedProjectDirection || company.notes
  ].filter(Boolean);

  return (
    <section className="rounded-lg border border-teal-100 bg-teal-50/70 p-5 shadow-sm">
      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div>
          <p className="text-sm font-bold text-teal-900">내외부 환경 분석 기반 근거 자료</p>
          <h2 className="mt-1 text-xl font-bold text-slate-950">
            {company.name} {modeLabel}의 판단 근거
          </h2>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-700">
            독립 분석 페이지로 이동하지 않고, 지금 작성하는 산출물 안에서 기업 문제 가설과 협업 논리를 바로 확인합니다.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Badge tone="cyan">{company.industry}</Badge>
          <Badge tone="green">{company.suggestedDepartment}</Badge>
          {scoreContext?.priorityTier ? <Badge tone="amber">{scoreContext.priorityTier}</Badge> : null}
        </div>
      </div>

      <div className="mt-4 grid gap-3 lg:grid-cols-4">
        <EvidenceBlock title="기업 문제 가설" items={company.likelyNeeds.slice(0, 3)} />
        <EvidenceBlock title="내부 환경 신호" items={internalSignals} />
        <EvidenceBlock title="외부 환경 신호" items={externalSignals} />
        <EvidenceBlock title="산출물 반영 포인트" items={actionPoints.slice(0, 3)} />
      </div>

      <div className="mt-4 rounded-md border border-teal-100 bg-white/70 p-3">
        <p className="text-xs font-bold text-teal-800">타깃 선정 로직</p>
        <p className="mt-1 text-sm leading-6 text-slate-700">
          {environment.external_environment_analysis.recommended_target_selection_logic}
        </p>
      </div>
    </section>
  );
}

function EvidenceBlock({ title, items }: { title: string; items: string[] }) {
  return (
    <div className="rounded-md border border-teal-100 bg-white p-3">
      <p className="text-xs font-bold text-slate-500">{title}</p>
      <ul className="mt-2 space-y-1.5 text-sm leading-5 text-slate-700">
        {items.map((item) => (
          <li key={item}>· {item}</li>
        ))}
      </ul>
    </div>
  );
}
