import type { CollaborationType, CompanyLead, CompanySize, ContactRoute } from "@/lib/types";
import { evaluateCompanyDiscovery } from "@/lib/industryAcademic";

type CompanySeed = {
  id: string;
  name: string;
  industry: string;
  size?: CompanySize;
  region?: string;
  description: string;
  recentBusinessContext: string;
  likelyNeeds: string[];
  possibleCollaborationTypes?: CollaborationType[];
  website: string;
  contactPage?: string;
  publicEmail?: string;
  linkedinUrl?: string;
  contactRoutes?: ContactRoute[];
  contactNotes?: string;
  sourceLinks?: string[];
  suggestedDepartment?: string;
  notes: string;
};

const noPublicEmailNotice = "검증된 공개 이메일이 없습니다. 공식 문의 페이지 또는 제휴/파트너십 문의 채널을 이용하세요.";

const defaultCollaborationTypes: CollaborationType[] = [
  "industry_academic_collaboration",
  "market_research",
  "business_strategy_proposal",
  "product_feedback"
];

function createCompany(seed: CompanySeed): CompanyLead {
  const contactRoutes = buildContactRoutes(seed);
  const linkedinUrl = seed.linkedinUrl || linkedinCompanySearchUrl(seed.name);
  const suggestedDepartment = seed.suggestedDepartment || inferSuggestedDepartment(seed);
  const contactNotes = seed.contactNotes || buildContactNotes(seed, suggestedDepartment, contactRoutes);
  const company: CompanyLead = {
    id: seed.id,
    name: seed.name,
    industry: seed.industry,
    size: seed.size || "large_enterprise",
    region: seed.region || "한국",
    description: seed.description,
    recentBusinessContext: seed.recentBusinessContext,
    likelyNeeds: seed.likelyNeeds,
    possibleCollaborationTypes: seed.possibleCollaborationTypes || defaultCollaborationTypes,
    contact: {
      website: seed.website,
      contactPage: seed.contactPage,
      publicEmail: seed.publicEmail,
      linkedinUrl,
      routes: contactRoutes,
      notes: contactNotes
    },
    suggestedDepartment,
    sourceLinks: uniqueLinks([seed.website, seed.contactPage, linkedinUrl, ...contactRoutes.map((route) => route.url), ...(seed.sourceLinks || [])]),
    notes: `${seed.notes} 컨택 메모: ${contactNotes}`
  };

  return {
    ...company,
    discovery: evaluateCompanyDiscovery(company)
  };
}

function uniqueLinks(links: Array<string | undefined>): string[] {
  return Array.from(new Set(links.filter(Boolean) as string[]));
}

function linkedinCompanySearchUrl(companyName: string) {
  return `https://www.linkedin.com/search/results/companies/?keywords=${encodeURIComponent(companyName)}`;
}

function linkedinPeopleSearchUrl(companyName: string) {
  return `https://www.linkedin.com/search/results/people/?keywords=${encodeURIComponent(companyName)}`;
}

function linkedinCompanyPeopleUrl(linkedinUrl: string) {
  return `${linkedinUrl.replace(/\/+$/, "")}/people/`;
}

function buildContactRoutes(seed: CompanySeed): ContactRoute[] {
  const routes: ContactRoute[] = [];

  if (seed.contactPage) {
    routes.push({
      type: inferContactRouteType(seed),
      label: inferContactRouteLabel(seed.contactPage),
      url: seed.contactPage,
      description: "공식 사이트에서 확인 가능한 공개 문의 접점입니다.",
      source: "official_site",
      verified: true
    });
  }

  routes.push(...(seed.contactRoutes || []));

  routes.push({
    type: "linkedin_company",
    label: seed.linkedinUrl ? "LinkedIn 회사 페이지" : "LinkedIn 기업 검색",
    url: seed.linkedinUrl || linkedinCompanySearchUrl(seed.name),
    description: "직접 문의 루트가 불명확할 때 회사 페이지, 채용 공고, 공개 게시글에서 공식 접점을 확인합니다.",
    source: seed.linkedinUrl ? "manual" : "mock_data",
    verified: Boolean(seed.linkedinUrl)
  });

  if (seed.linkedinUrl) {
    routes.push({
      type: "linkedin_people_search",
      label: "LinkedIn 재직자 보기",
      url: linkedinCompanyPeopleUrl(seed.linkedinUrl),
      description: "확인된 LinkedIn 회사 페이지의 사람 탭입니다. 공개 프로필의 현재 재직 여부를 한 번 더 확인한 뒤 1촌 신청과 DM을 남기세요.",
      source: "manual",
      verified: true
    });
  } else {
    routes.push({
      type: "linkedin_people_search",
      label: "LinkedIn 재직자 후보 검색",
      url: linkedinPeopleSearchUrl(seed.name),
      description: "회사명 기반 LinkedIn 사람 검색입니다. 동명이인이나 유사 기업 오표본이 섞일 수 있으니 현재 회사명과 직무를 확인한 뒤 1촌 신청과 DM을 남기세요.",
      source: "mock_data",
      verified: false
    });
  }

  const seen = new Set<string>();
  return routes.filter((route) => {
    const key = `${route.label}-${route.url}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function inferContactRouteType(seed: CompanySeed): ContactRoute["type"] {
  const linkText = `${seed.contactPage || ""} ${seed.industry} ${seed.likelyNeeds.join(" ")}`.toLowerCase();
  if (linkText.includes("support") || linkText.includes("customer") || linkText.includes("help") || linkText.includes("고객")) return "customer_support";
  if (linkText.includes("career") || linkText.includes("recruit") || linkText.includes("채용")) return "hr_recruiting";
  if (linkText.includes("press") || linkText.includes("pr") || linkText.includes("news")) return "pr_media";
  if (linkText.includes("partner") || linkText.includes("제휴")) return "partnership";
  return "official_contact";
}

function inferContactRouteLabel(url: string) {
  const lowerUrl = url.toLowerCase();
  if (lowerUrl.includes("support") || lowerUrl.includes("customer") || lowerUrl.includes("help")) return "고객센터/문의";
  if (lowerUrl.includes("career") || lowerUrl.includes("recruit")) return "채용/HR 문의";
  if (lowerUrl.includes("press") || lowerUrl.includes("pr")) return "PR/미디어 문의";
  if (lowerUrl.includes("partner")) return "제휴/파트너십 문의";
  return "공식 문의 페이지";
}

function inferSuggestedDepartment(seed: CompanySeed) {
  const text = `${seed.industry} ${seed.likelyNeeds.join(" ")} ${seed.notes}`.toLowerCase();

  if (text.includes("채용") || text.includes("커리어") || text.includes("recruiting") || text.includes("hr")) {
    return "HR/채용팀, 캠퍼스 리크루팅 담당, 브랜드/커뮤니케이션팀";
  }
  if (text.includes("제휴") || text.includes("파트너") || text.includes("b2b") || text.includes("gtm")) {
    return "사업개발팀, 제휴/파트너십팀, 전략기획팀";
  }
  if (text.includes("마케팅") || text.includes("브랜드") || text.includes("콘텐츠") || text.includes("커뮤니티")) {
    return "마케팅팀, 브랜드전략팀, 콘텐츠/커뮤니티팀";
  }
  if (text.includes("고객") || text.includes("사용자") || text.includes("서비스") || text.includes("경험")) {
    return "고객경험팀, 프로덕트팀, 서비스기획팀";
  }
  if (text.includes("ai") || text.includes("데이터") || text.includes("디지털")) {
    return "전략기획팀, 데이터/AI 사업팀, 프로덕트팀";
  }
  if (text.includes("공공") || text.includes("기관")) {
    return "대외협력팀, 사업 담당 부서, 산학협력/교육 프로그램 담당";
  }
  return "전략기획팀, 사업개발팀, 마케팅팀, 고객경험팀";
}

function buildContactNotes(seed: CompanySeed, suggestedDepartment: string, routes: ContactRoute[]) {
  const directRoute = routes.find((route) => route.type !== "linkedin_company" && route.type !== "linkedin_people_search");
  const linkedinGuide = seed.linkedinUrl ? "확인된 LinkedIn 회사 페이지의 사람 탭에서 재직자를 확인하세요." : "LinkedIn은 기업 검색 결과에서 공식 회사 페이지를 먼저 고른 뒤 사람 탭을 확인하세요.";
  const firstRoute = directRoute ? `${directRoute.label}를 1순위로 확인` : "직접 문의 루트가 불명확하므로 홈페이지와 LinkedIn 기업 검색을 병행";
  return `${firstRoute}하고, ${suggestedDepartment}에 맞춰 제안 주제를 분기하세요. ${linkedinGuide} 공개 프로필의 현재 재직 여부를 한 번 더 확인한 뒤 1촌 신청과 DM을 남기세요. ${seed.publicEmail ? `공개 이메일 ${seed.publicEmail} 사용 가능.` : noPublicEmailNotice}`;
}

const expansionCompanySeeds: CompanySeed[] = [
  {
    id: "company-hyundai-motor",
    name: "현대자동차",
    industry: "모빌리티/자동차",
    website: "https://www.hyundai.com/kr/ko",
    description: "완성차, 전기차, 수소차, 모빌리티 서비스를 운영하는 글로벌 자동차 기업입니다.",
    recentBusinessContext: "전기차 전환, 브랜드 경험, MZ 고객 접점, 소프트웨어 중심 차량 경험이 중요합니다.",
    likelyNeeds: ["전기차 고객 경험", "MZ 브랜드 접점", "모빌리티 서비스 전략"],
    notes: "자동차 구매 여정과 미래 모빌리티 경험을 다루는 산학협력 후보입니다."
  },
  {
    id: "company-kia",
    name: "기아",
    industry: "모빌리티/자동차",
    website: "https://www.kia.com/kr",
    description: "승용차, 전기차, PBV 등 모빌리티 제품과 서비스를 운영하는 자동차 기업입니다.",
    recentBusinessContext: "PBV, 전기차 포지셔닝, 젊은 고객층 브랜드 선호 형성이 중요합니다.",
    likelyNeeds: ["PBV 시장 기회", "전기차 포지셔닝", "젊은 고객 브랜드 인식"],
    notes: "신규 모빌리티 카테고리의 고객 문제 정의와 GTM 제안에 적합합니다."
  },
  {
    id: "company-lg-electronics",
    name: "LG전자",
    industry: "전자/가전",
    website: "https://www.lge.co.kr/",
    description: "가전, TV, IT 기기, 전장 등 생활 기술 제품을 제공하는 기업입니다.",
    recentBusinessContext: "스마트홈, 구독형 가전, 프리미엄 경험, 가전 서비스화가 중요합니다.",
    likelyNeeds: ["스마트홈 사용성", "가전 구독 서비스", "프리미엄 고객 경험"],
    notes: "가전 제품을 서비스 경험으로 확장하는 프로젝트와 맞습니다."
  },
  {
    id: "company-lg-uplus",
    name: "LG유플러스",
    industry: "통신/플랫폼",
    website: "https://www.lguplus.com/",
    description: "모바일, 인터넷, IPTV, B2B 솔루션과 콘텐츠 서비스를 운영하는 통신사입니다.",
    recentBusinessContext: "통신 요금제 차별화, 콘텐츠 결합, 청년 고객 락인이 중요합니다.",
    likelyNeeds: ["청년 요금제 니즈", "콘텐츠 결합 전략", "통신 고객 리텐션"],
    notes: "통신 서비스 차별화와 청년 고객 분석 프로젝트에 적합합니다."
  },
  {
    id: "company-cj-enm",
    name: "CJ ENM",
    industry: "미디어/엔터테인먼트",
    website: "https://www.cjenm.com/",
    description: "방송, 음악, 영화, 공연, 커머스 콘텐츠를 운영하는 종합 콘텐츠 기업입니다.",
    recentBusinessContext: "K콘텐츠 글로벌 확장, 팬덤 커머스, 숏폼 소비 변화 대응이 중요합니다.",
    likelyNeeds: ["K콘텐츠 팬덤", "콘텐츠 커머스", "숏폼 소비 분석"],
    notes: "콘텐츠 산업 트렌드와 글로벌 팬덤 전략 제안에 적합합니다."
  },
  {
    id: "company-cj-cheiljedang",
    name: "CJ제일제당",
    industry: "식품/F&B",
    website: "https://www.cj.co.kr/kr/index",
    description: "식품, 바이오, 소재 사업을 운영하는 종합 식품 기업입니다.",
    recentBusinessContext: "K푸드 글로벌화, HMR 차별화, 건강 지향 소비 변화가 중요합니다.",
    likelyNeeds: ["K푸드 글로벌 전략", "HMR 소비자 니즈", "건강식 포지셔닝"],
    notes: "식품 카테고리의 소비자 인사이트와 신제품 전략 제안에 적합합니다."
  },
  {
    id: "company-shinsegae",
    name: "신세계",
    industry: "리테일/백화점",
    website: "https://www.shinsegae.com/",
    description: "백화점과 프리미엄 유통 경험을 운영하는 리테일 기업입니다.",
    recentBusinessContext: "오프라인 공간 경험, VIP 고객 관리, MZ 럭셔리 소비 접점이 중요합니다.",
    likelyNeeds: ["오프라인 공간 경험", "MZ 럭셔리 소비", "멤버십 가치"],
    notes: "리테일 공간의 경험 설계와 고객 세분화 프로젝트에 적합합니다."
  },
  {
    id: "company-lotte-shopping",
    name: "롯데쇼핑",
    industry: "리테일/커머스",
    website: "https://www.lotteshopping.com/",
    description: "백화점, 마트, 슈퍼, e커머스 등 유통 채널을 운영하는 기업입니다.",
    recentBusinessContext: "옴니채널 전환, 오프라인 매장 효율, 멤버십 기반 고객 관리가 중요합니다.",
    likelyNeeds: ["옴니채널 경험", "매장 방문 동기", "멤버십 리텐션"],
    notes: "유통 채널 간 고객 이동과 오프라인 활성화 제안에 적합합니다."
  },
  {
    id: "company-coupang",
    name: "쿠팡",
    industry: "이커머스/물류",
    website: "https://www.coupang.com/",
    description: "이커머스, 로켓배송, OTT, 물류 인프라를 운영하는 플랫폼 기업입니다.",
    recentBusinessContext: "멤버십 가치, 카테고리 확장, 물류 경험 차별화가 중요합니다.",
    likelyNeeds: ["와우 멤버십 가치", "카테고리 구매 전환", "배송 경험 차별화"],
    notes: "커머스 리텐션과 멤버십 가치 제안 프로젝트에 적합합니다."
  },
  {
    id: "company-ssg",
    name: "SSG.COM",
    industry: "이커머스/리테일",
    size: "mid_sized_company",
    website: "https://www.ssg.com/",
    description: "신세계 계열의 온라인 장보기와 라이프스타일 커머스 플랫폼입니다.",
    recentBusinessContext: "온라인 장보기 차별화, 프리미엄 식품, 오프라인 연계가 중요합니다.",
    likelyNeeds: ["장보기 재구매", "프리미엄 식품 경험", "온오프라인 연계"],
    notes: "온라인 장보기 고객 여정과 리테일 연계 전략 제안에 적합합니다."
  },
  {
    id: "company-hyundai-department-store",
    name: "현대백화점",
    industry: "리테일/백화점",
    website: "https://www.ehyundai.com/",
    description: "백화점, 프리미엄 아울렛, 라이프스타일 공간을 운영하는 유통 기업입니다.",
    recentBusinessContext: "공간형 리테일, 문화 콘텐츠, MZ 방문 동기 강화가 중요합니다.",
    likelyNeeds: ["공간형 리테일", "MZ 방문 동기", "문화 콘텐츠 연계"],
    notes: "오프라인 리테일을 경험형 공간으로 확장하는 프로젝트와 맞습니다."
  },
  {
    id: "company-hyundai-card",
    name: "현대카드",
    industry: "금융/카드",
    website: "https://www.hyundaicard.com/",
    description: "카드, 금융, 브랜딩, 문화 마케팅을 결합한 금융 서비스를 제공합니다.",
    recentBusinessContext: "프리미엄 카드 경험, PLCC, 문화 브랜딩과 고객 락인이 중요합니다.",
    likelyNeeds: ["PLCC 가치", "문화 브랜딩", "카드 고객 리텐션"],
    notes: "금융 서비스 브랜딩과 고객 경험 분석 프로젝트에 적합합니다."
  },
  {
    id: "company-shinhan-bank",
    name: "신한은행",
    industry: "금융/은행",
    website: "https://www.shinhan.com/",
    description: "개인·기업 금융과 디지털 금융 서비스를 운영하는 은행입니다.",
    recentBusinessContext: "모바일 뱅킹 경험, 청년 금융, 자산관리 서비스 진입 장벽이 중요합니다.",
    likelyNeeds: ["청년 금융 니즈", "모바일 뱅킹 UX", "자산관리 진입 장벽"],
    notes: "2030 금융 행동 리서치와 디지털 금융 제안에 적합합니다."
  },
  {
    id: "company-kb-kookmin-bank",
    name: "KB국민은행",
    industry: "금융/은행",
    website: "https://www.kbstar.com/",
    description: "리테일 금융, 기업 금융, 자산관리 서비스를 제공하는 은행입니다.",
    recentBusinessContext: "청년 고객 확보, 슈퍼앱 경쟁, 금융 생활 서비스 확장이 중요합니다.",
    likelyNeeds: ["청년 고객 확보", "금융 앱 락인", "생활 금융 서비스"],
    notes: "금융 플랫폼 경쟁과 청년 고객 유입 전략 제안에 적합합니다."
  },
  {
    id: "company-woori-bank",
    name: "우리은행",
    industry: "금융/은행",
    website: "https://www.wooribank.com/",
    description: "개인 금융, 기업 금융, 글로벌 금융 서비스를 운영하는 은행입니다.",
    recentBusinessContext: "디지털 전환, 외국인·청년 고객, 생활 금융 접점 확대가 중요합니다.",
    likelyNeeds: ["디지털 금융 전환", "청년 고객 경험", "생활 금융 접점"],
    notes: "디지털 은행 경험과 신규 고객 세그먼트 분석 프로젝트에 적합합니다."
  },
  {
    id: "company-kakao-bank",
    name: "카카오뱅크",
    industry: "금융/인터넷은행",
    website: "https://www.kakaobank.com/",
    description: "모바일 중심의 인터넷전문은행 서비스를 운영합니다.",
    recentBusinessContext: "간편 금융 경험, 2030 고객 락인, 대출·투자 서비스 확장이 중요합니다.",
    likelyNeeds: ["모바일 금융 습관", "2030 락인", "간편 금융 UX"],
    notes: "모바일 금융 서비스의 사용자 경험과 신규 상품 제안에 적합합니다."
  },
  {
    id: "company-kbank",
    name: "케이뱅크",
    industry: "금융/인터넷은행",
    size: "mid_sized_company",
    website: "https://www.kbanknow.com/",
    description: "모바일 기반 예금, 대출, 투자 연계 금융 서비스를 제공하는 인터넷은행입니다.",
    recentBusinessContext: "고객 유입, 예금·대출 차별화, 디지털 금융 신뢰 형성이 중요합니다.",
    likelyNeeds: ["고객 유입 전략", "모바일 금융 신뢰", "상품 차별화"],
    notes: "인터넷은행 경쟁 구도와 고객 획득 전략 분석에 적합합니다."
  },
  {
    id: "company-mirae-asset",
    name: "미래에셋증권",
    industry: "금융/증권",
    website: "https://securities.miraeasset.com/",
    description: "투자, 자산관리, 해외주식, 연금 서비스를 제공하는 증권사입니다.",
    recentBusinessContext: "개인 투자자 교육, 해외주식 경험, 청년 자산관리 니즈가 중요합니다.",
    likelyNeeds: ["청년 투자 교육", "해외주식 UX", "자산관리 콘텐츠"],
    notes: "대학생 투자 행동과 자산관리 진입 장벽 분석 프로젝트에 적합합니다."
  },
  {
    id: "company-korea-investment",
    name: "한국투자증권",
    industry: "금융/증권",
    website: "https://www.truefriend.com/",
    description: "투자중개, 자산관리, IB 등 증권 서비스를 제공하는 금융 기업입니다.",
    recentBusinessContext: "모바일 투자 경험, 청년 투자자 리텐션, 금융 콘텐츠 신뢰가 중요합니다.",
    likelyNeeds: ["모바일 투자 경험", "투자자 리텐션", "금융 콘텐츠 신뢰"],
    notes: "투자 앱 사용성과 금융 콘텐츠 전략 프로젝트에 적합합니다."
  },
  {
    id: "company-nh-investment",
    name: "NH투자증권",
    industry: "금융/증권",
    website: "https://www.nhqv.com/",
    description: "자산관리, 투자중개, 리서치와 디지털 투자 서비스를 운영합니다.",
    recentBusinessContext: "초보 투자자 온보딩, ISA/연금 관심, 투자 정보 이해도가 중요합니다.",
    likelyNeeds: ["초보 투자자 온보딩", "연금/절세 니즈", "투자 정보 UX"],
    notes: "투자 정보 이해도와 청년 투자자 교육 제안에 적합합니다."
  },
  {
    id: "company-samsung-life",
    name: "삼성생명",
    industry: "금융/보험",
    website: "https://www.samsunglife.com/",
    description: "생명보험, 연금, 자산관리 서비스를 제공하는 보험사입니다.",
    recentBusinessContext: "보험 가입 인식, 디지털 보험 상담, 세대별 보장 니즈가 중요합니다.",
    likelyNeeds: ["보험 인식 개선", "디지털 상담 경험", "세대별 보장 니즈"],
    notes: "보험 서비스의 청년 고객 이해와 커뮤니케이션 전략 제안에 적합합니다."
  },
  {
    id: "company-hanwha-life",
    name: "한화생명",
    industry: "금융/보험",
    website: "https://www.hanwhalife.com/",
    description: "생명보험과 금융 플랫폼, 자산관리 서비스를 운영하는 보험사입니다.",
    recentBusinessContext: "디지털 보험 플랫폼, MZ 보험 인식, 헬스케어 연계가 중요합니다.",
    likelyNeeds: ["MZ 보험 인식", "헬스케어 연계", "디지털 보험 경험"],
    notes: "보험과 헬스케어 결합형 서비스 기획에 적합합니다."
  },
  {
    id: "company-samsung-fire",
    name: "삼성화재",
    industry: "금융/손해보험",
    website: "https://www.samsungfire.com/",
    description: "자동차보험, 장기보험, 일반보험과 디지털 보험 서비스를 제공합니다.",
    recentBusinessContext: "자동차 보험 경쟁, 디지털 청구 경험, 생활 위험 관리 서비스가 중요합니다.",
    likelyNeeds: ["디지털 보험 청구", "자동차보험 차별화", "생활 위험 관리"],
    notes: "보험 고객 경험과 디지털 전환 프로젝트에 적합합니다."
  },
  {
    id: "company-bc-card",
    name: "BC카드",
    industry: "금융/결제",
    website: "https://www.bccard.com/",
    description: "카드 결제 인프라, 데이터, 가맹점 솔루션을 운영하는 결제 기업입니다.",
    recentBusinessContext: "결제 데이터 활용, 가맹점 지원, 소비 트렌드 분석이 중요합니다.",
    likelyNeeds: ["결제 데이터 인사이트", "가맹점 솔루션", "소비 트렌드 분석"],
    notes: "결제 데이터 기반 시장 분석과 가맹점 가치 제안에 적합합니다."
  },
  {
    id: "company-nicepay",
    name: "NICE페이먼츠",
    industry: "금융/PG",
    size: "mid_sized_company",
    website: "https://www.nicepayments.co.kr/",
    description: "온라인 결제, PG, 정산 서비스를 제공하는 결제 인프라 기업입니다.",
    recentBusinessContext: "소상공인 결제 경험, B2B 결제 안정성, 커머스 고객 확보가 중요합니다.",
    likelyNeeds: ["B2B 결제 니즈", "소상공인 결제 경험", "커머스 고객 확보"],
    notes: "B2B 결제 인프라의 고객 세분화 프로젝트에 적합합니다."
  },
  {
    id: "company-naver-financial",
    name: "네이버파이낸셜",
    industry: "금융/페이먼트",
    size: "large_enterprise",
    website: "https://www.naverfincorp.com/",
    description: "네이버페이와 금융 서비스를 운영하는 핀테크 기업입니다.",
    recentBusinessContext: "간편결제 락인, 쇼핑·예약 결제 연결, 금융 서비스 확장이 중요합니다.",
    likelyNeeds: ["간편결제 락인", "커머스 결제 경험", "금융 서비스 전환"],
    notes: "페이먼트와 커머스 경험을 연결한 프로젝트에 적합합니다."
  },
  {
    id: "company-samsung-card",
    name: "삼성카드",
    industry: "금융/카드",
    website: "https://www.samsungcard.com/",
    description: "신용카드, 데이터 기반 마케팅, 금융 서비스를 운영합니다.",
    recentBusinessContext: "카드 혜택 피로도, 데이터 마케팅, 생활 플랫폼화가 중요합니다.",
    likelyNeeds: ["카드 혜택 인식", "데이터 마케팅", "생활 플랫폼 전략"],
    notes: "소비자 혜택 인식과 카드 상품 포지셔닝 분석에 적합합니다."
  },
  {
    id: "company-lotte-card",
    name: "롯데카드",
    industry: "금융/카드",
    website: "https://www.lottecard.co.kr/",
    description: "신용카드와 데이터 기반 소비자 금융 서비스를 제공합니다.",
    recentBusinessContext: "유통 계열 혜택, 고객 데이터 활용, 카드 상품 차별화가 중요합니다.",
    likelyNeeds: ["유통 혜택 연계", "카드 상품 차별화", "소비 데이터 활용"],
    notes: "유통-금융 결합형 카드 경험 제안에 적합합니다."
  },
  {
    id: "company-tving",
    name: "TVING",
    industry: "OTT/콘텐츠",
    size: "mid_sized_company",
    website: "https://www.tving.com/",
    description: "드라마, 예능, 스포츠 등 스트리밍 콘텐츠를 제공하는 OTT 서비스입니다.",
    recentBusinessContext: "OTT 구독 유지, 스포츠 콘텐츠, 오리지널 콘텐츠 팬덤이 중요합니다.",
    likelyNeeds: ["OTT 구독 리텐션", "콘텐츠 팬덤", "스포츠 시청 경험"],
    notes: "OTT 서비스 리텐션과 콘텐츠 소비자 분석 프로젝트에 적합합니다."
  },
  {
    id: "company-watcha",
    name: "왓챠",
    industry: "OTT/콘텐츠",
    size: "mid_sized_company",
    website: "https://watcha.com/",
    description: "영화, 드라마 추천과 스트리밍 서비스를 운영하는 콘텐츠 플랫폼입니다.",
    recentBusinessContext: "추천 경험, 구독 지속 이유, 콘텐츠 취향 데이터 활용이 중요합니다.",
    likelyNeeds: ["추천 경험 개선", "구독 지속 이유", "콘텐츠 취향 분석"],
    notes: "콘텐츠 추천과 취향 기반 커뮤니케이션 전략 제안에 적합합니다."
  },
  {
    id: "company-melon",
    name: "멜론",
    industry: "음악/플랫폼",
    website: "https://www.melon.com/",
    description: "음악 스트리밍, 차트, 아티스트 콘텐츠를 제공하는 음악 플랫폼입니다.",
    recentBusinessContext: "음악 구독 리텐션, 팬덤 기능, 플레이리스트 경험이 중요합니다.",
    likelyNeeds: ["음악 구독 리텐션", "팬덤 기능", "플레이리스트 UX"],
    notes: "음악 플랫폼의 고객 락인과 팬덤 경험 분석에 적합합니다."
  },
  {
    id: "company-genie-music",
    name: "지니뮤직",
    industry: "음악/플랫폼",
    size: "mid_sized_company",
    website: "https://www.geniemusic.co.kr/",
    description: "음악 스트리밍과 오디오 콘텐츠 서비스를 제공하는 플랫폼입니다.",
    recentBusinessContext: "음악 앱 차별화, 통신 결합 상품, 오디오 콘텐츠 확장이 중요합니다.",
    likelyNeeds: ["음악 앱 차별화", "통신 결합 혜택", "오디오 콘텐츠 전략"],
    notes: "음악 플랫폼 차별화와 구독 상품 전략 제안에 적합합니다."
  },
  {
    id: "company-bugs",
    name: "벅스",
    industry: "음악/플랫폼",
    size: "mid_sized_company",
    website: "https://music.bugs.co.kr/",
    description: "음악 스트리밍과 고음질 음악 경험을 제공하는 플랫폼입니다.",
    recentBusinessContext: "고음질 포지셔닝, 니치 음악 팬덤, 구독 유지가 중요합니다.",
    likelyNeeds: ["고음질 음악 수요", "니치 팬덤", "구독 리텐션"],
    notes: "음악 서비스 포지셔닝과 충성 고객 분석 프로젝트에 적합합니다."
  },
  {
    id: "company-hybe",
    name: "HYBE",
    industry: "엔터테인먼트/팬덤",
    website: "https://hybecorp.com/",
    description: "아티스트 IP, 팬덤 플랫폼, 음악·콘텐츠 사업을 운영하는 엔터테인먼트 기업입니다.",
    recentBusinessContext: "글로벌 팬덤 경험, IP 확장, 팬덤 커머스와 플랫폼 운영이 중요합니다.",
    likelyNeeds: ["글로벌 팬덤 경험", "IP 확장", "팬덤 커머스"],
    notes: "팬덤 플랫폼과 IP 비즈니스 전략 제안에 적합합니다."
  },
  {
    id: "company-sm-entertainment",
    name: "SM엔터테인먼트",
    industry: "엔터테인먼트/팬덤",
    website: "https://www.smentertainment.com/",
    description: "음악, 아티스트 IP, 팬덤 콘텐츠를 운영하는 엔터테인먼트 기업입니다.",
    recentBusinessContext: "팬덤 데이터, 글로벌 투어, IP 기반 상품화가 중요합니다.",
    likelyNeeds: ["팬덤 데이터 활용", "글로벌 팬 경험", "IP 상품화"],
    notes: "K팝 팬덤 리서치와 콘텐츠 커머스 제안에 적합합니다."
  },
  {
    id: "company-yg-entertainment",
    name: "YG엔터테인먼트",
    industry: "엔터테인먼트/팬덤",
    website: "https://www.ygfamily.com/",
    description: "아티스트 매니지먼트, 음악, 공연, 콘텐츠 사업을 운영합니다.",
    recentBusinessContext: "글로벌 팬덤 관리, 아티스트 IP 확장, 디지털 콘텐츠 전략이 중요합니다.",
    likelyNeeds: ["글로벌 팬덤 관리", "디지털 콘텐츠", "IP 확장"],
    notes: "팬덤 참여와 글로벌 콘텐츠 전략 프로젝트에 적합합니다."
  },
  {
    id: "company-jyp-entertainment",
    name: "JYP엔터테인먼트",
    industry: "엔터테인먼트/팬덤",
    website: "https://www.jype.com/",
    description: "아티스트 IP와 글로벌 음악 콘텐츠를 운영하는 엔터테인먼트 기업입니다.",
    recentBusinessContext: "글로벌 팬덤 유지, 아티스트 브랜드, 커뮤니티 경험이 중요합니다.",
    likelyNeeds: ["글로벌 팬덤 유지", "아티스트 브랜드", "커뮤니티 경험"],
    notes: "글로벌 팬덤 커뮤니케이션과 브랜드 전략 제안에 적합합니다."
  },
  {
    id: "company-nexon",
    name: "넥슨",
    industry: "게임/엔터테인먼트",
    website: "https://www.nexon.com/",
    description: "온라인 게임과 글로벌 게임 IP를 운영하는 게임 기업입니다.",
    recentBusinessContext: "라이브 서비스 운영, IP 확장, 신규 유저 유입과 복귀 유저 관리가 중요합니다.",
    likelyNeeds: ["게임 라이브 서비스", "복귀 유저 전략", "IP 확장"],
    notes: "게임 고객 세그먼트와 리텐션 전략 제안에 적합합니다."
  },
  {
    id: "company-netmarble",
    name: "넷마블",
    industry: "게임/엔터테인먼트",
    website: "https://www.netmarble.com/",
    description: "모바일 게임과 글로벌 IP 기반 게임을 운영하는 게임 기업입니다.",
    recentBusinessContext: "모바일 게임 경쟁, IP 협업, 글로벌 유저 획득 비용이 중요합니다.",
    likelyNeeds: ["모바일 게임 마케팅", "IP 협업 전략", "글로벌 유저 획득"],
    notes: "게임 마케팅과 IP 기반 신규 유저 확보 프로젝트에 적합합니다."
  },
  {
    id: "company-ncsoft",
    name: "엔씨소프트",
    industry: "게임/엔터테인먼트",
    website: "https://www.ncsoft.com/",
    description: "온라인·모바일 게임 IP와 AI 기술을 운영하는 게임 기업입니다.",
    recentBusinessContext: "IP 재활성화, 신규 유저 인식, 게임 커뮤니티 신뢰가 중요합니다.",
    likelyNeeds: ["IP 재활성화", "게임 커뮤니티 신뢰", "신규 유저 인식"],
    notes: "게임 브랜드 인식과 커뮤니티 전략 제안에 적합합니다."
  },
  {
    id: "company-pearlabyss",
    name: "펄어비스",
    industry: "게임/엔터테인먼트",
    size: "mid_sized_company",
    website: "https://www.pearlabyss.com/",
    description: "글로벌 MMORPG와 게임 IP를 개발·운영하는 게임 기업입니다.",
    recentBusinessContext: "글로벌 게임 IP 확장, 신규 타이틀 기대감, 커뮤니티 관리가 중요합니다.",
    likelyNeeds: ["글로벌 게임 커뮤니티", "IP 확장", "신규 타이틀 기대 관리"],
    notes: "글로벌 게임 팬덤과 커뮤니티 분석 프로젝트에 적합합니다."
  },
  {
    id: "company-line",
    name: "LINE",
    industry: "메신저/플랫폼",
    website: "https://linecorp.com/",
    description: "메신저, 콘텐츠, 핀테크, 광고 서비스를 운영하는 플랫폼 기업입니다.",
    recentBusinessContext: "일본·동남아 플랫폼 생태계, 메신저 기반 서비스 확장이 중요합니다.",
    likelyNeeds: ["메신저 기반 서비스", "글로벌 플랫폼 전략", "광고/콘텐츠 접점"],
    notes: "글로벌 플랫폼 생태계와 메신저 기반 서비스 제안에 적합합니다."
  },
  {
    id: "company-bunjang",
    name: "번개장터",
    industry: "중고거래/커머스",
    size: "mid_sized_company",
    website: "https://m.bunjang.co.kr/",
    description: "중고거래와 취향 기반 리커머스 서비스를 운영하는 플랫폼입니다.",
    recentBusinessContext: "거래 신뢰, 취향 기반 탐색, 리커머스 성장성이 중요합니다.",
    likelyNeeds: ["거래 신뢰", "취향 기반 탐색", "리커머스 성장"],
    notes: "리커머스 고객 신뢰와 세그먼트 분석 프로젝트에 적합합니다."
  },
  {
    id: "company-idus",
    name: "아이디어스",
    industry: "핸드메이드/커머스",
    size: "mid_sized_company",
    website: "https://www.idus.com/",
    description: "핸드메이드 작품과 작가 기반 커머스 플랫폼입니다.",
    recentBusinessContext: "작가 생태계, 선물 수요, 커머스 신뢰와 재구매가 중요합니다.",
    likelyNeeds: ["작가 생태계", "선물 수요", "재구매 전략"],
    notes: "크리에이터 커머스와 선물 시장 분석 프로젝트에 적합합니다."
  },
  {
    id: "company-brandi",
    name: "브랜디",
    industry: "패션/커머스",
    size: "mid_sized_company",
    website: "https://www.brandi.co.kr/",
    description: "여성 패션 커머스와 쇼핑몰 솔루션을 운영하는 플랫폼입니다.",
    recentBusinessContext: "패션 셀러 경쟁, 빠른 배송, 개인화 추천과 고객 리텐션이 중요합니다.",
    likelyNeeds: ["패션 셀러 성장", "개인화 추천", "빠른 배송 경험"],
    notes: "패션 플랫폼의 셀러 생태계와 고객 리텐션 분석에 적합합니다."
  },
  {
    id: "company-wconcept",
    name: "W컨셉",
    industry: "패션/커머스",
    size: "mid_sized_company",
    website: "https://www.wconcept.co.kr/",
    description: "디자이너 브랜드 중심의 패션 커머스 플랫폼입니다.",
    recentBusinessContext: "디자이너 브랜드 발견, 프리미엄 패션 고객, 콘텐츠 기반 구매 전환이 중요합니다.",
    likelyNeeds: ["브랜드 발견 경험", "프리미엄 고객", "콘텐츠 구매 전환"],
    notes: "브랜드 큐레이션과 프리미엄 커머스 전략 제안에 적합합니다."
  },
  {
    id: "company-croquis-zigzag",
    name: "지그재그",
    industry: "패션/커머스",
    size: "mid_sized_company",
    website: "https://zigzag.kr/",
    description: "여성 패션 쇼핑몰 탐색과 구매를 연결하는 패션 플랫폼입니다.",
    recentBusinessContext: "쇼핑몰 탐색 효율, 개인화 추천, 앱 재방문이 중요합니다.",
    likelyNeeds: ["개인화 탐색", "앱 재방문", "쇼핑몰 선택 기준"],
    notes: "패션 앱 탐색 경험과 구매 전환 분석 프로젝트에 적합합니다."
  },
  {
    id: "company-gentlemonster",
    name: "젠틀몬스터",
    industry: "패션/아이웨어",
    website: "https://www.gentlemonster.com/",
    description: "아이웨어, 공간 경험, 글로벌 패션 브랜드를 운영합니다.",
    recentBusinessContext: "브랜드 공간 경험, 글로벌 팬덤, 제품-콘텐츠 결합이 중요합니다.",
    likelyNeeds: ["공간 경험", "글로벌 브랜드 팬덤", "제품 콘텐츠화"],
    notes: "브랜드 경험과 오프라인 공간 전략 제안에 적합합니다."
  },
  {
    id: "company-fila-korea",
    name: "휠라코리아",
    industry: "패션/스포츠",
    website: "https://www.fila.co.kr/",
    description: "스포츠웨어와 라이프스타일 패션 브랜드를 운영합니다.",
    recentBusinessContext: "브랜드 리포지셔닝, 스포츠 라이프스타일, MZ 고객 회복이 중요합니다.",
    likelyNeeds: ["브랜드 리포지셔닝", "스포츠 라이프스타일", "MZ 고객 회복"],
    notes: "패션 브랜드 포지셔닝과 고객 인식 분석 프로젝트에 적합합니다."
  },
  {
    id: "company-spao",
    name: "SPAO",
    industry: "패션/SPA",
    website: "https://www.spao.com/",
    description: "캐주얼 SPA 패션 브랜드로 의류와 라이프스타일 상품을 판매합니다.",
    recentBusinessContext: "캐릭터 협업, 가격 경쟁력, 오프라인 매장 경험이 중요합니다.",
    likelyNeeds: ["캐릭터 협업", "가격 경쟁력", "매장 경험"],
    notes: "SPA 브랜드 협업 상품과 MZ 매장 방문 전략 제안에 적합합니다."
  },
  {
    id: "company-innisfree",
    name: "이니스프리",
    industry: "뷰티/화장품",
    website: "https://www.innisfree.com/kr/ko/Main.do",
    description: "자연주의 이미지를 기반으로 스킨케어와 메이크업 제품을 판매하는 뷰티 브랜드입니다.",
    recentBusinessContext: "브랜드 리뉴얼, 클린뷰티, 글로벌 고객과 Z세대 접점이 중요합니다.",
    likelyNeeds: ["브랜드 리뉴얼", "클린뷰티 인식", "Z세대 접점"],
    notes: "뷰티 브랜드 인식과 리브랜딩 효과 분석 프로젝트에 적합합니다."
  },
  {
    id: "company-laneige",
    name: "라네즈",
    industry: "뷰티/화장품",
    website: "https://www.laneige.com/kr/ko/index.html",
    description: "스킨케어와 글로벌 뷰티 제품을 운영하는 화장품 브랜드입니다.",
    recentBusinessContext: "글로벌 스킨케어 경쟁, 제품 라인 인지도, 콘텐츠 마케팅이 중요합니다.",
    likelyNeeds: ["글로벌 뷰티 인지도", "제품 라인 포지셔닝", "콘텐츠 마케팅"],
    notes: "글로벌 뷰티 브랜드의 고객 인식 분석 프로젝트에 적합합니다."
  },
  {
    id: "company-romand",
    name: "롬앤",
    industry: "뷰티/색조",
    size: "mid_sized_company",
    website: "https://romand.co.kr/",
    description: "색조 메이크업과 트렌디한 뷰티 콘텐츠를 중심으로 성장한 브랜드입니다.",
    recentBusinessContext: "색조 트렌드, 글로벌 K뷰티 팬덤, SNS 기반 구매 전환이 중요합니다.",
    likelyNeeds: ["색조 트렌드", "SNS 구매 전환", "글로벌 K뷰티 팬덤"],
    notes: "SNS 기반 뷰티 커머스와 글로벌 고객 분석에 적합합니다."
  },
  {
    id: "company-medicube",
    name: "메디큐브",
    industry: "뷰티/디바이스",
    size: "mid_sized_company",
    website: "https://themedicube.co.kr/",
    description: "스킨케어와 홈 뷰티 디바이스를 판매하는 뷰티 브랜드입니다.",
    recentBusinessContext: "홈 뷰티 디바이스 신뢰, 제품 효능 커뮤니케이션, 글로벌 확장이 중요합니다.",
    likelyNeeds: ["홈 뷰티 디바이스 신뢰", "효능 커뮤니케이션", "글로벌 확장"],
    notes: "뷰티 디바이스 구매 장벽과 메시지 전략 프로젝트에 적합합니다."
  },
  {
    id: "company-osulloc",
    name: "오설록",
    industry: "F&B/차",
    website: "https://www.osulloc.com/",
    description: "차, 티푸드, 티하우스 경험을 제공하는 프리미엄 차 브랜드입니다.",
    recentBusinessContext: "차 문화 대중화, 선물 수요, 오프라인 티하우스 경험이 중요합니다.",
    likelyNeeds: ["차 문화 대중화", "선물 수요", "오프라인 경험"],
    notes: "프리미엄 F&B 브랜드 경험과 선물 시장 분석에 적합합니다."
  },
  {
    id: "company-starbucks-korea",
    name: "스타벅스코리아",
    industry: "F&B/카페",
    website: "https://www.starbucks.co.kr/",
    description: "전국 카페 매장과 멤버십, 굿즈, 리워드 프로그램을 운영합니다.",
    recentBusinessContext: "매장 경험, 리워드 멤버십, 굿즈 구매와 커뮤니티 문화가 중요합니다.",
    likelyNeeds: ["멤버십 리워드", "매장 경험", "굿즈 구매 행동"],
    notes: "카페 브랜드 리텐션과 굿즈 전략 프로젝트에 적합합니다."
  },
  {
    id: "company-mega-mgc-coffee",
    name: "메가MGC커피",
    industry: "F&B/카페",
    size: "mid_sized_company",
    website: "https://www.mega-mgccoffee.com/",
    description: "가성비 커피와 대형 음료를 중심으로 성장한 카페 프랜차이즈입니다.",
    recentBusinessContext: "저가 커피 경쟁, 매장 밀도, 메뉴 차별화와 브랜드 선호가 중요합니다.",
    likelyNeeds: ["저가 커피 차별화", "메뉴 전략", "브랜드 선호"],
    notes: "F&B 프랜차이즈 경쟁과 메뉴 포지셔닝 분석에 적합합니다."
  },
  {
    id: "company-compose-coffee",
    name: "컴포즈커피",
    industry: "F&B/카페",
    size: "mid_sized_company",
    website: "https://composecoffee.com/",
    description: "가성비 커피와 프랜차이즈 매장을 운영하는 카페 브랜드입니다.",
    recentBusinessContext: "저가 커피 시장 경쟁, 가맹점 운영, 고객 재방문이 중요합니다.",
    likelyNeeds: ["가성비 포지셔닝", "고객 재방문", "가맹점 경험"],
    notes: "카페 프랜차이즈 고객 세분화와 재방문 전략에 적합합니다."
  },
  {
    id: "company-bhc",
    name: "BHC",
    industry: "F&B/치킨",
    website: "https://www.bhc.co.kr/",
    description: "치킨 프랜차이즈 브랜드와 외식 매장을 운영합니다.",
    recentBusinessContext: "배달 경쟁, 신메뉴 반응, 브랜드 충성도와 가격 민감도가 중요합니다.",
    likelyNeeds: ["신메뉴 반응", "배달 채널 전략", "브랜드 충성도"],
    notes: "치킨 프랜차이즈의 메뉴·채널 전략 프로젝트에 적합합니다."
  },
  {
    id: "company-bbq",
    name: "BBQ",
    industry: "F&B/치킨",
    website: "https://www.bbq.co.kr/",
    description: "치킨 프랜차이즈와 글로벌 외식 사업을 운영합니다.",
    recentBusinessContext: "글로벌 K치킨 확장, 배달 채널, 브랜드 프리미엄화가 중요합니다.",
    likelyNeeds: ["글로벌 K치킨", "배달 채널", "프리미엄 포지셔닝"],
    notes: "외식 브랜드 글로벌화와 배달 경험 분석에 적합합니다."
  },
  {
    id: "company-dominos-korea",
    name: "도미노피자 코리아",
    industry: "F&B/피자",
    website: "https://web.dominos.co.kr/",
    description: "피자 배달과 프랜차이즈 매장을 운영하는 글로벌 피자 브랜드입니다.",
    recentBusinessContext: "배달 앱 경쟁, 자체 앱 활성화, 신메뉴 프로모션이 중요합니다.",
    likelyNeeds: ["자체 앱 활성화", "신메뉴 프로모션", "배달 고객 리텐션"],
    notes: "F&B 자체 앱과 배달 플랫폼 경쟁 분석에 적합합니다."
  },
  {
    id: "company-hitejinro",
    name: "하이트진로",
    industry: "주류/F&B",
    website: "https://www.hitejinro.com/",
    description: "맥주와 소주 등 주류 브랜드를 운영하는 기업입니다.",
    recentBusinessContext: "주류 브랜드 경험, MZ 음주 문화, 팝업과 굿즈 마케팅이 중요합니다.",
    likelyNeeds: ["MZ 음주 문화", "브랜드 경험", "팝업/굿즈 전략"],
    notes: "주류 브랜드 경험과 MZ 마케팅 프로젝트에 적합합니다."
  },
  {
    id: "company-ob-beer",
    name: "오비맥주",
    industry: "주류/F&B",
    website: "https://www.ob.co.kr/",
    description: "맥주 브랜드와 주류 마케팅을 운영하는 기업입니다.",
    recentBusinessContext: "맥주 브랜드 선택, 저도주·무알콜 트렌드, 오프라인 이벤트가 중요합니다.",
    likelyNeeds: ["맥주 브랜드 선택", "무알콜 트렌드", "오프라인 이벤트"],
    notes: "주류 소비 트렌드와 브랜드 캠페인 전략 제안에 적합합니다."
  },
  {
    id: "company-korea-seven",
    name: "세븐일레븐 코리아",
    industry: "편의점/리테일",
    website: "https://www.7-eleven.co.kr/",
    description: "편의점 매장과 자체 상품, 생활 서비스를 운영합니다.",
    recentBusinessContext: "편의점 PB 경쟁, 앱 멤버십, 야간·근거리 소비가 중요합니다.",
    likelyNeeds: ["PB 상품 전략", "앱 멤버십", "근거리 소비"],
    notes: "편의점 상품 기획과 고객 리텐션 프로젝트에 적합합니다."
  },
  {
    id: "company-cu",
    name: "CU",
    industry: "편의점/리테일",
    website: "https://cu.bgfretail.com/",
    description: "전국 편의점 네트워크와 PB 상품, 멤버십 서비스를 운영합니다.",
    recentBusinessContext: "편의점 PB, 글로벌 점포, 앱 서비스와 고객 생활 접점이 중요합니다.",
    likelyNeeds: ["PB 상품", "앱 서비스", "생활 접점"],
    notes: "편의점 앱과 PB 상품 전략 제안에 적합합니다."
  },
  {
    id: "company-daiso",
    name: "다이소",
    industry: "생활용품/리테일",
    website: "https://www.daiso.co.kr/",
    description: "생활용품과 균일가 상품을 판매하는 리테일 브랜드입니다.",
    recentBusinessContext: "가성비 소비, 카테고리 확장, 매장 탐색 경험이 중요합니다.",
    likelyNeeds: ["가성비 소비", "카테고리 확장", "매장 탐색 경험"],
    notes: "생활용품 소비자 행동과 매장 경험 개선 프로젝트에 적합합니다."
  },
  {
    id: "company-hanssem",
    name: "한샘",
    industry: "가구/인테리어",
    website: "https://www.hanssem.com/",
    description: "가구, 인테리어, 리모델링 서비스를 제공하는 리빙 기업입니다.",
    recentBusinessContext: "주거 리모델링 수요, 온라인 상담, 라이프스타일 제안이 중요합니다.",
    likelyNeeds: ["리모델링 수요", "온라인 상담 경험", "라이프스타일 제안"],
    notes: "주거·리빙 고객 여정과 상담 경험 분석 프로젝트에 적합합니다."
  },
  {
    id: "company-casamia",
    name: "까사미아",
    industry: "가구/리빙",
    website: "https://www.guud.com/",
    description: "가구와 홈퍼니싱 상품을 제공하는 리빙 브랜드입니다.",
    recentBusinessContext: "프리미엄 리빙, 신혼·1인 가구, 온라인 구매 경험이 중요합니다.",
    likelyNeeds: ["프리미엄 리빙", "신혼/1인 가구", "온라인 구매 경험"],
    notes: "리빙 브랜드 포지셔닝과 주거 세그먼트 분석에 적합합니다."
  },
  {
    id: "company-tmap-mobility",
    name: "티맵모빌리티",
    industry: "모빌리티/내비게이션",
    size: "mid_sized_company",
    website: "https://www.tmapmobility.com/",
    description: "내비게이션, 대리, 주차, 모빌리티 데이터 서비스를 운영합니다.",
    recentBusinessContext: "운전자 데이터 활용, 이동 서비스 확장, B2B 모빌리티 솔루션이 중요합니다.",
    likelyNeeds: ["운전자 데이터", "이동 서비스 확장", "B2B 모빌리티"],
    notes: "모빌리티 데이터 기반 서비스 기획 프로젝트에 적합합니다."
  },
  {
    id: "company-green-car",
    name: "그린카",
    industry: "모빌리티/카셰어링",
    size: "mid_sized_company",
    website: "https://www.greencar.co.kr/",
    description: "카셰어링 서비스를 제공하는 모빌리티 플랫폼입니다.",
    recentBusinessContext: "카셰어링 선택 기준, 차량 이용 신뢰, 프로모션 효율이 중요합니다.",
    likelyNeeds: ["카셰어링 선택 기준", "차량 이용 신뢰", "프로모션 효율"],
    notes: "카셰어링 시장의 고객 경험과 차별화 전략에 적합합니다."
  },
  {
    id: "company-lotte-rental",
    name: "롯데렌탈",
    industry: "모빌리티/렌탈",
    website: "https://www.lotterental.com/",
    description: "렌터카, 차량 구독, 산업재 렌탈 서비스를 운영합니다.",
    recentBusinessContext: "차량 구독, 장기렌트, 법인 고객 관리와 디지털 전환이 중요합니다.",
    likelyNeeds: ["차량 구독", "장기렌트 고객", "법인 고객 관리"],
    notes: "렌탈 서비스의 고객 세분화와 구독형 모빌리티 전략 제안에 적합합니다."
  },
  {
    id: "company-airbnb-korea",
    name: "Airbnb Korea",
    industry: "여행/숙박 플랫폼",
    website: "https://www.airbnb.co.kr/",
    description: "숙소와 체험을 연결하는 글로벌 여행 플랫폼입니다.",
    recentBusinessContext: "로컬 여행, 장기 숙박, 호스트 신뢰와 지역 경험이 중요합니다.",
    likelyNeeds: ["로컬 여행 경험", "호스트 신뢰", "장기 숙박 수요"],
    notes: "여행 플랫폼의 지역 경험과 신뢰 형성 프로젝트에 적합합니다."
  },
  {
    id: "company-tripbtoz",
    name: "트립비토즈",
    industry: "여행/콘텐츠 커머스",
    size: "startup",
    website: "https://www.tripbtoz.com/",
    description: "여행 영상 콘텐츠와 숙박 예약을 연결하는 플랫폼입니다.",
    recentBusinessContext: "콘텐츠 기반 예약 전환, 여행 영상 소비, Z세대 여행 탐색이 중요합니다.",
    likelyNeeds: ["콘텐츠 예약 전환", "Z세대 여행 탐색", "영상 커머스"],
    notes: "콘텐츠 커머스형 여행 서비스 전략 제안에 적합합니다."
  },
  {
    id: "company-creatrip",
    name: "크리에이트립",
    industry: "여행/인바운드 플랫폼",
    size: "mid_sized_company",
    website: "https://www.creatrip.com/",
    description: "외국인 관광객 대상 한국 여행 정보와 예약 서비스를 제공합니다.",
    recentBusinessContext: "인바운드 관광 회복, K컬처 기반 여행, 외국인 고객 여정이 중요합니다.",
    likelyNeeds: ["인바운드 관광", "K컬처 여행", "외국인 고객 여정"],
    notes: "외국인 관광객 리서치와 K컬처 여행 상품 전략에 적합합니다."
  },
  {
    id: "company-doctornow",
    name: "닥터나우",
    industry: "헬스케어/디지털헬스",
    size: "mid_sized_company",
    website: "https://www.doctornow.co.kr/",
    description: "비대면 진료와 건강 관련 서비스를 제공하는 디지털 헬스케어 플랫폼입니다.",
    recentBusinessContext: "비대면 진료 규제, 사용자 신뢰, 건강 서비스 확장이 중요합니다.",
    likelyNeeds: ["비대면 진료 신뢰", "건강 서비스 확장", "규제 환경 대응"],
    notes: "디지털 헬스케어 고객 수용성과 신뢰 형성 프로젝트에 적합합니다."
  },
  {
    id: "company-goodoc",
    name: "굿닥",
    industry: "헬스케어/의료 플랫폼",
    size: "mid_sized_company",
    website: "https://www.goodoc.co.kr/",
    description: "병원 찾기, 예약, 건강 정보를 제공하는 의료 플랫폼입니다.",
    recentBusinessContext: "병원 탐색 신뢰, 예약 전환, 의료 정보 접근성이 중요합니다.",
    likelyNeeds: ["병원 탐색 신뢰", "예약 전환", "의료 정보 접근성"],
    notes: "의료 플랫폼 UX와 병원 선택 기준 분석에 적합합니다."
  },
  {
    id: "company-huraypositive",
    name: "휴레이포지티브",
    industry: "헬스케어/디지털헬스",
    size: "SME",
    website: "https://www.huray.net/",
    description: "디지털 헬스케어와 만성질환 관리 솔루션을 제공하는 기업입니다.",
    recentBusinessContext: "디지털 치료·관리 서비스 수용성, B2B 헬스케어 도입이 중요합니다.",
    likelyNeeds: ["만성질환 관리", "B2B 헬스케어", "사용자 수용성"],
    notes: "헬스케어 서비스 도입 장벽과 사용자 리서치 프로젝트에 적합합니다."
  },
  {
    id: "company-deepbio",
    name: "딥바이오",
    industry: "AI/헬스케어",
    size: "SME",
    website: "https://www.deepbio.co.kr/",
    description: "병리 진단 AI 솔루션을 개발하는 헬스케어 AI 기업입니다.",
    recentBusinessContext: "의료 AI 신뢰, 병원 도입 과정, 글로벌 규제와 세일즈가 중요합니다.",
    likelyNeeds: ["의료 AI 신뢰", "병원 도입", "글로벌 세일즈"],
    notes: "의료 AI 시장 진입과 이해관계자 설득 전략에 적합합니다."
  },
  {
    id: "company-upstage",
    name: "업스테이지",
    industry: "AI/SaaS",
    size: "mid_sized_company",
    website: "https://www.upstage.ai/",
    description: "LLM, 문서 AI, OCR 등 기업용 AI 솔루션을 개발합니다.",
    recentBusinessContext: "기업 AI 도입, 문서 자동화, 산업별 AI 활용 사례 확보가 중요합니다.",
    likelyNeeds: ["기업 AI 도입", "문서 자동화", "산업별 활용 사례"],
    notes: "B2B AI 솔루션의 고객 문제 정의와 유스케이스 발굴에 적합합니다."
  },
  {
    id: "company-wrtn",
    name: "뤼튼",
    industry: "AI/생성형AI",
    size: "startup",
    website: "https://wrtn.ai/",
    description: "생성형 AI 기반 생산성·콘텐츠 서비스를 제공하는 기업입니다.",
    recentBusinessContext: "AI 서비스 일상화, 생산성 사용 습관, 무료/유료 전환이 중요합니다.",
    likelyNeeds: ["AI 사용 습관", "생산성 서비스 전환", "유료화 전략"],
    notes: "생성형 AI 서비스의 학생·직장인 사용 맥락 분석에 적합합니다."
  },
  {
    id: "company-scatterlab",
    name: "스캐터랩",
    industry: "AI/대화형 서비스",
    size: "startup",
    website: "https://scatterlab.co.kr/",
    description: "대화형 AI와 캐릭터 기반 AI 서비스를 개발하는 기업입니다.",
    recentBusinessContext: "AI 캐릭터 관계성, 대화 신뢰, 팬덤형 서비스 경험이 중요합니다.",
    likelyNeeds: ["AI 캐릭터 경험", "대화 신뢰", "팬덤형 서비스"],
    notes: "AI 대화 서비스의 사용자 몰입과 윤리적 신뢰 분석에 적합합니다."
  },
  {
    id: "company-sendbird",
    name: "센드버드",
    industry: "B2B SaaS/커뮤니케이션",
    size: "mid_sized_company",
    website: "https://sendbird.com/",
    description: "채팅, 음성, 영상, AI 고객 커뮤니케이션 솔루션을 제공하는 SaaS 기업입니다.",
    recentBusinessContext: "글로벌 B2B 고객 확보, AI 고객 상담, 개발자 경험이 중요합니다.",
    likelyNeeds: ["B2B 고객 확보", "AI 상담 유스케이스", "개발자 경험"],
    notes: "B2B SaaS GTM과 고객 세그먼트 분석 프로젝트에 적합합니다."
  },
  {
    id: "company-flex",
    name: "플렉스",
    industry: "HR/SaaS",
    size: "SME",
    website: "https://flex.team/",
    description: "인사관리, 급여, 근태, 조직 운영을 지원하는 HR SaaS입니다.",
    recentBusinessContext: "스타트업·중소기업 HR 디지털화, 조직문화 데이터 활용이 중요합니다.",
    likelyNeeds: ["HR 디지털화", "조직문화 데이터", "B2B SaaS 도입"],
    notes: "HR SaaS 도입 장벽과 고객 세그먼트 분석에 적합합니다."
  },
  {
    id: "company-grepp",
    name: "그렙",
    industry: "HR/교육테크",
    size: "SME",
    website: "https://grepp.co/",
    description: "개발자 평가, 교육, 채용 솔루션을 제공하는 HR·교육테크 기업입니다.",
    recentBusinessContext: "개발자 역량 평가, 채용 효율, 교육-채용 연결이 중요합니다.",
    likelyNeeds: ["개발자 역량 평가", "채용 효율", "교육-채용 연결"],
    notes: "채용 평가와 교육 프로그램 개선 프로젝트에 적합합니다."
  },
  {
    id: "company-programmers",
    name: "프로그래머스",
    industry: "교육/개발자 플랫폼",
    size: "SME",
    website: "https://programmers.co.kr/",
    description: "개발자 코딩 테스트, 교육, 채용 플랫폼을 제공합니다.",
    recentBusinessContext: "개발자 학습 여정, 코딩 테스트 신뢰, 기업 채용 수요가 중요합니다.",
    likelyNeeds: ["개발자 학습 여정", "코딩 테스트 신뢰", "채용 수요"],
    notes: "개발자 교육과 채용 플랫폼 전략 제안에 적합합니다."
  },
  {
    id: "company-elice",
    name: "엘리스",
    industry: "교육/에듀테크",
    size: "mid_sized_company",
    website: "https://elice.io/",
    description: "AI·코딩 교육 플랫폼과 기업 교육 솔루션을 제공합니다.",
    recentBusinessContext: "AI 교육 수요, 기업 리스킬링, 학습 데이터 기반 성과 관리가 중요합니다.",
    likelyNeeds: ["AI 교육 수요", "기업 리스킬링", "학습 성과 관리"],
    notes: "교육 플랫폼의 기업 고객 가치와 학습 경험 개선 프로젝트에 적합합니다."
  },
  {
    id: "company-mathpresso",
    name: "매스프레소",
    industry: "교육/AI",
    size: "mid_sized_company",
    website: "https://www.mathpresso.com/",
    description: "AI 기반 학습 플랫폼과 수학 문제 풀이 서비스를 운영합니다.",
    recentBusinessContext: "AI 튜터링, 학습 지속성, 글로벌 교육 시장 확장이 중요합니다.",
    likelyNeeds: ["AI 튜터링", "학습 지속성", "글로벌 교육 시장"],
    notes: "AI 에듀테크의 학습자 리텐션과 글로벌 전략 프로젝트에 적합합니다."
  },
  {
    id: "company-miricanvas",
    name: "미리캔버스",
    industry: "디자인/SaaS",
    size: "mid_sized_company",
    website: "https://www.miricanvas.com/",
    description: "온라인 디자인 제작 도구와 템플릿 기반 콘텐츠 제작 서비스를 제공합니다.",
    recentBusinessContext: "AI 디자인 도구 경쟁, SMB·교육 고객, 템플릿 기반 생산성이 중요합니다.",
    likelyNeeds: ["AI 디자인 도구", "SMB 고객", "템플릿 생산성"],
    notes: "디자인 SaaS의 고객 세그먼트와 AI 기능 포지셔닝 프로젝트에 적합합니다."
  },
  {
    id: "company-mangoplate",
    name: "망고플레이트",
    industry: "푸드/리뷰 플랫폼",
    size: "mid_sized_company",
    website: "https://www.mangoplate.com/",
    description: "맛집 정보와 리뷰를 제공하는 음식 추천 플랫폼입니다.",
    recentBusinessContext: "리뷰 신뢰, 맛집 탐색, 커뮤니티 기반 추천 경험이 중요합니다.",
    likelyNeeds: ["리뷰 신뢰", "맛집 탐색", "커뮤니티 추천"],
    notes: "리뷰 플랫폼 신뢰와 음식 탐색 경험 분석에 적합합니다."
  },
  {
    id: "company-catchtable",
    name: "캐치테이블",
    industry: "외식/예약 플랫폼",
    size: "mid_sized_company",
    website: "https://www.catchtable.co.kr/",
    description: "레스토랑 예약, 웨이팅, 미식 경험을 연결하는 외식 플랫폼입니다.",
    recentBusinessContext: "프리미엄 외식 예약, 노쇼 관리, 레스토랑 CRM이 중요합니다.",
    likelyNeeds: ["프리미엄 외식 예약", "노쇼 관리", "레스토랑 CRM"],
    notes: "외식 예약 플랫폼의 고객 경험과 B2B 가치 제안에 적합합니다."
  },
  {
    id: "company-tabling",
    name: "테이블링",
    industry: "외식/웨이팅 플랫폼",
    size: "mid_sized_company",
    website: "https://www.tabling.co.kr/",
    description: "외식 매장 웨이팅과 예약 서비스를 제공하는 플랫폼입니다.",
    recentBusinessContext: "웨이팅 경험, 매장 회전율, 방문 전환과 고객 불만 관리가 중요합니다.",
    likelyNeeds: ["웨이팅 경험", "매장 회전율", "방문 전환"],
    notes: "외식 매장 운영과 고객 대기 경험 개선 프로젝트에 적합합니다."
  },
  {
    id: "company-lotte-world",
    name: "롯데월드",
    industry: "레저/테마파크",
    website: "https://adventure.lotteworld.com/",
    description: "테마파크, 아쿠아리움, 전망대 등 레저 공간을 운영합니다.",
    recentBusinessContext: "방문객 경험, 대기 시간, 시즌 이벤트와 굿즈 전략이 중요합니다.",
    likelyNeeds: ["방문객 경험", "대기 시간", "시즌 이벤트"],
    notes: "레저 공간 경험 설계와 이벤트 마케팅 프로젝트에 적합합니다."
  },
  {
    id: "company-everland",
    name: "에버랜드",
    industry: "레저/테마파크",
    website: "https://www.everland.com/",
    description: "테마파크와 리조트, 동물원, 시즌 이벤트를 운영하는 레저 브랜드입니다.",
    recentBusinessContext: "가족·MZ 방문 동기, 시즌 콘텐츠, 대기 경험과 앱 활용이 중요합니다.",
    likelyNeeds: ["방문 동기", "시즌 콘텐츠", "앱 활용"],
    notes: "테마파크 고객 여정과 시즌 이벤트 전략에 적합합니다."
  },
  {
    id: "company-museum-san",
    name: "뮤지엄 산",
    industry: "문화/전시",
    size: "nonprofit",
    website: "https://www.museumsan.org/",
    description: "건축, 자연, 예술 경험을 결합한 미술관입니다.",
    recentBusinessContext: "문화 공간 방문 경험, 지역 관광, 전시 콘텐츠 확산이 중요합니다.",
    likelyNeeds: ["문화 공간 경험", "지역 관광", "전시 콘텐츠 확산"],
    notes: "문화 공간의 방문객 경험과 콘텐츠 확산 전략 제안에 적합합니다."
  },
  {
    id: "company-korea-tourism-organization",
    name: "한국관광공사",
    industry: "공공기관/관광",
    size: "public_institution",
    website: "https://knto.or.kr/",
    description: "국내외 관광 진흥과 지역 관광 활성화 사업을 수행하는 공공기관입니다.",
    recentBusinessContext: "인바운드 관광 회복, 지역 관광, K컬처 여행 콘텐츠가 중요합니다.",
    likelyNeeds: ["인바운드 관광", "지역 관광 활성화", "K컬처 여행"],
    possibleCollaborationTypes: ["market_research", "research_collaboration", "joint_event", "business_strategy_proposal"],
    notes: "공공 관광 정책과 청년 관점 리서치 프로젝트에 적합합니다."
  },
  {
    id: "company-seoul-tourism-organization",
    name: "서울관광재단",
    industry: "공공기관/관광",
    size: "public_institution",
    website: "https://www.sto.or.kr/",
    description: "서울 관광 마케팅과 MICE, 관광 콘텐츠 활성화를 지원하는 기관입니다.",
    recentBusinessContext: "서울 관광 브랜딩, 외국인 관광객 경험, 로컬 콘텐츠 발굴이 중요합니다.",
    likelyNeeds: ["서울 관광 브랜딩", "외국인 경험", "로컬 콘텐츠"],
    possibleCollaborationTypes: ["market_research", "joint_event", "research_collaboration", "business_strategy_proposal"],
    notes: "서울 관광 경험과 글로벌 방문객 리서치에 적합합니다."
  },
  {
    id: "company-kotra-startup",
    name: "서울경제진흥원",
    industry: "공공기관/창업지원",
    size: "public_institution",
    website: "https://www.sba.seoul.kr/",
    description: "서울시 중소기업, 스타트업, 콘텐츠, 산업 지원 사업을 수행하는 기관입니다.",
    recentBusinessContext: "스타트업 지원, 청년 창업, 산업별 프로그램 성과 확산이 중요합니다.",
    likelyNeeds: ["스타트업 지원", "청년 창업", "프로그램 성과 확산"],
    possibleCollaborationTypes: ["research_collaboration", "joint_event", "sponsorship", "market_research"],
    notes: "공공 창업지원과 청년 프로그램 분석 프로젝트에 적합합니다."
  },
  {
    id: "company-kosme",
    name: "중소벤처기업진흥공단",
    industry: "공공기관/중소기업지원",
    size: "public_institution",
    website: "https://www.kosmes.or.kr/",
    description: "중소벤처기업의 성장, 금융, 수출, 인력 지원 사업을 수행하는 기관입니다.",
    recentBusinessContext: "중소기업 디지털 전환, 수출 지원, 청년 인재 연결이 중요합니다.",
    likelyNeeds: ["중소기업 지원", "디지털 전환", "청년 인재 연결"],
    possibleCollaborationTypes: ["market_research", "research_collaboration", "joint_event", "business_strategy_proposal"],
    notes: "중소기업 문제 발굴과 공공 지원 프로그램 개선 프로젝트에 적합합니다."
  },
  {
    id: "company-seoul-startup-hub",
    name: "서울창업허브",
    industry: "공공/창업지원",
    size: "public_institution",
    website: "https://startup-plus.kr/",
    description: "서울시 스타트업 보육, 네트워킹, 오픈이노베이션 프로그램을 지원합니다.",
    recentBusinessContext: "스타트업-대기업 협업, 초기기업 성장, 프로그램 참여자 경험이 중요합니다.",
    likelyNeeds: ["오픈이노베이션", "초기기업 성장", "프로그램 경험"],
    possibleCollaborationTypes: ["joint_event", "research_collaboration", "market_research", "sponsorship"],
    notes: "창업 생태계 리서치와 오픈이노베이션 프로그램 개선에 적합합니다."
  },
  {
    id: "company-impact-square",
    name: "임팩트스퀘어",
    industry: "ESG/소셜임팩트",
    size: "SME",
    website: "https://impactsquare.com/",
    description: "소셜임팩트 전략, 평가, ESG 컨설팅을 수행하는 조직입니다.",
    recentBusinessContext: "임팩트 측정, ESG 전략, 사회문제 해결형 비즈니스 모델이 중요합니다.",
    likelyNeeds: ["임팩트 측정", "ESG 전략", "사회문제 비즈니스"],
    possibleCollaborationTypes: ["research_collaboration", "market_research", "business_strategy_proposal", "joint_event"],
    notes: "임팩트 리서치와 ESG 전략 제안 프로젝트에 적합합니다."
  },
  {
    id: "company-merryyear",
    name: "MYSC",
    industry: "ESG/임팩트투자",
    size: "SME",
    website: "https://mysc.co.kr/",
    description: "소셜벤처 액셀러레이팅, 임팩트 투자, ESG 오픈이노베이션을 수행합니다.",
    recentBusinessContext: "소셜벤처 성장, 임팩트 생태계, 대기업 ESG 협업이 중요합니다.",
    likelyNeeds: ["소셜벤처 성장", "ESG 협업", "임팩트 생태계"],
    possibleCollaborationTypes: ["research_collaboration", "joint_event", "business_strategy_proposal", "sponsorship"],
    notes: "소셜벤처와 ESG 협업 모델 발굴 프로젝트에 적합합니다."
  },
  {
    id: "company-treeplanet",
    name: "트리플래닛",
    industry: "ESG/환경",
    size: "SME",
    website: "https://treepla.net/",
    description: "나무 심기, 숲 조성, 기업 ESG 캠페인을 수행하는 환경 기업입니다.",
    recentBusinessContext: "기업 ESG 캠페인, 참여형 환경 활동, 임팩트 커뮤니케이션이 중요합니다.",
    likelyNeeds: ["ESG 캠페인", "참여형 환경 활동", "임팩트 커뮤니케이션"],
    possibleCollaborationTypes: ["joint_event", "sponsorship", "market_research", "business_strategy_proposal"],
    notes: "청년 참여형 ESG 캠페인과 기업 협업 제안에 적합합니다."
  },
  {
    id: "company-rebricks",
    name: "리브릭스",
    industry: "ESG/순환경제",
    size: "startup",
    website: "https://rebricks.co.kr/",
    description: "폐자원 업사이클링과 지속가능 소재 활용 사업을 수행하는 기업입니다.",
    recentBusinessContext: "순환경제 인식, 친환경 소재 수요, B2B 협업 사례 확보가 중요합니다.",
    likelyNeeds: ["순환경제 인식", "친환경 소재 수요", "B2B 협업"],
    possibleCollaborationTypes: ["market_research", "business_strategy_proposal", "joint_event", "research_collaboration"],
    notes: "친환경 소재 시장 조사와 브랜드 협업 제안에 적합합니다."
  }
];

export const companyPool: CompanyLead[] = [
  createCompany({
    id: "company-toss",
    name: "토스",
    industry: "금융/핀테크",
    website: "https://toss.im/",
    contactPage: "https://support.toss.im/",
    publicEmail: "partnership@toss.im",
    linkedinUrl: "https://www.linkedin.com/company/tossglobal/",
    description: "송금, 결제, 은행, 증권, 보험 등 생활 금융 전반을 다루는 금융 플랫폼입니다.",
    recentBusinessContext: "금융 슈퍼앱 내 서비스 간 락인, 오프라인 결제 확장, 2030 금융 습관 선점이 중요합니다.",
    likelyNeeds: ["2030 금융 행동 이해", "오프라인 결제 선택 장벽 분석", "금융 서비스 락인 전략"],
    notes: "2030 금융 플랫폼 락인과 오프라인 결제 습관 분석형 제안에 적합합니다."
  }),
  createCompany({
    id: "company-kakao-mobility",
    name: "카카오모빌리티",
    industry: "모빌리티/물류",
    website: "https://www.kakaomobility.com/",
    description: "카카오 T를 기반으로 이동, 주차, 대리, 배송, 글로벌 모빌리티 서비스를 운영합니다.",
    recentBusinessContext: "비택시 서비스 확장, 배송/물류 인지도 강화, 해외 이용자 확산 전략이 중요합니다.",
    likelyNeeds: ["비택시 서비스 브랜드 인식", "배송/물류 사용 맥락", "해외 이동 서비스 GTM"],
    notes: "비택시 서비스와 글로벌 이동 경험 확산 전략 제안에 적합합니다."
  }),
  createCompany({
    id: "company-hp",
    name: "HP",
    industry: "IT/하드웨어",
    website: "https://www.hp.com/",
    description: "PC, 프린터, 주변기기와 업무용 디바이스를 제공하는 글로벌 IT 기업입니다.",
    recentBusinessContext: "노트북과 디바이스 시장에서 가격, 성능, 브랜드 선호, 학생 고객 접점이 중요합니다.",
    likelyNeeds: ["학생·주니어 고객 시장 진입", "노트북 구매 기준 분석", "교육 시장 디바이스 포지셔닝"],
    notes: "과거 넷북 시장 진입 전략 사례처럼 학생 고객 구매 맥락 분석에 적합합니다."
  }),
  createCompany({
    id: "company-google",
    name: "Google",
    industry: "인터넷/플랫폼",
    website: "https://about.google/",
    description: "검색, 광고, 클라우드, 모바일 생태계를 운영하는 글로벌 플랫폼 기업입니다.",
    recentBusinessContext: "대학생 서비스 이용, AI 검색 전환, 생산성 도구 사용 습관이 중요합니다.",
    likelyNeeds: ["대학생 유입 전략", "AI 검색 사용 맥락", "캠퍼스 생산성 도구 확산"],
    notes: "대학생 계층 유입 유도 전략 사례와 연결됩니다."
  }),
  createCompany({
    id: "company-sk-telecom",
    name: "SK텔레콤",
    industry: "통신/AI/콘텐츠",
    website: "https://www.sktelecom.com/",
    description: "이동통신, AI, 미디어, 구독, 커머스 서비스를 운영하는 통신 기업입니다.",
    recentBusinessContext: "통신 외 서비스 확장, 라이브 커머스, 쿠폰/선물하기, AI 서비스 전환이 중요합니다.",
    likelyNeeds: ["라이브 커머스 적용 전략", "쿠폰/선물하기 현황 분석", "통신 고객 락인 강화"],
    notes: "모바일 콘텐츠와 신규 비즈니스 모델 제안 사례가 많아 학회 프로젝트와 잘 맞습니다."
  }),
  createCompany({
    id: "company-loen",
    name: "LOEN Entertainment",
    industry: "음악/엔터테인먼트",
    size: "mid_sized_company",
    website: "https://www.kakaoent.com/",
    description: "음원과 콘텐츠 사업을 운영해온 엔터테인먼트 기업입니다.",
    recentBusinessContext: "음원 기반 수익 모델과 팬덤 기반 콘텐츠 확장이 중요합니다.",
    likelyNeeds: ["음원 활용 신규 사업", "팬덤 기반 비즈니스 모델", "콘텐츠 소비 행동 분석"],
    notes: "음원을 활용한 새로운 비즈니스 모델 제안 사례와 연결됩니다."
  }),
  createCompany({
    id: "company-sony",
    name: "Sony",
    industry: "전자/콘텐츠",
    website: "https://www.sony.com/",
    description: "전자기기, 게임, 음악, 이미지 센서 등 다양한 사업을 운영하는 글로벌 기업입니다.",
    recentBusinessContext: "디바이스 시장 축소와 콘텐츠·경험 중심 가치 전환이 중요합니다.",
    likelyNeeds: ["MP3/디바이스 저변 확대", "콘텐츠 경험 결합", "젊은 고객 접점 확대"],
    notes: "MP3 Player 시장 저변 확대 방안 사례와 연결됩니다."
  }),
  createCompany({
    id: "company-lotte",
    name: "롯데",
    industry: "식품/리테일",
    website: "https://www.lotte.co.kr/",
    description: "식품, 유통, 관광, 화학 등 다양한 사업을 운영하는 대기업 그룹입니다.",
    recentBusinessContext: "과자 신제품 콘셉트, 편의점·리테일 채널, MZ 고객 반응 검증이 중요합니다.",
    likelyNeeds: ["신제품 콘셉트 검증", "MZ 스낵 소비 맥락", "리테일 채널 프로모션"],
    notes: "과자 산업 내 신제품 콘셉트 제안 사례와 연결됩니다."
  }),
  createCompany({
    id: "company-st-unitas",
    name: "영단기",
    industry: "교육/에듀테크",
    size: "mid_sized_company",
    website: "https://eng.conects.com/",
    publicEmail: "STunitas_cs@stunitas.com",
    description: "영어 학습과 시험 대비 교육 서비스를 제공하는 에듀테크 브랜드입니다.",
    recentBusinessContext: "오프라인 학원과 온라인 강의 간 전환, 대학생 대상 마케팅 효율이 중요합니다.",
    likelyNeeds: ["대학생 대상 마케팅", "온오프라인 학습 전환", "강의 선택 기준 분석"],
    notes: "오프라인 학원 대학생 대상 마케팅 전략 사례와 연결됩니다."
  }),
  createCompany({
    id: "company-dell",
    name: "Dell",
    industry: "IT/하드웨어",
    website: "https://www.dell.com/",
    description: "PC, 노트북, 서버, 업무용 IT 인프라를 제공하는 글로벌 IT 기업입니다.",
    recentBusinessContext: "Inspiron과 같은 소비자 노트북의 타깃 세그먼트와 IMC 전략이 중요합니다.",
    likelyNeeds: ["노트북 IMC 전략", "학생 고객 구매 여정", "가격·성능 메시지 차별화"],
    notes: "Dell Inspiron IMC 전략 사례와 연결됩니다."
  }),
  createCompany({
    id: "company-socar",
    name: "쏘카",
    industry: "모빌리티/카셰어링",
    size: "mid_sized_company",
    website: "https://www.socar.kr/",
    publicEmail: "hello@socar.kr",
    linkedinUrl: "https://kr.linkedin.com/company/socarkr",
    description: "카셰어링과 이동 서비스를 제공하는 모빌리티 플랫폼입니다.",
    recentBusinessContext: "차별화된 이용 경험, 프로모션 효율, 대학생·직장인 이동 수요가 중요합니다.",
    likelyNeeds: ["카셰어링 차별화", "프로모션 전략", "신규 고객 유입"],
    notes: "카셰어링 서비스 차별화 전략과 프로모션 사례와 연결됩니다."
  }),
  createCompany({
    id: "company-kt",
    name: "KT",
    industry: "통신/AI/플랫폼",
    website: "https://corp.kt.com/",
    description: "통신, 미디어, AI, B2B 디지털 플랫폼 사업을 운영하는 기업입니다.",
    recentBusinessContext: "무선 시장 경쟁력 강화와 상품/서비스 차별화가 중요합니다.",
    likelyNeeds: ["무선 상품 경쟁력", "통신 서비스 차별화", "청년 고객 락인"],
    notes: "KT 무선 시장 경쟁력 강화를 위한 상품/서비스 제안 사례와 연결됩니다."
  }),
  createCompany({
    id: "company-hana-bank",
    name: "하나은행",
    industry: "금융/은행",
    website: "https://www.kebhana.com/",
    description: "개인·기업 금융, 글로벌 금융 서비스를 제공하는 은행입니다.",
    recentBusinessContext: "디지털 뱅킹 경쟁력과 모바일 금융 이용 경험 개선이 중요합니다.",
    likelyNeeds: ["디지털 경쟁력 강화", "모바일 금융 경험", "2030 금융 고객 확보"],
    notes: "하나은행 디지털 경쟁력 강화 방안 사례와 연결됩니다."
  }),
  createCompany({
    id: "company-snuh",
    name: "분당서울대학교병원",
    industry: "헬스케어/의료",
    size: "public_institution",
    website: "https://www.snubh.org/",
    description: "의료 서비스와 디지털 헬스케어 혁신을 수행하는 상급종합병원입니다.",
    recentBusinessContext: "환자 경험, 서비스 경쟁력, 의료 패러다임 변화 대응이 중요합니다.",
    likelyNeeds: ["병원 서비스 경쟁력", "환자 경험 개선", "디지털 헬스케어 인식"],
    notes: "분당서울대병원 서비스 경쟁력 강화 제안 사례와 연결됩니다."
  }),
  createCompany({
    id: "company-naver",
    name: "NAVER",
    industry: "인터넷/콘텐츠 플랫폼",
    website: "https://www.navercorp.com/",
    description: "검색, 콘텐츠, 커머스, 광고, 커뮤니티 등 다양한 사용자 접점을 운영합니다.",
    recentBusinessContext: "20대 콘텐츠 유입, 블로그 활성화, 요금제/멤버십 전략, 검색 경험 전환이 중요합니다.",
    likelyNeeds: ["20대 블로그 유입", "커뮤니티 활성화", "요금제/멤버십 전략"],
    notes: "20대 블로그 유입과 네이버 뮤직 요금제 제안 사례와 연결됩니다."
  }),
  createCompany({
    id: "company-poolus",
    name: "풀러스",
    industry: "모빌리티/카풀",
    size: "startup",
    website: "https://www.poolus.kr/",
    description: "차량 공유와 카풀 기반 이동 서비스를 제공했던 모빌리티 스타트업입니다.",
    recentBusinessContext: "신규 고객 유입, 리텐션 강화, 신뢰 기반 매칭 경험이 중요합니다.",
    likelyNeeds: ["신규 고객 유입", "리텐션 강화", "이용 신뢰 형성"],
    notes: "신규 고객 유입 및 리텐션 강화 방안 사례와 연결됩니다."
  }),
  createCompany({
    id: "company-spoon",
    name: "스푼라디오",
    industry: "오디오/커뮤니티",
    size: "mid_sized_company",
    website: "https://www.spooncast.net/",
    description: "누구나 목소리로 소통할 수 있는 오디오 스트리밍 플랫폼입니다.",
    recentBusinessContext: "이용 경험, 브랜딩, 크리에이터 커뮤니티 활성화가 중요합니다.",
    likelyNeeds: ["이용 경험 개선", "브랜딩 개선", "크리에이터 리텐션"],
    notes: "이용 경험 개선 및 브랜딩 개선 방안 사례와 연결됩니다."
  }),
  createCompany({
    id: "company-gs25",
    name: "GS25",
    industry: "편의점/리테일",
    website: "https://gs25.gsretail.com/",
    description: "전국 편의점 네트워크를 운영하는 리테일 브랜드입니다.",
    recentBusinessContext: "앱 활성화, 오프라인 연계, 냉장고 서비스와 개인화 혜택이 중요합니다.",
    likelyNeeds: ["앱 활성화", "오프라인 연계", "편의점 고객 리텐션"],
    notes: "나만의 냉장고 앱 활성화 및 오프라인 연계 방안 사례와 연결됩니다."
  }),
  createCompany({
    id: "company-medibloc",
    name: "MediBloc",
    industry: "헬스케어/블록체인",
    size: "startup",
    website: "https://medibloc.com/",
    description: "블록체인 기반 의료정보 생태계를 구축하는 디지털 헬스케어 기업입니다.",
    recentBusinessContext: "의료정보 신뢰, 환자 데이터 활용, 헬스케어 서비스 기획이 중요합니다.",
    likelyNeeds: ["헬스케어 서비스 기획", "의료 데이터 신뢰", "사용자 수용성"],
    notes: "플랫폼/메디토큰을 활용한 헬스케어 서비스 기획 사례와 연결됩니다."
  }),
  createCompany({
    id: "company-sandbox",
    name: "샌드박스네트워크",
    industry: "MCN/콘텐츠",
    size: "mid_sized_company",
    website: "https://sandbox.co.kr/",
    publicEmail: "contact@sandboxnetwork.net",
    linkedinUrl: "https://www.linkedin.com/company/sandbox-network-inc-/",
    description: "크리에이터와 커뮤니티 기반 콘텐츠 비즈니스를 운영하는 MCN 기업입니다.",
    recentBusinessContext: "콘텐츠 산업 트렌드, 크리에이터 수익 모델, 팬 커뮤니티 확장이 중요합니다.",
    likelyNeeds: ["콘텐츠 트렌드 분석", "중장기 사업모델", "신규 고객층 마케팅"],
    notes: "콘텐츠 산업 트렌드 분석과 MCN 사업모델 제안 사례와 연결됩니다."
  }),
  createCompany({
    id: "company-pubg",
    name: "PUBG",
    industry: "게임/엔터테인먼트",
    website: "https://www.krafton.com/",
    description: "배틀그라운드를 중심으로 글로벌 게임 IP를 운영하는 게임 스튜디오입니다.",
    recentBusinessContext: "신규 서비스 잠재 고객 페르소나와 마케팅 전략이 중요합니다.",
    likelyNeeds: ["게임 신규 서비스 페르소나", "마케팅 전략", "IP 팬덤 확장"],
    notes: "신규 서비스 잠재 고객 페르소나 도출 및 마케팅 전략 사례와 연결됩니다."
  }),
  createCompany({
    id: "company-laundrygo",
    name: "런드리고",
    industry: "생활서비스/세탁",
    size: "mid_sized_company",
    website: "https://www.laundrygo.com/",
    publicEmail: "business@lifegoeson.kr",
    linkedinUrl: "https://kr.linkedin.com/company/lifegoeson",
    description: "비대면 세탁과 생활 서비스를 제공하는 플랫폼입니다.",
    recentBusinessContext: "B2C 패션 신사업, 서비스 개선, 제휴와 마케팅 전략이 중요합니다.",
    likelyNeeds: ["서비스 개선", "B2C 패션 신사업", "제휴 마케팅"],
    notes: "마케팅, 제휴, B2C 패션 신사업 전략 및 서비스 개선 사례와 연결됩니다."
  }),
  createCompany({
    id: "company-emart24",
    name: "이마트24",
    industry: "편의점/리테일",
    website: "https://www.emart24.co.kr/",
    description: "신세계그룹이 운영하는 편의점 브랜드입니다.",
    recentBusinessContext: "신규 앱 서비스 개선과 편의점 고객 활성화가 중요합니다.",
    likelyNeeds: ["앱 서비스 개선", "편의점 고객 활성화", "오프라인 연계"],
    notes: "신 어플리케이션 서비스 개선 및 활성화 방안 사례와 연결됩니다."
  }),
  createCompany({
    id: "company-olive-young",
    name: "CJ올리브영",
    industry: "리테일/뷰티",
    website: "https://corp.oliveyoung.com/",
    description: "H&B 리테일과 K-뷰티 커머스를 운영하는 옴니채널 라이프스타일 플랫폼입니다.",
    recentBusinessContext: "펨테크, 메타버스, 라이프스타일, 콘텐츠 커머스 플랫폼 진화가 중요합니다.",
    likelyNeeds: ["K-뷰티 구매 여정", "콘텐츠 커머스", "라이프스타일 플랫폼 확장"],
    notes: "펨테크/메타버스/라이프스타일, 콘텐츠 커머스 플랫폼 진화 방안 사례와 연결됩니다."
  }),
  createCompany({
    id: "company-kream",
    name: "KREAM",
    industry: "패션/리셀 커머스",
    size: "mid_sized_company",
    website: "https://kream.co.kr/",
    description: "한정판 패션과 리셀 거래를 기반으로 커뮤니티형 커머스를 운영합니다.",
    recentBusinessContext: "상품과 콘텐츠를 기반으로 한 고객 상호작용과 리셀 커뮤니티 성장이 중요합니다.",
    likelyNeeds: ["리셀 커뮤니티 활성화", "콘텐츠 기반 구매 전환", "MZ 고객 상호작용"],
    notes: "리셀 시장 고객 상호 소통 플랫폼 관점의 프로젝트와 적합합니다."
  }),
  createCompany({
    id: "company-paris-baguette",
    name: "파리바게뜨",
    industry: "F&B/베이커리",
    website: "https://www.paris.co.kr/",
    description: "대한민국 베이커리 시장을 선도해온 프리미엄 베이커리 브랜드입니다.",
    recentBusinessContext: "앱 기반 방문 증대, MZ 매장 경험, 굿즈와 프로모션 전략이 중요합니다.",
    likelyNeeds: ["앱 기반 매장 방문 증대", "MZ 프로모션", "굿즈 기획"],
    notes: "파바앱을 활용한 MZ 매장 방문 증대와 굿즈 기획 사례와 연결됩니다."
  }),
  createCompany({
    id: "company-devsisters",
    name: "데브시스터즈",
    industry: "게임/IP",
    size: "mid_sized_company",
    website: "https://www.devsisters.com/",
    description: "쿠키런 IP를 중심으로 게임과 캐릭터 상품 사업을 운영하는 게임 기업입니다.",
    recentBusinessContext: "게임 IP의 상품화와 팬덤 커머스 확장이 중요합니다.",
    likelyNeeds: ["쿠키런 IP 상품화", "팬덤 굿즈 전략", "IP 커머스 확장"],
    notes: "쿠키런 IP를 활용한 상품화 전략 사례와 연결됩니다."
  }),
  createCompany({
    id: "company-amorepacific",
    name: "아모레퍼시픽",
    industry: "뷰티/화장품",
    website: "https://www.apgroup.com/",
    description: "화장품과 생활용품을 판매하는 대표 뷰티 기업입니다.",
    recentBusinessContext: "M&A, 남성 컬러 메이크업, 신성장 동력, 글로벌 고객 확장이 중요합니다.",
    likelyNeeds: ["신규 고객 유입", "팬덤 유지", "M&A 신사업 전략", "남성 뷰티 시장"],
    notes: "Be READY 신규 고객 유입, M&A 전략, 채널 신사업 모델 사례와 연결됩니다."
  }),
  createCompany({
    id: "company-myrealtrip",
    name: "마이리얼트립",
    industry: "여행/플랫폼",
    size: "mid_sized_company",
    website: "https://www.myrealtrip.com/",
    contactPage: "https://partner.myrealtrip.com/welcome/marketing_partner",
    publicEmail: "partnership@myrealtrip.com",
    linkedinUrl: "https://www.linkedin.com/company/myrealtrip/",
    description: "여행 상품 검색과 예약을 제공하는 여행 종합 플랫폼입니다.",
    recentBusinessContext: "여행 산업 내 타 서비스와의 차별화와 예약 경험 개선이 중요합니다.",
    likelyNeeds: ["여행 서비스 차별화", "예약 여정 개선", "2030 여행 의사결정"],
    notes: "여행 산업 내 타 서비스와의 차별화 전략 제안 사례와 연결됩니다."
  }),
  createCompany({
    id: "company-welaaa",
    name: "윌라",
    industry: "오디오북/콘텐츠",
    size: "mid_sized_company",
    website: "https://www.welaaa.com/",
    publicEmail: "cs@welaaa.com",
    description: "오디오북과 모바일 강의 기반 구독형 콘텐츠 스트리밍을 제공합니다.",
    recentBusinessContext: "오디오북 대중화와 2030 고객 유입, 콘텐츠 전략이 중요합니다.",
    likelyNeeds: ["오디오북 대중화", "2030 콘텐츠 유입", "구독형 콘텐츠 전략"],
    notes: "오디오북 대중화와 저변 넓히기 전략 사례와 연결됩니다."
  }),
  createCompany({
    id: "company-naver-webtoon",
    name: "네이버웹툰",
    industry: "미디어/콘텐츠",
    website: "https://webtoonscorp.com/",
    description: "웹툰과 스토리 콘텐츠를 글로벌로 서비스하며 창작자, 독자, IP 생태계를 운영합니다.",
    recentBusinessContext: "웹툰/시리즈 서비스 개선, 타깃 마케팅, 글로벌 독자 확장이 중요합니다.",
    likelyNeeds: ["서비스 개선", "타깃 마케팅", "콘텐츠 팬덤 확장"],
    notes: "네이버 웹툰/시리즈 서비스 개선 및 타깃 마케팅 전략 사례와 연결됩니다."
  }),
  createCompany({
    id: "company-jejuair",
    name: "제주항공",
    industry: "항공/여행",
    website: "https://www.jejuair.net/",
    description: "합리적 가격을 앞세운 저비용 항공사입니다.",
    recentBusinessContext: "위드코로나 이후 항공업계 회복과 캠페인 전략이 중요합니다.",
    likelyNeeds: ["항공업계 위기 극복", "마케팅 캠페인", "가격 민감 고객 분석"],
    notes: "항공업계 위기 극복을 위한 마케팅 및 캠페인 전략 사례와 연결됩니다."
  }),
  createCompany({
    id: "company-heybeauty",
    name: "헤이뷰티",
    industry: "뷰티 예약/플랫폼",
    size: "startup",
    website: "https://www.heybeauty.co.kr/",
    description: "뷰티샵 예약과 뷰티 서비스를 연결하는 플랫폼입니다.",
    recentBusinessContext: "뷰티 예약 플랫폼의 신규 사업모델과 고객 확보가 중요합니다.",
    likelyNeeds: ["신규 사업모델", "뷰티 예약 전환", "고객 경험 개선"],
    notes: "헤이뷰티 플랫폼 신규 사업 모델 제안 사례와 연결됩니다."
  }),
  createCompany({
    id: "company-fast-track-asia",
    name: "패스트트랙아시아",
    industry: "컴퍼니빌더/투자",
    size: "mid_sized_company",
    website: "https://fast-track.asia/",
    description: "컴퍼니빌더형 스타트업 지주회사입니다.",
    recentBusinessContext: "포트폴리오 마케팅, 캠퍼스 접점, 신규 비즈니스 모델 발굴이 중요합니다.",
    likelyNeeds: ["신규 비즈니스 모델", "캠퍼스 마케팅", "포트폴리오 성장 전략"],
    notes: "패스트파이브/캠퍼스/인베스트먼트 3사 마케팅과 신사업 모델 제안 사례와 연결됩니다."
  }),
  createCompany({
    id: "company-gs-caltex",
    name: "GS칼텍스",
    industry: "에너지/정유",
    website: "https://www.gscaltex.com/",
    description: "정유, 석유화학, 에너지 사업을 운영하는 종합 에너지 기업입니다.",
    recentBusinessContext: "Kixx 엔진오일 브랜드 인지도와 신규 공간 활용, 가치 확산 전략이 중요합니다.",
    likelyNeeds: ["엔진오일 브랜드 인지도", "신규 공간 활용", "가치 확산 전략"],
    notes: "Kixx 엔진오일 브랜드 인지도 및 가치 확산 전략 사례와 연결됩니다."
  }),
  createCompany({
    id: "company-cnc-company",
    name: "CNC컴퍼니",
    industry: "FemCare/소비재",
    size: "SME",
    website: "https://cnccompany.net/",
    description: "FemCare 브랜드를 운영하며 여성 건강과 라이프스타일 시장을 다룹니다.",
    recentBusinessContext: "신사업 진출과 M&A 전략, 여성 소비자 니즈 이해가 중요합니다.",
    likelyNeeds: ["신사업 진출", "M&A 전략", "FemCare 고객 니즈"],
    notes: "신사업 진출을 위한 M&A 전략 사례와 연결됩니다."
  }),
  createCompany({
    id: "company-hyundai-mobis",
    name: "현대모비스",
    industry: "자동차 부품/모빌리티",
    website: "https://www.mobis.co.kr/",
    description: "자동차 부품과 스마트 모빌리티 기술을 개발하는 글로벌 기업입니다.",
    recentBusinessContext: "스마트 모빌리티 전환과 미래차 부품 경쟁력, 글로벌 고객 전략이 중요합니다.",
    likelyNeeds: ["스마트 모빌리티 전략", "대외비 프로젝트", "미래차 고객 가치"],
    notes: "2024 산학협력 대외비 기업 사례와 연결됩니다."
  }),
  createCompany({
    id: "company-samsung-electronics",
    name: "삼성전자",
    industry: "전자/IT",
    website: "https://www.samsung.com/sec/",
    description: "글로벌 IT 시장을 이끄는 전자·모바일·반도체 기업입니다.",
    recentBusinessContext: "AI 디바이스, 모바일 생태계, 글로벌 소비자 경험 경쟁이 중요합니다.",
    likelyNeeds: ["대외비 프로젝트", "AI 디바이스 경험", "글로벌 소비자 인사이트"],
    notes: "2024 산학협력 대외비 기업 사례와 연결됩니다."
  }),
  createCompany({
    id: "company-ace-bed",
    name: "에이스침대",
    industry: "가구/리빙",
    website: "https://www.acebed.com/",
    description: "국내 침대 산업을 대표하는 침대 전문 기업입니다.",
    recentBusinessContext: "고객 로열티, 수면 경험, 중장기 서비스 전략이 중요합니다.",
    likelyNeeds: ["고객 로열티", "수면 경험 서비스", "중장기 고객 관리"],
    notes: "중장기적 고객 로열티 향상을 위한 서비스 전략 사례와 연결됩니다."
  }),
  createCompany({
    id: "company-lg-hnh",
    name: "LG생활건강",
    industry: "뷰티/생활소비재",
    website: "https://www.lghnh.com/",
    description: "화장품, 생활용품, 음료를 아우르는 종합 소비재 기업입니다.",
    recentBusinessContext: "동남아 뷰티 이커머스 시장과 2030 타깃 브랜드 육성이 중요합니다.",
    likelyNeeds: ["동남아 뷰티 이커머스", "2030 타깃 브랜드 육성", "글로벌 운영 전략"],
    notes: "동남아 뷰티 이커머스 시장 경쟁력 확보를 위한 2030 타깃 뷰티 브랜드 전략 사례와 연결됩니다."
  }),
  createCompany({
    id: "company-photoism",
    name: "포토이즘",
    industry: "라이프스타일/사진",
    size: "mid_sized_company",
    website: "https://photoism.co.kr/",
    description: "셀프 사진관과 포토부스 문화를 선도하는 라이프스타일 브랜드입니다.",
    recentBusinessContext: "고객 가치 확대, IP 협업, MZ 문화 접점 강화가 중요합니다.",
    likelyNeeds: ["고객 가치 확대", "스튜디오 활성화", "IP 협업"],
    notes: "포토이즘 스튜디오 고객 가치 확대를 위한 활성화 방안 사례와 연결됩니다."
  }),
  createCompany({
    id: "company-kyobo",
    name: "교보문고",
    industry: "도서/문화 콘텐츠",
    website: "https://www.kyobobook.co.kr/",
    description: "오프라인과 온라인 서점, 출판 및 문화 콘텐츠 서비스를 운영합니다.",
    recentBusinessContext: "지속가능 성장, 문화 콘텐츠 경험, 온오프라인 독서 고객 관리가 중요합니다.",
    likelyNeeds: ["지속가능 성장", "문화 콘텐츠 경험", "오프라인 서점 활성화"],
    notes: "교보문고의 지속가능한 성장을 위한 중장기 전략 사례와 연결됩니다."
  }),
  createCompany({
    id: "company-gangnam-unni",
    name: "강남언니",
    industry: "미용의료/헬스케어 플랫폼",
    size: "mid_sized_company",
    website: "https://www.gangnamunni.com/",
    description: "미용의료 시술 정보, 후기, 비용 정보를 제공하는 플랫폼입니다.",
    recentBusinessContext: "해외 미용의료 시장 파악, 신뢰 기반 정보 제공, 글로벌 진입 전략이 중요합니다.",
    likelyNeeds: ["해외 미용의료 시장", "글로벌 진입 전략", "소비자 신뢰 형성"],
    notes: "해외 미용의료 시장 파악 및 진입 전략 사례와 연결됩니다."
  }),
  createCompany({
    id: "company-nongshim",
    name: "농심",
    industry: "식품/F&B",
    website: "https://www.nongshim.com/",
    description: "라면, 스낵, 음료 등 식품 사업을 운영하는 식품 전문 기업입니다.",
    recentBusinessContext: "자사몰 신규 유입, 유저 리텐션, D2C 식품 구매 경험이 중요합니다.",
    likelyNeeds: ["자사몰 신규 유입", "유저 리텐션", "D2C 식품 구매 경험"],
    notes: "자사몰 신규 유입 및 유저 리텐션 전략 사례와 연결됩니다."
  }),
  createCompany({
    id: "company-pozalabs",
    name: "포자랩스",
    industry: "AI/음악",
    size: "startup",
    website: "https://www.pozalabs.com/",
    contactPage: "https://www.pozalabs.com/contact",
    publicEmail: "contact@pozalabs.com",
    linkedinUrl: "https://www.linkedin.com/company/pozalabs",
    description: "AI 음악 작곡 기술을 제공하는 기업입니다.",
    recentBusinessContext: "AI 음악 서비스 가격 전략과 창작자/브랜드 수요 검증이 중요합니다.",
    likelyNeeds: ["신규 서비스 프라이싱", "AI 창작 수요", "B2B 음악 활용"],
    notes: "신규 서비스 프라이싱 전략 수립 사례와 연결됩니다."
  }),
  createCompany({
    id: "company-krafton",
    name: "크래프톤",
    industry: "게임/콘텐츠",
    website: "https://www.krafton.com/",
    description: "글로벌 게임 IP와 스튜디오 포트폴리오를 운영하는 게임 기업입니다.",
    recentBusinessContext: "게임 IP 확장, 글로벌 팬덤, 신규 서비스 페르소나 도출이 중요합니다.",
    likelyNeeds: ["게임 IP 확장", "글로벌 팬덤", "잠재 고객 페르소나"],
    notes: "PUBG 프로젝트 사례와 함께 게임/엔터테인먼트 기업 후보로 적합합니다."
  }),
  createCompany({
    id: "company-channel-talk",
    name: "채널톡",
    industry: "AI/SaaS",
    size: "SME",
    website: "https://channel.io/",
    description: "고객 상담, CRM, 마케팅 자동화를 제공하는 B2B SaaS 기업입니다.",
    recentBusinessContext: "AI 상담 전환, SMB 고객 성공, 일본 등 글로벌 시장 확장이 중요합니다.",
    likelyNeeds: ["SMB 고객 니즈", "AI 상담 수용성", "글로벌 SaaS GTM"],
    notes: "SaaS 고객 세그먼트 분석과 글로벌 GTM 전략 제안에 적합합니다."
  }),
  createCompany({
    id: "company-wantedlab",
    name: "원티드랩",
    industry: "HR/리크루팅",
    size: "mid_sized_company",
    website: "https://www.wantedlab.com/",
    publicEmail: "biz@wantedlab.com",
    description: "채용 플랫폼, 커리어 콘텐츠, HR 솔루션을 제공하는 HR테크 기업입니다.",
    recentBusinessContext: "신입·주니어 채용, AI 매칭, 커리어 콘텐츠와 커뮤니티 접점이 중요합니다.",
    likelyNeeds: ["대학생 커리어 니즈", "주니어 채용 여정", "커리어 콘텐츠 반응"],
    possibleCollaborationTypes: ["recruiting_session", "joint_event", "market_research", "sponsorship"],
    notes: "채용 설명회, 커리어 세션, 대학생 리서치 협업으로 연결하기 좋습니다."
  }),
  createCompany({
    id: "company-todayhouse",
    name: "오늘의집",
    industry: "리빙/프롭테크",
    size: "mid_sized_company",
    website: "https://ohou.se/",
    description: "인테리어 콘텐츠, 커머스, 시공 연결을 제공하는 라이프스타일 플랫폼입니다.",
    recentBusinessContext: "이사·독립·신혼 고객 여정, 콘텐츠 기반 구매 전환, 시공 신뢰 형성이 중요합니다.",
    likelyNeeds: ["1인 가구 리빙 니즈", "콘텐츠-구매 전환", "시공 서비스 신뢰 장벽"],
    notes: "대학생·사회초년생 주거 경험을 다루는 프로젝트와 잘 맞습니다."
  }),
  createCompany({
    id: "company-musinsa",
    name: "무신사",
    industry: "패션/커머스",
    size: "large_enterprise",
    website: "https://www.musinsa.com/",
    description: "패션 커머스, 브랜드 인큐베이션, 오프라인 스토어를 운영하는 패션 플랫폼입니다.",
    recentBusinessContext: "브랜드 포트폴리오 확장, 오프라인 경험, Z세대 패션 취향 변화 대응이 중요합니다.",
    likelyNeeds: ["Z세대 패션 취향 분석", "오프라인 스토어 경험", "브랜드 포트폴리오 전략"],
    notes: "학생 소비자 관점에서 패션 플랫폼의 브랜드·커머스 전략을 제안하기 좋은 외부 확장 후보입니다."
  }),
  createCompany({
    id: "company-woowa-brothers",
    name: "우아한형제들",
    industry: "푸드테크/배달 플랫폼",
    size: "large_enterprise",
    website: "https://www.woowahan.com/",
    description: "배달의민족을 중심으로 음식 주문, 배달, 사장님 솔루션을 운영하는 플랫폼 기업입니다.",
    recentBusinessContext: "외식 경기 둔화, 배달비 민감도, 사장님 성장 지원, 멤버십 가치 강화가 중요합니다.",
    likelyNeeds: ["배달 이용자 리텐션", "외식 소비 패턴", "사장님 대상 서비스 가치"],
    notes: "사용자 리서치와 플랫폼 전략을 결합한 산학협력 주제로 확장하기 좋습니다."
  }),
  createCompany({
    id: "company-yogiyo",
    name: "요기요",
    industry: "푸드테크/배달 플랫폼",
    size: "mid_sized_company",
    website: "https://www.yogiyo.co.kr/",
    contactPage: "https://bizcenter.yogiyo.co.kr/",
    publicEmail: "partnership@yogiyo.co.kr",
    description: "음식 주문과 배달 서비스를 제공하는 배달 플랫폼입니다.",
    recentBusinessContext: "경쟁 플랫폼 대비 차별화, 할인 의존도 완화, 고객 재방문 유도가 중요합니다.",
    likelyNeeds: ["차별화 포지셔닝", "프로모션 효율", "재방문 유도 전략"],
    notes: "배달 플랫폼 간 선택 기준과 리텐션 전략을 분석하는 프로젝트에 적합합니다."
  }),
  createCompany({
    id: "company-kurly",
    name: "컬리",
    industry: "식품/이커머스",
    size: "large_enterprise",
    website: "https://www.kurly.com/",
    description: "신선식품과 라이프스타일 상품을 빠르게 배송하는 이커머스 플랫폼입니다.",
    recentBusinessContext: "프리미엄 식품 커머스 차별화, 반복 구매, PB/뷰티 확장 전략이 중요합니다.",
    likelyNeeds: ["프리미엄 커머스 차별화", "반복 구매 리텐션", "PB·뷰티 확장"],
    notes: "식품·뷰티·라이프스타일 카테고리 확장 전략을 제안하기 좋은 외부 후보입니다."
  }),
  createCompany({
    id: "company-daangn",
    name: "당근",
    industry: "지역 커뮤니티/플랫폼",
    size: "large_enterprise",
    website: "https://www.daangn.com/",
    publicEmail: "contact@daangn.com",
    linkedinUrl: "https://kr.linkedin.com/company/daangn",
    description: "지역 기반 중고거래, 동네생활, 로컬 광고와 커뮤니티 서비스를 운영합니다.",
    recentBusinessContext: "지역 커뮤니티 활성화, 로컬 비즈니스 광고, 신뢰 기반 거래 경험이 중요합니다.",
    likelyNeeds: ["동네 커뮤니티 활성화", "로컬 광고 가치", "거래 신뢰 경험"],
    notes: "지역 기반 서비스의 사용자 행동과 로컬 파트너십 전략을 다루기 좋습니다."
  }),
  createCompany({
    id: "company-yanolja",
    name: "야놀자",
    industry: "여행/호스피탈리티 테크",
    size: "large_enterprise",
    website: "https://www.yanolja.com/",
    description: "숙박, 여행, 레저 예약과 호스피탈리티 SaaS를 운영하는 여행 테크 기업입니다.",
    recentBusinessContext: "국내외 여행 수요 회복, 숙박 사업자 솔루션, 글로벌 호스피탈리티 기술 확장이 중요합니다.",
    likelyNeeds: ["여행 수요 세분화", "숙박 예약 전환", "B2B 솔루션 가치 제안"],
    notes: "소비자 여행 여정과 B2B 호스피탈리티 솔루션을 모두 제안할 수 있는 후보입니다."
  }),
  createCompany({
    id: "company-goodchoice",
    name: "여기어때",
    industry: "여행/예약 플랫폼",
    size: "mid_sized_company",
    website: "https://www.goodchoice.kr/",
    description: "숙박, 항공, 액티비티 등 여행 예약 서비스를 제공하는 플랫폼입니다.",
    recentBusinessContext: "숙박 예약 차별화, 앱 재방문, 여행 콘텐츠 기반 전환이 중요합니다.",
    likelyNeeds: ["앱 재방문", "여행 콘텐츠 전환", "숙박 예약 차별화"],
    notes: "2030 여행 의사결정과 앱 경험 분석 기반 프로젝트에 적합합니다."
  }),
  createCompany({
    id: "company-ridi",
    name: "리디",
    industry: "콘텐츠/웹소설/전자책",
    size: "mid_sized_company",
    website: "https://ridicorp.com/",
    description: "전자책, 웹소설, 웹툰 등 디지털 콘텐츠 서비스를 운영합니다.",
    recentBusinessContext: "콘텐츠 구독, IP 확장, 글로벌 독자 확보, 팬덤 기반 소비가 중요합니다.",
    likelyNeeds: ["콘텐츠 구독 리텐션", "IP 확장", "글로벌 독자 분석"],
    notes: "콘텐츠 플랫폼의 고객 세분화와 IP 사업 전략을 제안하기 좋은 후보입니다."
  }),
  createCompany({
    id: "company-zigbang",
    name: "직방",
    industry: "부동산/프롭테크",
    size: "mid_sized_company",
    website: "https://www.zigbang.com/",
    description: "부동산 정보 탐색과 주거 관련 디지털 서비스를 제공하는 프롭테크 기업입니다.",
    recentBusinessContext: "주거 탐색 신뢰, 1인 가구 수요, 디지털 부동산 경험 차별화가 중요합니다.",
    likelyNeeds: ["1인 가구 주거 탐색", "부동산 정보 신뢰", "앱 전환 경험"],
    notes: "대학생·사회초년생 주거 니즈 분석과 서비스 개선 프로젝트로 연결하기 좋습니다."
  }),
  createCompany({
    id: "company-ably",
    name: "에이블리",
    industry: "패션/커머스",
    size: "mid_sized_company",
    website: "https://a-bly.com/",
    description: "개인화 추천 기반 패션·라이프스타일 커머스 플랫폼입니다.",
    recentBusinessContext: "개인화 추천, 셀러 생태계, 여성 고객 리텐션과 카테고리 확장이 중요합니다.",
    likelyNeeds: ["개인화 추천 경험", "셀러 생태계 활성화", "여성 고객 리텐션"],
    notes: "패션 커머스 고객 행동과 추천 기반 구매 전환 분석에 적합합니다."
  }),
  createCompany({
    id: "company-kakao",
    name: "카카오",
    industry: "인터넷/플랫폼",
    size: "large_enterprise",
    website: "https://www.kakaocorp.com/",
    description: "메신저, 콘텐츠, 커머스, 광고, 금융 등 생활 플랫폼 생태계를 운영합니다.",
    recentBusinessContext: "플랫폼 신뢰 회복, 서비스 간 연결, AI 기반 사용자 경험, 생활 밀착 서비스 확장이 중요합니다.",
    likelyNeeds: ["플랫폼 신뢰", "서비스 간 연결 경험", "AI 사용자 경험"],
    notes: "대학생 관점의 생활 플랫폼 사용성과 신뢰 회복 전략을 제안하기 좋습니다."
  }),
  createCompany({
    id: "company-lunit",
    name: "루닛",
    industry: "AI/헬스케어",
    size: "mid_sized_company",
    website: "https://www.lunit.io/",
    contactPage: "https://www.lunit.io/contact",
    publicEmail: "pr@lunit.io",
    linkedinUrl: "https://www.linkedin.com/company/lunit-inc",
    description: "의료 영상과 암 진단 분야의 AI 솔루션을 개발하는 헬스케어 AI 기업입니다.",
    recentBusinessContext: "의료 AI 도입 장벽, 글로벌 병원 세일즈, 임상 현장 신뢰 확보가 중요합니다.",
    likelyNeeds: ["의료 AI 수용성", "글로벌 병원 GTM", "임상 현장 신뢰"],
    notes: "기술 기반 기업의 시장 진입과 이해관계자 설득 전략을 다루기 좋습니다."
  }),
  createCompany({
    id: "company-tridge",
    name: "트릿지",
    industry: "농식품/데이터 플랫폼",
    size: "mid_sized_company",
    website: "https://www.tridge.com/",
    contactPage: "https://www.tridge.com/contact-us",
    publicEmail: "press@tridge.com",
    linkedinUrl: "https://www.linkedin.com/company/tridge/",
    description: "글로벌 농식품 거래와 시장 데이터를 연결하는 B2B 플랫폼입니다.",
    recentBusinessContext: "글로벌 공급망 데이터 신뢰, B2B 고객 확보, 식품 원자재 시장 인사이트가 중요합니다.",
    likelyNeeds: ["B2B 고객 세분화", "글로벌 공급망 인사이트", "데이터 기반 가치 제안"],
    notes: "B2B 플랫폼의 고객 문제 정의와 시장 확장 전략을 제안하기 좋은 후보입니다."
  }),
  createCompany({
    id: "company-class101",
    name: "CLASS101",
    industry: "교육/크리에이터 이코노미",
    size: "mid_sized_company",
    website: "https://class101.net/",
    publicEmail: "ask@101.inc",
    linkedinUrl: "https://www.linkedin.com/company/class101",
    description: "온라인 클래스와 크리에이터 기반 교육 콘텐츠를 제공하는 플랫폼입니다.",
    recentBusinessContext: "구독형 교육 콘텐츠 리텐션, 크리에이터 공급, 학습 완료율이 중요합니다.",
    likelyNeeds: ["구독 리텐션", "학습 완료율", "크리에이터 콘텐츠 전략"],
    notes: "대학생·주니어 학습 니즈와 콘텐츠 구독 전략을 연결하기 좋습니다."
  }),
  createCompany({
    id: "company-29cm",
    name: "29CM",
    industry: "라이프스타일/커머스",
    size: "mid_sized_company",
    website: "https://www.29cm.co.kr/",
    publicEmail: "customer@29cm.co.kr",
    linkedinUrl: "https://www.linkedin.com/company/29cm",
    description: "브랜드 스토리와 감도 높은 큐레이션을 기반으로 라이프스타일 커머스를 운영합니다.",
    recentBusinessContext: "브랜드 큐레이션, 콘텐츠 기반 구매 전환, 프리미엄 라이프스타일 고객 확보가 중요합니다.",
    likelyNeeds: ["브랜드 큐레이션", "콘텐츠 커머스 전환", "프리미엄 고객 확보"],
    notes: "브랜드 스토리텔링과 커머스 전환 전략을 분석하기 좋은 후보입니다."
  }),
  createCompany({
    id: "company-makestar",
    name: "메이크스타",
    industry: "엔터테인먼트/팬덤 플랫폼",
    size: "SME",
    website: "https://www.makestar.co/",
    publicEmail: "cx@makestar.com",
    description: "K-pop 팬덤 기반 프로젝트, 굿즈, 이벤트 커머스를 운영하는 플랫폼입니다.",
    recentBusinessContext: "글로벌 팬덤 참여, 굿즈 구매 전환, 아티스트 프로젝트 기획이 중요합니다.",
    likelyNeeds: ["글로벌 팬덤 참여", "굿즈 구매 전환", "팬덤 프로젝트 기획"],
    notes: "팬덤 기반 커머스와 글로벌 고객 리서치 프로젝트에 적합합니다."
  }),
  createCompany({
    id: "company-supercat",
    name: "슈퍼캣",
    industry: "게임/메타버스",
    size: "mid_sized_company",
    website: "https://www.supercat.co.kr/",
    publicEmail: "we@supercat.co.kr",
    description: "게임 개발과 메타버스 플랫폼을 운영하는 게임 기업입니다.",
    recentBusinessContext: "커뮤니티 기반 게임 경험, UGC 콘텐츠, 장기 리텐션이 중요합니다.",
    likelyNeeds: ["게임 커뮤니티", "UGC 콘텐츠", "장기 리텐션"],
    notes: "게임 사용자 커뮤니티와 리텐션 전략을 제안하기 좋은 후보입니다."
  }),
  createCompany({
    id: "company-kotra",
    name: "KOTRA",
    industry: "공공기관/무역진흥",
    size: "public_institution",
    website: "https://www.kotra.or.kr/",
    description: "국내 기업의 해외 진출과 수출, 투자 유치를 지원하는 공공기관입니다.",
    recentBusinessContext: "중소기업 해외 진출, 수출 시장 데이터, 청년 글로벌 역량 연결이 중요합니다.",
    likelyNeeds: ["해외 진출 시장 조사", "중소기업 지원 프로그램", "청년 글로벌 프로젝트"],
    possibleCollaborationTypes: ["research_collaboration", "market_research", "joint_event", "sponsorship"],
    notes: "시장 조사와 공공 목적 프로젝트를 결합한 산학협력 후보로 적합합니다."
  }),
  createCompany({
    id: "company-greenpeace-seoul",
    name: "그린피스 서울사무소",
    industry: "ESG/비영리",
    size: "nonprofit",
    website: "https://www.greenpeace.org/korea/",
    description: "기후, 해양, 플라스틱, 에너지 전환 등 환경 캠페인을 수행하는 국제 비영리 단체입니다.",
    recentBusinessContext: "청년 참여 확대, 캠페인 메시지 설계, 기업 ESG 행동 촉구가 중요합니다.",
    likelyNeeds: ["청년 캠페인 참여", "ESG 메시지 전략", "디지털 캠페인 확산"],
    possibleCollaborationTypes: ["joint_event", "market_research", "business_strategy_proposal", "sponsorship"],
    notes: "사회적 임팩트와 캠페인 전략을 다루는 학회 프로젝트에 적합합니다."
  }),
  createCompany({
    id: "company-kleague",
    name: "K LEAGUE",
    industry: "스포츠/엔터테인먼트",
    size: "other",
    website: "https://www.kleague.com/",
    description: "국내 프로축구 리그 운영과 팬 경험, 경기, 구단 생태계를 관리하는 스포츠 브랜드입니다.",
    recentBusinessContext: "신규 관중 유입, 재방문, 리그 단위 팬 참여 이벤트와 관람 경험 설계가 중요합니다.",
    likelyNeeds: ["신규 팬 유입", "경기장 관람 경험", "리그 단위 팬 참여 프로그램"],
    possibleCollaborationTypes: ["business_strategy_proposal", "joint_event", "market_research", "sponsorship"],
    notes: "스포츠 관람을 경험형 엔터테인먼트로 재정의하는 제안에 적합합니다."
  }),
  ...expansionCompanySeeds.slice(0, 81).map(createCompany)
];

function hashSeed(seed: string): number {
  let hash = 2166136261;
  for (let index = 0; index < seed.length; index += 1) {
    hash ^= seed.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function randomFromSeed(seed: number) {
  let value = seed;
  return () => {
    value += 0x6d2b79f5;
    let next = value;
    next = Math.imul(next ^ (next >>> 15), next | 1);
    next ^= next + Math.imul(next ^ (next >>> 7), next | 61);
    return ((next ^ (next >>> 14)) >>> 0) / 4294967296;
  };
}

export function getCompaniesForSeed(seed: string, count = 30): CompanyLead[] {
  const random = randomFromSeed(hashSeed(seed));
  const targetCount = Math.min(count, companyPool.length);
  const tierTargets = buildTierTargets(targetCount);
  const picked = new Map<string, CompanyLead>();

  for (const [tier, tierCount] of Object.entries(tierTargets)) {
    selectDiscoveryCandidates(
      companyPool.filter((company) => company.discovery?.valueTier === tier),
      tierCount,
      random
    ).forEach((company) => picked.set(company.id, company));
  }

  if (picked.size < targetCount) {
    selectDiscoveryCandidates(
      companyPool.filter((company) => !picked.has(company.id)),
      targetCount - picked.size,
      random
    ).forEach((company) => picked.set(company.id, company));
  }

  return Array.from(picked.values()).sort((a, b) => {
    const tierDifference = tierSortRank(a) - tierSortRank(b);
    if (tierDifference !== 0) return tierDifference;
    return (b.discovery?.contactValueScore || 0) - (a.discovery?.contactValueScore || 0);
  });
}

export const companyLeads: CompanyLead[] = getCompaniesForSeed("societybridge-default", 30);

export function findCompanyById(id: string): CompanyLead | undefined {
  return companyPool.find((company) => company.id === id);
}

function buildTierTargets(count: number): Record<string, number> {
  if (count <= 5) return { "Tier 1": Math.min(3, count), "Tier 2": Math.max(0, count - 3), "Tier 3": 0 };
  if (count <= 10) return { "Tier 1": 4, "Tier 2": 4, "Tier 3": count - 8 };
  return {
    "Tier 1": Math.ceil(count * 0.36),
    "Tier 2": Math.ceil(count * 0.4),
    "Tier 3": count - Math.ceil(count * 0.36) - Math.ceil(count * 0.4)
  };
}

function selectDiscoveryCandidates(companies: CompanyLead[], count: number, random: () => number) {
  return companies
    .map((company) => ({
      company,
      sort: (company.discovery?.contactValueScore || 0) + random() * 18
    }))
    .sort((a, b) => b.sort - a.sort)
    .slice(0, Math.max(0, count))
    .map(({ company }) => company);
}

function tierSortRank(company: CompanyLead) {
  const tier = company.discovery?.valueTier;
  if (tier === "Tier 1") return 1;
  if (tier === "Tier 2") return 2;
  if (tier === "Tier 3") return 3;
  return 4;
}
