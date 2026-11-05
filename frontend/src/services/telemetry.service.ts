import { v4 as uuidv4 } from 'uuid';

const SESSION_STORAGE_KEY = 'x-session-id';

export class TelemetryService {
  private static instance: TelemetryService;
  private sessionId: string;

  private constructor() {
    this.sessionId = this.getOrCreateSessionId();
  }

  public static getInstance(): TelemetryService {
    if (!TelemetryService.instance) {
      TelemetryService.instance = new TelemetryService();
    }
    return TelemetryService.instance;
  }

  private getOrCreateSessionId(): string {
    const storedSid = sessionStorage.getItem(SESSION_STORAGE_KEY);
    if (storedSid) {
      return storedSid;
    }
    const newSid = uuidv4();
    sessionStorage.setItem(SESSION_STORAGE_KEY, newSid);
    return newSid;
  }

  public getSessionId(): string {
    return this.sessionId;
  }

  public generateTraceId(): string {
    return uuidv4();
  }

  public async logAction(action: string, metadata: object = {}) {
    const payload = {
      action,
      sessionId: this.sessionId,
      traceId: this.generateTraceId(),
      timestamp: new Date().toISOString(),
      metadata,
      url: window.location.href,
      userAgent: navigator.userAgent,
    };

    try {
      // Use fetch to avoid circular dependency with api.ts or interceptor complexity
      // Assuming the API Gateway will have a /logs endpoint
      await fetch(`${process.env.REACT_APP_API_URL || 'http://localhost:3000/api'}/v1/logs`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-session-id': this.sessionId,
          'x-trace-id': payload.traceId,
        },
        body: JSON.stringify(payload),
      });
    } catch (error) {
      console.error('Failed to send log:', error);
    }
  }
}

export const telemetry = TelemetryService.getInstance();
