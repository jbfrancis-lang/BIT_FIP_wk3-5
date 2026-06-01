"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { AlertCircle, CheckCircle2, Clipboard, ExternalLink, FileText, MailPlus, Route, Trash2 } from "lucide-react";

import { DashboardShell } from "@/components/DashboardShell";
import { EmptyState, FitScore, PageHeader } from "@/components/ui";
import { savedCompanyStatusLabels } from "@/lib/labels";
import { readSavedCompanies, writeSavedCompanies } from "@/lib/storage";
import type { ContactRoute, SavedCompany, SavedCompanyStatus } from "@/lib/types";

type StatusFilter = "all" | SavedCompanyStatus;

const statusOrder: SavedCompanyStatus[] = [
  "follow_up_needed",
  "not_contacted",
  "contacted",
  "replied",
  "meeting_scheduled",
  "rejected"
];

export default function SavedPage() {
  const [companies, setCompanies] = useState<SavedCompany[]>([]);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [copiedId, setCopiedId] = useState("");

  useEffect(() => {
    setCompanies(readSavedCompanies());
  }, []);

  const visibleCompanies = companies
    .filter((company) => statusFilter === "all" || company.status === statusFilter)
    .sort((a, b) => {
      const statusGap = statusOrder.indexOf(a.status) - statusOrder.indexOf(b.status);
      if (statusGap !== 0) return statusGap;
      return b.fitScore - a.fitScore;
    });

  const summary = {
    total: companies.length,
    needsAction: companies.filter((company) => ["not_contacted", "contacted", "follow_up_needed"].includes(company.status)).length,
    inConversation: companies.filter((company) => ["replied", "meeting_scheduled"].includes(company.status)).length,
    archived: companies.filter((company) => company.status === "rejected").length
  };

  function removeCompany(id: string) {
    const next = companies.filter((company) => company.id !== id);
    setCompanies(next);
    writeSavedCompanies(next);
  }

  function updateNotes(id: string, notes: string) {
    const next = companies.map((company) => (company.id === id ? { ...company, notes } : company));
    setCompanies(next);
    writeSavedCompanies(next);
  }

  function updateStatus(id: string, status: SavedCompanyStatus) {
    const next = companies.map((company) => (company.id === id ? { ...company, status } : company));
    setCompanies(next);
    writeSavedCompanies(next);
  }

  async function copyEmail(company: SavedCompany) {
    if (!company.generatedColdEmail) return;
    await navigator.clipboard.writeText(company.generatedColdEmail);
    setCopiedId(company.id);
    window.setTimeout(() => setCopiedId(""), 1600);
  }

  return (
    <DashboardShell>
      <PageHeader
        eyebrow="저장한 기업"
        title="기업 발굴부터 후속 연락까지 한 보드에서 관리합니다"
        description="저장한 기업의 상태, 다음 액션, 연락 루트, 제안/메일 생성 여부, 메모를 기준으로 산학협력 아웃리치 흐름을 관리합니다."
      />

      {companies.length === 0 ? (
        <EmptyState title="저장한 기업이 없습니다" description="기업 카드, 상세 화면, 이메일 생성 화면에서 저장하면 후속 관리 보드가 만들어집니다." />
      ) : (
        <div className="grid gap-4">
          <section className="grid gap-3 md:grid-cols-4">
            <PipelineStat label="전체 저장 기업" value={`${summary.total}개`} detail="관리 중인 기업 후보" />
            <PipelineStat label="오늘 확인할 기업" value={`${summary.needsAction}개`} detail="미연락/후속 대상" tone="amber" />
            <PipelineStat label="응답 이후 단계" value={`${summary.inConversation}개`} detail="답변 또는 미팅 예정" tone="green" />
            <PipelineStat label="종료/보류" value={`${summary.archived}개`} detail="거절 또는 후순위" tone="slate" />
          </section>

          <section className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <p className="text-sm font-bold text-slate-950">아웃리치 운영 순서</p>
                <p className="mt-1 text-sm text-slate-600">기업을 저장한 뒤, 연락 루트 확인 → 제안/메일 생성 → 발송 → 후속 상태 업데이트 순서로 관리하세요.</p>
              </div>
              <label className="grid gap-1 text-sm font-semibold text-slate-700 sm:min-w-56">
                상태 필터
                <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value as StatusFilter)} className="input">
                  <option value="all">전체 보기</option>
                  {Object.entries(savedCompanyStatusLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                </select>
              </label>
            </div>
          </section>

          {visibleCompanies.length === 0 ? (
            <EmptyState title="해당 상태의 기업이 없습니다" description="상태 필터를 변경하거나 기업을 추가 저장해 주세요." />
          ) : null}

          {visibleCompanies.map((company) => {
            const action = nextActionFor(company);
            const routes = contactRoutesFor(company);
            const followUpNeeded = needsFollowUp(company.status);

            return (
            <article key={company.id} className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="text-lg font-bold text-slate-950">{company.companyName}</h2>
                    <span className="rounded-md bg-cyan-50 px-2 py-1 text-xs font-semibold text-cyan-800">{company.industry}</span>
                    <span className={`rounded-md px-2 py-1 text-xs font-bold ${statusTone(company.status)}`}>
                      {savedCompanyStatusLabels[company.status]}
                    </span>
                    {followUpNeeded ? (
                      <span className="inline-flex items-center gap-1 rounded-md bg-amber-50 px-2 py-1 text-xs font-bold text-amber-800">
                        <AlertCircle size={13} />
                        후속 필요
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 rounded-md bg-slate-50 px-2 py-1 text-xs font-bold text-slate-600">
                        <CheckCircle2 size={13} />
                        상태 기록됨
                      </span>
                    )}
                  </div>
                  <p className="mt-1 text-xs text-slate-500">저장일: {new Date(company.savedAt).toLocaleString("ko-KR")}</p>
                </div>
                <FitScore score={company.fitScore} />
              </div>

              <div className="mt-4 rounded-lg border border-teal-100 bg-teal-50/80 p-4">
                <div className="flex items-start gap-3">
                  <div className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-white text-teal-800 shadow-sm">
                    <Route size={18} />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-teal-950">다음 액션</p>
                    <p className="mt-1 text-sm leading-6 text-slate-700">{action}</p>
                  </div>
                </div>
              </div>

              <div className="mt-4 grid gap-3 md:grid-cols-2">
                <Info title="문제 상황" value={company.problemSituation} />
                <Info title="프로젝트 제안 방향" value={company.projectProposalDirection} />
              </div>

              <div className="mt-4 rounded-lg border border-slate-200 bg-slate-50 p-4">
                <p className="text-sm font-bold text-slate-950">실무 연락 루트</p>
                <div className="mt-3 flex flex-wrap gap-2 text-sm">
                  {routes.map((route) => (
                    <a key={`${route.label}-${route.url}`} className="contact-link bg-white" href={route.url} target={route.url.startsWith("mailto:") ? undefined : "_blank"} rel="noreferrer" title={route.description}>
                      {route.label} <ExternalLink size={14} />
                    </a>
                  ))}
                </div>
                <p className="mt-2 text-xs leading-5 text-slate-500">
                  {company.contactChannel.publicEmail
                    ? "공개 이메일이 있는 경우 이메일 발송을 우선 검토하고, 없는 경우 공식 문의 페이지와 담당 부서 검색을 병행하세요."
                    : "검증된 공개 이메일이 없으면 공식 문의 페이지, 제휴/파트너십 폼, LinkedIn 검색 링크를 통해 담당 루트를 확인하세요."}
                </p>
              </div>

              {company.generatedColdEmail ? (
                <div className="mt-4 rounded-md bg-slate-50 p-4">
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                    <p className="text-sm font-bold text-slate-950">생성된 콜드 이메일</p>
                    <button type="button" onClick={() => copyEmail(company)} className="inline-flex items-center justify-center gap-2 rounded-md border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50">
                      <Clipboard size={14} />
                      {copiedId === company.id ? "복사 완료" : "이메일 복사"}
                    </button>
                  </div>
                  <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-slate-700">{company.generatedColdEmail}</p>
                </div>
              ) : (
                <div className="mt-4 rounded-md border border-dashed border-slate-300 bg-slate-50 p-4 text-sm leading-6 text-slate-600">
                  아직 저장된 콜드메일이 없습니다. 이메일 생성 화면에서 이 기업을 선택해 공식 톤의 1차 메일과 후속 메일을 생성할 수 있습니다.
                </div>
              )}

              <div className="mt-4 grid gap-4 md:grid-cols-[240px_1fr]">
                <label className="grid gap-2 text-sm font-medium text-slate-700">
                  상태
                  <select value={company.status} onChange={(event) => updateStatus(company.id, event.target.value as SavedCompanyStatus)} className="input">
                    {Object.entries(savedCompanyStatusLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                  </select>
                </label>
                <label className="grid gap-2 text-sm font-medium text-slate-700">
                  메모
                  <textarea value={company.notes} onChange={(event) => updateNotes(company.id, event.target.value)} className="input min-h-24 resize-y" />
                </label>
              </div>

              <div className="mt-4 flex flex-wrap justify-between gap-2 border-t border-slate-100 pt-4">
                <div className="flex flex-wrap gap-2">
                  <Link href={`/company/${company.companyId}`} className="rounded-md border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50">
                    상세 보기
                  </Link>
                  <Link href={`/proposal?company=${company.companyId}`} className="inline-flex items-center gap-2 rounded-md border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50">
                    <FileText size={16} />
                    제안서 생성
                  </Link>
                  <Link href={`/email?company=${company.companyId}`} className="inline-flex items-center gap-2 rounded-md bg-cyan-950 px-3 py-2 text-sm font-semibold text-white hover:bg-cyan-900">
                    <MailPlus size={16} />
                    콜드메일 생성
                  </Link>
                </div>
                <button type="button" onClick={() => removeCompany(company.id)} className="inline-flex items-center gap-2 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm font-semibold text-red-700 hover:bg-red-100">
                  <Trash2 size={16} />
                  삭제
                </button>
              </div>
            </article>
          );
          })}
        </div>
      )}
    </DashboardShell>
  );
}

function PipelineStat({ label, value, detail, tone = "cyan" }: { label: string; value: string; detail: string; tone?: "cyan" | "amber" | "green" | "slate" }) {
  const toneClass = {
    cyan: "border-cyan-100 bg-cyan-50 text-cyan-900",
    amber: "border-amber-100 bg-amber-50 text-amber-900",
    green: "border-emerald-100 bg-emerald-50 text-emerald-900",
    slate: "border-slate-200 bg-slate-50 text-slate-900"
  }[tone];

  return (
    <div className={`rounded-lg border p-4 shadow-sm ${toneClass}`}>
      <p className="text-xs font-bold opacity-75">{label}</p>
      <p className="mt-2 text-2xl font-bold">{value}</p>
      <p className="mt-1 text-xs font-semibold opacity-70">{detail}</p>
    </div>
  );
}

function Info({ title, value }: { title: string; value: string }) {
  return (
    <div className="rounded-md bg-slate-50 p-3">
      <p className="text-sm font-bold text-slate-950">{title}</p>
      <p className="mt-2 text-sm leading-6 text-slate-600">{value}</p>
    </div>
  );
}

function contactRoutesFor(company: SavedCompany) {
  const routes: ContactRoute[] = [];
  const existing = company.contactChannel.routes ?? [];
  routes.push(...existing);

  if (company.contactChannel.publicEmail) {
    routes.unshift({
      type: "official_contact",
      label: `공개 이메일: ${company.contactChannel.publicEmail}`,
      url: `mailto:${company.contactChannel.publicEmail}`,
      description: "공개 이메일 주소입니다."
    });
  }

  if (company.contactChannel.contactPage) {
    routes.push({
      type: "official_contact",
      label: "공식 문의 페이지",
      url: company.contactChannel.contactPage,
      description: "공식 사이트에서 확인 가능한 문의 접점입니다."
    });
  }

  if (company.contactChannel.website) {
    routes.push({
      type: "official_contact",
      label: "공식 웹사이트",
      url: company.contactChannel.website,
      description: "회사 공식 웹사이트입니다."
    });
  }

  if (company.contactChannel.linkedinUrl) {
    routes.push({
      type: "linkedin_company",
      label: "LinkedIn 회사 페이지",
      url: company.contactChannel.linkedinUrl,
      description: "직접 스크래핑하지 않고 공개 회사 페이지로 이동합니다."
    });
  }

  const unique = new Map<string, ContactRoute>();
  routes.forEach((route) => unique.set(route.url, route));
  return Array.from(unique.values());
}

function nextActionFor(company: SavedCompany) {
  const actionMap: Record<SavedCompanyStatus, string> = {
    not_contacted: "담당 부서와 공개 연락 루트를 확인한 뒤 1차 콜드메일 또는 공식 문의를 발송하세요.",
    contacted: "발송 후 3~5영업일이 지났다면 후속 메일을 보내고, 보낸 날짜와 반응을 메모에 남기세요.",
    replied: "답변 내용을 기준으로 미팅 목적, 제안서 첨부 여부, 요청 자료를 정리하세요.",
    meeting_scheduled: "미팅 전 기업 문제 가설, 제안 범위, 기대 산출물을 1페이지로 준비하세요.",
    rejected: "거절 사유를 메모에 남기고 유사 산업의 다른 기업 후보로 학습을 이전하세요.",
    follow_up_needed: "후속 메일을 우선 발송하세요. 첫 메일의 제안 방향을 짧게 상기시키고 낮은 부담의 CTA를 제시하는 것이 좋습니다."
  };
  return actionMap[company.status];
}

function needsFollowUp(status: SavedCompanyStatus) {
  return status === "follow_up_needed" || status === "contacted" || status === "not_contacted";
}

function statusTone(status: SavedCompanyStatus) {
  const toneMap: Record<SavedCompanyStatus, string> = {
    not_contacted: "bg-slate-100 text-slate-700",
    contacted: "bg-amber-50 text-amber-800",
    replied: "bg-emerald-50 text-emerald-800",
    meeting_scheduled: "bg-cyan-50 text-cyan-800",
    rejected: "bg-red-50 text-red-700",
    follow_up_needed: "bg-orange-50 text-orange-800"
  };
  return toneMap[status];
}
