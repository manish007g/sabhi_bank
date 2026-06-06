// client.js – thin wrapper around fetch/axios that proxies through the gateway

import axios from 'axios';

// Base URL points to the gateway service on the host machine
const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:8000';

const client = axios.create({
  baseURL: API_BASE,
  timeout: 5000,
});

// Helper to call a service via the gateway proxy
export const proxy = (service, path, options = {}) => {
  // service name must match SERVICE_URLS keys (auth, accounts, transactions, ...)
  const url = `/proxy/${service}${path}`;
  return client({ url, ...options });
};

export default client;
