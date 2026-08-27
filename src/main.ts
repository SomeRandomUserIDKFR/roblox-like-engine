import {
  getRoute,
  navigate,
  onRouteChange,
  syncDocumentTitle,
  type AppRoute,
} from "./app/router";
import { takePendingPlace } from "./place/activePlace";
import { applyRouteVisibility, mountHedronXPage } from "./studio/HedronXPage";
import type { PolyXHandle } from "./game/startPolyX";

let game: PolyXHandle | null = null;
let gameBooting = false;

function wireNav() {
  document.getElementById("nav-polyx")?.addEventListener("click", (e) => {
    e.preventDefault();
    navigate("polyx");
  });
  document.getElementById("nav-hedronx")?.addEventListener("click", (e) => {
    e.preventDefault();
    navigate("hedronx");
  });
}

async function ensureGame(forceRestart = false) {
  const pending = takePendingPlace();
  // Restart when a HedronX map was queued (Play from studio)
  if ((pending || forceRestart) && game) {
    game.dispose();
    game = null;
  }
  if (game || gameBooting) return;
  gameBooting = true;
  try {
    const { startPolyX } = await import("./game/startPolyX");
    game = await startPolyX({ place: pending });
  } catch (err) {
    console.error(err);
    const hud = document.getElementById("hud");
    if (hud) hud.textContent = `Failed to start renderer: ${err}`;
  } finally {
    gameBooting = false;
  }
}

async function applyRoute(route: AppRoute) {
  syncDocumentTitle(route);
  applyRouteVisibility(route);

  const studio = document.getElementById("hedronx-studio");
  if (route === "hedronx") {
    if (studio && !studio.dataset.mounted) {
      studio.dataset.mounted = "1";
      try {
        await mountHedronXPage(studio);
      } catch (err) {
        console.error(err);
        studio.dataset.mounted = "";
        studio.textContent = `Failed to start HedronX: ${err}`;
      }
    }
    return;
  }

  await ensureGame();
}

wireNav();
onRouteChange((route) => {
  void applyRoute(route);
});

// Normalize bare #HedronX → /HedronX for a clean URL
if (
  getRoute() === "hedronx" &&
  !window.location.pathname.toLowerCase().includes("hedronx")
) {
  navigate("hedronx", true);
}

void applyRoute(getRoute());
