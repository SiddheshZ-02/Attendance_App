// services/api/apiConfig.js

import { API_BASE_URL, API_ENDPOINTS } from '../../constants/api';

export const API_CONFIG = {
  BASE_URL: API_BASE_URL,
  ENDPOINTS: API_ENDPOINTS
};

// Helper function for API calls
export const apiCall = async (endpoint: string, method: string = 'GET', body: any = null, token: string | null = null) => {
  const headers: { [key: string]: string } = {
    'Content-Type': 'application/json'
  };
  
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  
  const options: RequestInit = {
    method,
    headers
  };
  
  if (body && method !== 'GET') {
    options.body = JSON.stringify(body);
  }
  
  try {
    const response = await fetch(`${API_CONFIG.BASE_URL}${endpoint}`, options);
    const data = await response.json();
    return data;
  } catch (error) {
    console.error('API call error:', error);
    throw error;
  }
};