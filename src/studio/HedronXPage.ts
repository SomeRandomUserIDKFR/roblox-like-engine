import type { AppRoute } from "../app/router";

/**
 * HedronX studio tab — mounts the Roblox Studio–style app.
 */
export async function mountHedronXPage(root: HTMLElement) {
  const { mountStudioApp } = await import("./StudioApp");
  await mountStudioApp(root);
}

export function applyRouteVisibility(route: AppRoute) {
  const play = document.getElementById("polyx-play");
  const studio = document.getElementById("hedronx-studio");
  const navPoly = document.getElementById("nav-polyx");
  const navHedron = document.getElementById("nav-hedronx");

  const isStudio = route === "hedronx";
  if (play) play.hidden = isStudio;
  if (studio) {
    studio.hidden = !isStudio;
    // Belt-and-suspenders: grid display overrides [hidden] without !important CSS
    studio.style.display = isStudio ? "" : "none";
  }
  navPoly?.classList.toggle("app-nav__link--active", !isStudio);
  navHedron?.classList.toggle("app-nav__link--active", isStudio);

  document.body.classList.toggle("route-hedronx", isStudio);
  document.body.classList.toggle("route-polyx", !isStudio);
}
