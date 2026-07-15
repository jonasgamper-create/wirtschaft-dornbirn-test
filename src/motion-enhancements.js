import Lenis from "lenis";
import { animate, hover, inView, press, stagger } from "motion";

const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
const motionAllowed = () => !reduceMotion.matches && !document.body.classList.contains("motion-off");

let lenis = null;
let lenisFrame = 0;
const runLenis = time => {
  if (!lenis) {
    lenisFrame = 0;
    return;
  }
  lenis.raf(time);
  lenisFrame = requestAnimationFrame(runLenis);
};
const canUseLenis = () => matchMedia("(hover:hover) and (pointer:fine)").matches && !reduceMotion.matches;
const startLenis = () => {
  if (lenis || !canUseLenis() || document.body.classList.contains("motion-off")) return;
  lenis = new Lenis({ lerp: 0.085, duration: 1.08, smoothWheel: true, syncTouch: false });
  lenisFrame = requestAnimationFrame(runLenis);
};
const stopLenis = () => {
  if (lenisFrame) cancelAnimationFrame(lenisFrame);
  lenisFrame = 0;
  lenis?.destroy();
  lenis = null;
};
startLenis();
window.addEventListener("wirtschaft:motionchange", event => event.detail.off ? stopLenis() : startLenis());
reduceMotion.addEventListener("change", event => event.matches ? stopLenis() : startLenis());

if (motionAllowed()) {
  animate(
    ".experience-bar",
    { opacity: [0, 1], y: [-14, 0] },
    { duration: 0.38, ease: "easeOut" }
  );
}

const revealGroup = (container, selector) => {
  inView(container, () => {
    if (!motionAllowed()) return;
    const items = document.querySelectorAll(`${container} ${selector}`);
    animate(
      items,
      { opacity: [0, 1], y: [20, 0] },
      { duration: 0.34, delay: stagger(0.045), ease: "easeOut" }
    );
  }, { amount: 0.22 });
};

revealGroup(".celebration-section", ".celebration-paths a");
revealGroup(".decision-section", ".decision-grid button");

inView(".lunch-card", element => {
  if (!motionAllowed()) return;
  animate(
    element,
    { opacity: [0.75, 1], scale: [0.985, 1], y: [18, 0] },
    { duration: 0.38, ease: "easeOut" }
  );
}, { amount: 0.3 });

inView(".stage-video-reel", element => {
  if (!motionAllowed()) return;
  animate(
    element,
    { opacity: [0, 1], scale: [0.94, 1] },
    { duration: 0.68, ease: "easeOut" }
  );
}, { amount: 0.28 });

hover(".button, .decision-grid button, .celebration-paths a", element => {
  if (!motionAllowed()) return;
  animate(element, { scale: 1.018 }, { duration: 0.18, ease: "easeOut" });
  return () => animate(element, { scale: 1 }, { duration: 0.16, ease: "easeOut" });
});

press(".button, .decision-grid button, .celebration-paths a", element => {
  if (!motionAllowed()) return;
  animate(element, { scale: 0.975 }, { duration: 0.12, ease: "easeOut" });
  return () => animate(element, { scale: 1 }, { type: "spring", stiffness: 520, damping: 34 });
});

document.querySelectorAll("dialog").forEach(dialog => {
  const observer = new MutationObserver(() => {
    if (!dialog.open || !motionAllowed()) return;
    const frame = dialog.querySelector(".dialog-frame");
    if (!frame) return;
    animate(
      frame,
      { opacity: [0, 1], scale: [0.975, 1], y: [14, 0] },
      { duration: 0.26, ease: "easeOut" }
    );
    if (dialog.id === "eventsDialog") {
      animate(
        dialog.querySelectorAll(".event-timeline article"),
        { opacity: [0, 1], y: [14, 0] },
        { duration: 0.28, delay: stagger(0.045), ease: "easeOut" }
      );
    }
  });
  observer.observe(dialog, { attributes: true, attributeFilter: ["open"] });
});

window.addEventListener("wirtschaft:themechange", () => {
  if (!motionAllowed()) return;
  animate(
    ".theme-status strong, .theme-status span",
    { opacity: [0.35, 1], x: [-8, 0] },
    { duration: 0.28, delay: stagger(0.035), ease: "easeOut" }
  );
});

reduceMotion.addEventListener("change", event => {
  if (!event.matches) return;
  document.querySelectorAll(".button, .decision-grid button, .celebration-paths a, .dialog-frame, .event-timeline article, .theme-status strong, .theme-status span, .stage-video-reel")
    .forEach(element => element.getAnimations().forEach(animation => animation.cancel()));
});
