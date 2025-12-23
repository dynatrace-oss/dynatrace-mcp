import { isClientRequestError } from '@dynatrace-sdk/shared-errors';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { CallToolResult, ToolAnnotations } from '@modelcontextprotocol/sdk/types.js';
import { z, ZodRawShape } from 'zod';

import { Telemetry } from './telemetry-openkit';
import { getGlobalRateLimiter } from './rate-limiter';
import { handleClientRequestError } from './dynatrace-connection-utils';

/**
 * Creates a tool registration function that wraps tool callbacks with:
 * - Rate limiting
 * - Error handling (including Dynatrace SDK errors)
 * - Telemetry tracking
 *
 * @param server - The MCP server instance
 * @param telemetry - The telemetry instance for tracking
 * @returns A function to register tools with the server
 */
export const createToolWrapper = (server: McpServer, telemetry: Telemetry) => {
  return (
    name: string,
    title: string,
    description: string,
    paramsSchema: ZodRawShape,
    annotations: ToolAnnotations,
    cb: (args: any) => Promise<string>,
  ) => {
    const wrappedCb = async (args: any): Promise<CallToolResult> => {
      // Capture starttime for telemetry
      const startTime = Date.now();

      // Rate limiting check
      const rateLimiter = getGlobalRateLimiter();
      if (!rateLimiter.tryAcquire()) {
        return {
          content: [
            { type: 'text', text: 'Rate limit exceeded: Maximum 5 tool calls per 20 seconds. Please try again later.' },
          ],
          isError: true,
        };
      }

      // track toolcall for telemetry
      let toolCallSuccessful = false;

      try {
        // call the tool
        const response = await cb(args);
        toolCallSuccessful = true;
        return {
          content: [{ type: 'text', text: response }],
        };
      } catch (error: any) {
        // Track error
        telemetry.trackError(error, `tool_${name}`).catch((e) => console.warn('Failed to track error:', e));

        // check if it's an error originating from the Dynatrace SDK / API Gateway and provide an appropriate message to the user
        if (isClientRequestError(error)) {
          return {
            content: [{ type: 'text', text: handleClientRequestError(error) }],
            isError: true,
          };
        }
        // else: We don't know what kind of error happened - best case we can log the error and provide error.message as a tool response
        console.error(error);
        return {
          content: [{ type: 'text', text: `Error: ${error.message}` }],
          isError: true,
        };
      } finally {
        // Track tool usage
        const duration = Date.now() - startTime;
        telemetry
          .trackMcpToolUsage(name, toolCallSuccessful, duration)
          .catch((e) => console.warn('Failed to track tool usage:', e));
      }
    };

    server.registerTool(
      name,
      {
        title: title,
        description: description,
        inputSchema: z.object(paramsSchema),
        annotations: annotations,
      },
      (args: any) => wrappedCb(args),
    );
  };
};

export type ToolRegistrationFn = ReturnType<typeof createToolWrapper>;
