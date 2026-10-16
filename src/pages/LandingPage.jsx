import { useLayoutEffect, useRef } from "react";
import { Link } from "react-router-dom";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import GamePulseLogo from "../components/GamePulseLogo";
import "./LandingPage.css";

gsap.registerPlugin(ScrollTrigger);

const features = [
  {
    number: "01",
    icon: "↘",
    title: "Know when the price drops",
    description:
      "Choose the games you want and set a price or discount threshold that makes sense for you.",
    tag: "PERSONAL PRICE TARGETS",
  },
  {
    number: "02",
    icon: "◷",
    title: "Keep an eye on the history",
    description:
      "Build a clearer picture of how a game's price changes over time instead of guessing when to buy.",
    tag: "PRICE HISTORY",
  },
  {
    number: "03",
    icon: "⌁",
    title: "One collection. Your rules.",
    description:
      "Keep tracked games and alert conditions together in a collection tied to your own account.",
    tag: "YOUR COLLECTION",
  },
];

const steps = [
  [
    "01",
    "Find your game",
    "Search the Steam catalog and select the purchase option you want to follow.",
  ],
  [
    "02",
    "Set your conditions",
    "Choose a target price, minimum discount, or first verified listing.",
  ],
  [
    "03",
    "Let GamePulse watch",
    "The monitoring pipeline is being built to check verified listings against your rules.",
  ],
];

function ArrowIcon() {
  return (
    <svg viewBox="0 0 20 20" fill="none" aria-hidden="true">
      <path
        d="M4 10h11M10 5l5 5-5 5"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function DashboardPreview() {
  return (
    <div
      className="lp-preview-wrap"
      aria-label="Illustrative GamePulse dashboard preview"
    >
      <div className="lp-preview-glow" />
      <div className="lp-preview-window">
        <div className="lp-preview-topbar">
          <div className="lp-window-dots">
            <i />
            <i />
            <i />
          </div>
          <span>GAMEPULSE / DEAL MONITOR</span>
          <span className="lp-live-chip">
            <b /> YOUR WATCHLIST
          </span>
        </div>
        <div className="lp-preview-body">
          <aside className="lp-preview-side">
            <div className="lp-mini-logo">
              G<span>•</span>
            </div>
            <div className="lp-side-line active">
              <i /> Overview
            </div>
            <div className="lp-side-line">
              <i /> My Games
            </div>
            <div className="lp-side-line">
              <i /> Price History
            </div>
            <div className="lp-side-line">
              <i /> Alerts
            </div>
            <div className="lp-side-bottom">
              <span /> Personal watchlist
            </div>
          </aside>
          <div className="lp-preview-content">
            <div className="lp-preview-heading">
              <div>
                <span className="lp-eyebrow">YOUR COLLECTION</span>
                <h3>
                  Deal overview<span>.</span>
                </h3>
              </div>
              <span className="lp-preview-date">PRICE WATCH / IN</span>
            </div>
            <div className="lp-metric-grid">
              <div className="lp-metric">
                <span>TRACKED GAMES</span>
                <strong>08</strong>
                <small>In your collection</small>
              </div>
              <div className="lp-metric">
                <span>PRICE TARGETS</span>
                <strong>05</strong>
                <small>Rules configured</small>
              </div>
              <div className="lp-metric">
                <span>WATCH STATUS</span>
                <strong className="lp-status-text">
                  Ready<span> to monitor</span>
                </strong>
                <small>
                  <i className="lp-status-dot" /> Setup in progress
                </small>
              </div>
            </div>
            <div className="lp-chart-card">
              <div className="lp-chart-head">
                <div>
                  <strong>Price movement</strong>
                  <small>Illustrative price history</small>
                </div>
                <span>LAST 30 DAYS⌄</span>
              </div>
              <div className="lp-chart-area">
                <div className="lp-chart-grid">
                  <i />
                  <i />
                  <i />
                  <i />
                </div>
                <svg
                  viewBox="0 0 620 130"
                  preserveAspectRatio="none"
                  aria-hidden="true"
                >
                  <defs>
                    <linearGradient
                      id="lp-chart-fill"
                      x1="0"
                      y1="0"
                      x2="0"
                      y2="1"
                    >
                      <stop offset="0%" stopColor="#00d6a0" stopOpacity=".24" />
                      <stop offset="100%" stopColor="#00d6a0" stopOpacity="0" />
                    </linearGradient>
                  </defs>
                  <path
                    d="M0 96 C35 92 40 74 76 80 S120 100 150 68 S195 52 220 66 S255 92 290 58 S335 70 365 46 S410 55 440 34 S475 60 505 42 S550 26 575 36 S600 17 620 13 L620 130 L0 130Z"
                    fill="url(#lp-chart-fill)"
                  />
                  <path
                    d="M0 96 C35 92 40 74 76 80 S120 100 150 68 S195 52 220 66 S255 92 290 58 S335 70 365 46 S410 55 440 34 S475 60 505 42 S550 26 575 36 S600 17 620 13"
                    fill="none"
                    stroke="#12ddb0"
                    strokeWidth="2.5"
                    vectorEffect="non-scaling-stroke"
                  />
                  <circle
                    cx="575"
                    cy="36"
                    r="4"
                    fill="#12ddb0"
                    stroke="#0e151c"
                    strokeWidth="3"
                  />
                </svg>
              </div>
              <div className="lp-chart-labels">
                <span>SEP 01</span>
                <span>SEP 08</span>
                <span>SEP 15</span>
                <span>SEP 22</span>
                <span>SEP 30</span>
              </div>
            </div>
            <div className="lp-preview-list">
              <div className="lp-list-title">
                <strong>Games on your radar</strong>
                <span>PREVIEW DATA</span>
              </div>
              <div className="lp-game-row">
                <div className="lp-game-art art-one">
                  GP<span>01</span>
                </div>
                <div className="lp-game-info">
                  <strong>Game of your choice</strong>
                  <small>Target price configured</small>
                </div>
                <div className="lp-game-rule">
                  <span>PRICE TARGET</span>
                  <b>Set by you</b>
                </div>
                <div className="lp-game-arrow">↗</div>
              </div>
              <div className="lp-game-row">
                <div className="lp-game-art art-two">
                  GP<span>02</span>
                </div>
                <div className="lp-game-info">
                  <strong>Another favourite</strong>
                  <small>Discount threshold configured</small>
                </div>
                <div className="lp-game-rule">
                  <span>DISCOUNT RULE</span>
                  <b>Set by you</b>
                </div>
                <div className="lp-game-arrow">↗</div>
              </div>
            </div>
          </div>
        </div>
      </div>
      <div className="lp-float-card lp-float-top">
        <span className="lp-float-icon">↘</span>
        <div>
          <strong>Your rules, your games</strong>
          <small>Track what matters to you</small>
        </div>
        <span className="lp-float-check">✓</span>
      </div>
      <div className="lp-float-card lp-float-bottom">
        <span className="lp-float-pulse">
          <i />
        </span>
        <div>
          <strong>Deal monitoring</strong>
          <small>Verification pipeline in progress</small>
        </div>
      </div>
    </div>
  );
}

export default function LandingPage() {
  const pageRef = useRef(null);
  const heroRef = useRef(null);

  useLayoutEffect(() => {
    const root = pageRef.current;
    if (!root) return undefined;
    const reduceMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;
    const handleAnchorClick = (event) => {
      const link = event.target.closest('a[href^="#"]');
      if (!link || !root.contains(link)) return;
      const selector = link.getAttribute("href");
      if (!selector || selector === "#") return;
      const target = root.querySelector(selector);
      if (!target) return;
      event.preventDefault();
      target.scrollIntoView({
        behavior: reduceMotion ? "auto" : "smooth",
        block: "start",
      });
    };
    root.addEventListener("click", handleAnchorClick);

    if (reduceMotion) {
      root
        .querySelectorAll(
          ".lp-reveal, .lp-hero-anim, .lp-preview-window, .lp-feature-card, .lp-step, .lp-cta-panel, .lp-manifesto-showcase",
        )
        .forEach((el) => {
          el.style.opacity = "1";
          el.style.visibility = "visible";
          el.style.transform = "none";
          el.style.filter = "none";
          el.style.clipPath = "none";
        });
      return () => root.removeEventListener("click", handleAnchorClick);
    }

    const ctx = gsap.context(() => {
      const heroTimeline = gsap.timeline({ defaults: { ease: "power3.out" } });
      heroTimeline
        .fromTo(
          ".lp-nav",
          { y: -24, autoAlpha: 0 },
          { y: 0, autoAlpha: 1, duration: 0.75 },
        )
        .fromTo(
          ".lp-hero-kicker",
          { y: 18, autoAlpha: 0, letterSpacing: "0.28em" },
          { y: 0, autoAlpha: 1, letterSpacing: "0.18em", duration: 0.65 },
          "-=0.35",
        )
        .fromTo(
          ".lp-hero-title-line",
          { yPercent: 115, rotateX: -18 },
          { yPercent: 0, rotateX: 0, duration: 1, stagger: 0.12 },
          "-=0.24",
        )
        .fromTo(
          ".lp-hero-copy, .lp-hero-actions, .lp-hero-proof",
          { y: 22, autoAlpha: 0 },
          { y: 0, autoAlpha: 1, duration: 0.7, stagger: 0.12 },
          "-=0.55",
        )
        .fromTo(
          ".lp-preview-window",
          { y: 58, autoAlpha: 0, rotateX: 7, scale: 0.96 },
          {
            y: 0,
            autoAlpha: 1,
            rotateX: 0,
            scale: 1,
            duration: 1.15,
            ease: "power3.out",
          },
          "-=0.8",
        )
        .fromTo(
          ".lp-float-card",
          { y: 18, autoAlpha: 0, scale: 0.92 },
          { y: 0, autoAlpha: 1, scale: 1, duration: 0.55, stagger: 0.14 },
          "-=0.45",
        );

      gsap.to(".lp-hero-orb.orb-a", {
        x: 34,
        y: -24,
        duration: 7,
        ease: "sine.inOut",
        yoyo: true,
        repeat: -1,
      });
      gsap.to(".lp-hero-orb.orb-b", {
        x: -24,
        y: 30,
        duration: 9,
        ease: "sine.inOut",
        yoyo: true,
        repeat: -1,
      });
      gsap.to(".lp-preview-window", {
        y: -9,
        duration: 3.5,
        ease: "sine.inOut",
        yoyo: true,
        repeat: -1,
        delay: 1.8,
      });
      gsap.to(".lp-float-top", {
        y: -8,
        duration: 2.8,
        ease: "sine.inOut",
        yoyo: true,
        repeat: -1,
        delay: 1.5,
      });
      gsap.to(".lp-float-bottom", {
        y: 7,
        duration: 3.2,
        ease: "sine.inOut",
        yoyo: true,
        repeat: -1,
        delay: 1.8,
      });

      gsap.utils.toArray(".lp-reveal").forEach((element) => {
        gsap.fromTo(
          element,
          { y: 44, autoAlpha: 0, filter: "blur(7px)" },
          {
            y: 0,
            autoAlpha: 1,
            filter: "blur(0px)",
            duration: 0.9,
            ease: "power3.out",
            scrollTrigger: { trigger: element, start: "top 86%", once: true },
          },
        );
      });

      const featureCards = gsap.utils.toArray(".lp-feature-card");
      const featureIntro = root.querySelector(".lp-feature-intro");
      const featureLayout = root.querySelector(".lp-feature-layout");
      const featureProgress = root.querySelector(".lp-feature-progress-fill");

      if (featureIntro) {
        gsap.fromTo(
          featureIntro.querySelectorAll(
            ".lp-eyebrow, h2, p, .lp-feature-progress, .lp-feature-explore",
          ),
          { y: 28, autoAlpha: 0, filter: "blur(5px)" },
          {
            y: 0,
            autoAlpha: 1,
            filter: "blur(0px)",
            duration: 0.8,
            stagger: 0.1,
            ease: "power3.out",
            scrollTrigger: {
              trigger: ".lp-feature-layout",
              start: "top 76%",
              once: true,
            },
          },
        );
      }

      // Desktop: pin the feature story and replace each card with the next one.
      // Keep the ScrollTrigger configuration separate from the timeline choreography.
      if (featureCards.length && featureLayout) {
        const featureMedia = gsap.matchMedia();

        featureMedia.add("(min-width: 801px)", () => {
          const cardInterval = 1;
          const transitionDuration = 0.62;
          const label = root.querySelector(".lp-feature-progress-label b");

          gsap.set(featureCards, {
            xPercent: 112,
            autoAlpha: 0,
            rotateY: -10,
            scale: 0.94,
            transformOrigin: "center center",
          });
          // Force the first feature card and all of its content into a real,
          // visible initial state before ScrollTrigger pins the section. This
          // avoids the empty-card flash until the first scroll update.
          gsap.set(featureCards[0], {
            xPercent: 0,
            x: 0,
            y: 0,
            autoAlpha: 1,
            visibility: "visible",
            rotateY: 0,
            scale: 1,
            clearProps: "filter",
          });
          featureCards[0].classList.add("is-in-focus");
          gsap.set(
            featureCards[0].querySelectorAll(
              ".lp-feature-top, .lp-feature-tag, h3, p, .lp-feature-arrow",
            ),
            {
              x: 0,
              y: 0,
              autoAlpha: 1,
              visibility: "visible",
              filter: "none",
              clearProps: "filter",
            },
          );

          const story = gsap.timeline({
            defaults: { ease: "power3.inOut" },
            scrollTrigger: {
              trigger: featureLayout,
              start: "top top+=88",
              end: () => `+=${Math.max(1800, featureCards.length * 760)}`,
              scrub: 0.65,
              pin: true,
              pinSpacing: true,
              anticipatePin: 1,
              invalidateOnRefresh: true,
              onUpdate: (self) => {
                const activeIndex = Math.min(
                  featureCards.length - 1,
                  Math.floor(self.progress * featureCards.length),
                );

                featureCards.forEach((card, index) => {
                  card.classList.toggle("is-in-focus", index === activeIndex);
                });

                if (label) {
                  label.textContent = String(activeIndex + 1).padStart(2, "0");
                }
                if (featureProgress) {
                  gsap.set(featureProgress, {
                    scaleY: self.progress,
                    transformOrigin: "top center",
                  });
                }
              },
            },
          });

          featureCards.forEach((card, index) => {
            const pieces = card.querySelectorAll(
              ".lp-feature-top, .lp-feature-tag, h3, p, .lp-feature-arrow",
            );

            const cardStart = index * cardInterval;

            // Card 01 must be readable immediately when the section is pinned.
            // Only cards entering later should have scroll-scrubbed text reveals.
            if (index === 0) {
              // Do not clear visibility after setting autoAlpha: that can
              // remove the explicit visible state left by earlier setup code.
              gsap.set(pieces, {
                x: 0,
                y: 0,
                autoAlpha: 1,
                visibility: "visible",
                filter: "none",
                clearProps: "filter",
              });

              return;
            }

            // Prepare upcoming cards' content for its entrance.
            gsap.set(pieces, {
              x: 22,
              autoAlpha: 0,
            });

            const previousCard = featureCards[index - 1];

            // Move the previous card out to the left.
            story.to(
              previousCard,
              {
                xPercent: -112,
                autoAlpha: 0,
                rotateY: 8,
                scale: 0.92,
                duration: transitionDuration,
              },
              cardStart,
            );

            // Bring the next card in from the right.
            story.fromTo(
              card,
              {
                xPercent: 112,
                autoAlpha: 0,
                rotateY: -10,
                scale: 0.94,
              },
              {
                xPercent: 0,
                autoAlpha: 1,
                rotateY: 0,
                scale: 1,
                duration: transitionDuration,
              },
              cardStart,
            );

            // Reveal the new card's content as it enters.
            story.to(
              pieces,
              {
                x: 0,
                autoAlpha: 1,
                duration: 0.38,
                stagger: 0.05,
                ease: "power2.out",
              },
              cardStart + 0.2,
            );
          });

          // Re-assert the initial state AFTER all timeline tweens have been
          // registered. GSAP's immediateRender on later fromTo tweens can
          // otherwise leave the first card's content hidden on first paint.
          const firstCard = featureCards[0];
          if (firstCard) {
            gsap.set(firstCard, {
              xPercent: 0,
              x: 0,
              y: 0,
              autoAlpha: 1,
              visibility: "visible",
              rotateY: 0,
              scale: 1,
            });
            gsap.set(
              firstCard.querySelectorAll(
                ".lp-feature-top, .lp-feature-tag, h3, p, .lp-feature-arrow",
              ),
              {
                x: 0,
                y: 0,
                autoAlpha: 1,
                visibility: "visible",
                clearProps: "filter",
              },
            );
            firstCard.classList.add("is-in-focus");
          }

          return () => {
            featureCards.forEach((card) =>
              card.classList.remove("is-in-focus"),
            );
            if (featureProgress)
              gsap.set(featureProgress, { clearProps: "transform" });
            if (label) label.textContent = "01";
          };
        });

        featureMedia.add("(max-width: 800px)", () => {
          gsap.set(featureCards, { clearProps: "all", autoAlpha: 1 });
          featureCards.forEach((card, index) => {
            gsap.fromTo(
              card,
              {
                x: index % 2 === 0 ? 36 : -36,
                y: 24,
                autoAlpha: 0,
                rotateY: index % 2 ? 4 : -4,
              },
              {
                x: 0,
                y: 0,
                autoAlpha: 1,
                rotateY: 0,
                duration: 0.75,
                ease: "power3.out",
                scrollTrigger: { trigger: card, start: "top 82%", once: true },
              },
            );
          });
        });
      }

      const stepCards = gsap.utils.toArray(".lp-step");
      gsap.fromTo(
        stepCards,
        {
          x: (index) => (index % 2 ? 54 : -54),
          y: (index) => (index === 1 ? 28 : 12),
          autoAlpha: 0,
          rotateY: (index) => (index % 2 ? -5 : 5),
          clipPath: "inset(0 0 100% 0)",
        },
        {
          x: 0,
          y: 0,
          autoAlpha: 1,
          rotateY: 0,
          clipPath: "inset(0 0 0% 0)",
          duration: 0.9,
          stagger: 0.18,
          ease: "power3.out",
          scrollTrigger: { trigger: ".lp-steps", start: "top 86%", once: true },
        },
      );

      // A scroll-linked progress rail drives the workflow instead of three generic reveals.
      gsap.fromTo(
        ".lp-steps-progress-fill",
        { scaleY: 0, transformOrigin: "top center" },
        {
          scaleY: 1,
          ease: "none",
          scrollTrigger: {
            trigger: ".lp-steps",
            start: "top 68%",
            end: "bottom 60%",
            scrub: 0.65,
          },
        },
      );
      if (stepCards.length) {
        const updateActiveStep = () => {
          const focusLine = window.innerHeight * 0.52;
          let closestStep = stepCards[0];
          let closestDistance = Infinity;
          stepCards.forEach((step) => {
            const rect = step.getBoundingClientRect();
            const center = rect.top + rect.height / 2;
            const distance = Math.abs(center - focusLine);
            if (distance < closestDistance) {
              closestDistance = distance;
              closestStep = step;
            }
          });
          stepCards.forEach((step) =>
            step.classList.toggle("is-active", step === closestStep),
          );
        };
        ScrollTrigger.create({
          trigger: ".lp-steps",
          start: "top bottom",
          end: "bottom top",
          onUpdate: updateActiveStep,
          onRefresh: updateActiveStep,
          onEnter: updateActiveStep,
          onEnterBack: updateActiveStep,
        });
        updateActiveStep();
      }
      stepCards.forEach((step) => {
        gsap.fromTo(
          step.querySelector(".lp-step-number span"),
          { scaleX: 0, transformOrigin: "left center" },
          {
            scaleX: 1,
            duration: 0.65,
            ease: "power3.out",
            scrollTrigger: { trigger: step, start: "top 78%", once: true },
          },
        );
      });

      // Pin the left-side explainer while the three workflow steps pass on desktop.
      const motionMedia = gsap.matchMedia();
      motionMedia.add("(min-width: 801px)", () => {
        ScrollTrigger.create({
          trigger: ".lp-how-section",
          start: "top 105px",
          endTrigger: ".lp-steps",
          end: "bottom 88%",
          pin: ".lp-how-intro",
          pinSpacing: false,
          anticipatePin: 1,
          invalidateOnRefresh: true,
        });
      });

      // Give the product preview a restrained scroll parallax, separate from its hero entrance.
      gsap.to(".lp-preview-wrap", {
        yPercent: -7,
        ease: "none",
        scrollTrigger: {
          trigger: ".lp-hero",
          start: "top top",
          end: "bottom top",
          scrub: 0.7,
        },
      });

      // The manifesto behaves like a live deal-terminal, not a generic two-column reveal.
      const manifesto = root.querySelector(".lp-manifesto");
      const showcase = root.querySelector(".lp-manifesto-showcase");
      if (manifesto && showcase) {
        const showcaseBits = showcase.querySelectorAll(
          ".lp-showcase-topline, .lp-showcase-game, .lp-showcase-price-card, .lp-showcase-bottom, .lp-manifesto-price-row",
        );
        const chartBars = showcase.querySelectorAll(
          ".lp-showcase-chart > span",
        );
        const chartLine = showcase.querySelector(".lp-showcase-chart path");

        gsap.set(showcase, {
          autoAlpha: 1,
          clipPath: "inset(0 0 0 0 round 18px)",
          transformPerspective: 1200,
          transformOrigin: "50% 50%",
        });
        ScrollTrigger.create({
          trigger: manifesto,
          start: "top 72%",
          once: true,
          onEnter: () => showcase.classList.add("is-scanning"),
        });
        gsap.fromTo(
          showcase,
          {
            autoAlpha: 0,
            clipPath: "inset(12% 8% 12% 8% round 28px)",
            rotateX: 7,
            rotateY: -8,
            scale: 0.92,
            y: 56,
          },
          {
            autoAlpha: 1,
            clipPath: "inset(0% 0% 0% 0% round 18px)",
            rotateX: 0,
            rotateY: 0,
            scale: 1,
            y: 0,
            duration: 1.25,
            ease: "power4.out",
            scrollTrigger: {
              trigger: manifesto,
              start: "top 72%",
              once: true,
            },
          },
        );

        gsap.fromTo(
          showcaseBits,
          { y: 22, autoAlpha: 0, filter: "blur(5px)" },
          {
            y: 0,
            autoAlpha: 1,
            filter: "blur(0px)",
            duration: 0.7,
            stagger: 0.13,
            ease: "power3.out",
            scrollTrigger: {
              trigger: manifesto,
              start: "top 65%",
              once: true,
            },
          },
        );

        // The price history animates like a market chart: bars rise, then the price line draws.
        gsap.fromTo(
          chartBars,
          { scaleY: 0.08, transformOrigin: "bottom center", autoAlpha: 0.3 },
          {
            scaleY: 1,
            autoAlpha: 1,
            duration: 0.65,
            stagger: 0.045,
            ease: "back.out(1.35)",
            scrollTrigger: {
              trigger: showcase,
              start: "top 64%",
              once: true,
            },
          },
        );

        if (chartLine) {
          let lineLength;

          try {
            lineLength = chartLine.getTotalLength();
          } catch {
            lineLength = null;
          }

          if (lineLength > 0) {
            gsap.set(chartLine, {
              strokeDasharray: lineLength,
              strokeDashoffset: lineLength,
            });

            gsap.to(chartLine, {
              strokeDashoffset: 0,
              duration: 1.35,
              delay: 0.35,
              ease: "power2.inOut",
              scrollTrigger: {
                trigger: showcase,
                start: "top 64%",
                once: true,
              },
            });
          }
        }

        // Subtle scroll-linked depth gives the preview a little parallax without fighting the page.
        gsap.to(".lp-showcase-chart", {
          y: -8,
          ease: "none",
          scrollTrigger: {
            trigger: manifesto,
            start: "top bottom",
            end: "bottom top",
            scrub: 0.7,
          },
        });

        gsap.fromTo(
          ".lp-manifesto-topline > *",
          { y: 16, autoAlpha: 0, filter: "blur(5px)" },
          {
            y: 0,
            autoAlpha: 1,
            filter: "blur(0px)",
            duration: 0.7,
            stagger: 0.1,
            ease: "power3.out",
            scrollTrigger: {
              trigger: ".lp-manifesto-content",
              start: "top 78%",
              once: true,
            },
          },
        );
        gsap.fromTo(
          ".lp-manifesto-heading > p",
          { y: 34, autoAlpha: 0, rotateX: -8, filter: "blur(8px)" },
          {
            y: 0,
            autoAlpha: 1,
            rotateX: 0,
            filter: "blur(0px)",
            duration: 1,
            stagger: 0.2,
            ease: "power4.out",
            scrollTrigger: {
              trigger: ".lp-manifesto-content",
              start: "top 78%",
              once: true,
            },
          },
        );
        gsap.fromTo(
          ".lp-manifesto-footer",
          { y: 18, autoAlpha: 0 },
          {
            y: 0,
            autoAlpha: 1,
            duration: 0.75,
            delay: 0.2,
            ease: "power3.out",
            scrollTrigger: {
              trigger: ".lp-manifesto-content",
              start: "top 72%",
              once: true,
            },
          },
        );
      }

      gsap.fromTo(
        ".lp-cta-panel",
        {
          scale: 0.9,
          y: 70,
          autoAlpha: 0,
          clipPath: "inset(8% 3% 0 3% round 20px)",
        },
        {
          scale: 1,
          y: 0,
          autoAlpha: 1,
          clipPath: "inset(0% 0% 0 0% round 17px)",
          duration: 1.15,
          ease: "power4.out",
          scrollTrigger: {
            trigger: ".lp-cta-panel",
            start: "top 84%",
            once: true,
          },
        },
      );
      gsap.fromTo(
        ".lp-cta-content > *",
        { y: 24, autoAlpha: 0 },
        {
          y: 0,
          autoAlpha: 1,
          duration: 0.65,
          stagger: 0.1,
          ease: "power3.out",
          scrollTrigger: {
            trigger: ".lp-cta-panel",
            start: "top 76%",
            once: true,
          },
        },
      );
      gsap.fromTo(
        ".lp-cta-art",
        { x: 70, rotation: -16, scale: 0.8, autoAlpha: 0 },
        {
          x: 0,
          rotation: 0,
          scale: 1,
          autoAlpha: 1,
          duration: 1.2,
          ease: "power3.out",
          scrollTrigger: {
            trigger: ".lp-cta-panel",
            start: "top 78%",
            once: true,
          },
        },
      );
      gsap.to(".lp-ring.ring-one", {
        rotation: 360,
        duration: 24,
        ease: "none",
        repeat: -1,
      });
      gsap.to(".lp-ring.ring-two", {
        rotation: -360,
        duration: 32,
        ease: "none",
        repeat: -1,
      });
      gsap.to(".lp-hero-grid", {
        backgroundPosition: "100px 100px",
        duration: 18,
        ease: "none",
        repeat: -1,
      });
    }, root);

    return () => {
      root.removeEventListener("click", handleAnchorClick);
      ctx.revert();
    };
  }, []);

  return (
    <main className="lp-page" ref={pageRef}>
      <div className="lp-noise" aria-hidden="true" />
      <header className="lp-nav">
        <Link to="/" className="lp-brand" aria-label="GamePulse home">
          <GamePulseLogo size={39} />
        </Link>
        <nav className="lp-nav-links" aria-label="Main navigation">
          <a href="#features">Features</a>
          <a href="#how-it-works">How it works</a>
        </nav>
        <div className="lp-nav-actions">
          <Link className="lp-signin" to="/login">
            Sign in
          </Link>
          <Link className="lp-nav-cta" to="/signup">
            Get started <ArrowIcon />
          </Link>
        </div>
      </header>

      <section className="lp-hero" ref={heroRef}>
        <div className="lp-hero-grid" aria-hidden="true" />
        <div className="lp-hero-orb orb-a" aria-hidden="true" />
        <div className="lp-hero-orb orb-b" aria-hidden="true" />
        <div className="lp-hero-inner">
          <div className="lp-hero-copy-col">
            <div className="lp-hero-kicker">
              <span className="lp-kicker-line" /> THE SMARTER WAY TO WATCH GAME
              DEALS
            </div>
            <h1 className="lp-hero-title">
              <span>
                <span className="lp-hero-title-line">Your next</span>
              </span>
              <span>
                <span className="lp-hero-title-line">favourite game.</span>
              </span>
              <span>
                <span className="lp-hero-title-line lp-title-accent">
                  A better price.
                </span>
              </span>
            </h1>
            <p className="lp-hero-copy">
              Build your game wishlist around the prices <em>you</em> want. Set
              your rules, follow the games you love, and make your next purchase
              a smarter one.
            </p>
            <div className="lp-hero-actions">
              <Link to="/signup" className="lp-primary-btn">
                Build your watchlist <ArrowIcon />
              </Link>
              <a href="#how-it-works" className="lp-secondary-btn">
                See how it works <span>↓</span>
              </a>
            </div>
            <div className="lp-hero-proof">
              <span className="lp-proof-mark">✳</span>
              <span>Personal game tracking</span>
              <i /> <span>Custom price rules</span>
              <i /> <span>Made for your next deal</span>
            </div>
          </div>
          <DashboardPreview />
        </div>
        <a href="#features" className="lp-scroll-cue">
          <span className="lp-scroll-wheel" /> SCROLL TO EXPLORE{" "}
          <span className="lp-scroll-line" />
        </a>
      </section>

      <section className="lp-trust-strip" aria-label="GamePulse principles">
        <div>
          <span className="lp-strip-symbol">✳</span> BUILT AROUND YOUR
          COLLECTION
        </div>
        <div>
          <span>01</span> YOUR GAMES
        </div>
        <div>
          <span>02</span> YOUR THRESHOLDS
        </div>
        <div>
          <span>03</span> YOUR NEXT DEAL
        </div>
      </section>

      <section id="features" className="lp-section lp-features-section">
        <div className="lp-feature-layout">
          <div className="lp-feature-intro">
            <span className="lp-eyebrow">
              <i /> LESS GUESSING. MORE GAMING.
            </span>
            <h2>
              Deals should find <em>your rules.</em>
            </h2>
            <p>
              Not another endless list of discounts. A focused space for the
              games you want and the prices you’re waiting for.
            </p>
            <div className="lp-feature-progress" aria-hidden="true">
              <span className="lp-feature-progress-track">
                <i className="lp-feature-progress-fill" />
              </span>
              <span className="lp-feature-progress-label">
                <b>01</b> / 03&nbsp; — YOUR DEAL WORKFLOW
              </span>
            </div>
            <a className="lp-feature-explore" href="#how-it-works">
              Explore how it works <ArrowIcon />
            </a>
          </div>
          <div className="lp-feature-grid">
            {features.map((feature) => (
              <article
                className={`lp-feature-card${feature.number === "01" ? " is-in-focus" : ""}`}
                key={feature.number}
              >
                <div className="lp-feature-top">
                  <span className="lp-feature-index">
                    FEATURE / {feature.number}
                  </span>
                  <span className="lp-feature-icon">{feature.icon}</span>
                </div>
                <div className="lp-feature-bottom">
                  <span className="lp-feature-tag">{feature.tag}</span>
                  <h3>{feature.title}</h3>
                  <p>{feature.description}</p>
                  <div className="lp-feature-arrow">
                    <ArrowIcon />
                  </div>
                </div>
                <span className="lp-feature-watermark" aria-hidden="true">
                  {feature.number}
                </span>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section id="how-it-works" className="lp-section lp-how-section">
        <div className="lp-how-intro lp-reveal">
          <span className="lp-eyebrow">
            <i /> SIMPLE BY DESIGN
          </span>
          <h2>
            Three steps.
            <br />
            <em>One smarter wishlist.</em>
          </h2>
          <p>
            Set up the collection once. Keep your attention on the games you
            actually want to play.
          </p>
        </div>
        <div className="lp-steps">
          <div className="lp-steps-progress" aria-hidden="true">
            <span className="lp-steps-progress-fill" />
          </div>
          {steps.map(([number, title, description]) => (
            <article className="lp-step" key={number}>
              <div className="lp-step-number">
                {number}
                <span />
              </div>
              <div className="lp-step-content">
                <h3>{title}</h3>
                <p>{description}</p>
              </div>
              <span className="lp-step-corner">↗</span>
            </article>
          ))}
        </div>
      </section>

      <section className="lp-manifesto">
        <div className="lp-manifesto-grid" aria-hidden="true" />
        <div className="lp-manifesto-content">
          <div className="lp-manifesto-topline">
            <span className="lp-eyebrow">
              <i /> YOUR COLLECTION, YOUR CALL
            </span>
            <span className="lp-manifesto-index">GAMEPULSE / 001</span>
          </div>

          <div className="lp-manifesto-heading">
            <p>
              Wishlist with <span>intention.</span>
            </p>
            <p>
              Buy when the <span>time is right.</span>
            </p>
          </div>

          <div className="lp-manifesto-footer">
            <span className="lp-manifesto-marker" aria-hidden="true">
              <i />
            </span>
            <small>
              Keep the games you care about — and the price you’re waiting for —
              in one place.
            </small>
            <span className="lp-manifesto-status">
              <i /> PLAY THE WAITING GAME DIFFERENTLY
            </span>
          </div>
        </div>

        <div
          className="lp-manifesto-showcase"
          aria-label="Illustrative GamePulse price tracking interface"
        >
          <div className="lp-showcase-topline">
            <span>
              <i /> PERSONAL PRICE TARGET
            </span>
            <span className="lp-showcase-live">
              <i /> RULE PREVIEW
            </span>
          </div>

          <div className="lp-showcase-game">
            <div className="lp-showcase-cover" aria-hidden="true">
              GP
              <i />
            </div>
            <div className="lp-showcase-game-copy">
              <small>YOUR WATCHLIST</small>
              <strong>Next game. Better price.</strong>
              <span>One rule, checked against your target.</span>
            </div>
            <span className="lp-showcase-arrow" aria-hidden="true">
              ↗
            </span>
          </div>

          <div className="lp-showcase-price-card">
            <div className="lp-showcase-price-copy">
              <small>YOUR TARGET</small>
              <strong>₹1,599.60</strong>
              <span>
                <i /> Waiting for your price
              </span>
            </div>
            <div
              className="lp-showcase-chart"
              aria-label="Illustrative downward price trend"
            >
              {Array.from({ length: 12 }, (_, index) => (
                <span key={index} style={{ "--i": index }} />
              ))}
              <svg
                viewBox="0 0 320 72"
                preserveAspectRatio="none"
                aria-hidden="true"
              >
                <path d="M4 15 C24 16 28 31 48 30 S77 33 91 38 S118 29 137 37 S165 47 183 43 S209 49 228 45 S253 55 269 51 S294 59 316 57" />
              </svg>
            </div>
          </div>

          <div className="lp-showcase-bottom">
            <div className="lp-manifesto-mini-stat">
              <span className="lp-mini-stat-icon" aria-hidden="true">
                ↘
              </span>
              <span>
                <small>PRICE RULE</small>
                <strong>Target reached</strong>
              </span>
              <b>01</b>
            </div>
            <div className="lp-manifesto-mini-stat">
              <span className="lp-mini-stat-icon" aria-hidden="true">
                ◎
              </span>
              <span>
                <small>YOUR COLLECTION</small>
                <strong>Always yours</strong>
              </span>
              <b>02</b>
            </div>
          </div>

          <div className="lp-manifesto-price-row">
            <span>GAMEPULSE / SMARTER BUYING</span>
            <span>
              MADE FOR YOUR RULES <i>↗</i>
            </span>
          </div>
        </div>
      </section>

      <section className="lp-cta-section">
        <div className="lp-cta-panel">
          <div className="lp-cta-glow" />
          <div className="lp-cta-content">
            <span className="lp-eyebrow">
              <i /> YOUR NEXT DEAL STARTS HERE
            </span>
            <h2>
              Ready when the
              <br />
              <em>price is right.</em>
            </h2>
            <p>
              Create your collection and start setting the rules for your next
              game deal.
            </p>
            <div className="lp-cta-actions">
              <Link to="/signup" className="lp-primary-btn">
                Create your free account <ArrowIcon />
              </Link>
              <Link to="/login" className="lp-secondary-btn">
                Already have an account? Sign in
              </Link>
            </div>
            <span className="lp-cta-footnote">
              Price monitoring and notifications are still being connected.
            </span>
          </div>
          <div className="lp-cta-art" aria-hidden="true">
            <div className="lp-ring ring-one" />
            <div className="lp-ring ring-two" />
            <div className="lp-ring ring-three" />
            <div className="lp-cta-glyph">
              G<span>•</span>
            </div>
            <div className="lp-art-cross cross-one">+</div>
            <div className="lp-art-cross cross-two">✳</div>
          </div>
        </div>
      </section>

      <footer className="lp-footer">
        <Link to="/" className="lp-footer-brand">
          <GamePulseLogo size={34} />
        </Link>
        <span>Built for smarter game deals.</span>
        <div>
          <a href="#features">Features</a>
          <a href="#how-it-works">How it works</a>
          <Link to="/login">Sign in</Link>
        </div>
        <small>© {new Date().getFullYear()} GamePulse</small>
      </footer>
    </main>
  );
}
