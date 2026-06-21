import http from "k6/http";
import { check, sleep } from "k6";

export const options = {
  scenarios: {
    feed: {
      executor: "constant-vus",
      vus: Number(__ENV.VUS || 500),
      duration: __ENV.DURATION || "30s",
    },
  },
  thresholds: {
    http_req_duration: ["p(95)<300"],
    http_req_failed: ["rate<0.01"],
  },
};

const baseUrl = (__ENV.API_BASE_URL || "http://localhost:3000").replace(
  /\/$/,
  "",
);

export default function feedLoadTest() {
  if (!__ENV.APPWRITE_JWT) {
    throw new Error("APPWRITE_JWT is required");
  }

  const response = http.get(`${baseUrl}/v1/leanks/feed?limit=20`, {
    headers: { Authorization: `Bearer ${__ENV.APPWRITE_JWT}` },
    tags: { endpoint: "feed" },
  });

  check(response, {
    "feed responds 200": (result) => result.status === 200,
    "feed uses success envelope": (result) => result.json("ok") === true,
  });
  sleep(0.1);
}
