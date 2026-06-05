import type { ColdEmailRequest } from "@/lib/types";

export function buildLinkedInOutreachMessages(request: ColdEmailRequest) {
  const societyName = request.society?.societyName?.trim() || "우리 학회";
  const companyName = request.company?.name?.trim() || "귀사";
  const recipientName = request.recipientName?.trim() || "OOO";
  const senderName = request.senderName?.trim() || "발신자명";
  const senderRole = request.senderRole?.trim() || "직책";
  const senderEmail = request.senderEmail?.trim() || "이메일";
  const senderPhone = request.senderPhone?.trim() || "전화번호";
  const projectPeriod = request.projectPeriod?.trim() || "202X년 N월~N월";
  const societyIntro =
    request.societyOutreachIntro?.trim() ||
    request.society?.oneLineIntroduction?.trim() ||
    "기업과의 협업 프로젝트를 수행할 수 있는 대학 학회입니다.";
  const collaborationHistory =
    request.collaborationHistorySummary?.trim() ||
    "매 학기 기업과 함께 프로젝트를 수행해왔으며, 자세한 설명은 첨부한 '학회 소개서'를 참고해 주시기 바랍니다.";
  const societyStrength =
    request.societyOutreachStrength?.trim() ||
    request.analysis?.outreach_positioning?.trim() ||
    request.society?.coreCapabilities?.trim() ||
    "기업 내부 데이터만으로는 포착하기 어려운 외부 관점의 리서치와 실행 가능한 제안 도출을 강점으로 가지고 있습니다.";

  return {
    linkedinConnectionRequest: `안녕하세요 ${recipientName} 님,\n${societyName} ${senderRole} ${senderName}입니다.\n\n${companyName}와 ${societyName}의 산학협력 프로젝트를 제안드리고자 1촌 신청을 드리게 되었습니다. 우선, 귀사와의 산학협력 제안을 드리기 위해 관련 부서를 찾던 중 부득이하게 개인적으로 연락드리게 된 점 양해 부탁드립니다.\n\n신청을 받아주신다면, 학회 소개서와 프로젝트 개요서를 송부드리고 싶습니다. 더불어, 혹시 귀사 내의 대학교 협력의 유관부서, 담당자의 연락처를 알려주실 수 있으시다면 정말 감사드리겠습니다.\n\n추운 겨울, 따뜻하게 보내시길 바랍니다.\n감사합니다.`,
    linkedinAcceptedMessage: `안녕하세요! 1촌 신청을 수락해주셔서 감사드립니다.\n\n산학협력 프로젝트와 관련하여 간단히 제안드리고자 연락드리며, 추가적으로 참고하실 수 있도록, 학회 소개서와 프로젝트 개요서를 첨부드립니다.\n\n본 프로젝트는 ${projectPeriod} 중 약 3주간 진행을 예상하고 있으며, 구체적인 주제는 사측의 관심사와 필요를 최우선으로 반영하여 협의 후 확정하고자 합니다.\n\n만약 내부적으로 희망하시는 주제가 있으시다면 해당 방향을 중심으로 논의를 진행하고자 하며, 별도의 지정 주제가 없으신 경우에는 학회 측에서 주제 제안서를 공유드린 뒤 미팅을 통해 세부 내용을 조율드릴 수 있습니다.\n\n${societyName}${topicParticle(societyName)} ${societyIntro} ${collaborationHistory}\n\n${societyStrength} 기업 측에서 필요로 하시는 방식에 맞춰 유연하게 프로젝트를 수행드릴 수 있습니다.\n\n혹시라도 산학협력 프로젝트 관련하여 추가적으로 궁금하시거나 요청하실 내용이 있다면 말씀 주시는 대로 최대한 빠르게 회신 드리겠습니다.\n\n감사합니다.\n\n\n${senderName} 드림\n${societyName}\n📧 ${senderEmail}\n📞 ${senderPhone}`
  };
}

export function buildConversionStrategyNotes(request: ColdEmailRequest) {
  const companyName = request.company?.name?.trim() || "대상 기업";
  const roleHint = request.recipientRoleHint?.trim() || "추천 부서 또는 산학협력 유관 실무자";
  const warmConnection = request.warmConnectionHint?.trim() || "동문·지인·학회 선배 경유 가능성은 수동 확인 필요";
  const activityHint = request.linkedinActivityHint?.trim() || "최근 LinkedIn 활동성은 사용자가 직접 확인 필요";
  const openingHook = request.openingHookMemo?.trim() || `${companyName}의 최근 사업 맥락과 학생·청년 관점의 외부 리서치 필요성을 연결`;

  return {
    roleHint,
    warmConnection,
    activityHint,
    openingHook,
    summary: `Who는 ${roleHint}를 우선 수신자로 두고, ${warmConnection}와 ${activityHint}를 수동 확인한 뒤 접근합니다. How는 첫 문장에서 ${openingHook} 흐름을 제시하고, 첫 요청은 담당 부서 연결 또는 짧은 미팅으로 낮춥니다.`
  };
}

function topicParticle(value: string) {
  const trimmed = value.trim();
  if (!trimmed) return "은";
  const last = trimmed.charCodeAt(trimmed.length - 1);
  if (last < 0xac00 || last > 0xd7a3) return "는";
  return (last - 0xac00) % 28 === 0 ? "는" : "은";
}
