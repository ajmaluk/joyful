import type { AgentPlanStep, AgentToolTrace, AIGenerationResponse, ProjectMemorySnapshot } from '@/types';
import type { ContextFileNode } from '@/services/skills';

function now() {
  return new Date().toISOString();
}

function createTrace(
  tool: AgentToolTrace['tool'],
  label: string,
  detail?: string,
  target?: string,
  status: AgentToolTrace['status'] = 'done',
): AgentToolTrace {
  const timestamp = now();
  return {
    id: `trace_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    tool,
    label,
    status,
    target,
    detail,
    startedAt: timestamp,
    endedAt: status === 'running' || status === 'pending' ? undefined : timestamp,
  };
}

export function buildProjectMemorySnapshot(
  selectedSkills: string[],
  contextGraph: ContextFileNode[],
  response?: AIGenerationResponse,
): ProjectMemorySnapshot {
  const sandboxIssues = response?.metadata?.sandboxResults
    ?.filter(result => result.status === 'error')
    .map(result => `${result.command}: ${(result.stderr || result.stdout || 'failed').trim().slice(0, 160)}`) || [];

  const recentDecisions = [
    contextGraph.length > 0 ? `Used ranked context: ${contextGraph.slice(0, 4).map(node => node.path).join(', ')}` : 'Started from an empty project.',
    response?.metadata?.estimatedComplexity ? `Complexity: ${response.metadata.estimatedComplexity}` : '',
    response?.patches?.length ? `Preferred ${response.patches.length} targeted patch operation(s).` : '',
  ].filter(Boolean);

  return {
    selectedSkills,
    contextFiles: contextGraph.map(node => node.path),
    recentDecisions,
    knownIssues: sandboxIssues,
  };
}

export function buildAgentPlanFromContext(
  prompt: string,
  contextGraph: ContextFileNode[],
  selectedSkills: string[],
  hasExistingFiles: boolean,
): AgentPlanStep[] {
  const complex = prompt.length > 220 || /complex|dashboard|app|auth|database|workflow|kanban|crm|commerce|booking|analytics|multi[- ]page/i.test(prompt);
  return [
    {
      id: 'understand',
      title: 'Understand request',
      status: 'done',
      detail: complex ? 'Classified as a complex build/change request' : 'Classified as a focused build/change request',
    },
    {
      id: 'context',
      title: hasExistingFiles ? 'Inspect project context' : 'Prepare project scaffold',
      status: 'done',
      detail: contextGraph.length ? contextGraph.slice(0, 3).map(node => node.path).join(', ') : 'No existing files',
    },
    {
      id: 'skills',
      title: 'Activate builder skills',
      status: selectedSkills.length ? 'done' : 'pending',
      detail: selectedSkills.slice(0, 4).join(', '),
    },
    {
      id: 'implementation',
      title: 'Generate targeted file operations',
      status: 'pending',
      detail: hasExistingFiles ? 'Prefer patches and minimal rewrites' : 'Create a complete runnable React/Vite app',
    },
    {
      id: 'verify',
      title: 'Validate and repair',
      status: 'pending',
      detail: 'Run sandbox checks and surface issues for repair',
    },
  ];
}

export function buildAgentToolTrace(
  selectedSkills: string[],
  contextGraph: ContextFileNode[],
  response: AIGenerationResponse,
): AgentToolTrace[] {
  const trace: AgentToolTrace[] = [
    createTrace('select_skills', 'Selected builder skills', selectedSkills.join(', ') || 'Default builder skills'),
    createTrace(
      'rank_context',
      'Ranked project context',
      contextGraph.length ? contextGraph.map(node => `${node.path} (${node.reason})`).join('; ') : 'No existing files',
    ),
  ];

  for (const node of contextGraph.slice(0, 8)) {
    trace.push(createTrace('read_file', `Read ${node.path}`, node.reason, node.path));
  }

  for (const step of response.metadata?.agentPlan || []) {
    trace.push(createTrace('plan', step.title, step.detail, undefined, step.status === 'error' ? 'error' : 'done'));
  }

  for (const patch of response.patches || []) {
    const range = patch.lineStart ? `lines ${patch.lineStart}-${patch.lineEnd ?? patch.lineStart}` : 'exact text patch';
    trace.push(createTrace('apply_patch', `Patch ${patch.path}`, patch.reason || range, patch.path));
  }

  for (const file of response.files || []) {
    const tool = file.action === 'delete' ? 'delete_file' : file.action === 'modify' ? 'write_file' : 'write_file';
    const label = file.action === 'delete' ? `Delete ${file.path}` : file.action === 'modify' ? `Update ${file.path}` : `Create ${file.path}`;
    trace.push(createTrace(tool, label, file.action === 'modify' ? 'Full file operation' : undefined, file.path));
  }

  for (const result of response.metadata?.sandboxResults || []) {
    trace.push(createTrace(
      'run_command',
      `Run ${result.command}`,
      (result.stderr || result.stdout || '').trim().slice(0, 180),
      result.command,
      result.status,
    ));
  }

  if (response.metadata?.repaired) {
    trace.push(createTrace('repair', 'Applied repair pass', 'Provider response was repaired before final output'));
  }

  const failedChecks = response.metadata?.sandboxResults?.filter(result => result.status === 'error').length || 0;
  trace.push(createTrace(
    'validate_preview',
    failedChecks ? 'Validation needs review' : 'Validation completed',
    failedChecks ? `${failedChecks} check(s) failed` : 'No blocking sandbox errors reported',
    undefined,
    failedChecks ? 'error' : 'done',
  ));

  return trace;
}
