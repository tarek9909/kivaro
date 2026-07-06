export function createSettingsApi(client) {
  return {
    companyProfile: {
      get: (options) => client.get('/company-profile', options),
      update: (payload, options) => client.patch('/company-profile', payload, options)
    },
    systemSettings: {
      list: (options) => client.get('/settings', options),
      update: (key, payload, options) => client.patch(`/settings/${key}`, payload, options)
    }
  };
}
