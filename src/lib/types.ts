export type SocietyType =
  | "business_society"
  | "consulting_club"
  | "finance_society"
  | "marketing_club"
  | "data_ai_club"
  | "technology_club"
  | "startup_club"
  | "social_impact_club"
  | "other";

export type CollaborationType =
  | "corporate_project"
  | "industry_academic_collaboration"
  | "sponsorship"
  | "recruiting_session"
  | "joint_event"
  | "research_collaboration"
  | "user_interview"
  | "market_research"
  | "business_strategy_proposal"
  | "product_feedback"
  | "other";

export type SocietyProfileInput = {
  societyName: string;
  organizationType: SocietyType;
  university: string;
  oneLineIntroduction: string;
  detailedIntroduction: string;
  visionAndDirection: string;
  mainActivities: string;
  pastProjects: string;
  coreCapabilities: string;
  industriesOfInterest: string;
  preferredCollaborationType: CollaborationType;
  targetRegion: string;
  uploadedMaterialText: string;
};

export type SocietyAnalysis = {
  society_summary: string;
  vision_summary: string;
  strategic_direction: string;
  core_capabilities: string[];
  past_project_assets: string[];
  collaboration_assets: string[];
  suitable_company_types: string[];
  suitable_industries: string[];
  potential_project_themes: string[];
  outreach_positioning: string;
  keywords_for_company_search: string[];
};

export type EnvironmentAnalysis = {
  internal_environment_analysis: {
    likely_company_context: string;
    current_growth_challenges: string[];
    customer_or_user_frictions: string[];
    product_or_service_gaps: string[];
    go_to_market_or_branding_issues: string[];
    data_or_insight_gaps: string[];
    decision_questions_for_company: string[];
  };
  external_environment_analysis: {
    relevant_industries: string[];
    market_trends: string[];
    competitive_pressures: string[];
    customer_behavior_shifts: string[];
    regulatory_or_social_factors: string[];
    company_side_pain_points: string[];
    collaboration_opportunity_areas: string[];
    company_types_likely_to_have_these_problems: string[];
    recommended_target_selection_logic: string;
  };
  strategic_fit_summary: string;
  recommended_target_company_criteria: string[];
  problem_keywords_for_company_search: string[];
};

export type CompanySize =
  | "startup"
  | "SME"
  | "mid_sized_company"
  | "large_enterprise"
  | "public_institution"
  | "nonprofit"
  | "other";

export type ContactRouteType =
  | "official_contact"
  | "customer_support"
  | "partnership"
  | "business_development"
  | "strategy"
  | "marketing"
  | "hr_recruiting"
  | "pr_media"
  | "linkedin_company"
  | "linkedin_people_search"
  | "careers"
  | "other";

export type ContactRoute = {
  type: ContactRouteType;
  label: string;
  url: string;
  description?: string;
  source?: "official_site" | "manual" | "mock_data" | "future_search_api";
  verified?: boolean;
};

export type RecipientFitCriteria = {
  decisionAuthority: number;
  executionRelevance: number;
  externalCollaborationLikelihood: number;
  publicContactability: number;
  warmIntroPotential: number;
  overall: number;
};

export type ContactRoutePriority = {
  rank: number;
  route: ContactRoute;
  reason: string;
};

export type RecipientFit = {
  primaryDepartment: string;
  alternativeDepartments: string[];
  recommendedRecipientTitle: string;
  criteria: RecipientFitCriteria;
  reasoning: string;
  firstAction: string;
  userActionChecklist: string[];
  contactRoutePriority: ContactRoutePriority[];
  noPublicEmailNotice: string;
};

export type ContactChannels = {
  website?: string;
  contactPage?: string;
  publicEmail?: string;
  linkedinUrl?: string;
  routes?: ContactRoute[];
  notes?: string;
};

export type CompanyValueTier = "Tier 1" | "Tier 2" | "Tier 3";
export type DiscoverySignalLevel = "상" | "중" | "하";

export type CompanyDiscoveryProfile = {
  valueTier: CompanyValueTier;
  valueTierReason: string;
  collaborationPotential: DiscoverySignalLevel;
  collaborationPotentialScore: number;
  problemOpportunitySignal: DiscoverySignalLevel;
  problemOpportunityScore: number;
  contactability: DiscoverySignalLevel;
  contactabilityScore: number;
  contactValueScore: number;
  contactValueReason: string;
  discoveryTags: string[];
  targetRationale: string;
  recommendedSearchQueries: string[];
};

export type CompanyLead = {
  id: string;
  name: string;
  industry: string;
  size: CompanySize;
  region: string;
  description: string;
  recentBusinessContext: string;
  likelyNeeds: string[];
  possibleCollaborationTypes: CollaborationType[];
  contact: ContactChannels;
  suggestedDepartment: string;
  recipientFit?: RecipientFit;
  sourceLinks: string[];
  notes: string;
  discovery?: CompanyDiscoveryProfile;
};

export type CompanyScore = {
  fitScore: number;
  priorityTier: string;
  tierReason: string;
  whyGoodTarget: string;
  expectedCompanyProblem: string;
  solvableArea: string;
  whyOurSociety: string;
  recommendedProjectDirection: string;
  collaborationTypeFit: string;
  contactAvailability: string;
  fitReasoning: string;
  risks: string[];
  environmentProblemFit: string;
};

export type ProposalTone = "strategic" | "professional" | "student_friendly" | "concise" | "formal";
export type ProposalLength = "short_summary" | "one_page_proposal" | "detailed_proposal";

export type ProjectProposalRequest = {
  society: SocietyProfileInput | null;
  analysis: SocietyAnalysis | null;
  company: CompanyLead | null;
  scoreContext?: CompanyScore | null;
  preferredCollaborationType: CollaborationType;
  desiredProjectDuration: string;
  capabilitiesToEmphasize: string;
  proposalTemplateName?: string;
  proposalTemplateText?: string;
  tone: ProposalTone;
  outputLength: ProposalLength;
};

export type ProjectProposalOutput = {
  proposalTitle: string;
  proposalBackground: string;
  companyProblemDefinition: string;
  whyNow: string;
  projectGoals: string;
  keyQuestions: string;
  scopeOfWork: string;
  methodology: string;
  timelineAndOperation: string;
  expectedDeliverables: string;
  expectedImpact: string;
  societyFit: string;
  collaborationRequests: string;
  qualityChecklist: string[];
  onePageSummary: string;
};

export type EmailPurpose =
  | "corporate_project_proposal"
  | "industry_academic_collaboration"
  | "sponsorship"
  | "recruiting_session"
  | "joint_event"
  | "research_collaboration"
  | "user_interview"
  | "market_research"
  | "other";

export type EmailTone = "concise" | "formal" | "confident" | "student_organization" | "executive_facing";
export type EmailLength = "five_sentences" | "short_email" | "detailed_email";
export type EmailCta =
  | "request_meeting"
  | "request_feedback"
  | "request_introduction"
  | "request_collaboration_discussion"
  | "request_project_opportunity";

export type ColdEmailRequest = {
  society: SocietyProfileInput | null;
  analysis: SocietyAnalysis | null;
  company: CompanyLead | null;
  purpose: EmailPurpose;
  tone: EmailTone;
  length: EmailLength;
  cta: EmailCta;
  recipientName: string;
  senderName: string;
  senderRole: string;
  senderEmail: string;
  senderPhone: string;
  projectPeriod: string;
  societyOutreachIntro: string;
  societyOutreachStrength: string;
  collaborationHistorySummary: string;
  optionalAttachmentMention: string;
  scoreContext?: CompanyScore | null;
};

export type ColdEmailOutput = {
  subjectLines: string[];
  messageStrategy: string;
  linkedinConnectionRequest: string;
  linkedinAcceptedMessage: string;
  emailBody: string;
  shortLinkedInDm: string;
  followUpEmailMessage: string;
  oneSentencePitch: string;
  suggestedCtaSentence: string;
  qualityChecklist: string[];
};

export type SavedCompanyStatus =
  | "not_contacted"
  | "contacted"
  | "replied"
  | "meeting_scheduled"
  | "rejected"
  | "follow_up_needed";

export type SavedCompany = {
  id: string;
  companyId: string;
  companyName: string;
  industry: string;
  fitScore: number;
  problemSituation: string;
  projectProposalDirection: string;
  contactChannel: ContactChannels;
  generatedColdEmail: string;
  notes: string;
  status: SavedCompanyStatus;
  savedAt: string;
};
