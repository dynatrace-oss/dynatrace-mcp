'use strict';
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
Object.defineProperty(exports, '__esModule', { value: true });
exports.chatWithDavisCopilot =
  exports.explainDqlInNaturalLanguage =
  exports.generateDqlFromNaturalLanguage =
  exports.isDavisCopilotSkillAvailable =
  exports.DAVIS_COPILOT_DOCS =
    void 0;
const client_davis_copilot_1 = require('@dynatrace-sdk/client-davis-copilot');
// Documentation links for Davis Copilot
exports.DAVIS_COPILOT_DOCS = {
  ENABLE_COPILOT:
    'https://docs.dynatrace.com/docs/discover-dynatrace/platform/davis-ai/copilot/copilot-getting-started#enable-davis-copilot',
};
/**
 * Check if a specific Davis Copilot skill is available
 * Returns true if the skill is available, false otherwise
 */
const isDavisCopilotSkillAvailable = async (dtClient, skill) => {
  try {
    const client = new client_davis_copilot_1.PublicClient(dtClient);
    const response = await client.listAvailableSkills();
    const availableSkills = response.skills || [];
    return availableSkills.includes(skill);
  } catch (error) {
    // If Davis Copilot is not enabled or any other error occurs, return false
    return false;
  }
};
exports.isDavisCopilotSkillAvailable = isDavisCopilotSkillAvailable;
/**
 * Generate DQL from natural language
 * Converts plain English descriptions into powerful Dynatrace Query Language (DQL) statements.
 * DQL is the most powerful way to query any data in Dynatrace, including problem events,
 * security issues, logs, metrics, spans, and custom data.
 */
const generateDqlFromNaturalLanguage = async (dtClient, text) => {
  const client = new client_davis_copilot_1.PublicClient(dtClient);
  return await client.nl2dql({
    body: { text },
  });
};
exports.generateDqlFromNaturalLanguage = generateDqlFromNaturalLanguage;
/**
 * Explain DQL in natural language
 * Provides plain English explanations of complex DQL queries.
 * Helps users understand what powerful DQL statements do, including
 * queries for problem events, security issues, and performance metrics.
 */
const explainDqlInNaturalLanguage = async (dtClient, dql) => {
  const client = new client_davis_copilot_1.PublicClient(dtClient);
  return await client.dql2nl({
    body: { dql },
  });
};
exports.explainDqlInNaturalLanguage = explainDqlInNaturalLanguage;
const chatWithDavisCopilot = async (dtClient, text, context, annotations, state) => {
  const client = new client_davis_copilot_1.PublicClient(dtClient);
  const response = await client.recommenderConversation({
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
exports.chatWithDavisCopilot = chatWithDavisCopilot;
