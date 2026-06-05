"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { BookmarkPlus, Clipboard, Loader2, Send } from "lucide-react";

import { DashboardShell } from "@/components/DashboardShell";
import { EvidencePanel } from "@/components/EvidencePanel";
import { EmptyState, ErrorBox, PageHeader, PrimaryButton } from "@/components/ui";
import { emailCtaLabels, emailLengthLabels, emailPurposeLabels, emailToneLabels } from "@/lib/labels";
import { companyPool, findCompanyById } from "@/lib/mockData";
import { readSavedCompanies, readSocietyState, saveLatestColdEmail, writeSavedCompanies } from "@/lib/storage";
import type { ColdEmailOutput, CompanyScore, EmailCta, EmailLength, EmailPurpose, EmailTone, EnvironmentAnalysis, SavedCompany, SocietyAnalysis, SocietyProfileInput } from "@/lib/types";

export default function EmailPage() {
  return (
    <Suspense fallback={<DashboardShell><EmptyState title="불러오는 중입니다" description="콜드 이메일 생성 화면을 준비하고 있습니다." /></DashboardShell>}>
      <EmailContent />
    </Suspense>
  );
}

function EmailContent() {
  const searchParams = useSearchParams();
  const initialCompanyId = searchParams.get("company") || companyPool[0]?.id || "";
  const [society, setSociety] = useState<SocietyProfileInput | null>(null);
  const [analysis, setAnalysis] = useState<SocietyAnalysis | null>(null);
  const [environmentAnalysis, setEnvironmentAnalysis] = useState<EnvironmentAnalysis | null>(null);
  const [companyId, setCompanyId] = useState(initialCompanyId);
  const [purpose, setPurpose] = useState<EmailPurpose>("industry_academic_collaboration");
  const [tone, setTone] = useState<EmailTone>("student_organization");
  const [length, setLength] = useState<EmailLength>("short_email");
  const [cta, setCta] = useState<EmailCta>("request_meeting");
  const [recipientName, setRecipientName] = useState("");
  const [senderName, setSenderName] = useState("");
  const [senderRole, setSenderRole] = useState("");
  const [senderEmail, setSenderEmail] = useState("");
  const [senderPhone, setSenderPhone] = useState("");
  const [projectPeriod, setProjectPeriod] = useState("");
  const [societyOutreachIntro, setSocietyOutreachIntro] = useState("");
  const [collaborationHistorySummary, setCollaborationHistorySummary] = useState("");
  const [societyOutreachStrength, setSocietyOutreachStrength] = useState("");
  const [optionalAttachmentMention, setOptionalAttachmentMention] = useState("");
  const [recipientRoleHint, setRecipientRoleHint] = useState("");
  const [warmConnectionHint, setWarmConnectionHint] = useState("");
  const [linkedinActivityHint, setLinkedinActivityHint] = useState("");
  const [openingHookMemo, setOpeningHookMemo] = useState("");
  const [scoreContext, setScoreContext] = useState<CompanyScore | null>(null);
  const [output, setOutput] = useState<ColdEmailOutput | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  const selectedCompany = useMemo(() => findCompanyById(companyId) || null, [companyId]);

  useEffect(() => {
    const stored = readSocietyState();
    setSociety(stored.society);
    setAnalysis(stored.analysis);
    setEnvironmentAnalysis(stored.environmentAnalysis);
  }, []);

  async function handleGenerate(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!society || !analysis || !selectedCompany) {
      setError("학회 분석과 기업 선택이 필요합니다.");
      return;
    }

    setIsLoading(true);
    setError("");
    try {
      const scoreResponse = await fetch("/api/score-company", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ society, analysis, environmentAnalysis, company: selectedCompany })
      });
      const scorePayload = await scoreResponse.json();
      if (!scoreResponse.ok) throw new Error(scorePayload.error || "기업 평가에 실패했습니다.");

      const emailResponse = await fetch("/api/generate-cold-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          society,
          analysis,
          company: selectedCompany,
          purpose,
          tone,
          length,
          cta,
          recipientName,
          senderName,
          senderRole,
          senderEmail,
          senderPhone,
          projectPeriod,
          societyOutreachIntro,
          societyOutreachStrength,
          collaborationHistorySummary,
          optionalAttachmentMention,
          recipientRoleHint,
          warmConnectionHint,
          linkedinActivityHint,
          openingHookMemo,
          scoreContext: scorePayload.data
        })
      });
      const emailPayload = await emailResponse.json();
      if (!emailResponse.ok) throw new Error(emailPayload.error || "콜드 이메일 생성에 실패했습니다.");

      setScoreContext(scorePayload.data);
      setOutput(emailPayload.data);
      saveLatestColdEmail(emailPayload.data);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "알 수 없는 오류가 발생했습니다.");
    } finally {
      setIsLoading(false);
    }
  }

  function handleSave() {
    if (!selectedCompany || !output) return;
    const saved: SavedCompany = {
      id: `${selectedCompany.id}-${Date.now()}`,
      companyId: selectedCompany.id,
      companyName: selectedCompany.name,
      industry: selectedCompany.industry,
      fitScore: scoreContext?.fitScore ?? 0,
      problemSituation: scoreContext?.expectedCompanyProblem || selectedCompany.likelyNeeds.join(", "),
      projectProposalDirection: scoreContext?.recommendedProjectDirection || selectedCompany.notes,
      contactChannel: selectedCompany.contact,
      generatedColdEmail: output.emailBody,
      notes: "콜드 이메일 생성 화면에서 저장됨",
      status: "not_contacted",
      savedAt: new Date().toISOString()
    };
    writeSavedCompanies([saved, ...readSavedCompanies()]);
  }

  return (
    <DashboardShell>
      <PageHeader
        eyebrow="기업 찾기 / 콜드메일 생성"
        title="기업 분석 근거를 바탕으로 첫 연락 메시지를 만듭니다"
        description="기업 찾기에서 확인한 문제 상황, 추천 부서, 연락 루트를 근거로 1촌 신청 전후 메시지와 공식 콜드메일을 생성합니다."
      />

      {!society || !analysis ? (
        <EmptyState title="먼저 학회 분석이 필요합니다" description="학회 프로필 화면에서 정보를 입력하면 콜드 이메일을 생성할 수 있습니다." />
      ) : (
        <div className="space-y-5">
          <EvidencePanel
            society={society}
            analysis={analysis}
            environmentAnalysis={environmentAnalysis}
            company={selectedCompany}
            scoreContext={scoreContext}
            mode="email"
          />
          <div className="grid gap-5 xl:grid-cols-[0.85fr_1.15fr]">
          <form onSubmit={handleGenerate} className="h-fit rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
            <div className="grid gap-4">
              <Field label="기업 선택">
                <select value={companyId} onChange={(event) => setCompanyId(event.target.value)} className="input">
                  {companyPool.map((company) => <option key={company.id} value={company.id}>{company.name} · {company.industry}</option>)}
                </select>
              </Field>
              <Field label="아웃리치 목적">
                <select value={purpose} onChange={(event) => setPurpose(event.target.value as EmailPurpose)} className="input">
                  {Object.entries(emailPurposeLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                </select>
              </Field>
              <Field label="톤">
                <select value={tone} onChange={(event) => setTone(event.target.value as EmailTone)} className="input">
                  {Object.entries(emailToneLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                </select>
              </Field>
              <Field label="길이">
                <select value={length} onChange={(event) => setLength(event.target.value as EmailLength)} className="input">
                  {Object.entries(emailLengthLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                </select>
              </Field>
              <Field label="CTA">
                <select value={cta} onChange={(event) => setCta(event.target.value as EmailCta)} className="input">
                  {Object.entries(emailCtaLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                </select>
              </Field>
              <Field label="수신자 이름">
                <input value={recipientName} onChange={(event) => setRecipientName(event.target.value)} className="input" placeholder="예: OOO" />
              </Field>
              <Field label="발신자 이름">
                <input value={senderName} onChange={(event) => setSenderName(event.target.value)} className="input" placeholder="예: 공나영" />
              </Field>
              <Field label="발신자 역할">
                <input value={senderRole} onChange={(event) => setSenderRole(event.target.value)} className="input" placeholder="예: 회장 또는 대외협력팀장" />
              </Field>
              <Field label="발신자 이메일">
                <input value={senderEmail} onChange={(event) => setSenderEmail(event.target.value)} className="input" placeholder="예: bit.yonsei@gmail.com" />
              </Field>
              <Field label="발신자 전화번호">
                <input value={senderPhone} onChange={(event) => setSenderPhone(event.target.value)} className="input" placeholder="예: 010-0000-0000" />
              </Field>
              <Field label="예상 프로젝트 기간">
                <input value={projectPeriod} onChange={(event) => setProjectPeriod(event.target.value)} className="input" placeholder="예: 202X년 N월~N월" />
              </Field>
              <Field label="학회 소개 문구">
                <textarea
                  value={societyOutreachIntro}
                  onChange={(event) => setSocietyOutreachIntro(event.target.value)}
                  className="input min-h-24"
                  placeholder="예: BIT는 국내에서 ‘혁신’을 중심으로 경영 전략을 논의하는 대학 학회로, 시장과 트렌드를 읽고 새로운 비즈니스 기회를 실행 가능한 전략으로 연결할 수 있는 인재를 양성하는 것을 목표로 하고 있습니다."
                />
              </Field>
              <Field label="기존 프로젝트/협업 경험 문구">
                <textarea
                  value={collaborationHistorySummary}
                  onChange={(event) => setCollaborationHistorySummary(event.target.value)}
                  className="input min-h-20"
                  placeholder="예: 매 학기 기업과 함께 신규 서비스·사업모델 기획, 마케팅·제휴 전략 과제를 수행해왔으며, 자세한 설명은 첨부한 ‘학회 소개서’를 참고해 주시기 바랍니다."
                />
              </Field>
              <Field label="학회 강점/제공 가치 문구">
                <textarea
                  value={societyOutreachStrength}
                  onChange={(event) => setSocietyOutreachStrength(event.target.value)}
                  className="input min-h-24"
                  placeholder="예: 기업 내부 데이터만으로는 포착하기 어려운 2030 소비자의 실제 인식·비교·선택 맥락에 대한 데이터를 강점으로 가지고 있습니다."
                />
              </Field>
              <Field label="첨부자료 언급">
                <input value={optionalAttachmentMention} onChange={(event) => setOptionalAttachmentMention(event.target.value)} className="input" placeholder="예: 학회 소개서와 프로젝트 개요서를 첨부드립니다." />
              </Field>
              <div className="rounded-md border border-cyan-100 bg-cyan-50 p-4">
                <p className="text-sm font-bold text-cyan-950">전환 적합도 보강 정보</p>
                <p className="mt-1 text-xs leading-5 text-cyan-900">LinkedIn은 자동 수집하지 않습니다. 사용자가 직접 확인한 담당자/관계 힌트가 있을 때만 입력하세요.</p>
              </div>
              <Field label="추천 수신자/담당자 힌트">
                <input value={recipientRoleHint} onChange={(event) => setRecipientRoleHint(event.target.value)} className="input" placeholder="예: 브랜드마케팅팀 실무자 또는 제휴 담당자" />
              </Field>
              <Field label="동문·지인·학회 네트워크 힌트">
                <input value={warmConnectionHint} onChange={(event) => setWarmConnectionHint(event.target.value)} className="input" placeholder="예: 연세대 동문 여부 확인 필요, 이전 산학협력 접점 없음" />
              </Field>
              <Field label="LinkedIn 활동성 확인 힌트">
                <input value={linkedinActivityHint} onChange={(event) => setLinkedinActivityHint(event.target.value)} className="input" placeholder="예: 최근 게시글/댓글 활동이 있는 담당자 우선" />
              </Field>
              <Field label="첫 문장 Hook 메모">
                <textarea
                  value={openingHookMemo}
                  onChange={(event) => setOpeningHookMemo(event.target.value)}
                  className="input min-h-20"
                  placeholder="예: 최근 신규 서비스 출시와 2030 고객 리서치 필요성을 연결"
                />
              </Field>
            </div>

            {error ? <div className="mt-4"><ErrorBox message={error} /></div> : null}
            <div className="mt-5 flex flex-wrap gap-2">
              <PrimaryButton type="submit" disabled={isLoading}>
                {isLoading ? <Loader2 className="animate-spin" size={17} /> : <Send size={17} />}
                이메일 생성
              </PrimaryButton>
              <button type="button" onClick={handleSave} disabled={!output} className="inline-flex items-center justify-center gap-2 rounded-md border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50">
                <BookmarkPlus size={17} />저장
              </button>
            </div>
          </form>

          <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 className="text-lg font-bold text-slate-950">생성 결과</h2>
                <p className="mt-1 text-sm text-slate-500">복사 버튼으로 바로 사용할 수 있습니다.</p>
              </div>
              {scoreContext ? <span className="rounded-md bg-emerald-50 px-2 py-1 text-xs font-semibold text-emerald-800">적합도 {scoreContext.fitScore}</span> : null}
            </div>

            {output ? (
              <div className="mt-4 space-y-4">
                <OutputBlock title="이메일 제목 3개" content={output.subjectLines.join("\n")} />
                <OutputBlock title="메시지 전략" content={output.messageStrategy} />
                <OutputBlock title="전환 전략" content={output.conversionStrategy} />
                <OutputBlock title="1촌 신청 전 메시지" content={output.linkedinConnectionRequest} />
                <OutputBlock title="1촌 수락 후 메시지" content={output.linkedinAcceptedMessage} />
                <OutputBlock title="개인화 콜드 이메일" content={output.emailBody} />
                <OutputBlock title="짧은 LinkedIn DM 버전" content={output.shortLinkedInDm} />
                <OutputBlock title="후속 이메일" content={output.followUpEmailMessage} />
                <OutputBlock title="한 문장 피치" content={output.oneSentencePitch} />
                <OutputBlock title="추천 CTA 문장" content={output.suggestedCtaSentence} />
                <ChecklistBlock items={output.qualityChecklist} />
              </div>
            ) : (
              <div className="mt-4 rounded-md bg-slate-50 p-6 text-sm leading-6 text-slate-600">
                기업과 메시지 조건을 선택한 뒤 생성 버튼을 눌러주세요.
              </div>
            )}
          </section>
        </div>
        </div>
      )}
    </DashboardShell>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <label className="grid gap-2 text-sm font-medium text-slate-700">{label}{children}</label>;
}

function OutputBlock({ title, content }: { title: string; content: string }) {
  return (
    <div className="rounded-md bg-slate-50 p-4">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm font-bold text-slate-950">{title}</p>
        <button type="button" onClick={() => navigator.clipboard.writeText(content)} className="inline-flex items-center gap-1 text-xs font-semibold text-cyan-800">
          <Clipboard size={13} />복사
        </button>
      </div>
      <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-slate-700">{content}</p>
    </div>
  );
}

function ChecklistBlock({ items }: { items: string[] }) {
  const content = items.map((item) => `- ${item}`).join("\n");

  return (
    <div className="rounded-md border border-slate-200 bg-white p-4">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm font-bold text-slate-950">품질 체크리스트</p>
        <button type="button" onClick={() => navigator.clipboard.writeText(content)} className="inline-flex items-center gap-1 text-xs font-semibold text-cyan-800">
          <Clipboard size={13} />복사
        </button>
      </div>
      <ul className="mt-3 grid gap-2 text-sm leading-6 text-slate-700">
        {items.map((item) => (
          <li key={item} className="rounded-md bg-slate-50 px-3 py-2">{item}</li>
        ))}
      </ul>
    </div>
  );
}
