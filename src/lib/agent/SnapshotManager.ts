import { virtualFS } from '@/lib/vfs/VirtualFileSystem';
import { FileSummarizer } from './FileSummarizer';
import { agentEventBus } from './eventBus';

export interface Snapshot {
  id: string;
  projectId: string;
  label: string;
  reason: string;
  timestamp: number;
  fileCount: number;
  totalSize: number;
  fileHashes: Record<string, string>;
  fileContents: Record<string, string>;
  summary: string;
}

function generateId(): string {
  const ts = Date.now().toString(36);
  const rand = Math.random().toString(36).slice(2, 8);
  return `snap-${ts}-${rand}`;
}

export class SnapshotManager {
  private summarizer = new FileSummarizer();

  async createSnapshot(projectId: string, label: string, reason: string): Promise<Snapshot> {
    const allFiles = await virtualFS.getAllFiles();
    const fileHashes: Record<string, string> = {};
    const fileContents: Record<string, string> = {};
    let totalSize = 0;

    for (const file of allFiles) {
      const hash = this.summarizer.computeContentHash(file.content);
      fileHashes[file.path] = hash;
      fileContents[file.path] = file.content;
      totalSize += file.content.length;
    }

    const snapshot: Snapshot = {
      id: generateId(),
      projectId,
      label,
      reason,
      timestamp: Date.now(),
      fileCount: allFiles.length,
      totalSize,
      fileHashes,
      fileContents,
      summary: `Snapshot "${label}": ${allFiles.length} files, ${(totalSize / 1024).toFixed(1)}KB — ${reason}`,
    };

    const existing = (await this.getKey('snapshots', projectId)) as Snapshot[] | undefined;
    const snapshots: Snapshot[] = existing || [];

    // Store content separately to keep snapshots list lightweight
    await virtualFS.setMeta(`snapshot_content:${snapshot.id}`, fileContents);
    const contentless = { ...snapshot, fileContents: {} };
    snapshots.push(contentless);
    await virtualFS.setMeta(`snapshots:${projectId}`, snapshots);

    const index = (await virtualFS.getMeta('snapshot_projects_index')) as string[] | undefined;
    const projectsIndex: string[] = index || [];
    if (!projectsIndex.includes(projectId)) {
      projectsIndex.push(projectId);
      await virtualFS.setMeta('snapshot_projects_index', projectsIndex);
    }

    agentEventBus.emit({
      type: 'snapshot:created',
      snapshotId: snapshot.id,
      label: snapshot.label,
    });

    return snapshot;
  }

  async restoreSnapshot(snapshotId: string): Promise<void> {
    const { projectId } = await this.findSnapshotProject(snapshotId);
    if (!projectId) throw new Error(`Snapshot not found: ${snapshotId}`);

    const snapshots = (await virtualFS.getMeta(`snapshots:${projectId}`)) as Snapshot[] | undefined;
    const snapshot = snapshots?.find(s => s.id === snapshotId);
    if (!snapshot) throw new Error(`Snapshot not found: ${snapshotId}`);

    const fileContents = (await virtualFS.getMeta(`snapshot_content:${snapshotId}`)) as Record<string, string> | undefined;
    if (!fileContents) throw new Error(`Snapshot content not found: ${snapshotId}`);

    const existingFiles = await virtualFS.getAllFiles();

    // Delete files that exist currently but not in snapshot
    for (const existing of existingFiles) {
      if (!fileContents[existing.path]) {
        try {
          await virtualFS.deleteFile(existing.path);
        } catch {
          // skip if file no longer exists
        }
      }
    }

    // Write all snapshot files
    for (const [path, content] of Object.entries(fileContents)) {
      await virtualFS.writeFile(path, content);
    }

    agentEventBus.emit({
      type: 'snapshot:restored',
      snapshotId: snapshot.id,
      label: snapshot.label,
    });
  }

  async listSnapshots(projectId: string): Promise<Snapshot[]> {
    const snapshots = (await virtualFS.getMeta(`snapshots:${projectId}`)) as Snapshot[] | undefined;
    return snapshots || [];
  }

  async deleteSnapshot(snapshotId: string): Promise<void> {
    const { projectId } = await this.findSnapshotProject(snapshotId);
    if (!projectId) return;

    const snapshots = (await virtualFS.getMeta(`snapshots:${projectId}`)) as Snapshot[] | undefined;
    if (!snapshots) return;

    const filtered = snapshots.filter(s => s.id !== snapshotId);
    await virtualFS.setMeta(`snapshots:${projectId}`, filtered);
    await virtualFS.setMeta(`snapshot_content:${snapshotId}`, null);
  }

  async getSnapshot(snapshotId: string): Promise<Snapshot | undefined> {
    const { snapshot } = await this.findSnapshotProject(snapshotId);
    if (!snapshot) return undefined;

    // Load the content back
    const fileContents = (await virtualFS.getMeta(`snapshot_content:${snapshotId}`)) as Record<string, string> | undefined;
    return { ...snapshot, fileContents: fileContents || {} };
  }

  shouldCreateSnapshot(operations: { type: string; files: string[] }[]): boolean {
    if (operations.length === 0) return false;

    const destructiveTypes = new Set([
      'delete', 'rename', 'move', 'replace',
    ]);

    const sensitiveTypes = new Set([
      'delete', 'config', 'template',
    ]);

    let destructiveCount = 0;
    let massEditCount = 0;
    let configChange = false;

    for (const op of operations) {
      if (destructiveTypes.has(op.type)) {
        destructiveCount++;
      }
      if (op.files.length > 3) {
        massEditCount += op.files.length;
      }
      if (sensitiveTypes.has(op.type)) {
        configChange = true;
      }
    }

    if (destructiveCount > 0) return true;
    if (configChange) return true;
    if (massEditCount > 10) return true;

    const totalFiles = operations.reduce((sum, op) => sum + op.files.length, 0);
    if (totalFiles > 5 && destructiveCount > 0) return true;

    return false;
  }

  private async findSnapshotProject(snapshotId: string): Promise<{ projectId: string | null; snapshot: Snapshot | null }> {
    const allKeys = await this.getAllSnapshotProjectIds();
    for (const projectId of allKeys) {
      const snapshots = (await virtualFS.getMeta(`snapshots:${projectId}`)) as Snapshot[] | undefined;
      if (snapshots) {
        const found = snapshots.find(s => s.id === snapshotId);
        if (found) return { projectId, snapshot: found };
      }
    }
    return { projectId: null, snapshot: null };
  }

  private async getAllSnapshotProjectIds(): Promise<string[]> {
    const index = (await virtualFS.getMeta('snapshot_projects_index')) as string[] | undefined;
    return index || [];
  }

  private async getKey(_prefix: string, _projectId: string): Promise<unknown> {
    return virtualFS.getMeta(`snapshots:${_projectId}`);
  }
}

export const snapshotManager = new SnapshotManager();
