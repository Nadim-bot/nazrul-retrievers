/**
 * Nazrul Retrievers - JKKNIU Lost & Found System
 * Full-Stack Client API Helper Utility with Resilient Failover Support
 */

const API_BASE = '/api';

export function getAuthToken(): string | null {
  try {
    return localStorage.getItem('auth_token') || localStorage.getItem('jkkniu_token');
  } catch {
    return null;
  }
}

export function setAuthToken(token: string | null) {
  try {
    if (token) {
      localStorage.setItem('auth_token', token);
      localStorage.setItem('jkkniu_token', token);
    } else {
      localStorage.removeItem('auth_token');
      localStorage.removeItem('jkkniu_token');
    }
  } catch (err) {
    console.error('Failed to update localStorage auth token:', err);
  }
}

interface FetchOptions extends RequestInit {
  bodyData?: any;
}

export async function apiFetch<T = any>(endpoint: string, options: FetchOptions = {}): Promise<T> {
  const token = getAuthToken();
  const headers = new Headers(options.headers || {});

  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  // Handle json payload encoding
  let body = options.body;
  if (options.bodyData && !(options.bodyData instanceof FormData)) {
    headers.set('Content-Type', 'application/json');
    body = JSON.stringify(options.bodyData);
  } else if (options.bodyData instanceof FormData) {
    body = options.bodyData;
    // Note: Do NOT set Content-Type header when uploading FormData, 
    // the browser will automatically set it along with the boundary string!
  }

  const response = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers,
    body
  });

  if (!response.ok) {
    const errData = await response.json().catch(() => ({}));
    throw new Error(errData.error || `HTTP request failed with status ${response.status}`);
  }

  return response.json();
}

export interface MongoDiagnosticResult {
  connected: boolean;
  readyState: number;
  mongodb_uri: string;
  databaseName: string;
  timestamp: string;
  error?: string;
}

export async function testMongoConnectivity(): Promise<MongoDiagnosticResult> {
  try {
    const response = await fetch(`${API_BASE}/db-status`);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    return await response.json();
  } catch (err: any) {
    return {
      connected: false,
      readyState: 0,
      mongodb_uri: 'UNKNOWN',
      databaseName: 'N/A',
      timestamp: new Date().toISOString(),
      error: err.message || 'Failed to connect to diagnostic endpoint'
    };
  }
}
