import axios from 'axios';

/**
 * axios.create ≈ fetch-обёртка / RTK Query baseQuery.
 * withCredentials: cookie it_session уходит на BFF через Vite proxy /api → :3000
 */
export const http = axios.create({
  baseURL: '/api',
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
});
