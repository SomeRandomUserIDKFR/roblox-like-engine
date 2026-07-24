import { Vector3, type PerspectiveCamera } from "three";

/** How long a bubble stays fully visible before it starts fading (ms). */
const LIFETIME = 8000;
/** Fade-out duration (ms) — must match the CSS opacity transition. */
const FADE = 700;
/** Max bubbles stacked above the head at once (oldest drop off). */
const MAX = 3;

interface Bubble {
  el: HTMLDivElement;
  born: number;
}

/**
 * Roblox-style chat bubbles that float above the character's head.
 * Bubbles are plain DOM stacked in a container that is re-positioned each frame
 * by projecting a world-space anchor (just above the head) to screen space.
 */
export class ChatBubbles {
  private readonly container: HTMLDivElement;
  private readonly bubbles: Bubble[] = [];
  private readonly proj = new Vector3();

  constructor() {
    this.container = document.createElement("div");
    this.container.className = "chat-bubbles";
    this.container.style.display = "none";
    document.body.appendChild(this.container);
  }

  /** Show a new chat message bubble. */
  say(text: string) {
    const t = text.trim();
    if (!t) return;

    const el = document.createElement("div");
    el.className = "chat-bubble";
    el.textContent = t.slice(0, 200);
    // Newest goes last so column layout puts it at the bottom (nearest the head).
    this.container.appendChild(el);
    this.bubbles.push({ el, born: performance.now() });
    requestAnimationFrame(() => el.classList.add("chat-bubble--in"));

    while (this.bubbles.length > MAX) {
      const old = this.bubbles.shift();
      old?.el.remove();
    }
  }

  /** Reposition + age bubbles. Call once per frame. */
  update(camera: PerspectiveCamera, anchorWorld: Vector3) {
    const now = performance.now();

    for (let i = this.bubbles.length - 1; i >= 0; i--) {
      const b = this.bubbles[i];
      const age = now - b.born;
      if (age > LIFETIME) b.el.classList.add("chat-bubble--out");
      if (age > LIFETIME + FADE) {
        b.el.remove();
        this.bubbles.splice(i, 1);
      }
    }

    if (this.bubbles.length === 0) {
      this.container.style.display = "none";
      return;
    }

    this.proj.copy(anchorWorld).project(camera);
    // z > 1 means the anchor is behind the camera.
    if (this.proj.z > 1) {
      this.container.style.display = "none";
      return;
    }

    const x = (this.proj.x * 0.5 + 0.5) * window.innerWidth;
    const y = (-this.proj.y * 0.5 + 0.5) * window.innerHeight;
    this.container.style.display = "flex";
    this.container.style.left = `${x}px`;
    this.container.style.top = `${y}px`;
  }
}
