import { NextResponse } from "next/server";

import { collaborationTypeLabels, proposalLengthLabels, proposalToneLabels } from "@/lib/labels";
import { fallbackGenerateProjectProposal } from "@/lib/fallbacks";
import { generateJson } from "@/lib/openai";
import type { ProjectProposalOutput, ProjectProposalRequest } from "@/lib/types";

export async function POST(request: Request) {
  try {
    const payload = (await request.json()) as ProjectProposalRequest;
    const fallback = fallbackGenerateProjectProposal(payload);

    const output = await generateJson<ProjectProposalOutput>({
      system:
        "당신은 대학 학회와 기업의 산학협력·기업 프로젝트 제안서를 만드는 전략 컨설턴트입니다. 결과는 실제 기업 제안서처럼 읽혀야 합니다. 반드시 제안 제목, 제안 배경, 기업 문제 상황, 왜 지금 중요한지, 프로젝트 목표, 수행 범위, 분석 접근, 예상 산출물, 기업 기대효과, 학회 적합성, 짧은 요약을 포함하세요. 대상 기업의 문제 상황, 해소 가능 영역, 왜 이 학회여야 하는지를 반영하되 과장하지 말고, 기업 담당자가 바로 검토할 수 있는 문장으로 작성하세요. 품질 체크리스트에는 결과물이 충족한 기준을 짧은 한국어 문장 배열로 작성하세요. 모든 문자열 필드는 한국어로 반환하세요.",
      user: {
        task: "기업별 산학협력/기업 프로젝트 제안서 생성",
        required_keys: Object.keys(fallback),
        section_guide: {
          proposalTitle: "기업명과 핵심 과제가 드러나는 제안서 제목",
          proposalBackground: "시장/고객/기업 맥락을 연결한 제안 배경",
          companyProblemDefinition: "기업이 겪을 법한 문제를 의사결정 질문으로 재정의",
          whyNow: "왜 지금 이 문제를 검토해야 하는지. 최근 사업 맥락, 고객 변화, 경쟁 압력, 실행 타이밍 중 최소 2개를 연결",
          projectGoals: "프로젝트로 달성할 목표",
          keyQuestions: "프로젝트가 답해야 할 핵심 질문",
          scopeOfWork: "수행 범위와 제외하거나 조정할 범위",
          methodology: "리서치와 분석 방법론",
          timelineAndOperation: "일정, 미팅, 중간 공유, 최종 발표 등 운영 방식",
          expectedDeliverables: "기업이 받게 될 산출물",
          expectedImpact: "기업 입장에서의 기대효과",
          societyFit: "학회 역량과 해당 기업 과제의 적합성",
          collaborationRequests: "기업에 요청할 협업 사항",
          qualityChecklist: "배열. 문제 가설, why now, 산출물, 기업 가치, 학회 적합성, 낮은 요청사항이 반영됐는지 4~6개 항목으로 점검",
          onePageSummary: "제안 제목, 배경, 목표, 방법, 산출물, 기대효과가 들어간 1페이지 요약"
        },
        quality_rules: [
          "기업 문제를 사실처럼 단정하지 말고 '예상됩니다', '검토할 수 있습니다', '가능성이 있습니다'처럼 가설형으로 표현하세요.",
          "제안서에는 기업이 얻는 실무 산출물이 반드시 드러나야 합니다.",
          "학회 적합성은 추상적 열정이 아니라 과거 프로젝트, 조사 역량, 2030 관점, 분석 역량 중 입력에 있는 근거와 연결하세요.",
          "협업 요청사항은 첫 미팅, 공개 가능 자료, 중간 피드백, 최종 발표 참석처럼 낮은 부담의 행동으로 제한하세요.",
          "공개되지 않은 내부 정보나 사적 연락처를 만들지 마세요."
        ],
        length_policy: {
          short_summary: "각 섹션은 1~2문장 중심으로 압축하고, 핵심 질문과 산출물만 짧게 정리하세요.",
          one_page_proposal: "각 섹션은 실제 1페이지 제안서에 들어갈 밀도로 2~4문장 또는 짧은 줄바꿈 목록으로 작성하세요.",
          detailed_proposal: "각 섹션은 상세 제안서 수준으로 근거, 운영 방식, 산출물을 더 구체적으로 작성하세요."
        },
        template_policy: {
          template_name: payload.proposalTemplateName || "기본 정형 제안서",
          template_text: payload.proposalTemplateText || "",
          instruction: "템플릿 텍스트가 있으면 해당 템플릿의 목차, 표현 밀도, 운영 항목을 우선 반영하되 required_keys의 JSON 구조는 반드시 유지하세요. BIT 템플릿의 경우 제안 개요, 주제 제안 1·2, 요청사항 및 최종 아웃풋, 진행 계획이 잘 드러나게 작성하세요."
        },
        labels: {
          collaboration_type: collaborationTypeLabels[payload.preferredCollaborationType],
          tone: proposalToneLabels[payload.tone],
          length: proposalLengthLabels[payload.outputLength]
        },
        request: payload
      },
      fallback,
      temperature: 0.45
    });

    return NextResponse.json({ data: output, demoMode: !process.env.OPENAI_API_KEY });
  } catch {
    return NextResponse.json({ error: "프로젝트 제안 생성 중 문제가 발생했습니다." }, { status: 400 });
  }
}
