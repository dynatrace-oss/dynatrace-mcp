import { _OAuthHttpClient } from "@dynatrace-sdk/http-client";

// TypeScript interfaces based on OpenAPI spec
export interface AvailableSkillsResponse {
  skills: SkillType[];
}

export type SkillType = "conversation" | "nl2dql" | "dql2nl";

export type Status = "SUCCESSFUL" | "SUCCESSFUL_WITH_WARNINGS" | "FAILED";

export interface Nl2DqlRequest {
  text: string;
}

export interface Nl2DqlResponse {
  dql: string;
  messageToken: string;
  status: Status;
  metadata?: Metadata;
}

export interface Dql2NlRequest {
  dql: string;
}

export interface Dql2NlResponse {
  summary: string;
  explanation: string;
  messageToken: string;
  status: Status;
  metadata?: Metadata;
}

export interface ConversationRequest {
  text: string;
  context?: ConversationContext[];
  annotations?: Record<string, string>;
  state?: State;
}

export interface ConversationResponse {
  text: string;
  messageToken: string;
  state: State;
  metadata: MetadataWithSource;
  status: Status;
}

export interface ConversationContext {
  type: "supplementary" | "document-retrieval" | "instruction";
  value: string;
}

export interface State {
  version?: string;
  conversationId?: string;
  skillName?: string;
  history?: Array<{
    role: string;
    text: string;
    supplementary?: string | null;
  }>;
}

export interface Metadata {
  notifications?: Notification[];
}

export interface MetadataWithSource extends Metadata {
  sources?: SourceDocument[];
}

export interface Notification {
  severity?: string;
  notificationType?: string;
  message?: string;
}

export interface SourceDocument {
  title?: string;
  url?: string;
  type?: string;
}

export interface Nl2DqlFeedbackRequest {
  messageToken: string;
  origin: string;
  feedback: Nl2DqlFeedback;
  userQuery: string;
  queryExplanation?: string;
  generatedDql?: string;
}

export interface Nl2DqlFeedback {
  type: "positive" | "negative";
  text?: string;
  category?: string;
  improvement?: Nl2DqlImprovedSummary;
}

export interface Nl2DqlImprovedSummary {
  text: string;
  confirmation: boolean;
}

export interface Dql2NlFeedbackRequest {
  messageToken: string;
  origin: string;
  feedback: Dql2NlFeedback;
  userQuery: string;
  queryExplanation?: string;
  generatedDql?: string;
}

export interface Dql2NlFeedback {
  type: "positive" | "negative";
  text?: string;
  category?: string;
  improvement?: Dql2NlImprovedSummary;
}

export interface Dql2NlImprovedSummary {
  text: string;
  confirmation: boolean;
}

export interface ConversationFeedbackRequest {
  messageToken: string;
  origin: string;
  feedback: ConversationFeedback;
  userPrompt?: string;
  copilotResponse?: string;
  sources?: string[];
}

export interface ConversationFeedback {
  type: "positive" | "negative";
  text?: string;
  category?: string;
  improvement?: ConversationImprovedSummary;
}

export interface ConversationImprovedSummary {
  text: string;
  confirmation: boolean;
}

// API Functions
export const getAvailableSkills = async (dtClient: _OAuthHttpClient): Promise<AvailableSkillsResponse> => {
  const response = await dtClient.request({
    method: 'GET',
    url: '/platform/davis/copilot/v0.2/skills',
    headers: {
      'Accept': 'application/json'
    }
  });
  
  return response.json();
};

export const generateDqlFromNaturalLanguage = async (
  dtClient: _OAuthHttpClient, 
  text: string
): Promise<Nl2DqlResponse> => {
  const request: Nl2DqlRequest = { text };
  
  const response = await dtClient.request({
    method: 'POST',
    url: '/platform/davis/copilot/v0.2/skills/nl2dql:generate',
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json'
    },
    body: JSON.stringify(request)
  });
  
  return response.json();
};

export const explainDqlInNaturalLanguage = async (
  dtClient: _OAuthHttpClient, 
  dql: string
): Promise<Dql2NlResponse> => {
  const request: Dql2NlRequest = { dql };
  
  const response = await dtClient.request({
    method: 'POST',
    url: '/platform/davis/copilot/v0.2/skills/dql2nl:explain',
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json'
    },
    body: JSON.stringify(request)
  });
  
  return response.json();
};

export const chatWithDavisCopilot = async (
  dtClient: _OAuthHttpClient, 
  text: string,
  context?: ConversationContext[],
  annotations?: Record<string, string>,
  state?: State
): Promise<ConversationResponse> => {
  const request: ConversationRequest = { 
    text, 
    context, 
    annotations, 
    state 
  };
  
  const response = await dtClient.request({
    method: 'POST',
    url: '/platform/davis/copilot/v0.2/skills/conversations:message',
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json'
    },
    body: JSON.stringify(request)
  });
  
  return response.json();
};

export const submitNl2DqlFeedback = async (
  dtClient: _OAuthHttpClient,
  feedbackRequest: Nl2DqlFeedbackRequest
): Promise<void> => {
  await dtClient.request({
    method: 'POST',
    url: '/platform/davis/copilot/v0.2/skills/nl2dql:feedback',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(feedbackRequest)
  });
};

export const submitDql2NlFeedback = async (
  dtClient: _OAuthHttpClient,
  feedbackRequest: Dql2NlFeedbackRequest
): Promise<void> => {
  await dtClient.request({
    method: 'POST',
    url: '/platform/davis/copilot/v0.2/skills/dql2nl:feedback',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(feedbackRequest)
  });
};

export const submitConversationFeedback = async (
  dtClient: _OAuthHttpClient,
  feedbackRequest: ConversationFeedbackRequest
): Promise<void> => {
  await dtClient.request({
    method: 'POST',
    url: '/platform/davis/copilot/v0.2/skills/conversations:feedback',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(feedbackRequest)
  });
}; 