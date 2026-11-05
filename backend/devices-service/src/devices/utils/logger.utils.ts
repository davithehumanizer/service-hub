import * as fs from 'fs';
import * as path from 'path';

export interface ImportStats {
  total: number;
  success: number;
  updated: number;
  skipped: number;
  brandRestricted: number;
  errors: number;
  icecatApiCalls: number;
  errorDetails: Array<{ productId: string; ean: string; error: string }>;
}

/**
 * Simple file-based logger for import operations
 */
export class ImportLogger {
  private logFile: string;
  private stats: ImportStats;
  private startTime: number;

  constructor(logDir?: string) {
    const resolvedLogDir = logDir || path.join(process.cwd(), 'logs');
    if (!fs.existsSync(resolvedLogDir)) {
      fs.mkdirSync(resolvedLogDir, { recursive: true });
    }

    const timestamp = new Date()
      .toISOString()
      .replace(/[:.]/g, '-')
      .split('T')[0];
    this.logFile = path.join(resolvedLogDir, `import_${timestamp}.log`);
    this.stats = {
      total: 0,
      success: 0,
      updated: 0,
      skipped: 0,
      brandRestricted: 0,
      errors: 0,
      icecatApiCalls: 0,
      errorDetails: [],
    };
    this.startTime = Date.now();

    this.log('INFO', 'Logger initialized', `Log file: ${this.logFile}`);
  }

  log(level: string, message: string, details = ''): void {
    const timestamp = new Date().toISOString();
    const logLine = `[${timestamp}] [${level}] ${message}${details ? ' - ' + details : ''}\n`;

    // Write to file
    fs.appendFileSync(this.logFile, logLine, 'utf8');

    // Also log to console
    console.log(`[${level}] ${message}${details ? ' - ' + details : ''}`);
  }

  incrementIcecatApiCalls(): void {
    this.stats.icecatApiCalls++;
  }

  incrementBrandRestricted(): void {
    this.stats.brandRestricted++;
  }

  logSuccess(deviceId: string, ean: string, action = 'CREATED'): void {
    this.stats.total++;
    if (action === 'CREATED') {
      this.stats.success++;
    } else if (action === 'UPDATED') {
      this.stats.updated++;
    } else if (action === 'SKIPPED') {
      this.stats.skipped++;
    }
    this.log(
      'SUCCESS',
      `${action}: Device ${deviceId}`,
      `EAN: ${ean || 'N/A'}`,
    );
  }

  logError(productId: string, ean: string, error: Error | string): void {
    this.stats.total++;
    this.stats.errors++;
    const errorMsg =
      typeof error === 'string' ? error : error.message || String(error);
    this.stats.errorDetails.push({ productId, ean, error: errorMsg });
    this.log(
      'ERROR',
      `Failed to process product ${productId}`,
      `EAN: ${ean || 'N/A'}, Error: ${errorMsg}`,
    );
  }

  getElapsedTime(): string {
    const elapsed = Date.now() - this.startTime;
    const seconds = Math.floor(elapsed / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);

    if (hours > 0) {
      return `${hours}h ${minutes % 60}m ${seconds % 60}s`;
    } else if (minutes > 0) {
      return `${minutes}m ${seconds % 60}s`;
    } else {
      return `${seconds}s`;
    }
  }

  logSummary(interrupted = false): void {
    const elapsedTime = this.getElapsedTime();
    const summary = `
========================================
${interrupted ? 'IMPORT INTERRUPTED (Ctrl+C)' : 'IMPORT SUMMARY'}
========================================
Execution Time: ${elapsedTime}
Icecat API Calls: ${this.stats.icecatApiCalls}
----------------------------------------
Total Processed: ${this.stats.total}
Successful Creates: ${this.stats.success}
Successful Updates: ${this.stats.updated}
Skipped (No Changes): ${this.stats.skipped}
Brand Restricted: ${this.stats.brandRestricted}
Errors: ${this.stats.errors}
========================================
`;

    fs.appendFileSync(this.logFile, summary, 'utf8');
    console.log(summary);

    if (this.stats.errorDetails.length > 0) {
      const errorSummary =
        '\nError Details:\n' +
        this.stats.errorDetails
          .map(
            (e) =>
              `  - Product ${e.productId} (EAN: ${e.ean || 'N/A'}): ${e.error}`,
          )
          .join('\n') +
        '\n';
      fs.appendFileSync(this.logFile, errorSummary, 'utf8');
      console.log(errorSummary);
    }
  }

  getStats(): ImportStats {
    return { ...this.stats };
  }
}
