'use strict';

const express = require('express');
const Anthropic = require('@anthropic-ai/sdk');

const app = express();
app.use(express.json());

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const SYSTEM_PROMPT = `당신은 경남어린이집연합회의 공식 AI 상담원입니다.
경남 지역 어린이집 원장님·보육교사·학부모님의 질문에 친절하고 전문적으로 답변해 주세요.

주요 업무 영역:
- 보육 관련 법령 및 정책 안내 (영유아보육법, 보육지침 등)
- 어린이집 운영 실무 (보조금, 인건비, 회계처리, 평가인증 등)
- 보육교직원 처우 및 근무 여건 관련 정보
- 경남어린이집연합회 사업 및 공지사항 안내
- 건의서·공문 작성 지원

답변 원칙:
- 법령·지침 관련 내용은 근거 조항을 함께 안내하세요
- 불확실한 정보는 "확인이 필요합니다"라고 명시하세요
- 최신 정보는 보건복지부나 지자체에 재확인을 권장하세요
- 카카오톡 메시지에 맞게 짧고 명확하게 답변하세요 (300자 이내 권장)`;

function buildResponse(text) {
  return {
    version: '2.0',
    template: {
      outputs: [{ simpleText: { text } }]
    }
  };
}

function buildMenuResponse(text, buttons) {
  return {
    version: '2.0',
    template: {
      outputs: [{ simpleText: { text } }],
      quickReplies: buttons.map(label => ({
        label,
        action: 'message',
        messageText: label
      }))
    }
  };
}

app.get('/', (req, res) => {
  res.json({ status: 'ok', service: '경남어린이집연합회 카카오 챗봇' });
});

app.post('/webhook', async (req, res) => {
  try {
    const utterance = req.body?.userRequest?.utterance?.trim() ?? '';

    if (!utterance) {
      return res.json(buildResponse('메시지를 입력해 주세요.'));
    }

    if (utterance === '메뉴' || utterance === '처음으로' || utterance === '시작') {
      return res.json(buildMenuResponse(
        '안녕하세요! 경남어린이집연합회 AI 상담원입니다.\n무엇을 도와드릴까요?',
        ['질의응답', '공지사항', '정책정보', '건의서 작성']
      ));
    }

    if (utterance === '공지사항') {
      return res.json(buildMenuResponse(
        '📢 경남어린이집연합회 공지사항\n\n최신 공지는 연합회 홈페이지 또는 카카오채널을 확인해 주세요.\n\n문의: 055-000-0000',
        ['질의응답', '정책정보', '건의서 작성']
      ));
    }

    if (utterance === '정책정보') {
      return res.json(buildMenuResponse(
        '📋 주요 보육 정책 정보\n\n• 보육료 지원 기준\n• 교사 처우개선비\n• 인건비 지원 현황\n• 평가인증 일정\n\n자세한 내용은 질문해 주세요!',
        ['보육료 지원', '교사 처우개선비', '평가인증', '메뉴']
      ));
    }

    if (utterance === '건의서 작성') {
      return res.json(buildMenuResponse(
        '✍️ 건의서 작성 안내\n\n건의하실 내용을 구체적으로 말씀해 주세요.\n예) "영아반 인건비 지원 확대 건의서 작성해줘"\n\n작성된 건의서는 Word 파일(.docx)로 저장됩니다.',
        ['메뉴', '질의응답']
      ));
    }

    const message = await anthropic.messages.create({
      model: 'claude-opus-4-8',
      max_tokens: 800,
      thinking: { type: 'adaptive' },
      system: SYSTEM_PROMPT,
      messages: [{ role: 'user', content: utterance }]
    });

    const textBlock = message.content.find(b => b.type === 'text');
    const answer = textBlock?.text ?? '답변을 생성하지 못했습니다. 다시 시도해 주세요.';

    const truncated = answer.length > 1000
      ? answer.slice(0, 997) + '...'
      : answer;

    return res.json(buildMenuResponse(truncated, ['메뉴', '질의응답']));

  } catch (err) {
    console.error('Webhook error:', err.message);
    return res.json(buildResponse('일시적인 오류가 발생했습니다. 잠시 후 다시 시도해 주세요.'));
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`경남어린이집연합회 카카오 챗봇 서버 실행 중: http://localhost:${PORT}`);
});
