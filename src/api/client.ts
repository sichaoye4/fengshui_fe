import type {
  DongzhaiFloorEvaluateRequest,
  DongzhaiFloorEvaluateResponse,
  HouseholdBazhaiRequest,
  HouseholdBazhaiResponse,
  JingzhaiFullRequest,
  JingzhaiFullResponse,
  RuleEvaluateRequest,
  RuleEvaluationResponse
} from "../types/fengshui";
import { getStoredToken } from "./auth";

async function postJson<TRequest, TResponse>(
  path: string,
  payload: TRequest,
  baseUrl = ""
): Promise<TResponse> {
  const token = getStoredToken();
  const headers: Record<string, string> = {
    "Content-Type": "application/json"
  };
  if (token) headers.Authorization = `Bearer ${token}`;

  const response = await fetch(`${baseUrl}${path}`, {
    method: "POST",
    headers,
    body: JSON.stringify(payload)
  });

  if (!response.ok) {
    let detail = `HTTP ${response.status}`;
    try {
      const body = (await response.json()) as { detail?: string };
      if (body.detail) {
        detail = body.detail;
      }
    } catch {
      // keep default
    }
    throw new Error(detail);
  }

  return (await response.json()) as TResponse;
}

export async function evaluateRules(
  payload: RuleEvaluateRequest,
  baseUrl = ""
): Promise<RuleEvaluationResponse> {
  return postJson<RuleEvaluateRequest, RuleEvaluationResponse>("/api/v1/rules/evaluate", payload, baseUrl);
}

export async function evaluateHouseholdBazhai(
  payload: HouseholdBazhaiRequest,
  baseUrl = ""
): Promise<HouseholdBazhaiResponse> {
  return postJson<HouseholdBazhaiRequest, HouseholdBazhaiResponse>(
    "/api/v1/bazhai/household-person-house",
    payload,
    baseUrl
  );
}

export async function evaluateDongzhaiFloor(
  payload: DongzhaiFloorEvaluateRequest,
  baseUrl = ""
): Promise<DongzhaiFloorEvaluateResponse> {
  return postJson<DongzhaiFloorEvaluateRequest, DongzhaiFloorEvaluateResponse>(
    "/api/v1/bazhai/dongzhai-floor",
    payload,
    baseUrl
  );
}

export async function evaluateJingzhaiFull(
  payload: JingzhaiFullRequest,
  baseUrl = ""
): Promise<JingzhaiFullResponse> {
  return postJson<JingzhaiFullRequest, JingzhaiFullResponse>(
    "/api/v1/jingzhai/full",
    payload,
    baseUrl
  );
}
