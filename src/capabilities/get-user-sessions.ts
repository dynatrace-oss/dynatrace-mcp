// Get user sessions and user experience data from Dynatrace
export interface UserSession {
  sessionId: string;
  userId?: string;
  startTime: number;
  endTime?: number;
  duration: number;
  userType: string;
  applicationId: string;
  applicationName: string;
  pageViews: number;
  actions: number;
  errors: number;
  apdexScore: number;
}

export async function getUserSessions(dtClient: any, applicationId?: string, limit: number = 10): Promise<UserSession[]> {
  const url = applicationId 
    ? `/api/v2/userSessions?applicationId=${applicationId}&limit=${limit}`
    : `/api/v2/userSessions?limit=${limit}`;
    
  const response = await dtClient.send({
    url,
    method: 'GET',
    headers: {
      'Accept': 'application/json',
    },
  });

  const data = await response.body('json');
  
  return data.sessions?.map((session: any) => ({
    sessionId: session.sessionId,
    userId: session.userId,
    startTime: session.startTime,
    endTime: session.endTime,
    duration: session.duration,
    userType: session.userType,
    applicationId: session.applicationId,
    applicationName: session.applicationName,
    pageViews: session.pageViews,
    actions: session.actions,
    errors: session.errors,
    apdexScore: session.apdexScore
  })) || [];
} 