import { clearSession, setAccessToken, setStoredUser } from '../tokenStorage.js';

export function createAuthApi(client) {
  return {
    async login(payload, options) {
      const response = await client.post('/auth/login', payload, options);
      const token = response?.data?.token;
      const user = response?.data?.user;

      if (token) {
        setAccessToken(token);
      }

      if (user) {
        setStoredUser(user);
      }

      return response;
    },
    async logout(options) {
      try {
        return await client.post('/auth/logout', undefined, options);
      } finally {
        clearSession();
      }
    },
    me: (options) => client.get('/auth/me', options),
    updateMe: (payload, options) => client.patch('/auth/me', payload, options),
    updatePassword: (payload, options) => client.patch('/auth/me/password', payload, options)
  };
}
