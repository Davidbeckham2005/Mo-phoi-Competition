import { request } from "../http.js";

export function getPublicState() {
  return request("/api/public");
}
