/**
 * Davis CoPilot API Integration
 *
 * This module provides access to Davis CoPilot AI capabilities including:
 * - Natural Language to DQL conversion
 * - DQL explanation in plain English
 * - AI-powered conversation assistance
 * - Feedback submission for continuous improvement
 *
 * Note: While Davis CoPilot AI is generally available (GA),
 * the Davis CoPilot APIs are currently in preview.
 * For more information: https://dt-url.net/copilot-community
 *
 * DQL (Dynatrace Query Language) is the most powerful way to query any data
 * in Dynatrace, including problem events, security issues, logs, metrics, and spans.
 */

import { HttpClient } from '@dynatrace-sdk/http-client';
import {
  PublicClient,
  Nl2DqlResponse,
  Dql2NlResponse,
  ConversationResponse,
  ConversationContext,
  State,
  RecommenderResponse,
} from '@dynatrace-sdk/client-davis-copilot';

// Re-export types that are used externally
export type { Dql2NlResponse };

// Documentation links for Davis Copilot
export const DAVIS_COPILOT_DOCS = {
  ENABLE_COPILOT:
    'https://docs.dynatrace.com/docs/discover-dynatrace/platform/davis-ai/copilot/copilot-getting-started#enable-davis-copilot',
} as const;

/**
 * Check if a specific Davis Copilot skill is available
 * Returns true if the skill is available, false otherwise
 */
export const isDavisCopilotSkillAvailable = async (dtClient: HttpClient, skill: string): Promise<boolean> => {
  try {
    const client = new PublicClient(dtClient);
    const response = await client.listAvailableSkills();
    const availableSkills = response.skills || [];
    return availableSkills.includes(skill as any);
  } catch (error: any) {
    // If Davis Copilot is not enabled or any other error occurs, return false
    return false;
  }
};

/**
 * Generate DQL from natural language
 * Converts plain English descriptions into powerful Dynatrace Query Language (DQL) statements.
 * DQL is the most powerful way to query any data in Dynatrace, including problem events,
 * security issues, logs, metrics, spans, and custom data.
 */
export const generateDqlFromNaturalLanguage = async (dtClient: HttpClient, text: string): Promise<Nl2DqlResponse> => {
  const client = new PublicClient(dtClient);

  return await client.nl2dql({
    body: { text },
  });
};

/**
 * Explain DQL in natural language
 * Provides plain English explanations of complex DQL queries.
 * Helps users understand what powerful DQL statements do, including
 * queries for problem events, security issues, and performance metrics.
 */
export const explainDqlInNaturalLanguage = async (dtClient: HttpClient, dql: string): Promise<Dql2NlResponse> => {
  const client = new PublicClient(dtClient);

  return await client.dql2nl({
    body: { dql },
  });
};

export const chatWithDavisCopilot = async (
  dtClient: HttpClient,
  text: string,
  context?: ConversationContext[],
  annotations?: Record<string, string>,
  state?: State,
): Promise<ConversationResponse> => {
  const client = new PublicClient(dtClient);

  const response: RecommenderResponse = await client.recommenderConversation({
    body: {
      text,
      context,
      annotations,
      state,
    },
  });

  // Type guard: RecommenderResponse is ConversationResponse | EventArray
  // In practice, the SDK defaults to non-streaming and returns ConversationResponse
  if (Array.isArray(response)) {
    throw new Error(
      'Unexpected streaming response format. Please raise an issue at https://github.com/dynatrace-oss/dynatrace-mcp/issues.',
    );
  }

  return response;
};
