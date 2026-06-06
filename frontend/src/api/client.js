// client.js – thin wrapper around fetch/axios that proxies through the gateway

import axios from 'axios';

const defaultHost = typeof window !== 'undefined' ? window.location.hostname : 'localhost';
const defaultProtocol = typeof window !== 'undefined' && window.location.protocol === 'https:' ? 'https' : 'http';
const API_BASE = import.meta.env.VITE_API_BASE || `${defaultProtocol}://${defaultHost}:8000`;

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
