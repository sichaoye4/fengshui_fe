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

async function postJson<TRequest, TResponse>(
  baseUrl: string,
  path: string,
  payload: TRequest
): Promise<TResponse> {
  const response = await fetch(`${baseUrl}${path}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
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

export async function evaluateRules(baseUrl: string, payload: RuleEvaluateRequest): Promise<RuleEvaluationResponse> {
  return postJson<RuleEvaluateRequest, RuleEvaluationResponse>(baseUrl, "/api/v1/rules/evaluate", payload);
}

export async function evaluateHouseholdBazhai(
  baseUrl: string,
  payload: HouseholdBazhaiRequest
): Promise<HouseholdBazhaiResponse> {
  return postJson<HouseholdBazhaiRequest, HouseholdBazhaiResponse>(
    baseUrl,
    "/api/v1/bazhai/household-person-house",
    payload
  );
}

export async function evaluateDongzhaiFloor(
  baseUrl: string,
  payload: DongzhaiFloorEvaluateRequest
): Promise<DongzhaiFloorEvaluateResponse> {
  return postJson<DongzhaiFloorEvaluateRequest, DongzhaiFloorEvaluateResponse>(
    baseUrl,
    "/api/v1/bazhai/dongzhai-floor",
    payload
  );
}

export async function evaluateJingzhaiFull(
  baseUrl: string,
  payload: JingzhaiFullRequest
): Promise<JingzhaiFullResponse> {
  return postJson<JingzhaiFullRequest, JingzhaiFullResponse>(
    baseUrl,
    "/api/v1/jingzhai/full",
    payload
  );
}
