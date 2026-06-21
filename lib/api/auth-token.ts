export type JwtProvider = {
  get(force?: boolean): Promise<string>;
  clear(): void;
};

export function createJwtProvider(
  createToken: () => Promise<string>,
  now: () => number = Date.now,
): JwtProvider {
  let cached: { token: string; expiresAt: number } | null = null;
  let inFlight: Promise<string> | null = null;
  return {
    async get(force = false) {
      if (!force && cached && cached.expiresAt > now() + 30_000) {
        return cached.token;
      }
      if (inFlight) return inFlight;
      inFlight = createToken()
        .then((token) => {
          cached = { token, expiresAt: now() + 14 * 60_000 };
          return token;
        })
        .finally(() => {
          inFlight = null;
        });
      return inFlight;
    },
    clear() {
      cached = null;
      inFlight = null;
    },
  };
}

export async function requestWithJwt<T extends { status: number }>(
  provider: JwtProvider,
  send: (token: string) => Promise<T>,
) {
  let response = await send(await provider.get());
  if (response.status === 401) {
    provider.clear();
    response = await send(await provider.get(true));
  }
  return response;
}
