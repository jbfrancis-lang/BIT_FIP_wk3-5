import { NextResponse } from "next/server";

import { fallbackScoreCompany } from "@/lib/fallbacks";
import { generateJson } from "@/lib/openai";
import { isRecord, normalizeFitScore, toText, toTextArray } from "@/lib/normalize";
import type { CompanyLead, CompanyScore, EnvironmentAnalysis, SocietyAnalysis, SocietyProfileInput } from "@/lib/types";

type Payload = {
  society: SocietyProfileInput;
  analysis: SocietyAnalysis;
  environmentAnalysis?: EnvironmentAnalysis | null;
  company: CompanyLead;
};

export async function POST(request: Request) {
  try {
    const payload = (await request.json()) as Payload;
    const fallback = fallbackScoreCompany(payload.society, payload.analysis, payload.company, payload.environmentAnalysis);

    const score = await generateJson<CompanyScore>({
      system:
        "당신은 대학 학회와 학생 조직이 컨택할 기업을 평가하는 B2B 협업 전략가입니다. priorityTier는 fitScore가 아니라 기업의 value 기준입니다. Tier 1은 네임드 기업, 대기업, 글로벌 기업, 협업 레퍼런스 가치와 브랜드 파급력이 매우 큰 기업입니다. Tier 2는 특정 산업이나 2030 고객 접점에서 인지도가 높아 포트폴리오 가치가 충분한 기업입니다. Tier 3는 브랜드 파급력은 상대적으로 낮지만 문제 상황이 명확하면 파일럿 또는 대량 아웃리치 후보가 될 기업입니다. fitScore는 별도 기준으로, 해당 기업의 문제 상황과 학회 역량이 얼마나 잘 맞는지를 0부터 100 사이 정수로 평가하세요. 기업 추천은 무작위가 아니라 기업 Value Tier, 산학협력 가능성, 최근 문제/기회 신호, 컨택 용이성을 종합한 contactValueScore를 참고해야 합니다. 또한 이 기업이 후보 리스트의 질을 높이는 이유, 다수 기업 컨택 과정에서 반복 적용 가능한 이유, 어떤 담당자/부서에 어떤 방식으로 접근해야 하는지를 자연스러운 한국어로 정리하세요. 내부 프레임워크 용어를 산출물에 억지로 노출하지 말고, 기업 담당자가 읽어도 어색하지 않은 근거 문장으로 작성하세요. 회사의 공개 목데이터 외 사적인 연락처를 추정하지 마세요. 공개 이메일이 없으면 반드시 'No verified public email is available. Use the company contact page or partnership inquiry form.'라고 안내하세요.",
      user: {
        task: "기업 협업 적합도 평가",
        required_keys: Object.keys(fallback),
        tier_criteria: ["기업 인지도", "브랜드 파급력", "협업 레퍼런스 가치", "네임드 여부", "기업 규모와 대외 신뢰도"],
        discovery_criteria: ["기업 Value Tier", "산학협력 가능성", "최근 문제/기회 가능성", "컨택 용이성", "후보 풀 내 컨택 가치"],
        fit_score_criteria: ["기업 문제 상황과의 일치도", "해소 가능 영역의 명확성", "왜 우리 학회여야 하는지", "외부 시장 압력과의 관련성", "산업 관련성", "과거 프로젝트 경험", "협업 실행 가능성", "연락 가능성"],
        outreach_success_criteria: ["좋은 후보 리스트에 포함될 이유", "다수 기업에 빠르게 적용 가능한 접근 근거", "응답 가능성이 높은 담당 부서와 첫 접촉 방식", "낮은 부담의 첫 CTA", "콜드메일 전에 확인해야 할 근거"],
        society: payload.society,
        analysis: payload.analysis,
        environment_analysis: payload.environmentAnalysis,
        company_discovery_profile: payload.company.discovery,
        company: payload.company
      },
      fallback
    });

    return NextResponse.json({ data: normalizeCompanyScore(score, fallback), demoMode: !process.env.OPENAI_API_KEY });
  } catch {
    return NextResponse.json({ error: "기업 적합도 평가 중 문제가 발생했습니다." }, { status: 400 });
  }
}

function normalizeCompanyScore(value: unknown, fallback: CompanyScore): CompanyScore {
  const record = isRecord(value) ? value : {};
  return {
    fitScore: normalizeFitScore(record.fitScore ?? record.fit_score, fallback.fitScore),
    priorityTier: toText(record.priorityTier ?? record.priority_tier, fallback.priorityTier),
    tierReason: toText(record.tierReason ?? record.tier_reason, fallback.tierReason),
    whyGoodTarget: toText(record.whyGoodTarget ?? record.why_good_target, fallback.whyGoodTarget),
    expectedCompanyProblem: toText(record.expectedCompanyProblem ?? record.expected_company_problem, fallback.expectedCompanyProblem),
    solvableArea: toText(record.solvableArea ?? record.solvable_area, fallback.solvableArea),
    whyOurSociety: toText(record.whyOurSociety ?? record.why_our_society, fallback.whyOurSociety),
    recommendedProjectDirection: toText(record.recommendedProjectDirection ?? record.recommended_project_direction, fallback.recommendedProjectDirection),
    collaborationTypeFit: toText(record.collaborationTypeFit ?? record.collaboration_type_fit, fallback.collaborationTypeFit),
    contactAvailability: toText(record.contactAvailability ?? record.contact_availability, fallback.contactAvailability),
    fitReasoning: toText(record.fitReasoning ?? record.fit_reasoning, fallback.fitReasoning),
    risks: toTextArray(record.risks, fallback.risks),
    environmentProblemFit: toText(record.environmentProblemFit ?? record.environment_problem_fit, fallback.environmentProblemFit),
    listQualityReason: toText(record.listQualityReason ?? record.list_quality_reason, fallback.listQualityReason),
    outreachScaleReason: toText(record.outreachScaleReason ?? record.outreach_scale_reason, fallback.outreachScaleReason),
    targetFitReason: toText(record.targetFitReason ?? record.target_fit_reason, fallback.targetFitReason),
    approachStrategy: toText(record.approachStrategy ?? record.approach_strategy, fallback.approachStrategy),
    conversionHypothesis: toText(record.conversionHypothesis ?? record.conversion_hypothesis, fallback.conversionHypothesis)
  };
}
