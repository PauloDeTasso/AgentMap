import * as fs from 'fs';
import * as path from 'path';

export interface TempFile {
  path: string;
  size: number;
  createdAt: Date;
  lastAccessed: Date;
  type: 'file' | 'worktree' | 'cache';
}

export interface CleanupResult {
  removed: string[];
  errors: string[];
  freedBytes: number;
}

const DEFAULT_TEMP_PATTERNS = [
  '**/temp/**',
  '**/.tmp/**',
  '**/tmp/**',
  '**/.cache/**',
  '**/cache/**',
  '**/*.tmp',
  '**/*.temp',
  '**/*.log',
  '**/test-results/**',
  '**/test-output/**',
  '**/.playwright-mcp/**',
  '**/node_modules/.cache/**',
];

const DEFAULT_TTL_DAYS = 7;

export class TempCleanupService {
  private projectRoot: string;
  private tempDir: string;

  constructor(projectRoot: string) {
    this.projectRoot = projectRoot;
    this.tempDir = path.join(projectRoot, 'temp');
    this.ensureTempDir();
  }

  private ensureTempDir(): void {
    if (!fs.existsSync(this.tempDir)) {
      fs.mkdirSync(this.tempDir, { recursive: true });
    }
  }

  listTempFiles(olderThanDays: number = DEFAULT_TTL_DAYS): TempFile[] {
    const files: TempFile[] = [];
    const cutoff = Date.now() - olderThanDays * 24 * 60 * 60 * 1000;

    const scanDir = (dir: string) => {
      if (!fs.existsSync(dir)) return;

      const entries = fs.readdirSync(dir, { withFileTypes: true });
      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);
        const relativePath = path.relative(this.projectRoot, fullPath);

        if (entry.isDirectory()) {
          scanDir(fullPath);
        } else {
          try {
            const stats = fs.statSync(fullPath);
            if (stats.mtimeMs < cutoff) {
              files.push({
                path: relativePath,
                size: stats.size,
                createdAt: stats.birthtime,
                lastAccessed: stats.atime,
                type: this.detectType(relativePath),
              });
            }
          } catch {
            // ignore inaccessible files
          }
        }
      }
    };

    scanDir(this.tempDir);
    return files;
  }

  cleanupTempFiles(olderThanDays: number = DEFAULT_TTL_DAYS): CleanupResult {
    const result: CleanupResult = {
      removed: [],
      errors: [],
      freedBytes: 0,
    };

    const cutoff = Date.now() - olderThanDays * 24 * 60 * 60 * 1000;
    const tempFiles = this.listTempFiles(olderThanDays);

    for (const file of tempFiles) {
      const fullPath = path.join(this.projectRoot, file.path);
      try {
        if (fs.existsSync(fullPath)) {
          const stats = fs.statSync(fullPath);
          fs.rmSync(fullPath, { recursive: true, force: true });
          result.removed.push(file.path);
          result.freedBytes += stats.size;
        }
      } catch (error) {
        result.errors.push(`${file.path}: ${error instanceof Error ? error.message : 'unknown error'}`);
      }
    }

    return result;
  }

  private detectType(filePath: string): TempFile['type'] {
    const lower = filePath.toLowerCase();
    if (lower.includes('worktree') || lower.includes('.kilo/worktrees')) return 'worktree';
    if (lower.includes('cache') || lower.includes('.cache')) return 'cache';
    return 'file';
  }

  getTempDir(): string {
    return this.tempDir;
  }
}
