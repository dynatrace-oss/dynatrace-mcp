'use strict';
var __createBinding =
  (this && this.__createBinding) ||
  (Object.create
    ? function (o, m, k, k2) {
        if (k2 === undefined) k2 = k;
        var desc = Object.getOwnPropertyDescriptor(m, k);
        if (!desc || ('get' in desc ? !m.__esModule : desc.writable || desc.configurable)) {
          desc = {
            enumerable: true,
            get: function () {
              return m[k];
            },
          };
        }
        Object.defineProperty(o, k2, desc);
      }
    : function (o, m, k, k2) {
        if (k2 === undefined) k2 = k;
        o[k2] = m[k];
      });
var __setModuleDefault =
  (this && this.__setModuleDefault) ||
  (Object.create
    ? function (o, v) {
        Object.defineProperty(o, 'default', { enumerable: true, value: v });
      }
    : function (o, v) {
        o['default'] = v;
      });
var __importStar =
  (this && this.__importStar) ||
  (function () {
    var ownKeys = function (o) {
      ownKeys =
        Object.getOwnPropertyNames ||
        function (o) {
          var ar = [];
          for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
          return ar;
        };
      return ownKeys(o);
    };
    return function (mod) {
      if (mod && mod.__esModule) return mod;
      var result = {};
      if (mod != null)
        for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== 'default') __createBinding(result, mod, k[i]);
      __setModuleDefault(result, mod);
      return result;
    };
  })();
Object.defineProperty(exports, '__esModule', { value: true });
exports.createTelemetry = createTelemetry;
const openkit_js_1 = require('@dynatrace/openkit-js');
const os = __importStar(require('os'));
const crypto = __importStar(require('crypto'));
const version_1 = require('./version');
/**
 * Based on https://github.com/Dynatrace/openkit-js/blob/main/example.md#business-events-capturing
 * Uses BizEvents for telemetry to make data accessible via Grail
 */
class DynatraceMcpTelemetry {
  openKit = null;
  session = null;
  isEnabled;
  initPromise;
  environmentInfo;
  constructor(environmentInfo) {
    this.isEnabled = process.env.DT_MCP_DISABLE_TELEMETRY !== 'true';
    this.environmentInfo = environmentInfo;
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
  async initializeOpenKit(endpointUrl, applicationId, deviceId) {
    try {
      console.error(
        `Connecting Dynatrace Telemetry via ${endpointUrl}. You can disable this by setting DT_MCP_DISABLE_TELEMETRY=true.`,
      );
      this.openKit = new openkit_js_1.OpenKitBuilder(endpointUrl, applicationId, parseInt(deviceId, 10))
        .withApplicationVersion((0, version_1.getPackageJsonVersion)())
        .withOperatingSystem(`${os.platform()} ${os.release()}`)
        .withManufacturer('Dynatrace-OSS')
        .withModelId('Dynatrace-MCP-Server')
        .build();
      return new Promise((resolve) => {
        const timeoutInMilliseconds = 10 * 1000; // 10 seconds timeout
        this.openKit.waitForInit((success) => {
          if (success) {
            this.session = this.openKit.createSession();
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
  generateDeviceId() {
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
  getCommonAttributes() {
    return {
      version: (0, version_1.getPackageJsonVersion)(),
      node_version: process.version,
      platform: process.platform,
      os_type: os.type(),
      os_release: os.release(),
      environment_id: this.environmentInfo.environmentId,
      stage: this.environmentInfo.stage,
    };
  }
  /**
   * Track Server Start using BizEvents
   * @returns nothing
   */
  async trackMcpServerStart() {
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
  async trackMcpClientInitialization(clientName, clientVersion) {
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
  async trackMcpToolUsage(toolName, success, duration) {
    if (!this.isEnabled) return;
    await this.initPromise;
    if (!this.session) return;
    try {
      const eventData = {
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
  async trackError(error, context) {
    if (!this.isEnabled) return;
    await this.initPromise;
    if (!this.session) return;
    try {
      const eventData = {
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
  async shutdown() {
    if (!this.isEnabled) return;
    await this.initPromise;
    try {
      if (this.session) {
        this.session.end();
      }
      if (this.openKit) {
        await new Promise((resolve) => {
          this.openKit.shutdown(() => resolve());
        });
      }
    } catch (error) {
      console.warn('Failed to shutdown usage tracking:', error);
    }
  }
}
class NoOpTelemetry {
  async trackMcpServerStart() {}
  async trackMcpClientInitialization() {}
  async trackMcpToolUsage() {}
  async trackError() {}
  async shutdown() {}
}
function createTelemetry(environmentInfo) {
  try {
    return new DynatraceMcpTelemetry(environmentInfo);
  } catch (e) {
    // Failed to initialize (unexpected). Log concise message without stack trace spam.
    console.error('Dynatrace Telemetry initialization failed:', e.message);
    // fallback to NoOp Telemetry
    return new NoOpTelemetry();
  }
}
