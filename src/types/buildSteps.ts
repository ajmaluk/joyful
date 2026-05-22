export interface BuildStep {
  id: string;
  type: 'analyze' | 'plan' | 'create' | 'modify' | 'delete' | 'patch' | 'command' | 'preview' | 'validate' | 'done';
  label: string;
  status: 'pending' | 'active' | 'done' | 'error';
  detail?: string;
  timestamp: number;
}

export function createBuildStep(type: BuildStep['type'], label: string, detail?: string): BuildStep {
  return {
    id: `step_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
    type,
    label,
    status: 'pending',
    detail,
    timestamp: Date.now(),
  };
}

export function buildInitialSteps(hasExistingFiles: boolean): BuildStep[] {
  return [
    createBuildStep('analyze', 'Analyzing your request', 'Understanding requirements and context'),
    createBuildStep('plan', 'Planning implementation', hasExistingFiles ? 'Reviewing existing files' : 'Designing project structure'),
    createBuildStep('create', 'Calling AI provider', 'Generating code and file operations'),
    createBuildStep('modify', 'Applying changes', 'Updating project files'),
    createBuildStep('validate', 'Validating in sandbox', 'Checking for errors and compatibility'),
    createBuildStep('preview', 'Refreshing preview', 'Updating live preview'),
  ];
}

export function buildStepsFromResponse(response: { files?: Array<{ path: string; action?: string }>; patches?: Array<{ path: string }>; metadata?: { sandboxCommands?: Array<{ command: string; args?: string[] }> } }): BuildStep[] {
  const steps: BuildStep[] = [];

  const creates = response.files?.filter(f => f.action === 'create') || [];
  const modifies = response.files?.filter(f => f.action === 'modify') || [];
  const deletes = response.files?.filter(f => f.action === 'delete') || [];
  const patches = response.patches || [];

  for (const file of creates) {
    steps.push(createBuildStep('create', `Create ${file.path}`));
  }
  for (const file of modifies) {
    steps.push(createBuildStep('modify', `Update ${file.path}`));
  }
  for (const file of deletes) {
    steps.push(createBuildStep('delete', `Delete ${file.path}`));
  }
  for (const patch of patches) {
    steps.push(createBuildStep('patch', `Patch ${patch.path}`));
  }

  for (const cmd of response.metadata?.sandboxCommands || []) {
    steps.push(createBuildStep('command', `Run ${cmd.command} ${(cmd.args || []).join(' ')}`));
  }

  if (steps.length > 0) {
    steps.push(createBuildStep('preview', 'Refresh preview'));
  }

  return steps;
}
