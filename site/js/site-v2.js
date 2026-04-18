document.addEventListener("DOMContentLoaded", () => {
    const hero = document.querySelector(".js-hero-lab");
    const heroVideo = hero?.querySelector(".js-hero-lab-video");
    const ambientVideos = Array.from(document.querySelectorAll(".js-ambient-video"));
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

    function tryPlayVideo(video) {
        if (!(video instanceof HTMLVideoElement)) {
            return;
        }

        video.muted = true;
        video.defaultMuted = true;
        video.playsInline = true;

        const playAttempt = video.play();
        if (playAttempt && typeof playAttempt.catch === "function") {
            playAttempt.catch(() => {
                // No hacemos ruido si el navegador retrasa el autoplay.
            });
        }
    }

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

    if (!prefersReducedMotion.matches && ambientVideos.length > 0) {
        ambientVideos.forEach((video) => {
            tryPlayVideo(video);
            video.addEventListener("canplay", () => {
                tryPlayVideo(video);
            }, { once: true });
        });

        if ("IntersectionObserver" in window) {
            const ambientVideoObserver = new IntersectionObserver((entries) => {
                entries.forEach((entry) => {
                    if (!(entry.target instanceof HTMLVideoElement)) {
                        return;
                    }

                    if (entry.isIntersecting) {
                        tryPlayVideo(entry.target);
                        return;
                    }

                    entry.target.pause();
                });
            }, {
                threshold: 0.2
            });

            ambientVideos.forEach((video) => {
                ambientVideoObserver.observe(video);
            });
        }

        document.addEventListener("visibilitychange", () => {
            if (document.visibilityState === "visible") {
                ambientVideos.forEach((video) => {
                    tryPlayVideo(video);
                });
            }
        });
    }

    const megaNavItems = Array.from(document.querySelectorAll(".js-nav-mega"));
    const hoverCapable = window.matchMedia("(hover: hover) and (pointer: fine)");

    if (megaNavItems.length > 0) {
        let megaMenuCloseTimer = null;

        function setMegaMenuState(openItem = null) {
            megaNavItems.forEach((item) => {
                const trigger = item.querySelector(".lab-nav__trigger");
                const isOpen = item === openItem;
                item.classList.toggle("is-open", isOpen);
                if (trigger) {
                    trigger.setAttribute("aria-expanded", String(isOpen));
                }
            });
        }

        function clearMegaMenuCloseTimer() {
            if (megaMenuCloseTimer !== null) {
                window.clearTimeout(megaMenuCloseTimer);
                megaMenuCloseTimer = null;
            }
        }

        function scheduleMegaMenuClose() {
            clearMegaMenuCloseTimer();
            megaMenuCloseTimer = window.setTimeout(() => {
                setMegaMenuState(null);
            }, 320);
        }

        megaNavItems.forEach((item) => {
            const trigger = item.querySelector(".lab-nav__trigger");
            const panel = item.querySelector(".lab-nav__panel");

            trigger?.addEventListener("click", (event) => {
                event.preventDefault();
                if (hoverCapable.matches) {
                    clearMegaMenuCloseTimer();
                    setMegaMenuState(item);
                    trigger.blur();
                    return;
                }

                const shouldOpen = !item.classList.contains("is-open");
                setMegaMenuState(shouldOpen ? item : null);
            });

            trigger?.addEventListener("mouseenter", () => {
                if (hoverCapable.matches) {
                    clearMegaMenuCloseTimer();
                    setMegaMenuState(item);
                }
            });

            trigger?.addEventListener("mouseleave", () => {
                if (hoverCapable.matches) {
                    scheduleMegaMenuClose();
                }
            });

            panel?.addEventListener("mouseenter", () => {
                if (hoverCapable.matches) {
                    clearMegaMenuCloseTimer();
                    setMegaMenuState(item);
                }
            });

            panel?.addEventListener("mouseleave", () => {
                if (hoverCapable.matches) {
                    scheduleMegaMenuClose();
                }
            });
        });

        document.addEventListener("click", (event) => {
            clearMegaMenuCloseTimer();
            if (!megaNavItems.some((item) => item.contains(event.target))) {
                setMegaMenuState(null);
            }
        });

        document.addEventListener("keydown", (event) => {
            if (event.key === "Escape") {
                clearMegaMenuCloseTimer();
                setMegaMenuState(null);
            }
        });
    }

    const analyticsLinks = Array.from(document.querySelectorAll("a[data-analytics-event]"));
    const analyticsDebugEnabled = window.location.search.includes("analyticsDebug=1") ||
        window.__ANALYTICS_DEBUG__ === true;

    function normalizeAnalyticsValue(value) {
        return String(value || "").trim();
    }

    function getLinkDestination(link) {
        const rawHref = normalizeAnalyticsValue(link.getAttribute("href"));

        if (!rawHref) {
            return {
                destinationPath: "",
                destinationHost: ""
            };
        }

        try {
            const destination = new URL(rawHref, window.location.href);
            return {
                destinationPath: normalizeAnalyticsValue(destination.pathname),
                destinationHost: normalizeAnalyticsValue(destination.host)
            };
        } catch (error) {
            return {
                destinationPath: rawHref,
                destinationHost: ""
            };
        }
    }

    function emitAnalyticsEvent(eventName, payload) {
        const safePayload = { ...payload };
        const dataLayerPayload = { event: eventName, ...safePayload };

        if (window.google_tag_manager) {
            window.dataLayer = window.dataLayer || [];
            window.dataLayer.push(dataLayerPayload);
        } else if (typeof window.gtag === "function") {
            window.gtag("event", eventName, safePayload);
        } else {
            window.dataLayer = window.dataLayer || [];
            window.dataLayer.push(dataLayerPayload);
        }

        document.dispatchEvent(new CustomEvent("dynasty:analytics", {
            detail: {
                event: eventName,
                payload: safePayload
            }
        }));

        if (analyticsDebugEnabled && typeof console !== "undefined" && typeof console.info === "function") {
            console.info("[dynasty-analytics]", eventName, safePayload);
        }
    }

    function storeReservationAttribution(payload) {
        try {
            window.sessionStorage.setItem("dynastyReservationAttribution", JSON.stringify({
                ...payload,
                captured_at: new Date().toISOString()
            }));
        } catch (error) {
            // Ignore sessionStorage failures in private browsing or restricted contexts.
        }
    }

    if (analyticsLinks.length > 0) {
        analyticsLinks.forEach((link) => {
            link.addEventListener("click", () => {
                const eventName = normalizeAnalyticsValue(link.dataset.analyticsEvent);
                if (!eventName) {
                    return;
                }

                const { destinationPath, destinationHost } = getLinkDestination(link);
                const clusterName = normalizeAnalyticsValue(link.dataset.analyticsCluster) || "services";
                const payload = {
                    cluster_name: clusterName,
                    service_name: normalizeAnalyticsValue(link.dataset.analyticsService),
                    location_name: normalizeAnalyticsValue(link.dataset.analyticsLocation),
                    cta_placement: normalizeAnalyticsValue(link.dataset.analyticsPlacement),
                    cta_channel: normalizeAnalyticsValue(link.dataset.analyticsChannel),
                    cta_label: normalizeAnalyticsValue(link.textContent),
                    page_path: normalizeAnalyticsValue(window.location.pathname),
                    page_title: normalizeAnalyticsValue(document.title),
                    destination_path: destinationPath,
                    destination_host: destinationHost
                };

                if (!payload.service_name) {
                    delete payload.service_name;
                }

                if (!payload.location_name) {
                    delete payload.location_name;
                }

                if (eventName.endsWith("_reservation_click")) {
                    storeReservationAttribution(payload);
                }

                emitAnalyticsEvent(eventName, payload);
            });
        });
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
