/** Auth API client for user registration, login, and session management. */

import type { FloorplanAssetResponse } from "./floorplans";

export interface UserPublic {
  id: string;
  username: string;
  display_name: string;
  is_active: boolean;
  created_at: string;
  last_login_at: string | null;
}

export interface TokenResponse {
  access_token: string;
  refresh_token: string;
  token_type: string;
  user: UserPublic;
}

const STORAGE_KEY = "fengshui_auth_v1";

/** Save auth data to localStorage. */
export function saveAuth(token: string, user: UserPublic): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify({ token, user, stored_at: Date.now() }));
}

/** Load auth data from localStorage. */
export function loadAuth(): { token: string; user: UserPublic } | null {
  if (typeof window === "undefined") return null;
  const raw = window.localStorage.getItem(STORAGE_KEY);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw);
    if (parsed.token && parsed.user) return { token: parsed.token, user: parsed.user };
    return null;
  } catch {
    return null;
  }
}

/** Clear auth data from localStorage. */
export function clearAuth(): void {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(STORAGE_KEY);
}

/** Get the stored access token. */
export function getStoredToken(): string | null {
  const auth = loadAuth();
  return auth?.token ?? null;
}

/** Build auth headers for API calls. */
export function authHeaders(token?: string): Record<string, string> {
  const t = token ?? getStoredToken();
  return t ? { Authorization: `Bearer ${t}` } : {};
}

async function postJson<TRequest, TResponse>(
  path: string,
  payload: TRequest,
  token?: string
): Promise<TResponse> {
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (token) headers.Authorization = `Bearer ${token}`;

  const response = await fetch(path, {
    method: "POST",
    headers,
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    let detail = `HTTP ${response.status}`;
    try {
      const body = (await response.json()) as { detail?: string };
      if (body.detail) detail = body.detail;
    } catch {
      // keep default
    }
    throw new Error(detail);
  }

  return (await response.json()) as TResponse;
}

async function getJson<TResponse>(path: string, token?: string): Promise<TResponse> {
  const headers: Record<string, string> = {};
  if (token) headers.Authorization = `Bearer ${token}`;

  const response = await fetch(path, { headers });

  if (!response.ok) {
    let detail = `HTTP ${response.status}`;
    try {
      const body = (await response.json()) as { detail?: string };
      if (body.detail) detail = body.detail;
    } catch {
      // keep default
    }
    throw new Error(detail);
  }

  return (await response.json()) as TResponse;
}

async function delJson(path: string, token?: string): Promise<void> {
  const headers: Record<string, string> = {};
  if (token) headers.Authorization = `Bearer ${token}`;
  const response = await fetch(path, { method: "DELETE", headers });
  if (!response.ok) {
    let detail = `HTTP ${response.status}`;
    try {
      const body = (await response.json()) as { detail?: string };
      if (body.detail) detail = body.detail;
    } catch {
      // keep default
    }
    throw new Error(detail);
  }
}

export async function register(
  username: string,
  password: string,
  displayName?: string
): Promise<TokenResponse> {
  return postJson<{ username: string; password: string; display_name: string }, TokenResponse>(
    "/api/v1/auth/register",
    { username, password, display_name: displayName ?? "" }
  );
}

export async function login(username: string, password: string): Promise<TokenResponse> {
  return postJson<{ username: string; password: string }, TokenResponse>(
    "/api/v1/auth/login",
    { username, password }
  );
}

export async function getMe(token: string): Promise<UserPublic> {
  return getJson<UserPublic>("/api/v1/auth/me", token);
}

export async function logout(token: string): Promise<void> {
  await postJson<{ refresh_token: string }, { status: string }>(
    "/api/v1/auth/logout",
    { refresh_token: "" },
    token
  );
}

// ---------------------------------------------------------------------------
// Session (save/load) API
// ---------------------------------------------------------------------------

export interface SessionMemberInput {
  name: string;
  birth_year?: number | null;
  gender?: string | null;
  is_primary_resident: boolean;
  relationship: string;
}

export interface SessionCreateRequest {
  house_profile: Record<string, unknown>;
  members: SessionMemberInput[];
  analysis_results: Record<string, unknown>;
}

export interface SessionMemberResponse {
  person_id: string;
  name: string;
  birth_year: number | null;
  gender: string | null;
  relationship: string;
  is_primary_resident: boolean;
}

export interface SessionDetailResponse {
  id: string;
  house_profile: Record<string, unknown>;
  members: SessionMemberResponse[];
  analysis_results: Record<string, unknown>;
  floorplan: FloorplanAssetResponse | null;
  created_at: string;
  updated_at: string;
}

export interface SessionSummaryResponse {
  id: string;
  house_name: string;
  member_count: number;
  created_at: string;
}

export async function saveSession(
  payload: SessionCreateRequest,
  token: string
): Promise<SessionDetailResponse> {
  return postJson<SessionCreateRequest, SessionDetailResponse>(
    "/api/v1/sessions",
    payload,
    token
  );
}

export async function listSessions(token: string): Promise<SessionSummaryResponse[]> {
  return getJson<SessionSummaryResponse[]>("/api/v1/sessions", token);
}

export async function getLatestSession(token: string): Promise<SessionDetailResponse | null> {
  return getJson<SessionDetailResponse | null>("/api/v1/sessions/latest", token);
}

export async function getSession(
  sessionId: string,
  token: string
): Promise<SessionDetailResponse> {
  return getJson<SessionDetailResponse>(`/api/v1/sessions/${sessionId}`, token);
}

export async function deleteSession(sessionId: string, token: string): Promise<void> {
  return delJson(`/api/v1/sessions/${sessionId}`, token);
}
