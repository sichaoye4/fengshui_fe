import type {
  BazhaiPersonHouseRequest,
  BazhaiPersonHouseResponse,
  HouseholdBazhaiRequest,
  HouseholdBazhaiResponse,
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

export async function evaluateBazhai(
  baseUrl: string,
  payload: BazhaiPersonHouseRequest
): Promise<BazhaiPersonHouseResponse> {
  return postJson<BazhaiPersonHouseRequest, BazhaiPersonHouseResponse>(
    baseUrl,
    "/api/v1/bazhai/person-house",
    payload
  );
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
