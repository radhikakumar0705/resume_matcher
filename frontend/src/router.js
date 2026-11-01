import { useEffect, useState } from "react";

// Minimal hash router: "#/dashboard" -> "dashboard"; "" or "#/" -> "home"
const current = () => window.location.hash.replace(/^#\/?/, "") || "home";

export function useRoute() {
  const [route, setRoute] = useState(current);
  useEffect(() => {
    const onChange = () => {
      setRoute(current());
      window.scrollTo({ top: 0 });
    };
    window.addEventListener("hashchange", onChange);
    return () => window.removeEventListener("hashchange", onChange);
  }, []);
  return route;
}

export const navigate = (route) => {
  window.location.hash = route === "home" ? "/" : `/${route}`;
};
