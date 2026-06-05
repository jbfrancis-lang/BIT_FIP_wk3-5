import type { CompanyLead, CompanyScore, ContactRoute, RecipientFit } from "@/lib/types";

export const publicEmailFallback = "검증된 공개 이메일은 없습니다. 공식 문의 페이지 또는 파트너십 문의 폼을 활용하세요.";

export function getContactRoutes(company: CompanyLead): ContactRoute[] {
  const routes: ContactRoute[] = [...(company.contact.routes || [])];
  const hasType = (type: ContactRoute["type"]) => routes.some((route) => route.type === type);

  if (company.contact.contactPage && !hasType("official_contact")) {
    routes.push({
      type: "official_contact",
      label: "공식 문의 페이지",
      url: company.contact.contactPage,
      description: "공식 사이트에서 확인 가능한 공개 문의 접점입니다.",
      source: "official_site",
      verified: true
    });
  }
  if (company.contact.linkedinUrl && !hasType("linkedin_company")) {
    routes.push({
      type: "linkedin_company",
      label: "LinkedIn 회사 페이지",
      url: company.contact.linkedinUrl,
      description: "LinkedIn 직접 스크래핑 없이, 사용자가 직접 공개 회사 페이지와 재직자 정보를 확인하는 경로입니다.",
      source: "mock_data",
      verified: false
    });
  }
  if (!hasType("linkedin_people_search")) {
    routes.push(buildLinkedInPeopleSearchRoute(company));
  }

  return routes;
}

export function contactAvailability(company: CompanyLead, scoreAvailability?: string) {
  if (company.contact.publicEmail) {
    return `공개 이메일 ${company.contact.publicEmail} 사용 가능`;
  }
  if (!scoreAvailability || scoreAvailability.includes("No verified public email")) {
    return publicEmailFallback;
  }
  return scoreAvailability;
}

export function buildRecipientFit(company: CompanyLead, score?: CompanyScore | null): RecipientFit {
  if (company.recipientFit) return company.recipientFit;

  const routes = getContactRoutes(company);
  const departments = splitDepartments(company.suggestedDepartment);
  const primaryDepartment = departments[0] || inferPrimaryDepartment(company);
  const alternativeDepartments = unique([...(departments.slice(1)), ...inferAlternativeDepartments(company)]).slice(0, 4);
  const recommendedRecipientTitle = inferRecipientTitle(company, primaryDepartment);
  const routePriority = prioritizeRoutes(company, routes, primaryDepartment);
  const responseSignals = buildResponseSignals(company, primaryDepartment, recommendedRecipientTitle);
  const linkedinSearchKeywords = buildLinkedInSearchKeywords(company, primaryDepartment, recommendedRecipientTitle);
  const manualVerificationHints = buildManualVerificationHints(company, primaryDepartment, recommendedRecipientTitle);
  const outreachApproach = buildOutreachApproach(company, score, primaryDepartment, recommendedRecipientTitle);
  const criteria = {
    decisionAuthority: scoreByDepartment(primaryDepartment, ["전략", "사업개발", "제휴", "오픈이노베이션", "대외협력"]),
    executionRelevance: scoreByDepartment(primaryDepartment, ["마케팅", "브랜드", "프로덕트", "고객경험", "HR", "채용", "전략"]),
    externalCollaborationLikelihood: scoreByDepartment(primaryDepartment, ["제휴", "대외협력", "오픈이노베이션", "사업개발", "산학협력", "마케팅"]),
    publicContactability: publicContactabilityScore(company, routes),
    warmIntroPotential: warmIntroScore(company),
    overall: 0
  };
  criteria.overall = Math.round(
    criteria.decisionAuthority * 0.24 +
      criteria.executionRelevance * 0.24 +
      criteria.externalCollaborationLikelihood * 0.22 +
      criteria.publicContactability * 0.18 +
      criteria.warmIntroPotential * 0.12
  );

  const projectContext = score?.recommendedProjectDirection || `${company.likelyNeeds[0] || company.industry} 관련 산학협력 제안`;

  return {
    primaryDepartment,
    alternativeDepartments,
    recommendedRecipientTitle,
    criteria,
    responseLikelihood: fitLevel(criteria.overall),
    responseSignals,
    linkedinSearchKeywords,
    manualVerificationHints,
    outreachApproach,
    reasoning: `전환 적합도 측면에서는 ${projectContext}을 검토하거나 관련 실무 부서로 연결할 가능성이 높은 ${primaryDepartment}을 1순위 접점으로 두는 것을 추천드립니다. 수신자는 ${recommendedRecipientTitle}를 우선 탐색하고, 동문·지인 경유 가능성이나 최근 LinkedIn 활동성은 사용자가 직접 확인하는 방식이 안전합니다.`,
    firstAction: routePriority[0]
      ? `${routePriority[0].route.label}를 1순위로 확인한 뒤, ${recommendedRecipientTitle}에게 연결될 수 있도록 제목과 첫 문단에서 '${outreachApproach.openingHook}' 흐름을 명확히 밝히는 것을 추천드립니다.`
      : `공식 홈페이지에서 ${primaryDepartment} 또는 ${recommendedRecipientTitle} 연결 가능 경로를 먼저 확인하는 것을 추천드립니다.`,
    userActionChecklist: buildUserActionChecklist(company, routePriority, primaryDepartment, recommendedRecipientTitle),
    contactRoutePriority: routePriority,
    noPublicEmailNotice: company.contact.publicEmail ? "" : publicEmailFallback
  };
}

function buildLinkedInPeopleSearchRoute(company: CompanyLead): ContactRoute {
  const keywords = [company.name, company.suggestedDepartment, "담당자", "산학협력", "제휴"].filter(Boolean).join(" ");
  return {
    type: "linkedin_people_search",
    label: "LinkedIn 담당자 검색",
    url: `https://www.linkedin.com/search/results/people/?keywords=${encodeURIComponent(keywords)}`,
    description: "자동 수집 없이 사용자가 직접 재직 여부, 직무, 활동성을 확인하는 검색 링크입니다.",
    source: "future_search_api",
    verified: false
  };
}

export function routeTypeLabel(route: ContactRoute) {
  const labels: Record<ContactRoute["type"], string> = {
    official_contact: "공식 문의",
    customer_support: "고객센터",
    partnership: "제휴/파트너십",
    business_development: "사업개발",
    strategy: "전략/기획",
    marketing: "마케팅",
    hr_recruiting: "HR/채용",
    pr_media: "PR/미디어",
    linkedin_company: "LinkedIn 회사",
    linkedin_people_search: "LinkedIn 재직자 후보",
    careers: "채용 페이지",
    other: "기타 공개 접점"
  };
  return labels[route.type];
}

export function sourceLinkLabel(link: string) {
  try {
    const hostname = new URL(link).hostname.replace(/^www\./, "");
    if (hostname.includes("linkedin.com")) return "LinkedIn";
    return hostname;
  } catch {
    return "출처";
  }
}

function prioritizeRoutes(company: CompanyLead, routes: ContactRoute[], primaryDepartment: string) {
  return routes
    .map((route) => ({
      route,
      weight: routeWeight(route, company, primaryDepartment),
      reason: routeReason(route, company, primaryDepartment)
    }))
    .sort((a, b) => b.weight - a.weight)
    .slice(0, 5)
    .map((item, index) => ({
      rank: index + 1,
      route: item.route,
      reason: item.reason
    }));
}

function routeWeight(route: ContactRoute, company: CompanyLead, primaryDepartment: string) {
  let weight = 40;
  if (route.verified) weight += 14;
  if (route.type === "partnership" || route.type === "business_development") weight += 18;
  if (route.type === "official_contact") weight += 14;
  if (route.type === "marketing" && primaryDepartment.includes("마케팅")) weight += 14;
  if (route.type === "hr_recruiting" && /HR|채용|리크루팅/.test(primaryDepartment)) weight += 14;
  if (route.type === "linkedin_people_search") weight += 10;
  if (route.type === "linkedin_company") weight += 4;
  if (company.contact.publicEmail) weight += 8;
  return weight;
}

function routeReason(route: ContactRoute, company: CompanyLead, primaryDepartment: string) {
  if (route.type === "linkedin_people_search") {
    return "직접 스크래핑하지 않고 공개 검색 화면에서 현재 재직자와 직무를 사용자가 직접 확인하는 보조 경로로 활용하는 것을 추천드립니다.";
  }
  if (route.type === "partnership" || route.type === "business_development") {
    return `${primaryDepartment} 또는 제휴 담당자에게 전달될 가능성이 높으므로 1차 접점으로 활용하는 것을 추천드립니다.`;
  }
  if (route.type === "hr_recruiting") {
    return "리크루팅 세션, 채용 브랜딩, 학생 대상 프로그램 제안일 때 이 경로를 우선 활용하는 것을 추천드립니다.";
  }
  if (route.type === "marketing") {
    return "브랜드, 고객 리서치, 캠페인 제안일 때 실무 부서 연결 가능성이 있으므로 우선 확인하는 것을 추천드립니다.";
  }
  if (route.type === "official_contact") {
    return company.contact.publicEmail ? "공개 이메일과 함께 병행하는 공식 접점으로 활용하는 것을 추천드립니다." : publicEmailFallback;
  }
  return "공식 공개 정보 기반 보조 접점입니다. 개인 연락처를 추정하지 않고 사용자가 확인한 뒤 활용하는 것을 추천드립니다.";
}

function buildUserActionChecklist(
  company: CompanyLead,
  routePriority: Array<{ rank: number; route: ContactRoute; reason: string }>,
  primaryDepartment: string,
  recommendedRecipientTitle: string
) {
  const firstRoute = routePriority[0]?.route;
  const linkedinRoute = routePriority.find(({ route }) => route.type === "linkedin_people_search" || route.type === "linkedin_company")?.route;
  const actions = [
    firstRoute
      ? `1순위 링크인 '${firstRoute.label}'를 열고 ${primaryDepartment} 또는 ${recommendedRecipientTitle}와 연결되는 공식 접점을 직접 확인하세요.`
      : `${company.name} 공식 홈페이지에서 ${primaryDepartment} 또는 ${recommendedRecipientTitle} 연결 경로를 직접 확인하세요.`,
    linkedinRoute
      ? `${linkedinRoute.label}에서는 회사명, 현재 재직 여부, 직무 키워드, 최근 게시글·댓글 활동성을 직접 확인한 뒤 후보 담당자 URL이나 이름을 저장하세요.`
      : "LinkedIn 또는 공개 검색에서 회사명과 추천 부서명을 함께 검색해 후보 담당자를 직접 확인하세요.",
    "동문, 선배, 학회 네트워크, 이전 산학협력 접점이 있는지 먼저 확인하고 가능하면 1촌 신청 전에 경유 소개를 요청하세요.",
    company.contact.publicEmail
      ? `검증된 공개 이메일 ${company.contact.publicEmail}로 1차 메일을 발송하고, 같은 날 공식 문의 폼에도 동일한 요지를 남기세요.`
      : "검증된 공개 이메일이 없으므로 공식 문의 페이지 또는 파트너십 문의 폼에 먼저 남기고, LinkedIn DM은 보조 경로로 사용하세요.",
    `메일/DM 첫 문장에는 '${primaryDepartment} 담당자님께 전달 부탁드립니다'처럼 전달 대상을 명시하세요.`,
    "실제로 확인한 담당자명, 직책, URL, 발송 여부를 저장 기업 메모에 기록하세요."
  ];

  return actions;
}

function buildResponseSignals(company: CompanyLead, primaryDepartment: string, recommendedRecipientTitle: string) {
  const signals = [
    `${primaryDepartment}은 제안 내용을 내부 실무 부서로 연결할 가능성이 높은 접점입니다.`,
    `${recommendedRecipientTitle}는 프로젝트 검토 또는 담당자 연결 요청을 이해할 가능성이 높은 수신자 유형입니다.`
  ];
  if (company.contact.publicEmail) signals.push("검증된 공개 이메일이 있어 공식 문의와 병행 발송이 가능합니다.");
  if (company.contact.linkedinUrl || getContactRoutes(company).some((route) => route.type === "linkedin_people_search")) {
    signals.push("LinkedIn에서는 재직 여부, 직무 적합성, 최근 활동성을 사용자가 직접 확인할 수 있습니다.");
  }
  if (company.size === "large_enterprise" || company.size === "mid_sized_company") {
    signals.push("조직 규모가 커 담당 부서 연결 요청형 CTA가 직접 제안보다 더 자연스럽습니다.");
  } else {
    signals.push("조직 규모상 실무 책임자 또는 리드급 담당자에게 바로 검토 요청을 보낼 여지가 있습니다.");
  }
  return signals.slice(0, 4);
}

function buildLinkedInSearchKeywords(company: CompanyLead, primaryDepartment: string, recommendedRecipientTitle: string) {
  return unique([
    `${company.name} ${primaryDepartment}`,
    `${company.name} ${recommendedRecipientTitle}`,
    `${company.name} 산학협력`,
    `${company.name} 제휴`,
    `${company.name} ${company.industry} 마케팅`
  ]).slice(0, 5);
}

function buildManualVerificationHints(company: CompanyLead, primaryDepartment: string, recommendedRecipientTitle: string) {
  return [
    `${company.name} 재직 여부와 현재 직무가 ${primaryDepartment} 또는 ${recommendedRecipientTitle}와 맞는지 확인`,
    "최근 3개월 내 LinkedIn 게시글, 댓글, 프로필 업데이트 등 활동성이 있는지 확인",
    "연세대, BIT, 학회 선배, 지인 경유 가능성이 있는지 확인",
    "공식 문의 페이지와 LinkedIn 개인 메시지를 같은 날 병행할지 결정",
    "확인한 담당자명, 직책, URL은 저장 기업 메모에 직접 입력"
  ];
}

function buildOutreachApproach(
  company: CompanyLead,
  score: CompanyScore | null | undefined,
  primaryDepartment: string,
  recommendedRecipientTitle: string
) {
  const projectDirection = score?.recommendedProjectDirection || `${company.likelyNeeds[0] || company.industry} 관련 산학협력 프로젝트`;
  const expectedProblem = score?.expectedCompanyProblem || company.likelyNeeds.slice(0, 2).join(", ");

  return {
    subjectHook: `${company.name} ${projectDirection} 검토 요청`,
    openingHook: `${company.name}의 ${expectedProblem} 과제를 외부 학생·청년 관점에서 검토할 수 있다고 보았습니다.`,
    firstCta: `${primaryDepartment} 또는 ${recommendedRecipientTitle} 연결이 가능하신지 먼저 여쭙는 낮은 CTA를 권장합니다.`,
    followUpAction: "3~5영업일 후에는 자료 재전송보다 담당 부서 연결 가능 여부만 짧게 확인하는 후속 메시지를 권장합니다."
  };
}

function inferPrimaryDepartment(company: CompanyLead) {
  const text = `${company.industry} ${company.likelyNeeds.join(" ")} ${company.notes}`;
  if (/채용|커리어|리크루팅|HR/.test(text)) return "HR/채용팀";
  if (/제휴|파트너|B2B|사업개발/.test(text)) return "사업개발팀";
  if (/마케팅|브랜드|콘텐츠|커뮤니티/.test(text)) return "마케팅팀";
  if (/고객|사용자|서비스|경험|프로덕트/.test(text)) return "고객경험팀";
  if (/공공|기관|ESG|사회/.test(text)) return "대외협력팀";
  return "전략기획팀";
}

function inferAlternativeDepartments(company: CompanyLead) {
  const text = `${company.industry} ${company.likelyNeeds.join(" ")} ${company.notes}`;
  const departments = ["전략기획팀", "사업개발팀", "마케팅팀"];
  if (/고객|사용자|서비스|경험|프로덕트/.test(text)) departments.push("고객경험팀", "프로덕트팀");
  if (/채용|커리어|리크루팅|HR/.test(text)) departments.push("HR/채용팀");
  if (/ESG|사회|공공|기관/.test(text)) departments.push("대외협력팀", "ESG팀");
  return departments;
}

function inferRecipientTitle(company: CompanyLead, department: string) {
  if (/HR|채용|리크루팅/.test(department)) return "캠퍼스 리크루팅 또는 채용 브랜딩 담당자";
  if (/마케팅|브랜드|콘텐츠/.test(department)) return "브랜드/마케팅 전략 실무자 또는 팀 리드";
  if (/고객경험|프로덕트|서비스/.test(department)) return "CX/서비스기획/프로덕트 담당자";
  if (/제휴|사업개발|오픈이노베이션/.test(department)) return "제휴/사업개발 담당자 또는 오픈이노베이션 담당자";
  if (/대외협력|ESG|공공/.test(department)) return "대외협력 또는 ESG 프로그램 담당자";
  if (company.size === "startup" || company.size === "SME") return "사업 책임자 또는 대표/리드급 담당자";
  return "전략기획 또는 신사업 담당 실무자";
}

function scoreByDepartment(department: string, keywords: string[]) {
  const hit = keywords.some((keyword) => department.includes(keyword));
  return hit ? 82 : 62;
}

function publicContactabilityScore(company: CompanyLead, routes: ContactRoute[]) {
  if (company.contact.publicEmail) return 92;
  if (routes.some((route) => route.type === "partnership" || route.type === "business_development")) return 82;
  if (company.contact.contactPage) return 74;
  if (routes.some((route) => route.type === "linkedin_people_search")) return 62;
  return 46;
}

function warmIntroScore(company: CompanyLead) {
  if (company.size === "large_enterprise") return 68;
  if (company.size === "mid_sized_company") return 72;
  if (company.size === "startup" || company.size === "SME") return 78;
  return 64;
}

function fitLevel(score: number): "높음" | "보통" | "확인 필요" {
  if (score >= 78) return "높음";
  if (score >= 62) return "보통";
  return "확인 필요";
}

function splitDepartments(value: string) {
  return value
    .split(/[,/·]| 또는 |,|\s+및\s+/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function unique(values: string[]) {
  return Array.from(new Set(values));
}
