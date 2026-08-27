import { ENGINE_NAME, STUDIO_NAME } from "../brand";

export type AppRoute = "polyx" | "hedronx";

/** Resolve route from path (`/HedronX`) or hash (`#HedronX` / `#/HedronX`). */
export function getRoute(): AppRoute {
  const hash = window.location.hash.replace(/^#\/?/, "").toLowerCase();
  if (hash === "hedronx" || hash === STUDIO_NAME.toLowerCase()) {
    return "hedronx";
  }

  const path = window.location.pathname.replace(/\/+$/, "").toLowerCase();
  const leaf = path.split("/").pop() ?? "";
  if (leaf === "hedronx" || leaf === STUDIO_NAME.toLowerCase()) {
    return "hedronx";
  }

  return "polyx";
}

export function navigate(route: AppRoute, replace = false) {
  const url =
    route === "hedronx"
      ? `${window.location.origin}/HedronX`
      : `${window.location.origin}/`;
  if (replace) {
    window.history.replaceState({ route }, "", url);
  } else {
    window.history.pushState({ route }, "", url);
  }
  window.dispatchEvent(new Event("polyx-route"));
}

export function onRouteChange(handler: (route: AppRoute) => void) {
  const fire = () => handler(getRoute());
  window.addEventListener("popstate", fire);
  window.addEventListener("hashchange", fire);
  window.addEventListener("polyx-route", fire);
  return () => {
    window.removeEventListener("popstate", fire);
    window.removeEventListener("hashchange", fire);
    window.removeEventListener("polyx-route", fire);
  };
}

export function syncDocumentTitle(route: AppRoute) {
  document.title =
    route === "hedronx"
      ? `${STUDIO_NAME} — studio`
      : `${ENGINE_NAME} — by ${STUDIO_NAME}`;
}
