import { _OAuthHttpClient } from "@dynatrace-sdk/http-client";
import { executeDql } from "./execute-dql";

export interface ChangeEvent {
  eventId: string;
  eventType: string;
  entityId: string;
  entityName: string;
  timestamp: string;
  source: string;
  description: string;
  severity: string;
  tags: Record<string, string>;
}

export interface DeploymentEvent {
  eventId: string;
  deploymentName: string;
  serviceName: string;
  version: string;
  timestamp: string;
  status: string;
  environment: string;
  duration: number;
  affectedEntities: string[];
}

export const getChangeEvents = async (dtClient: _OAuthHttpClient, entityId?: string, timeframe: string = '24h') => {
  const now = new Date();
  const from = new Date(now.getTime() - (timeframe === '24h' ? 24 * 60 * 60 * 1000 : 60 * 60 * 1000));
  
  let dql = `
    fetch events
    | filter event.type in ("CONFIGURATION_CHANGE", "DEPLOYMENT", "CUSTOM_ANNOTATION")
    | filter timestamp >= datetime("${from.toISOString()}")
  `;
  
  if (entityId) {
    dql += ` | filter dt.source_entity == "${entityId}"`;
  }
  
  dql += ` | sort timestamp desc
    | limit 50
  `;
  
  return await executeDql(dtClient, dql);
};

export const getDeploymentEvents = async (dtClient: _OAuthHttpClient, serviceName?: string, timeframe: string = '24h') => {
  const now = new Date();
  const from = new Date(now.getTime() - (timeframe === '24h' ? 24 * 60 * 60 * 1000 : 60 * 60 * 1000));
  
  let dql = `
    fetch events
    | filter event.type == "DEPLOYMENT"
    | filter timestamp >= datetime("${from.toISOString()}")
  `;
  
  if (serviceName) {
    dql += ` | filter event.service.name == "${serviceName}"`;
  }
  
  dql += ` | sort timestamp desc
    | limit 20
  `;
  
  return await executeDql(dtClient, dql);
};

export const getConfigurationChanges = async (dtClient: _OAuthHttpClient, entityId?: string, timeframe: string = '24h') => {
  const now = new Date();
  const from = new Date(now.getTime() - (timeframe === '24h' ? 24 * 60 * 60 * 1000 : 60 * 60 * 1000));
  
  let dql = `
    fetch events
    | filter event.type == "CONFIGURATION_CHANGE"
    | filter timestamp >= datetime("${from.toISOString()}")
  `;
  
  if (entityId) {
    dql += ` | filter dt.source_entity == "${entityId}"`;
  }
  
  dql += ` | sort timestamp desc
    | limit 30
  `;
  
  return await executeDql(dtClient, dql);
};

export const getCustomAnnotations = async (dtClient: _OAuthHttpClient, entityId?: string, timeframe: string = '24h') => {
  const now = new Date();
  const from = new Date(now.getTime() - (timeframe === '24h' ? 24 * 60 * 60 * 1000 : 60 * 60 * 1000));
  
  let dql = `
    fetch events
    | filter event.type == "CUSTOM_ANNOTATION"
    | filter timestamp >= datetime("${from.toISOString()}")
  `;
  
  if (entityId) {
    dql += ` | filter dt.source_entity == "${entityId}"`;
  }
  
  dql += ` | sort timestamp desc
    | limit 20
  `;
  
  return await executeDql(dtClient, dql);
}; 