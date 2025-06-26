// Get maintenance windows from Dynatrace
export interface MaintenanceWindow {
  id: string;
  name: string;
  description?: string;
  startTime: string;
  endTime: string;
  type: string;
  enabled: boolean;
  scope: string[];
}

export async function getMaintenanceWindows(dtClient: any, windowId?: string): Promise<MaintenanceWindow[]> {
  const url = windowId 
    ? `/api/v2/maintenanceWindows/${windowId}`
    : '/api/v2/maintenanceWindows';
    
  const response = await dtClient.send({
    url,
    method: 'GET',
    headers: {
      'Accept': 'application/json',
    },
  });

  const data = await response.body('json');
  
  if (windowId) {
    // Single maintenance window
    return [{
      id: data.id,
      name: data.name,
      description: data.description,
      startTime: data.startTime,
      endTime: data.endTime,
      type: data.type,
      enabled: data.enabled,
      scope: data.scope || []
    }];
  } else {
    // List of maintenance windows
    return data.values?.map((window: any) => ({
      id: window.id,
      name: window.name,
      description: window.description,
      startTime: window.startTime,
      endTime: window.endTime,
      type: window.type,
      enabled: window.enabled,
      scope: window.scope || []
    })) || [];
  }
} 