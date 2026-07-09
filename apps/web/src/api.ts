import { platformHeaders } from "./platform/platform";

const apiBaseUrl = import.meta.env.VITE_API_URL ?? "http://localhost:4000/api";

export async function api<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${apiBaseUrl}${path}`, {
    ...init,
    headers: { "content-type": "application/json", ...platformHeaders(), ...init?.headers }
  });

  if (!response.ok) throw new Error(`API error ${response.status}`);
  return response.json() as Promise<T>;
}
