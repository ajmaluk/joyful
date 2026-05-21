import dotenv from 'dotenv';
import { GoogleGenAI, ThinkingLevel, Type } from '@google/genai';

dotenv.config({ path: new URL('../.env', import.meta.url).pathname });

const apiKey = process.env.VITE_GEMINI_API_KEY;
const model = process.env.VITE_GEMINI_API_MODEL || "gemini-2.0-flash-exp";
const thinking = process.env.VITE_GEMINI_API_THINKING_LEVEL || 'MINIMAL';

if (!apiKey) {
  console.error('VITE_GEMINI_API_KEY is missing in .env');
  process.exit(2);
}

async function stripMarkdownJson(value) {
  const trimmed = String(value).trim();
  const fenced = trimmed.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/i);
  if (fenced) return fenced[1].trim();
  const firstBrace = trimmed.indexOf('{');
  const lastBrace = trimmed.lastIndexOf('}');
  if (firstBrace >= 0 && lastBrace > firstBrace) return trimmed.slice(firstBrace, lastBrace + 1);
  return trimmed;
}

(async () => {
  try {
    const ai = new GoogleGenAI({ apiKey });

    const systemInstruction = `You are Joyful AI. Return only valid JSON with this shape:\n{\n  \"files\": [ { \"path\": \"index.html\", \"action\": \"create\", \"content\": \"...\" } ],\n  \"summary\": \"brief summary\",\n  \"nextSteps\": [\"step\"]\n}\nDo not wrap JSON in markdown.`;

    const userPrompt = `Create a minimal index.html file for a tiny landing page. Respond using only the JSON schema requested by system instruction.`;

    const response = await ai.models.generateContentStream({
      model,
      config: {
        responseMimeType: "text/plain",
        systemInstruction,
      },
      contents: [
        {
          role: 'user',
          parts: [{ text: userPrompt }],
        },
      ],
    });

    let text = '';
    for await (const chunk of response) {
      text += chunk.text || '';
    }

    console.log('\n--- Raw model output ---\n');
    console.log(text);

    const jsonText = await stripMarkdownJson(text);
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
