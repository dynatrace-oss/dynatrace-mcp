import { OpenKitBuilder, OpenKit, Session } from '@dynatrace/openkit-js';
import * as os from 'os';
import * as crypto from 'crypto';
import { getPackageJsonVersion } from './version';

export interface Telemetry {
  trackMcpServerStart(): Promise<void>;
  trackMcpClientInitialization(clientName: string, clientVersion: string): Promise<void>;
  trackMcpToolUsage(toolName: string, success: boolean, duration?: number): Promise<void>;
  trackError(error: Error, context?: string): Promise<void>;
  shutdown(): Promise<void>;
}

/**
 * Based on https://github.com/Dynatrace/openkit-js/blob/main/example.md#business-events-capturing
 * Uses BizEvents for telemetry to make data accessible via Grail
 */
class DynatraceMcpTelemetry implements Telemetry {
  private openKit: OpenKit | null = null;
  private session: Session | null = null;
  private isEnabled: boolean;
  private initPromise: Promise<boolean>;

  constructor() {
    this.isEnabled = process.env.DT_MCP_DISABLE_TELEMETRY !== 'true';

    if (!this.isEnabled) {
      throw new Error('Dynatrace Telemetry is disabled via DT_MCP_DISABLE_TELEMETRY=true');
    }

    // Default configuration for Dynatrace MCP Server Telemetry endpoints (DT Prod Self Mon)
    const applicationId = process.env.DT_MCP_TELEMETRY_APPLICATION_ID || '5e2dbb56-076b-412e-8ffc-7babb7ae7c5d';
    const endpointUrl = process.env.DT_MCP_TELEMETRY_ENDPOINT_URL || 'https://bf96767wvv.bf.dynatrace.com/mbeacon';
    // get anonymized device id
    const deviceId = process.env.DT_MCP_TELEMETRY_DEVICE_ID || this.generateDeviceId();

    this.initPromise = this.initializeOpenKit(endpointUrl, applicationId, deviceId);
  }

  /**
   *
   * @param endpointUrl Dynatrace Endpoint for OpenKit Ingest
   * @param applicationId Application Id for OpenKit Ingest
   * @param deviceId Device or Session ID (should be anonymized)
   * @returns true if initialization was successful, false otherwise
   */
  private async initializeOpenKit(endpointUrl: string, applicationId: string, deviceId: string): Promise<boolean> {
    try {
      console.error(
        `Connecting Dynatrace Telemetry via ${endpointUrl}. You can disable this by setting DT_MCP_DISABLE_TELEMETRY=true.`,
      );

      this.openKit = new OpenKitBuilder(endpointUrl, applicationId, parseInt(deviceId, 10))
        .withApplicationVersion(getPackageJsonVersion())
        .withOperatingSystem(`${os.platform()} ${os.release()}`)
        .withManufacturer('Dynatrace-OSS')
        .withModelId('Dynatrace-MCP-Server')
        .build();

      return new Promise<boolean>((resolve) => {
        const timeoutInMilliseconds = 10 * 1000; // 10 seconds timeout
        this.openKit!.waitForInit((success) => {
          if (success) {
            this.session = this.openKit!.createSession();
          } else {
            console.error('Failed to initialize Dynatrace Telemetry: timeout or connection failed');
            this.isEnabled = false;
          }
          resolve(success);
        }, timeoutInMilliseconds);
      });
    } catch (error) {
      console.error('Failed to initialize Dynatrace Telemetry:', error);
      console.error(
        'If the error persists, please consider disabling telemetry by setting DT_MCP_DISABLE_TELEMETRY=true.',
      );
      this.isEnabled = false;
      return false;
    }
  }

  /**
   * Generates a random device identifier
   * @returns deviceId - a string containing number for OpenKit
   */
  private generateDeviceId(): string {
    // Generate a simple device ID based on hostname and some randomness
    const hostname = os.hostname();
    const random = crypto.randomBytes(8).toString('hex');
    const hash = crypto.createHash('md5').update(`${hostname}-${random}`).digest('hex');
    // Convert to a number (device ID must be a number for OpenKit)
    return parseInt(hash.substring(0, 15), 16).toString();
  }

  /**
   * Get common telemetry attributes for all events
   * @returns common attributes object
   */
  private getCommonAttributes(): Record<string, string> {
    return {
      version: getPackageJsonVersion(),
      node_version: process.version,
      platform: process.platform,
      os_type: os.type(),
      os_release: os.release(),
    };
  }

  /**
   * Track Server Start using BizEvents
   * @returns nothing
   */
  async trackMcpServerStart(): Promise<void> {
    if (!this.isEnabled) return;

    await this.initPromise;
    if (!this.session) return;

    try {
      this.session.sendBizEvent('com.dynatrace-oss.mcp.server-start', {
        'event.name': 'MCP Server Started',
        ...this.getCommonAttributes(),
      });
    } catch (error) {
      console.warn('Failed to track server start:', error);
    }
  }

  /**
   * Track MCP Client Initialization using BizEvents
   * Note: when running in HTTP mode, there might be multiple client-initialization events from multiple clients connecting to the same MCP server
   * @param clientName name of the MCP client (e.g., 'vscode', 'claude-desktop')
   * @param clientVersion version of the MCP client
   * @returns nothing
   */
  async trackMcpClientInitialization(clientName: string, clientVersion: string): Promise<void> {
    if (!this.isEnabled) return;

    await this.initPromise;
    if (!this.session) return;

    try {
      this.session.sendBizEvent('com.dynatrace-oss.mcp.client-initialization', {
        'event.name': 'MCP Client Initialized',
        'client_name': clientName,
        'client_version': clientVersion,
        ...this.getCommonAttributes(),
      });
    } catch (error) {
      console.warn('Failed to track client initialization:', error);
    }
  }

  /**
   * Track Tool Usage using BizEvents
   * @param toolName name of the tool
   * @param success whether or not the tool call was successful
   * @param duration duration of the tool call
   * @returns nothing
   */
  async trackMcpToolUsage(toolName: string, success: boolean, duration?: number): Promise<void> {
    if (!this.isEnabled) return;

    await this.initPromise;
    if (!this.session) return;

    try {
      const eventData: Record<string, string | number | boolean> = {
        'event.name': success ? 'Tool Usage Success' : 'Tool Usage Error',
        'tool_name': toolName,
        'tool_status': success ? 'success' : 'error',
        ...this.getCommonAttributes(),
      };

      if (duration !== undefined) {
        eventData.tool_duration_ms = duration;
      }

      this.session.sendBizEvent('com.dynatrace-oss.mcp.tool-usage', eventData);
    } catch (error) {
      console.warn('Failed to track tool usage:', error);
    }
  }

  /**
   * Track Errors using BizEvents
   * @param error error message to be tracked
   * @param context
   * @returns nothing
   */
  async trackError(error: Error, context?: string): Promise<void> {
    if (!this.isEnabled) return;

    await this.initPromise;
    if (!this.session) return;

    try {
      const eventData: Record<string, string | number> = {
        'event.name': 'MCP Error Occurred',
        'error_name': error.name || 'Error',
        'error_message': error.message,
        'error_code': 500,
        ...this.getCommonAttributes(),
      };

      if (context) {
        eventData.error_context = context;
      }

      if (error.stack) {
        eventData.error_stack = error.stack.substring(0, 1000); // Limit stack trace length
      }

      this.session.sendBizEvent('com.dynatrace-oss.mcp.error', eventData);
    } catch (trackingError) {
      console.warn('Failed to track error:', trackingError);
    }
  }

  async shutdown(): Promise<void> {
    if (!this.isEnabled) return;

    await this.initPromise;

    try {
      if (this.session) {
        this.session.end();
      }
      if (this.openKit) {
        await new Promise<void>((resolve) => {
          this.openKit!.shutdown(() => resolve());
        });
      }
    } catch (error) {
      console.warn('Failed to shutdown usage tracking:', error);
    }
  }
}

class NoOpTelemetry implements Telemetry {
  async trackMcpServerStart(): Promise<void> {}
  async trackMcpClientInitialization(): Promise<void> {}
  async trackMcpToolUsage(): Promise<void> {}
  async trackError(): Promise<void> {}
  async shutdown(): Promise<void> {}
}

export function createTelemetry(): Telemetry {
  try {
    return new DynatraceMcpTelemetry();
  } catch (e) {
    // Failed to initialize (unexpected). Log concise message without stack trace spam.
    console.error('Dynatrace Telemetry initialization failed:', (e as Error).message);
    // fallback to NoOp Telemetry
    return new NoOpTelemetry();
  }
}
