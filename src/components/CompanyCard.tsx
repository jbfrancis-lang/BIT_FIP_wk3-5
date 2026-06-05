"use client";

import Link from "next/link";
import { BookmarkPlus, ExternalLink, FileText, MailPlus, Users } from "lucide-react";

import { Badge, FitScore } from "@/components/ui";
import { buildRecipientFit, contactAvailability } from "@/lib/contactRoutes";
import { collaborationTypeLabels, companySizeLabels } from "@/lib/labels";
import { readSavedCompanies, writeSavedCompanies } from "@/lib/storage";
import type { CompanyLead, CompanyScore, SavedCompany } from "@/lib/types";

export function CompanyCard({ company, score }: { company: CompanyLead; score: CompanyScore | null }) {
  const recipientFit = buildRecipientFit(company, score);

  function handleSave() {
    const saved: SavedCompany = {
      id: `${company.id}-${Date.now()}`,
      companyId: company.id,
      companyName: company.name,
      industry: company.industry,
      fitScore: score?.fitScore ?? 0,
      problemSituation: score?.expectedCompanyProblem || company.likelyNeeds.join(", "),
      projectProposalDirection: score?.recommendedProjectDirection || company.notes,
      contactChannel: company.contact,
      generatedColdEmail: "",
      notes: "기업 카드에서 저장됨",
      status: "not_contacted",
      savedAt: new Date().toISOString()
    };
    writeSavedCompanies([saved, ...readSavedCompanies()]);
  }

  return (
    <article className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
      <div className="mb-4 flex items-center justify-between gap-3 rounded-md border border-slate-200 bg-slate-50 px-3 py-2">
        <p className="text-sm font-bold text-slate-950">기업 분석</p>
        <p className="text-xs font-semibold text-slate-500">분석 확인 후 프로젝트 제안 또는 콜드메일 생성으로 이동</p>
      </div>

      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-lg font-bold text-slate-950">{company.name}</h2>
            {score?.priorityTier ? <Badge tone="amber">{score.priorityTier}</Badge> : null}
            <Badge tone="green">{company.industry}</Badge>
            <Badge tone="cyan">{companySizeLabels[company.size]}</Badge>
          </div>
          <p className="mt-2 text-sm leading-6 text-slate-600">{company.description}</p>
        </div>
        <FitScore score={score?.fitScore ?? 0} />
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        {company.possibleCollaborationTypes.slice(0, 4).map((type) => (
          <Badge key={type}>{collaborationTypeLabels[type]}</Badge>
        ))}
        <Badge tone="amber">{company.region}</Badge>
      </div>

      <div className="mt-4 grid gap-3 md:grid-cols-2">
        <Info label="티어 분류 근거" value={score?.tierReason || "기업 후보 티어를 분류하는 중입니다."} />
        <Info label="좋은 타깃인 이유" value={score?.whyGoodTarget || "분석 대기 중입니다."} />
        <Info label="문제 상황 Fit" value={score?.environmentProblemFit || "기업 문제 상황 분석과의 연결성을 평가하는 중입니다."} />
        <Info label="예상 문제/니즈" value={score?.expectedCompanyProblem || company.likelyNeeds.join(", ")} />
        <Info label="해소 가능 영역" value={score?.solvableArea || "학회가 해소할 수 있는 영역을 정리하는 중입니다."} />
        <Info label="왜 우리 학회인가" value={score?.whyOurSociety || "학회만의 설득 논리를 정리하는 중입니다."} />
        <Info label="추천 프로젝트 방향" value={score?.recommendedProjectDirection || "분석 대기 중입니다."} />
        <Info label="추천 접촉 부서" value={company.suggestedDepartment} />
        <Info label="1순위 수신자" value={`${recipientFit.primaryDepartment} · ${recipientFit.recommendedRecipientTitle}`} />
        <Info label="전환 적합도" value={`${recipientFit.responseLikelihood} · ${recipientFit.primaryDepartment}의 ${recipientFit.recommendedRecipientTitle}에게 먼저 접근하는 것을 추천드립니다.`} />
        <Info label="응답 가능성 신호" value={recipientFit.responseSignals.slice(0, 2).join(" ")} />
        <Info label="권장 첫 문장 Hook" value={recipientFit.outreachApproach.openingHook} />
        <Info label="사용자가 해야 할 일" value={recipientFit.userActionChecklist.slice(0, 2).join(" ")} />
        <Info label="연락 가능성" value={contactAvailability(company, score?.contactAvailability)} />
      </div>

      <div className="mt-5 flex flex-col gap-3 border-t border-slate-100 pt-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="min-w-0 space-y-2 text-sm">
          <p className="text-xs font-bold text-slate-500">실제 컨택 루트</p>
          <div className="flex flex-wrap gap-2">
            {recipientFit.contactRoutePriority.slice(0, 4).map(({ route, rank, reason }) => (
              <a key={`${route.label}-${route.url}`} className="contact-link" href={route.url} target="_blank" rel="noreferrer" title={reason}>
                {route.type === "linkedin_people_search" ? <Users size={14} /> : null}
                {rank}순위 {route.label} <ExternalLink size={14} />
              </a>
            ))}
            {company.contact.publicEmail ? (
              <a className="contact-link" href={`mailto:${company.contact.publicEmail}`}>
                {company.contact.publicEmail}
              </a>
            ) : null}
          </div>
          <p className="max-w-3xl text-xs leading-5 text-slate-500">{recipientFit.firstAction}</p>
          <p className="max-w-3xl text-xs leading-5 text-slate-500">검색어 예시: {recipientFit.linkedinSearchKeywords.slice(0, 2).join(" / ")}</p>
          <p className="max-w-3xl text-xs leading-5 text-slate-500">{contactAvailability(company, score?.contactAvailability)}</p>
        </div>

        <div className="flex flex-wrap gap-2 text-sm lg:justify-end">
          {company.contact.website ? (
            <a className="contact-link" href={company.contact.website} target="_blank" rel="noreferrer">
              홈페이지 <ExternalLink size={14} />
            </a>
          ) : null}
          <button
            type="button"
            onClick={handleSave}
            className="inline-flex items-center justify-center gap-2 rounded-md border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
          >
            <BookmarkPlus size={16} />
            저장
          </button>
          <Link href={`/company/${company.id}`} className="inline-flex items-center justify-center rounded-md border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50">
            상세 보기
          </Link>
          <Link href={`/proposal?company=${company.id}`} className="inline-flex items-center justify-center gap-2 rounded-md border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50">
            <FileText size={16} />
            프로젝트 제안
          </Link>
          <Link href={`/email?company=${company.id}`} className="inline-flex items-center justify-center gap-2 rounded-md bg-cyan-950 px-3 py-2 text-sm font-semibold text-white transition hover:bg-cyan-900">
            <MailPlus size={16} />
            콜드메일 생성
          </Link>
        </div>
      </div>
    </article>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md bg-slate-50 p-3">
      <p className="text-xs font-semibold text-slate-500">{label}</p>
      <p className="mt-1 text-sm leading-6 text-slate-700">{value}</p>
    </div>
  );
}
