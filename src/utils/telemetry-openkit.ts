import { OpenKitBuilder, OpenKit, Session } from '@dynatrace/openkit-js';
import * as os from 'os';
import * as crypto from 'crypto';
import { getPackageJsonVersion } from './version';

export interface Telemetry {
  trackMcpServerStart(): Promise<void>;
  trackMcpToolUsage(toolName: string, success: boolean, duration?: number): Promise<void>;
  trackError(error: Error, context?: string): Promise<void>;
  shutdown(): Promise<void>;
}

/**
 * Based on https://docs.dynatrace.com/docs/ingest-from/extend-dynatrace/openkit/instrument-your-application-using-dynatrace-openkit#openkit-basic-sample--javascript
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
   * Track Server Start
   * @returns nothing
   */
  async trackMcpServerStart(): Promise<void> {
    if (!this.isEnabled) return;

    await this.initPromise;
    if (!this.session) return;

    try {
      const action = this.session.enterAction('mcp_server_start');
      action.reportEvent('server_started');
      action.reportValue('version', getPackageJsonVersion());
      action.reportValue('node_version', process.version);
      action.reportValue('platform', process.platform);
      action.leaveAction();
    } catch (error) {
      console.warn('Failed to track server start:', error);
    }
  }

  /**
   * Track Tool Usage
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
      const action = this.session.enterAction(`tool_${toolName}`);
      action.reportEvent(success ? 'tool_success' : 'tool_error');
      action.reportValue('tool_name', toolName);
      action.reportValue('success', success ? 'true' : 'false');

      if (duration !== undefined) {
        action.reportValue('duration_ms', duration);
      }

      action.leaveAction();
    } catch (error) {
      console.warn('Failed to track tool usage:', error);
    }
  }

  /**
   * Track Errors
   * @param error error message to be tracked
   * @param context
   * @returns nothing
   */
  async trackError(error: Error, context?: string): Promise<void> {
    if (!this.isEnabled) return;

    await this.initPromise;
    if (!this.session) return;

    try {
      const action = this.session.enterAction('error_occurred');
      // reportError expects name and code, so we'll use error name and a generic error code
      action.reportError(error.name || 'Error', 500);

      if (context) {
        action.reportValue('error_context', context);
      }

      action.reportValue('error_message', error.message);
      if (error.stack) {
        action.reportValue('error_stack', error.stack.substring(0, 1000)); // Limit stack trace length
      }
      action.leaveAction();
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
