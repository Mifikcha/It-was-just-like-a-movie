import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

const MOTION = {
  heroTravel: 1.1,
  sceneEase: "power2.out",
  scrub: 1.2,
  headerOffset: 48,
} as const;

const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

const setupContactForm = () => {
  const form = document.querySelector<HTMLFormElement>("[data-contact-form]");
  const status = document.querySelector<HTMLElement>("[data-contact-status]");
  if (!form || !status) return;

  form.addEventListener("submit", (event) => {
    event.preventDefault();
    if (!form.reportValidity()) return;
    status.innerHTML = 'Форма ещё не подключена к отправке. Напишите напрямую в <a href="https://t.me/Skifcha" target="_blank" rel="noreferrer">Telegram</a> — поля сохранены только в вашем браузере.';
    status.dataset.state = "notice";
  });
};

const setupHeader = () => {
  const header = document.querySelector<HTMLElement>("[data-site-header]");
  if (!header) return;
  const update = () => header.toggleAttribute("data-condensed", window.scrollY > MOTION.headerOffset);
  update();
  window.addEventListener("scroll", update, { passive: true });
};

const setupMotion = () => {
  if (reducedMotion) return;
  gsap.registerPlugin(ScrollTrigger);

  gsap.set("[data-progress-shell]", { strokeDasharray: 100, strokeDashoffset: 88 });
  gsap.to("[data-progress-shell]", {
    strokeDashoffset: 0,
    scrollTrigger: { trigger: "main", start: "top top", end: "bottom bottom", scrub: MOTION.scrub },
  });
  gsap.to("[data-progress-node]", {
    rotate: 312,
    transformOrigin: "32px 32px",
    scrollTrigger: { trigger: "main", start: "top top", end: "bottom bottom", scrub: MOTION.scrub },
  });
  const progressLabel = document.querySelector<HTMLElement>(".structure-progress small");
  ScrollTrigger.create({
    trigger: "main",
    start: "top top",
    end: "bottom bottom",
    onUpdate: ({ progress }) => {
      if (progressLabel) progressLabel.textContent = `${String(Math.round(progress * 100)).padStart(2, "0")}%`;
    },
  });

  const hero = document.querySelector("[data-scene='hero']");
  if (hero) {
    const timeline = gsap.timeline({
      scrollTrigger: { trigger: hero, start: "top top", end: "bottom top", scrub: MOTION.scrub },
    });
    timeline
      .to("[data-hero-visual]", { xPercent: -8, yPercent: 8, scale: 0.72, rotate: 8, duration: MOTION.heroTravel }, 0)
      .to("[data-hero-copy]", { y: -72, opacity: 0.2, duration: 0.72 }, 0.25)
      .to("[data-hero-quote]", { y: -24, opacity: 0, duration: 0.45 }, 0.18)
      .to("[data-dyson='hero'] .dyson__shell", { rotate: 38, transformOrigin: "50% 50%", duration: MOTION.heroTravel }, 0)
      .to("[data-dyson='hero'] .dyson__collectors", { rotate: -24, transformOrigin: "50% 50%", duration: MOTION.heroTravel }, 0);
  }

  gsap.from("[data-knowledge-graph] line", {
    scrollTrigger: { trigger: "[data-system-observatory]", start: "top 68%" },
    strokeDashoffset: 100,
    stagger: 0.035,
    duration: 1.5,
    ease: MOTION.sceneEase,
  });

  gsap.from("[data-system-observatory] .interface-frame", {
    scrollTrigger: { trigger: "[data-system-observatory]", start: "top 78%", end: "bottom 70%", scrub: MOTION.scrub },
    y: 100,
    rotateX: 10,
    rotateY: -8,
  });

  gsap.to("[data-final-visual]", {
    scrollTrigger: { trigger: "[data-scene='decision']", start: "top bottom", end: "bottom bottom", scrub: MOTION.scrub },
    rotate: -9,
    scale: 1.08,
  });
};

setupHeader();
setupContactForm();
setupMotion();
