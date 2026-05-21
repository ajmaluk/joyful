// Simple test harness for Joyful AI response parsing

function stripMarkdownJson(value) {
  const trimmed = String(value).trim();
  const fenced = trimmed.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/i);
  if (fenced) return fenced[1].trim();
  const firstBrace = trimmed.indexOf('{');
  const lastBrace = trimmed.lastIndexOf('}');
  if (firstBrace >= 0 && lastBrace > firstBrace) return trimmed.slice(firstBrace, lastBrace + 1);
  return trimmed;
}

function normalizeAIResponse(value) {
  if (!value || typeof value !== 'object') throw new Error('AI returned an empty response.');

  const response = value;
  const files = Array.isArray(response.files) ? response.files : [];
  if (files.length === 0) throw new Error('AI did not return any file operations.');

  const normalizedFiles = files
    .filter(file => file && typeof file.path === 'string')
    .map(file => ({
      path: file.path,
      action: file.action === 'delete' || file.action === 'modify' || file.action === 'create' ? file.action : 'modify',
      content: file.action === 'delete' ? undefined : String(file.content || ''),
    }));

  if (normalizedFiles.length === 0) throw new Error('AI returned file operations without valid paths.');

  return {
    files: normalizedFiles,
    summary: typeof response.summary === 'string' ? response.summary : 'AI updated the project files.',
    nextSteps: Array.isArray(response.nextSteps) ? response.nextSteps.map(String).slice(0, 6) : [],
    metadata: response.metadata || {},
  };
}

const samples = [
  "```json\n{\n  \"files\": [ { \"path\": \"index.html\", \"action\": \"create\", \"content\": \"<h1>Hello</h1>\" } ],\n  \"summary\": \"Created index\",\n  \"nextSteps\": [\"Preview\"],\n  \"metadata\": { \"template\": \"portfolio\", \"estimatedComplexity\": \"simple\" }\n}\n```",
  '{ "files":[{"path":"README.md","action":"modify","content":"# README"}], "summary":"Updated README","nextSteps":[] }',
];

for (const [i, sample] of samples.entries()) {
  console.log('\n--- Sample', i + 1, '---');
  try {
    const jsonText = stripMarkdownJson(sample);
    const parsed = JSON.parse(jsonText);
    const normalized = normalizeAIResponse(parsed);
    console.log('Parsed object:');
    console.log(JSON.stringify(normalized, null, 2));
  } catch (err) {
    console.error('Error parsing sample', i + 1, err.message);
  }
}

console.log('\nTest complete.');
