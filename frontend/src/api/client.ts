/// <reference types="vite/client" />

import type { ApiResponse, ListResponse, PaginatedMeta } from '../types/api';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL?.replace(/\/$/, '') || 'http://localhost:5000/api';
type HttpMethod = 'GET' | 'POST' | 'PUT' | 'DELETE';
export type QueryParams = { [key: string]: string | number | boolean | null | undefined };
interface RequestOptions { method?: HttpMethod; body?: unknown; headers?: HeadersInit; isFormData?: boolean; }
interface BlobRequestOptions { method?: 'GET' | 'POST'; body?: unknown; headers?: HeadersInit; }

export class ApiError extends Error {
  details?: unknown;
  status?: number;
  constructor(message: string, status?: number, details?: unknown) {
    super(message); this.name = 'ApiError'; this.status = status; this.details = details;
  }
}

export function getStoredToken(): string | null { return localStorage.getItem('authToken'); }
export function setStoredToken(token: string): void { localStorage.setItem('authToken', token); }
export function clearStoredToken(): void { localStorage.removeItem('authToken'); localStorage.removeItem('token'); }

function handleUnauthorized(status?: number): void {
  if (status === 401) {
    clearStoredToken();
    window.dispatchEvent(new Event('auth:unauthorized'));
    if (!window.location.pathname.startsWith('/login') && !window.location.pathname.startsWith('/register')) {
      window.location.href = '/login';
    }
  }
}

function buildHeaders(extraHeaders?: HeadersInit, isFormData = false): HeadersInit {
  const token = getStoredToken();
  const headers: Record<string, string> = { ...(extraHeaders as Record<string, string> | undefined) };
  if (!isFormData) headers['Content-Type'] = 'application/json';
  if (token) headers.Authorization = `Bearer ${token}`;
  return headers;
}

function buildUrl(path: string): string {
  if (path.startsWith('http://') || path.startsWith('https://')) return path;
  return `${API_BASE_URL}${path.startsWith('/') ? path : `/${path}`}`;
}

function appendQueryParams(path: string, params?: QueryParams): string {
  if (!params) return path;
  const query = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => { if (value !== undefined && value !== null && value !== '') query.set(key, String(value)); });
  const queryString = query.toString();
  return queryString ? `${path}${path.includes('?') ? '&' : '?'}${queryString}` : path;
}

async function parseJsonResponse<T>(response: Response): Promise<ApiResponse<T>> {
  let payload: ApiResponse<T>;
  try { payload = (await response.json()) as ApiResponse<T>; }
  catch { throw new ApiError(response.ok ? 'Invalid JSON response from server.' : response.statusText, response.status); }
  if (!response.ok || payload.success === false) {
    handleUnauthorized(response.status);
    throw new ApiError(payload.message || response.statusText || 'Request failed.', response.status, payload.details);
  }
  return payload;
}

async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const isFormData = options.isFormData || options.body instanceof FormData;
  const response = await fetch(buildUrl(path), {
    method: options.method || 'GET',
    headers: buildHeaders(options.headers, isFormData),
    body: isFormData ? (options.body as BodyInit) : options.body !== undefined ? JSON.stringify(options.body) : undefined,
  });
  const payload = await parseJsonResponse<T>(response);
  return payload.data;
}

async function requestList<T>(path: string, params?: QueryParams): Promise<ListResponse<T>> {
  const response = await fetch(buildUrl(appendQueryParams(path, params)), { method: 'GET', headers: buildHeaders() });
  const payload = await parseJsonResponse<T[]>(response);
  return { data: Array.isArray(payload.data) ? payload.data : [], meta: payload.meta };
}

async function requestWithMeta<T>(path: string, params?: QueryParams): Promise<{ data: T; meta?: PaginatedMeta }> {
  const response = await fetch(buildUrl(appendQueryParams(path, params)), { method: 'GET', headers: buildHeaders() });
  const payload = await parseJsonResponse<T>(response);
  return { data: payload.data, meta: payload.meta };
}

async function requestBlob(path: string, options: BlobRequestOptions = {}): Promise<Blob> {
  const isFormData = options.body instanceof FormData;
  const response = await fetch(buildUrl(path), {
    method: options.method || 'GET',
    headers: buildHeaders(options.headers, isFormData),
    body: isFormData ? (options.body as BodyInit) : options.body !== undefined ? JSON.stringify(options.body) : undefined,
  });
  if (!response.ok) {
    handleUnauthorized(response.status);
    let message = response.statusText || 'File request failed.';
    try { const payload = (await response.json()) as Partial<ApiResponse<unknown>>; message = payload.message || message; } catch { /* ignore */ }
    throw new ApiError(message, response.status);
  }
  return response.blob();
}

function openBlobInNewTab(blob: Blob): void {
  const url = URL.createObjectURL(blob); window.open(url, '_blank', 'noopener,noreferrer');
  window.setTimeout(() => URL.revokeObjectURL(url), 60000);
}

function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob); const link = document.createElement('a');
  link.href = url; link.download = filename || 'download'; document.body.appendChild(link); link.click(); link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export const apiClient = {
  get: <T>(path: string): Promise<T> => request<T>(path),
  getWithParams: <T>(path: string, params?: QueryParams): Promise<T> => request<T>(appendQueryParams(path, params)),
  getList: requestList,
  getWithMeta: requestWithMeta,
  post: <T>(path: string, body?: unknown): Promise<T> => request<T>(path, { method: 'POST', body }),
  put: <T>(path: string, body?: unknown): Promise<T> => request<T>(path, { method: 'PUT', body }),
  delete: <T>(path: string): Promise<T> => request<T>(path, { method: 'DELETE' }),
  postFormData: <T>(path: string, formData: FormData): Promise<T> => request<T>(path, { method: 'POST', body: formData, isFormData: true }),
  getBlob: requestBlob,
  postBlob: (path: string, body?: unknown): Promise<Blob> => requestBlob(path, { method: 'POST', body }),
  openBlobInNewTab,
  downloadBlob,
};
