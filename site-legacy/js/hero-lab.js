document.addEventListener("DOMContentLoaded", () => {
    const hero = document.querySelector(".js-hero-lab");
    const heroVideo = hero?.querySelector(".js-hero-lab-video");
    const overlay = document.querySelector(".hero-lab-overlay");
    const openButton = document.querySelector(".js-hero-lab-open");
    const closeButtons = overlay ? overlay.querySelectorAll("[data-overlay-close]") : [];
    const firstInput = overlay ? overlay.querySelector(".hero-lab-overlay__input") : null;

    const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
    const introMemoryKey = "__heroLabIntroSeen";

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
        hero.classList.add("is-intro-enabled", "is-body-visible", "is-launcher-visible", "is-intro-complete");
        hero.classList.remove("is-mark-active");
        introStarted = true;
        introComplete = true;
        markIntroSeenInMemory();
    }

    function runHeroIntro() {
        if (!hero || introStarted) {
            return;
        }

        hero.classList.add("is-intro-enabled");
        introStarted = true;

        introTimers.push(window.setTimeout(() => {
            hero.classList.add("is-body-visible");
        }, 1600));

        introTimers.push(window.setTimeout(() => {
            hero.classList.add("is-mark-active");
        }, 2350));

        introTimers.push(window.setTimeout(() => {
            hero.classList.add("is-launcher-visible");
        }, 3400));

        introTimers.push(window.setTimeout(() => {
            hero.classList.remove("is-mark-active");
            hero.classList.add("is-intro-complete");
            introComplete = true;
            markIntroSeenInMemory();
        }, 5000));
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
            hero.classList.add("is-intro-enabled");
            heroVideo?.addEventListener("play", runHeroIntro, { once: true });

            // Fallback por si el evento play tarda o el navegador trata raro el autoplay.
            introTimers.push(window.setTimeout(runHeroIntro, 900));

            document.addEventListener("scroll", maybeSkipIntro, { once: true, passive: true });
            hero.addEventListener("pointerdown", maybeSkipIntro, { once: true });
        }
    }

    if (!overlay || !openButton) {
        return;
    }

    function setOverlayState(isOpen) {
        document.body.classList.toggle("hero-lab-overlay-open", isOpen);
        overlay.classList.toggle("is-open", isOpen);
        overlay.setAttribute("aria-hidden", String(!isOpen));
        openButton.setAttribute("aria-expanded", String(isOpen));

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
            openButton.focus();
        }
    }

    openButton.addEventListener("click", () => {
        setOverlayState(true);
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
