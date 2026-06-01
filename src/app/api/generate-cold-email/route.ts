import { NextResponse } from "next/server";

import { emailCtaLabels, emailLengthLabels, emailPurposeLabels, emailToneLabels } from "@/lib/labels";
import { fallbackGenerateColdEmail } from "@/lib/fallbacks";
import { generateJson } from "@/lib/openai";
import { buildLinkedInOutreachMessages } from "@/lib/outreachTemplates";
import type { ColdEmailOutput, ColdEmailRequest } from "@/lib/types";

export async function POST(request: Request) {
  try {
    const payload = (await request.json()) as ColdEmailRequest;
    const fallback = fallbackGenerateColdEmail(payload);

    const generated = await generateJson<ColdEmailOutput>({
      system:
        "당신은 대학 학회와 학생 조직을 위한 공식 대외협력 제안 메일 작성자입니다. 학생 조직의 진정성은 유지하되, 전체 문체는 정중하고 공적인 B2B/산학협력 제안 톤이어야 합니다. 과도하게 캐주얼하거나 친근한 표현을 피하고, 검토 요청, 협업 가능성 논의, 담당 부서 연결 요청, 회신 요청 같은 공식 표현을 사용하세요. 제목 3개, 메시지 전략, 이메일 본문, 짧은 DM, 후속 메일, 한 문장 피치, CTA 문장, 품질 체크리스트가 모두 같은 공식 문체를 유지해야 합니다. 실제 B2B 콜드메일과 파트너십 제안 메일의 일반 원칙을 반영해 수신 기업 중심의 개인화, 문제 또는 기회 중심 도입, 명확한 기대가치, 하나의 구체적인 다음 행동 요청을 우선하세요. 이메일 본문에는 기업 선정 이유, 예상 문제 또는 기회, 협업 방향, 기업 기대가치, 명확한 미팅 또는 회신 요청을 포함하세요. 대상 기업의 문제 상황, 해소 가능 영역, 왜 이 학회가 제안하는지가 자연스럽게 드러나야 합니다. 공개되지 않은 개인 연락처나 사적 정보를 만들지 마세요.",
      user: {
        task: "기업 맞춤 콜드 이메일 생성",
        required_keys: Object.keys(fallback),
        output_guidelines: {
          subjectLines: "짧고 구체적인 제안·검토 요청 제목 3개만 작성. 과장, 느낌표, 광고성 표현은 피하고 기업명 또는 협업 주제를 포함",
          messageStrategy: "이 메일이 어떤 논리로 설계됐는지 2~3문장으로 설명. 기업 선정 이유, 문제 가설, 제안 방향, 낮은 CTA가 어떻게 연결되는지 포함",
          emailBody: "공식 인사, 소속 소개, 기업 선정 이유, 예상 문제/기회, 협업 방향, 기대가치, 첨부자료 언급, 20분 내외 미팅 또는 담당 부서 연결 요청 순서로 작성. 수신 기업이 얻을 실무적 가치를 먼저 이해할 수 있게 작성",
          linkedinConnectionRequest: "코드 템플릿에서 고정 생성되므로 OpenAI가 임의 변경하지 않음",
          linkedinAcceptedMessage: "코드 템플릿에서 고정 생성되므로 OpenAI가 임의 변경하지 않음",
          shortLinkedInDm: "짧지만 공적인 담당자 연결 또는 검토 요청 문체. 한 가지 요청만 제시",
          followUpEmailMessage: "이전 제안의 맥락을 간단히 환기하고, 추가 압박 없이 담당 부서 연결 또는 회신 가능 여부만 정중히 확인",
          oneSentencePitch: "기업 기대가치와 학회 제공 역량이 함께 드러나는 공식 한 문장",
          suggestedCtaSentence: "미팅, 회신, 담당 부서 연결 중 선택 CTA에 맞춘 명확한 단일 요청",
          qualityChecklist: "배열. 기업 선정 이유, 문제/기회 가설, 협업 방향, 기업 기대가치, 낮은 CTA, 공적 문체, 미검증 정보 비생성 여부를 4~6개 항목으로 점검"
        },
        quality_rules: [
          "기업의 문제를 단정하지 말고 '검토했습니다', '가능성이 있다고 보았습니다', '의미 있는 논의 주제가 될 수 있습니다'처럼 가설형으로 표현하세요.",
          "첫 메일에서 계약, 확정 프로젝트, 긴 자료 검토를 요구하지 말고 15~20분 미팅, 담당 부서 연결, 간단한 피드백 중 하나만 요청하세요.",
          "학생 조직이라는 표현은 신뢰를 낮추지 않도록 역량, 산출물, 과거 프로젝트 맥락과 함께 제시하세요.",
          "광고성 제목, 과도한 칭찬, 느낌표, 지나친 친근함을 피하세요.",
          "공개되지 않은 개인 연락처나 특정 담당자 실명을 만들지 마세요."
        ],
        labels: {
          purpose: emailPurposeLabels[payload.purpose],
          tone: emailToneLabels[payload.tone],
          length: emailLengthLabels[payload.length],
          cta: emailCtaLabels[payload.cta]
        },
        request: payload
      },
      fallback,
      temperature: 0.55
    });
    const linkedInTemplates = buildLinkedInOutreachMessages(payload);
    const output = { ...generated, ...linkedInTemplates };

    return NextResponse.json({ data: output, demoMode: !process.env.OPENAI_API_KEY });
  } catch {
    return NextResponse.json({ error: "콜드 이메일 생성 중 문제가 발생했습니다." }, { status: 400 });
  }
}
