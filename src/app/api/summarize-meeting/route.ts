import { NextResponse } from 'next/server';

/**
 * 회의록 세 줄 요약 — 본문을 넣으면 세 줄을 돌려준다.
 * 키가 없으면 요약하지 않고 그대로 알린다. 키 없이 흉내내는 요약은 만들지 않는다.
 */

const MODEL = 'gemini-2.5-flash';
const PROMPT = [
  '너는 대학 팀프로젝트 회의록을 정리하는 조교다.',
  '아래 회의록 본문을 정확히 세 줄로 요약해라.',
  '1번째 줄은 결정한 것, 2번째 줄은 문제나 걸림돌, 3번째 줄은 다음에 할 일을 담는다.',
  '각 줄은 한국어 한 문장, 40자 내외. 번호·불릿·따옴표 없이 줄바꿈으로만 구분해 세 줄만 출력해라.',
].join('\n');

export async function POST(request: Request) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: 'AI 키가 설정되지 않았어요' }, { status: 503 });
  }

  const payload = (await request.json()) as { title?: unknown; body?: unknown };
  const body = typeof payload.body === 'string' ? payload.body.trim() : '';
  const title = typeof payload.title === 'string' ? payload.title.trim() : '';
  if (body.length < 20) {
    return NextResponse.json({ error: '요약할 내용이 너무 짧아요' }, { status: 400 });
  }

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent`,
    {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-goog-api-key': apiKey },
      body: JSON.stringify({
        contents: [{ parts: [{ text: `${PROMPT}\n\n## 주제\n${title}\n\n## 본문\n${body.slice(0, 6000)}` }] }],
        generationConfig: { temperature: 0.2, maxOutputTokens: 4096 },
      }),
    },
  );

  if (!response.ok) {
    return NextResponse.json({ error: '요약에 실패했어요' }, { status: 502 });
  }

  const data = (await response.json()) as {
    candidates?: { content?: { parts?: { text?: string }[] } }[];
  };
  const text = data.candidates?.[0]?.content?.parts?.map((part) => part.text ?? '').join('') ?? '';
  const lines = text
    .split('\n')
    .map((line) => line.replace(/^\s*[-*\d.)\s]+/, '').trim())
    .filter(Boolean)
    .slice(0, 3);

  if (lines.length === 0) {
    return NextResponse.json({ error: '요약에 실패했어요' }, { status: 502 });
  }
  return NextResponse.json({ lines });
}
