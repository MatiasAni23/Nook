import { useEffect, type RefObject } from "react";

const revealSelector = [
  ".landing-hero-copy > *", ".landing-hero-visual",
  ".landing-place-types > *", ".landing-catalog-heading > *", ".landing-how-heading",
  ".landing-steps li", ".landing-purpose > *", ".landing-faq > *",
  ".landing-final > *", ".landing-footer-top > *",
].join(",");

/** Progressive enhancement: prerender and browsers without observers keep all content visible. */
export function useLandingMotion(reference: RefObject<HTMLDivElement>) {
  useEffect(() => {
    const root = reference.current;
    if (!root) return;
    const motion = window.matchMedia("(prefers-reduced-motion: reduce)");
    const targets = Array.from(root.querySelectorAll<HTMLElement>(revealSelector));
    const ambientTargets = Array.from(root.querySelectorAll<HTMLElement>(".landing-guide-float, .landing-mascot-scene"));
    const ambientVisibility = new Map<HTMLElement, boolean>();
    let revealObserver: IntersectionObserver | null = null;
    let resetObserver: IntersectionObserver | null = null;
    let ambientObserver: IntersectionObserver | null = null;

    const updateAmbient = () => ambientVisibility.forEach((visible, element) => {
      element.dataset.ambientActive = String(visible && document.visibilityState === "visible");
    });
    const reset = () => {
      revealObserver?.disconnect();
      resetObserver?.disconnect();
      ambientObserver?.disconnect();
      ambientVisibility.clear();
      delete root.dataset.landingMotion;
      targets.forEach(element => {
        delete element.dataset.landingReveal;
        delete element.dataset.landingReturn;
        element.style.removeProperty("--landing-reveal-delay");
      });
      ambientTargets.forEach(element => { delete element.dataset.ambientActive; });
    };
    const configure = () => {
      reset();
      if (motion.matches) return;
      root.dataset.landingMotion = "enabled";
      if (!("IntersectionObserver" in window)) return;

      revealObserver = new IntersectionObserver(entries => {
        entries.forEach(entry => {
          if (!entry.isIntersecting) return;
          (entry.target as HTMLElement).dataset.landingReveal = "visible";
        });
      }, { root, threshold: 0, rootMargin: "-16px 0px -16px 0px" });

      // Reset only after leaving an expanded viewport. The separate boundary keeps
      // an entrance's own translation from repeatedly hiding/showing the element.
      resetObserver = new IntersectionObserver(entries => {
        entries.forEach(entry => {
          if (entry.isIntersecting) return;
          const element = entry.target as HTMLElement;
          const above = entry.boundingClientRect.bottom <= root.getBoundingClientRect().top;
          element.dataset.landingReturn = String(above);
          element.dataset.landingReveal = "waiting";
        });
      }, { root, threshold: 0, rootMargin: "80px 0px 80px 0px" });

      const viewportBottom = root.getBoundingClientRect().bottom;
      targets.forEach((element, index) => {
        element.style.setProperty("--landing-reveal-delay", `${(index % 3) * 70}ms`);
        if (element.getBoundingClientRect().top >= viewportBottom) {
          element.dataset.landingReveal = "waiting";
        } else {
          element.dataset.landingReveal = "visible";
        }
        revealObserver?.observe(element);
        resetObserver?.observe(element);
      });

      ambientObserver = new IntersectionObserver(entries => {
        entries.forEach(entry => ambientVisibility.set(entry.target as HTMLElement, entry.isIntersecting));
        updateAmbient();
      }, { root, threshold: 0.1 });
      ambientTargets.forEach(element => ambientObserver?.observe(element));
    };

    configure();
    motion.addEventListener("change", configure);
    document.addEventListener("visibilitychange", updateAmbient);
    return () => {
      reset();
      motion.removeEventListener("change", configure);
      document.removeEventListener("visibilitychange", updateAmbient);
    };
  }, [reference]);
}
