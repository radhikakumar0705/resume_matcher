import { useEffect, useState } from "react";

// Minimal hash router: "#/agent?match=3" -> { route: "agent", params: { match: "3" } }
const current = () => {
  const [path, query = ""] = window.location.hash.replace(/^#\/?/, "").split("?");
  return { route: path || "home", params: Object.fromEntries(new URLSearchParams(query)) };
};

export function useRoute() {
  const [state, setState] = useState(current);
  useEffect(() => {
    const onChange = () => {
      setState(current());
      window.scrollTo({ top: 0 });
    };
    window.addEventListener("hashchange", onChange);
    return () => window.removeEventListener("hashchange", onChange);
  }, []);
  return state;
}

export const navigate = (route) => {
  window.location.hash = route === "home" ? "/" : `/${route}`;
};
