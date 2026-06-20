import client from './client';

export const parentService = {
  // Parent's own children (uses /my-children route, not /children which is nurse/admin)
  getMyChildren: async () => {
    const response = await client.get('/my-children');
    return response.data?.data ?? response.data;
  },

  getChild: async (childId) => {
    const response = await client.get(`/my-children/${childId}`);
    return response.data?.data ?? response.data;
  },

  // Missing reports submitted by this parent
  getMyReports: async () => {
    const response = await client.get('/my-reports');
    return response.data?.data ?? response.data;
  },

  reportMissing: async (data) => {
    const response = await client.post('/missing-reports', data);
    return response.data;
  },
};
