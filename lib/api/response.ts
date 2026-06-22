import type { ApiResult } from "./types";

type ApiSuccess<T> = Extract<ApiResult<T>, { ok: true }>;

export function unwrapApiData<T>(response: ApiSuccess<T>): T {
  return response.data;
}
