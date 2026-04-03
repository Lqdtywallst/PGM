document.addEventListener("DOMContentLoaded", () => {
    const hero = document.querySelector(".js-hero-lab");
    const heroVideo = hero?.querySelector(".js-hero-lab-video");
    const overlay = document.querySelector(".hero-lab-overlay");
    const openButtons = Array.from(document.querySelectorAll(".js-booking-open"));
    const closeButtons = overlay ? overlay.querySelectorAll("[data-overlay-close]") : [];
    const firstInput = overlay ? overlay.querySelector(".hero-lab-overlay__input") : null;

    const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
    const introMemoryKey = "__siteV2HeroIntroSeen";
    const heroIntroTimings = {
        startDelay: 120,
        bodyVisible: 320,
        markActive: 1500,
        launcherVisible: 2450,
        complete: 3600
    };

    let introTimers = [];
    let introStarted = false;
    let introComplete = false;
    let lastFocusedElement = null;

    function clearIntroTimers() {
        introTimers.forEach((timerId) => {
            window.clearTimeout(timerId);
        });
        introTimers = [];
    }

    function wasIntroSeenInMemory() {
        return window[introMemoryKey] === true;
    }

    function markIntroSeenInMemory() {
        window[introMemoryKey] = true;
    }

    function revealHeroImmediately() {
        if (!hero) {
            return;
        }

        clearIntroTimers();
        hero.classList.add("is-intro-bypass");
        hero.classList.remove("hero-lab--intro-pending", "is-mark-active");
        hero.classList.add("is-intro-enabled", "is-body-visible", "is-launcher-visible", "is-intro-complete");
        introStarted = true;
        introComplete = true;
        markIntroSeenInMemory();
    }

    function runHeroIntro() {
        if (!hero || introStarted) {
            return;
        }

        hero.classList.add("is-intro-enabled");
        hero.classList.remove("hero-lab--intro-pending");
        introStarted = true;

        introTimers.push(window.setTimeout(() => {
            hero.classList.add("is-body-visible");
        }, heroIntroTimings.bodyVisible));

        introTimers.push(window.setTimeout(() => {
            hero.classList.add("is-mark-active");
        }, heroIntroTimings.markActive));

        introTimers.push(window.setTimeout(() => {
            hero.classList.add("is-launcher-visible");
        }, heroIntroTimings.launcherVisible));

        introTimers.push(window.setTimeout(() => {
            hero.classList.remove("is-mark-active");
            hero.classList.add("is-intro-complete");
            introComplete = true;
            markIntroSeenInMemory();
        }, heroIntroTimings.complete));
    }

    function maybeSkipIntro() {
        if (!introComplete) {
            revealHeroImmediately();
        }
    }

    if (hero) {
        if (prefersReducedMotion.matches || wasIntroSeenInMemory()) {
            revealHeroImmediately();
        } else {
            heroVideo?.addEventListener("play", runHeroIntro, { once: true });

            // Arranca la intro casi al momento; no dependemos del evento play para enseñar el copy.
            introTimers.push(window.setTimeout(runHeroIntro, heroIntroTimings.startDelay));

            document.addEventListener("scroll", maybeSkipIntro, { once: true, passive: true });
            hero.addEventListener("pointerdown", maybeSkipIntro, { once: true });
        }
    }

    if (!overlay || openButtons.length === 0) {
        return;
    }

    function setOverlayState(isOpen) {
        document.body.classList.toggle("hero-lab-overlay-open", isOpen);
        overlay.classList.toggle("is-open", isOpen);
        overlay.setAttribute("aria-hidden", String(!isOpen));
        openButtons.forEach((button) => {
            button.setAttribute("aria-expanded", String(isOpen));
        });

        if (isOpen) {
            lastFocusedElement = document.activeElement;
            window.requestAnimationFrame(() => {
                firstInput?.focus();
            });
            return;
        }

        if (lastFocusedElement instanceof HTMLElement) {
            lastFocusedElement.focus();
        } else {
            openButtons[0].focus();
        }
    }

    openButtons.forEach((button) => {
        button.addEventListener("click", () => {
            setOverlayState(true);
        });
    });

    closeButtons.forEach((button) => {
        button.addEventListener("click", () => {
            setOverlayState(false);
        });
    });

    overlay.addEventListener("submit", (event) => {
        event.preventDefault();
    });

    document.addEventListener("keydown", (event) => {
        if (event.key === "Escape" && overlay.classList.contains("is-open")) {
            setOverlayState(false);
        }
    });
});
