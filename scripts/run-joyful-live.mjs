import dotenv from 'dotenv';

dotenv.config({ path: new URL('../.env', import.meta.url).pathname });

const invokeUrl = process.env.VITE_NV_INVOKE_URL || 'https://integrate.api.nvidia.com/v1/chat/completions';
const apiKey = process.env.VITE_NV_API_KEY || '';
const model = process.env.VITE_NV_API_MODEL || 'qwen/qwen3-coder-480b-a35b-instruct';
const topP = Number(process.env.VITE_NV_API_TOP_P || 0.8);

function stripMarkdownJson(value) {
  const trimmed = String(value).trim();
  const fenced = trimmed.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/i);
  if (fenced) return fenced[1].trim();
  const firstBrace = trimmed.indexOf('{');
  const lastBrace = trimmed.lastIndexOf('}');
  if (firstBrace >= 0 && lastBrace > firstBrace) return trimmed.slice(firstBrace, lastBrace + 1);
  return trimmed;
}

async function callJoyful(messages) {
  if (!apiKey) {
    throw new Error('VITE_NV_API_KEY is required to run this live Joyful AI check.');
  }

  const response = await fetch(invokeUrl, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      Accept: 'application/json',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model,
      messages,
      temperature: 0.7,
      top_p: topP,
      frequency_penalty: 0,
      presence_penalty: 0,
      max_tokens: 4096,
      stream: false,
    }),
  });

  const body = await response.text();
  if (!response.ok) {
    throw new Error(`NVIDIA API error ${response.status}: ${body}`);
  }

  const json = JSON.parse(body);
  return String(json?.choices?.[0]?.message?.content || json?.choices?.[0]?.text || '');
}

(async () => {
  try {
    const systemInstruction = `You are Joyful AI. Return only valid JSON with this shape:
{
  "files": [ { "path": "index.html", "action": "create", "content": "..." } ],
  "summary": "brief summary",
  "nextSteps": ["step"]
}
Do not wrap JSON in markdown.
Do not use JavaScript string concatenation, comments, trailing commas, or unescaped line breaks inside JSON strings.`;

    const userPrompt = 'Create a minimal index.html file for a tiny landing page. Respond using only the JSON schema requested by system instruction.';
    const text = await callJoyful([
      { role: 'system', content: systemInstruction },
      { role: 'user', content: userPrompt },
    ]);

    console.log('\n--- Raw model output ---\n');
    console.log(text);

    const jsonText = stripMarkdownJson(text);
    try {
      const parsed = JSON.parse(jsonText);
      console.log('\n--- Parsed JSON ---\n');
      console.log(JSON.stringify(parsed, null, 2));
    } catch (err) {
      console.error('\nFailed to parse model output as JSON:', err.message);
    }
  } catch (err) {
    console.error('Error calling Joyful AI:', err.message || err);
    process.exitCode = 1;
  }
})();
