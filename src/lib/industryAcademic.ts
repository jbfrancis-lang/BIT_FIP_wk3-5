import type { CompanyDiscoveryProfile, CompanyLead, CompanyValueTier, DiscoverySignalLevel } from "@/lib/types";

export const industryAcademicCollaborationProfile = {
  valueSummary:
    "2030 소비자 raw data, 설문/IDI, 현장 관찰, 문제정의, 경쟁/사례 분석을 바탕으로 기업이 바로 검토할 수 있는 실행형 전략 보고서를 제공하는 산학협력",
  learnedFromCases: [
    "카카오모빌리티: 비택시 물류/배송 브랜드 통합, 글로벌 모빌리티 GTM, 이용자 여정과 전환 트리거 분석",
    "토스: 2030 금융 플랫폼 락인, 오프라인 결제 점유율, 상권 관찰과 심층 인터뷰 기반 이용 장벽 분석",
    "K리그 CP01: 신규 팬 유치, 재방문율 제고, 리그 단위 팬 참여 이벤트와 관람 경험 설계"
  ],
  fitSignals: [
    "2030 또는 대학생 소비자가 핵심 고객이거나 중요한 성장 타깃",
    "신규 고객 유입, 락인, 재방문, 오프라인 전환, 브랜드 인지도 문제가 있음",
    "내부 데이터만으로는 소비자의 실제 비교 기준, 언어, 선택 맥락을 알기 어려움",
    "설문, IDI, 현장 관찰, 경쟁 서비스 비교가 전략 수립에 직접 도움이 됨",
    "2~3주 단위 프로젝트와 3~4개 팀의 병렬 리서치 결과를 받을 수 있음"
  ],
  outputFormat:
    "약 2~3주 프로젝트, 3~4명 단위 3~4개 팀, 팀별 130시간 이상 투입, 40~60장 전략 보고서 3~4부, 설문/인터뷰 raw data, 중간/최종 발표"
};

const tierOneCompanyIds = new Set([
  "company-google",
  "company-samsung-electronics",
  "company-naver",
  "company-kakao",
  "company-sk-telecom",
  "company-kt",
  "company-hyundai-mobis",
  "company-lg-hnh",
  "company-amorepacific",
  "company-toss",
  "company-musinsa",
  "company-woowa-brothers",
  "company-hana-bank",
  "company-lotte",
  "company-sony",
  "company-hp",
  "company-dell",
  "company-gs-caltex",
  "company-nongshim",
  "company-krafton",
  "company-naver-webtoon",
  "company-olive-young",
  "company-gs25",
  "company-paris-baguette",
  "company-kotra"
]);

const tierTwoCompanyIds = new Set([
  "company-kakao-mobility",
  "company-socar",
  "company-kream",
  "company-todayhouse",
  "company-daangn",
  "company-yanolja",
  "company-kurly",
  "company-ridi",
  "company-gangnam-unni",
  "company-lunit",
  "company-wantedlab",
  "company-channel-talk",
  "company-myrealtrip",
  "company-sandbox",
  "company-pubg",
  "company-devsisters",
  "company-photoism",
  "company-kyobo",
  "company-ace-bed",
  "company-emart24",
  "company-jejuair",
  "company-29cm",
  "company-yogiyo",
  "company-class101",
  "company-tridge",
  "company-laundrygo",
  "company-spoon",
  "company-pozalabs"
]);

const problemOpportunityKeywords = [
  "2030",
  "대학생",
  "청년",
  "신규",
  "락인",
  "리텐션",
  "재방문",
  "전환",
  "브랜드",
  "마케팅",
  "커뮤니티",
  "고객",
  "사용자",
  "서비스",
  "경험",
  "GTM",
  "글로벌",
  "신사업",
  "캠페인"
];

const collaborationFitKeywords = [
  "시장",
  "조사",
  "인터뷰",
  "설문",
  "전략",
  "제안",
  "피드백",
  "브랜딩",
  "마케팅",
  "고객",
  "사용자",
  "경쟁",
  "리서치",
  "산학협력"
];

export function getCompanyValueTier(company: Pick<CompanyLead, "id" | "size">): { tier: CompanyValueTier; reason: string; score: number } {
  if (tierOneCompanyIds.has(company.id)) {
    return {
      tier: "Tier 1",
      score: 95,
      reason: "전국적 또는 글로벌 인지도가 높고, 협업 성사 시 학회 포트폴리오와 대외 신뢰도에 주는 레퍼런스 가치가 큰 네임드 기업입니다."
    };
  }

  if (tierTwoCompanyIds.has(company.id) || company.size === "large_enterprise" || company.size === "mid_sized_company") {
    return {
      tier: "Tier 2",
      score: company.size === "large_enterprise" ? 82 : 74,
      reason: "특정 산업이나 2030 고객 접점에서 인지도가 높고, 협업 사례로 활용했을 때 충분한 신뢰도와 설명력이 있는 기업입니다."
    };
  }

  return {
    tier: "Tier 3",
    score: company.size === "public_institution" || company.size === "nonprofit" ? 66 : 58,
    reason: "브랜드 파급력은 상대적으로 제한적이지만, 문제 상황이 명확하면 대량 아웃리치나 파일럿 협업 후보로 검토할 수 있는 기업입니다."
  };
}

export function evaluateCompanyDiscovery(company: CompanyLead): CompanyDiscoveryProfile {
  const valueTier = getCompanyValueTier(company);
  const companyText = [
    company.name,
    company.industry,
    company.description,
    company.recentBusinessContext,
    company.likelyNeeds.join(" "),
    company.notes
  ].join(" ");
  const problemSignalCount = countKeywordMatches(companyText, problemOpportunityKeywords);
  const collaborationSignalCount = countKeywordMatches(companyText, collaborationFitKeywords);
  const contactabilityScore = calculateContactabilityScore(company);
  const problemOpportunityScore = clamp(45 + problemSignalCount * 5 + company.likelyNeeds.length * 3, 40, 95);
  const collaborationPotentialScore = clamp(
    44 + collaborationSignalCount * 4 + company.possibleCollaborationTypes.length * 4 + (company.notes.includes("산학협력") ? 8 : 0),
    42,
    95
  );
  const contactValueScore = Math.round(
    valueTier.score * 0.32 + collaborationPotentialScore * 0.28 + problemOpportunityScore * 0.26 + contactabilityScore * 0.14
  );

  return {
    valueTier: valueTier.tier,
    valueTierReason: valueTier.reason,
    collaborationPotential: signalLevel(collaborationPotentialScore),
    collaborationPotentialScore,
    problemOpportunitySignal: signalLevel(problemOpportunityScore),
    problemOpportunityScore,
    contactability: signalLevel(contactabilityScore),
    contactabilityScore,
    contactValueScore,
    contactValueReason: buildContactValueReason(company, valueTier.tier, collaborationPotentialScore, problemOpportunityScore, contactabilityScore),
    discoveryTags: buildDiscoveryTags(company, valueTier.tier, problemSignalCount, contactabilityScore),
    targetRationale: `${company.name}${topicParticle(company.name)} ${company.likelyNeeds.slice(0, 2).join(", ")} 문제를 겪을 가능성이 있어, 학생·청년 관점의 리서치와 전략 제안으로 컨택할 가치가 있습니다.`,
    recommendedSearchQueries: buildRecommendedSearchQueries(company)
  };
}

function countKeywordMatches(text: string, keywords: string[]) {
  return keywords.reduce((count, keyword) => count + (text.includes(keyword) ? 1 : 0), 0);
}

function calculateContactabilityScore(company: CompanyLead) {
  const routeScore = Math.min(company.contact.routes?.length || 0, 4) * 6;
  const emailScore = company.contact.publicEmail ? 24 : 0;
  const contactPageScore = company.contact.contactPage ? 18 : 0;
  const linkedinScore = company.contact.linkedinUrl ? 10 : 6;
  return clamp(38 + routeScore + emailScore + contactPageScore + linkedinScore, 35, 95);
}

function signalLevel(score: number): DiscoverySignalLevel {
  if (score >= 78) return "상";
  if (score >= 62) return "중";
  return "하";
}

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

function buildDiscoveryTags(company: CompanyLead, tier: CompanyValueTier, problemSignalCount: number, contactabilityScore: number) {
  return [
    tier,
    company.industry,
    company.size === "large_enterprise" ? "대기업/네임드" : "",
    problemSignalCount >= 5 ? "문제 신호 강함" : "문제 신호 보통",
    contactabilityScore >= 78 ? "공개 접점 양호" : "접점 확인 필요",
    company.likelyNeeds.some((need) => need.includes("2030") || need.includes("대학생") || need.includes("청년")) ? "2030 접점" : "",
    company.notes.includes("사례") || company.notes.includes("산학협력") ? "기존 사례 유사" : ""
  ].filter((tag): tag is string => Boolean(tag));
}

function buildContactValueReason(
  company: CompanyLead,
  tier: CompanyValueTier,
  collaborationPotentialScore: number,
  problemOpportunityScore: number,
  contactabilityScore: number
) {
  return `${tier} 기업으로 분류되며, 산학협력 가능성 ${signalLevel(collaborationPotentialScore)}, 문제/기회 신호 ${signalLevel(problemOpportunityScore)}, 컨택 용이성 ${signalLevel(contactabilityScore)}로 판단됩니다. 기업 인지도, 협업 가능성, 문제 신호, 공개 접점 여부를 함께 반영해 후보 풀에서 우선 검토할 가치가 있습니다.`;
}

function buildRecommendedSearchQueries(company: CompanyLead) {
  return [
    `${company.name} 제휴 문의`,
    `${company.name} 마케팅 담당자`,
    `${company.name} 신사업 전략`,
    `${company.name} ${company.industry} 2030 고객`,
    `${company.name} 산학협력`
  ];
}

function topicParticle(value: string) {
  const trimmed = value.trim();
  const last = trimmed.charCodeAt(trimmed.length - 1);
  if (last < 0xac00 || last > 0xd7a3) return "는";
  return (last - 0xac00) % 28 === 0 ? "는" : "은";
}
