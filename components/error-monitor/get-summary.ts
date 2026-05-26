import { resultSchema, type Line } from './schemas'

export async function getSummary(lines: Line[], _previous: Line[]) {
  const stderrLines = lines.filter(l => l.stream === 'stderr' && l.data.trim())
  if (stderrLines.length === 0) {
    return resultSchema.parse({ shouldBeFixed: false, summary: '' })
  }

  const summary = stderrLines.slice(0, 20).map(l => l.data.trim()).filter(Boolean).join('\n')

  return resultSchema.parse({
    shouldBeFixed: true,
    summary: summary.slice(0, 4000),
  })
}
