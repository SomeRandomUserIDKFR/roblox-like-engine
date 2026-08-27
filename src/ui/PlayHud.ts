import type { Humanoid } from "../player/Humanoid";

/** Simple health bar + MP status chip. */
export function mountPlayHud(humanoid: Humanoid) {
  const root = document.createElement("div");
  root.id = "polyx-vitals";
  Object.assign(root.style, {
    position: "fixed",
    left: "16px",
    bottom: "72px",
    zIndex: "40",
    minWidth: "160px",
    fontFamily: '"Segoe UI", system-ui, sans-serif',
    pointerEvents: "none",
  });

  const label = document.createElement("div");
  label.style.cssText =
    "color:#e8eef7;font-size:12px;margin-bottom:4px;text-shadow:0 1px 2px #000;";
  label.textContent = "Health";

  const track = document.createElement("div");
  track.style.cssText =
    "height:10px;background:rgba(0,0,0,0.55);border:1px solid rgba(255,255,255,0.25);border-radius:3px;overflow:hidden;";

  const fill = document.createElement("div");
  fill.style.cssText =
    "height:100%;width:100%;background:linear-gradient(90deg,#2ecc71,#27ae60);transition:width .12s;";
  track.appendChild(fill);

  const net = document.createElement("div");
  net.id = "polyx-net-status";
  net.style.cssText =
    "margin-top:8px;color:#9fb0c5;font-size:11px;text-shadow:0 1px 2px #000;";
  net.textContent = "Solo · start MP: npm run server";

  root.append(label, track, net);
  document.body.appendChild(root);

  const sync = () => {
    const pct = Math.max(0, humanoid.Health / Math.max(1, humanoid.MaxHealth));
    fill.style.width = `${pct * 100}%`;
    fill.style.background =
      pct > 0.35
        ? "linear-gradient(90deg,#2ecc71,#27ae60)"
        : "linear-gradient(90deg,#e74c3c,#c0392b)";
    label.textContent = `Health ${Math.round(humanoid.Health)} / ${humanoid.MaxHealth}`;
  };
  sync();
  const c1 = humanoid.HealthChanged.Connect(sync);
  const c2 = humanoid.Died.Connect(sync);

  return {
    root,
    setNetStatus(text: string) {
      net.textContent = text;
    },
    dispose() {
      c1.Disconnect();
      c2.Disconnect();
      root.remove();
    },
  };
}
