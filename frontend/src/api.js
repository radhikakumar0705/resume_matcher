export const API_URL = process.env.REACT_APP_API_URL || "http://127.0.0.1:5000";

// fetch wrapper: returns parsed JSON or throws Error with the server's message
async function request(path, options = {}) {
  let res;
  try {
    res = await fetch(`${API_URL}${path}`, options);
  } catch {
    throw new Error("Could not reach the server. Is the backend running?");
  }
  if (res.status === 204) return null;
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || `Server error (${res.status})`);
  return data;
}

export const matchResume = (formData) => request("/match", { method: "POST", body: formData });

export const getSuggestions = (body) =>
  request("/suggestions", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

export const listMatches = () => request("/matches");

export const deleteMatch = (id) => request(`/matches/${id}`, { method: "DELETE" });

export const resumeUrl = (id) => `${API_URL}/matches/${id}/resume`;

export const startAgentRun = (matchId) =>
  request("/agent/runs", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ match_id: matchId }),
  });

export const getAgentRun = (id) => request(`/agent/runs/${id}`);

export const listAgentRuns = () => request("/agent/runs");
