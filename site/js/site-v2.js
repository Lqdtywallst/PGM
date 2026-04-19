document.addEventListener("DOMContentLoaded", () => {
    const header = document.querySelector(".lab-header");
    const hero = document.querySelector(".js-hero-lab");
    const heroVideo = hero?.querySelector(".js-hero-lab-video");
    const ambientVideos = Array.from(document.querySelectorAll(".js-ambient-video"));
    const overlay = document.querySelector(".hero-lab-overlay");
    const overlayForm = overlay?.querySelector(".hero-lab-overlay__form");
    const openButtons = Array.from(document.querySelectorAll(".js-booking-open"));
    const closeButtons = overlay ? overlay.querySelectorAll("[data-overlay-close]") : [];
    const firstInput = overlay ? overlay.querySelector(".hero-lab-overlay__input") : null;
    const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
    const coarsePointer = window.matchMedia("(pointer: coarse)");
    const mobileViewport = window.matchMedia("(max-width: 860px)");
    const shouldSimplifyHero = coarsePointer.matches || mobileViewport.matches;
    const shouldBypassHeroIntro = document.body.classList.contains("home-page");
    const introMemoryKey = "__siteV2HeroIntroSeen";
    const BOOKING_INTENT_KEY = "dynastyBookingIntent";
    const DEFAULT_WHATSAPP_URL = "https://wa.me/971586122568?text=Hi%2C%20I%20would%20like%20help%20booking%20a%20car%20in%20Dubai.";
    const fleetBrandFilterMap = {
        lamborghini: "lamborghini",
        ferrari: "ferrari",
        mercedes: "mercedes",
        porsche: "porsche",
        "rolls-royce": "rolls-royce"
    };
    const fleetTypeFilterMap = {
        "luxury cars": "luxury",
        "convertible cars": "convertible",
        "sports cars": "sports",
        "electric cars": "electric",
        "suv cars": "suv"
    };
    const heroIntroTimings = {
        startDelay: 120,
        bodyVisible: 320,
        markActive: 1500,
        launcherVisible: 2450,
        complete: 3600
    };
    const homeBookingForm = document.querySelector(".js-home-booking-form");
    const homePickupDateInput = document.getElementById("home-pickup-date");
    const homeReturnDateInput = document.getElementById("home-return-date");
    const homePickupTimeInput = document.getElementById("home-pickup-time");
    const homeReturnTimeInput = document.getElementById("home-return-time");

    let introTimers = [];
    let introStarted = false;
    let introComplete = false;
    let lastFocusedElement = null;

    if (overlay) {
        overlay.setAttribute("aria-hidden", "true");
        overlay.setAttribute("inert", "");
    }

    function normalizeBookingValue(value) {
        return String(value || "").trim();
    }

    function getStoredBookingIntent() {
        try {
            const rawIntent = window.sessionStorage.getItem(BOOKING_INTENT_KEY);

            if (!rawIntent) {
                return null;
            }

            const parsedIntent = JSON.parse(rawIntent);
            return parsedIntent && typeof parsedIntent === "object" ? parsedIntent : null;
        } catch (error) {
            return null;
        }
    }

    function storeBookingIntent(bookingIntent) {
        const normalizedIntent = {
            car: normalizeBookingValue(bookingIntent?.car),
            price: normalizeBookingValue(bookingIntent?.price),
            startDate: normalizeBookingValue(bookingIntent?.startDate),
            endDate: normalizeBookingValue(bookingIntent?.endDate),
            pickupTime: normalizeBookingValue(bookingIntent?.pickupTime),
            dropoffTime: normalizeBookingValue(bookingIntent?.dropoffTime),
            savedAt: Date.now()
        };

        try {
            window.sessionStorage.setItem(BOOKING_INTENT_KEY, JSON.stringify(normalizedIntent));
        } catch (error) {
            // Ignore sessionStorage failures.
        }

        return normalizedIntent;
    }

    function buildBookingQuery(bookingIntent) {
        const params = new URLSearchParams();

        [
            ["car", bookingIntent?.car],
            ["price", bookingIntent?.price],
            ["startDate", bookingIntent?.startDate],
            ["endDate", bookingIntent?.endDate],
            ["pickupTime", bookingIntent?.pickupTime],
            ["dropoffTime", bookingIntent?.dropoffTime]
        ].forEach(([key, value]) => {
            const normalizedValue = normalizeBookingValue(value);
            if (normalizedValue) {
                params.set(key, normalizedValue);
            }
        });

        return params;
    }

    function buildFleetFilterHref(filterKey, filterValue) {
        const params = new URLSearchParams();
        params.set(filterKey, filterValue);
        return `./fleet.html?${params.toString()}`;
    }

    function getDubaiDateString(offsetDays = 0) {
        const dubaiNow = new Date(new Date().toLocaleString("en-US", { timeZone: "Asia/Dubai" }));
        dubaiNow.setDate(dubaiNow.getDate() + offsetDays);
        const year = dubaiNow.getFullYear();
        const month = String(dubaiNow.getMonth() + 1).padStart(2, "0");
        const day = String(dubaiNow.getDate()).padStart(2, "0");
        return `${year}-${month}-${day}`;
    }

    function buildTimeOptions(select, selectedValue) {
        if (!(select instanceof HTMLSelectElement)) {
            return;
        }

        const values = [];
        for (let hour = 9; hour <= 22; hour += 1) {
            values.push(`${String(hour).padStart(2, "0")}:00`);
        }

        select.innerHTML = values.map((value) => `<option value="${value}">${value}</option>`).join("");
        select.value = values.includes(selectedValue) ? selectedValue : "12:00";
    }

    function setHeaderScrollState() {
        if (!header) {
            return;
        }

        header.classList.toggle("is-scrolled", window.scrollY > 18);
    }

    function initFleetFilterLinks() {
        document.querySelectorAll(".lab-nav__panel--brands .lab-nav__card").forEach((link) => {
            const label = normalizeBookingValue(link.querySelector("strong")?.textContent).toLowerCase();
            const brand = fleetBrandFilterMap[label];

            if (brand) {
                link.setAttribute("href", buildFleetFilterHref("brand", brand));
            }
        });

        document.querySelectorAll(".lab-nav__panel--types .lab-nav__card").forEach((link) => {
            const label = normalizeBookingValue(link.querySelector("strong")?.textContent).toLowerCase();
            const type = fleetTypeFilterMap[label];

            if (type) {
                link.setAttribute("href", buildFleetFilterHref("type", type));
            }
        });
    }

    function hydrateHeroVideo() {
        if (!(heroVideo instanceof HTMLVideoElement) || shouldSimplifyHero) {
            return;
        }

        const source = heroVideo.querySelector("source[data-src]");
        if (source && !source.getAttribute("src")) {
            source.setAttribute("src", source.dataset.src || "");
            heroVideo.load();
        }

        tryPlayVideo(heroVideo);
    }

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
        if (prefersReducedMotion.matches || wasIntroSeenInMemory() || shouldSimplifyHero || shouldBypassHeroIntro) {
            hero.classList.add("hero-lab--mobile-ready");
            revealHeroImmediately();
        } else {
            hydrateHeroVideo();
            heroVideo?.addEventListener("play", runHeroIntro, { once: true });

            // Arranca la intro casi al momento; no dependemos del evento play para enseñar el copy.
            introTimers.push(window.setTimeout(runHeroIntro, heroIntroTimings.startDelay));

            document.addEventListener("scroll", maybeSkipIntro, { once: true, passive: true });
            hero.addEventListener("pointerdown", maybeSkipIntro, { once: true });
        }
    }

    if (!prefersReducedMotion.matches && ambientVideos.length > 0) {
        if ("IntersectionObserver" in window) {
            const ambientVideoObserver = new IntersectionObserver((entries) => {
                entries.forEach((entry) => {
                    if (!(entry.target instanceof HTMLVideoElement)) {
                        return;
                    }

                    if (entry.isIntersecting) {
                        entry.target.dataset.inViewport = "true";
                        tryPlayVideo(entry.target);
                        return;
                    }

                    entry.target.dataset.inViewport = "false";
                    entry.target.pause();
                });
            }, {
                threshold: 0.2
            });

            ambientVideos.forEach((video) => {
                video.dataset.inViewport = "false";
                video.addEventListener("canplay", () => {
                    if (video.dataset.inViewport === "true") {
                        tryPlayVideo(video);
                    }
                });
                ambientVideoObserver.observe(video);
            });
        } else {
            ambientVideos.forEach((video) => {
                tryPlayVideo(video);
                video.addEventListener("canplay", () => {
                    tryPlayVideo(video);
                }, { once: true });
            });
        }

        document.addEventListener("visibilitychange", () => {
            if (document.visibilityState === "visible") {
                ambientVideos.forEach((video) => {
                    if (video.dataset.inViewport !== "false") {
                        tryPlayVideo(video);
                    }
                });
                return;
            }

            ambientVideos.forEach((video) => {
                video.pause();
            });
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

    function initMobileHeaderDrawer() {
        const headerInner = header?.querySelector(".lab-header__inner");
        const nav = header?.querySelector(".lab-nav");
        const headerNav = header?.querySelector(".lab-header__nav");

        if (!header || !headerInner || !nav || !headerNav || header.querySelector(".lab-mobile-toggle")) {
            return;
        }

        const mainLinks = Array.from(nav.children)
            .filter((item) => item.matches?.("a"))
            .map((link) => ({
                href: link.getAttribute("href") || "#",
                label: normalizeBookingValue(link.textContent),
                current: link.getAttribute("aria-current") === "page"
            }));

        const buildSectionLinks = (selector) => Array.from(nav.querySelectorAll(selector))
            .map((link) => `<a href="${link.getAttribute("href") || "#"}">${normalizeBookingValue(link.querySelector("strong")?.textContent || link.textContent)}</a>`)
            .join("");

        const toggle = document.createElement("button");
        toggle.type = "button";
        toggle.className = "lab-mobile-toggle";
        toggle.setAttribute("aria-expanded", "false");
        toggle.setAttribute("aria-controls", "lab-mobile-drawer");
        toggle.setAttribute("aria-label", "Open navigation");
        toggle.innerHTML = "<span></span><span></span><span></span>";
        headerInner.insertBefore(toggle, headerNav);

        const drawer = document.createElement("div");
        drawer.className = "lab-mobile-drawer";
        drawer.id = "lab-mobile-drawer";
        drawer.setAttribute("aria-hidden", "true");
        drawer.innerHTML = `
            <div class="lab-mobile-drawer__scrim" data-mobile-nav-close></div>
            <div class="lab-mobile-drawer__panel" role="dialog" aria-modal="true" aria-label="Mobile navigation">
                <div class="lab-mobile-drawer__header">
                    <strong>Dynasty Prestige</strong>
                    <button type="button" class="lab-mobile-drawer__close" data-mobile-nav-close>Close</button>
                </div>
                <div class="lab-mobile-drawer__section">
                    <span class="lab-mobile-drawer__label">Navigate</span>
                    <div class="lab-mobile-drawer__links">
                        ${mainLinks.map((link) => `<a href="${link.href}"${link.current ? " aria-current=\"page\"" : ""}>${link.label}</a>`).join("")}
                    </div>
                </div>
                <div class="lab-mobile-drawer__section">
                    <span class="lab-mobile-drawer__label">Brands</span>
                    <div class="lab-mobile-drawer__links">${buildSectionLinks(".lab-nav__panel--brands .lab-nav__card")}</div>
                </div>
                <div class="lab-mobile-drawer__section">
                    <span class="lab-mobile-drawer__label">Browse</span>
                    <div class="lab-mobile-drawer__links">${buildSectionLinks(".lab-nav__panel--types .lab-nav__card")}</div>
                </div>
                <div class="lab-mobile-drawer__actions">
                    <a class="lab-mobile-drawer__action lab-mobile-drawer__action--primary" href="https://wa.me/971586122568" target="_blank" rel="noopener">WhatsApp now</a>
                    <a class="lab-mobile-drawer__action lab-mobile-drawer__action--secondary" href="tel:+971586122568">Call</a>
                </div>
            </div>
        `;

        document.body.appendChild(drawer);

        function setDrawerState(isOpen) {
            document.body.classList.toggle("lab-mobile-nav-open", isOpen);
            drawer.classList.toggle("is-open", isOpen);
            toggle.classList.toggle("is-open", isOpen);
            drawer.setAttribute("aria-hidden", String(!isOpen));
            toggle.setAttribute("aria-expanded", String(isOpen));

            if (isOpen) {
                emitAnalyticsEvent("mobile_menu_open", {
                    page_path: normalizeBookingValue(window.location.pathname),
                    page_title: normalizeBookingValue(document.title)
                });
            }
        }

        toggle.addEventListener("click", () => {
            setDrawerState(!drawer.classList.contains("is-open"));
        });

        drawer.querySelectorAll("[data-mobile-nav-close]").forEach((button) => {
            button.addEventListener("click", () => {
                setDrawerState(false);
            });
        });

        drawer.querySelectorAll("a").forEach((link) => {
            link.addEventListener("click", () => {
                setDrawerState(false);
            });
        });

        document.addEventListener("keydown", (event) => {
            if (event.key === "Escape" && drawer.classList.contains("is-open")) {
                setDrawerState(false);
            }
        });
    }

    function initMobileActionBar() {
        if (!mobileViewport.matches || document.querySelector(".lab-mobile-action-bar")) {
            return;
        }

        if (document.body.classList.contains("home-page")) {
            return;
        }

        const isHomePage = !!hero;
        const isFleetPage = document.body.classList.contains("fleet-page");

        if (!isHomePage && !isFleetPage) {
            return;
        }

        const actionBar = document.createElement("div");
        actionBar.className = "lab-mobile-action-bar";
        actionBar.innerHTML = `
            <button type="button" class="lab-mobile-action-bar__primary">Choose dates</button>
            <a class="lab-mobile-action-bar__secondary" href="${DEFAULT_WHATSAPP_URL}" target="_blank" rel="noopener">WhatsApp</a>
        `;

        document.body.appendChild(actionBar);
        document.body.classList.add("lab-has-mobile-bar");

        actionBar.querySelector(".lab-mobile-action-bar__primary")?.addEventListener("click", () => {
            if (isHomePage && overlay) {
                setOverlayState(true);
                return;
            }

            if (isFleetPage) {
                document.dispatchEvent(new CustomEvent("dynasty:fleet-open-dates"));
            }
        });
    }

    function initHomeBookingBar() {
        if (!homeBookingForm || !homePickupDateInput || !homeReturnDateInput || !homePickupTimeInput || !homeReturnTimeInput) {
            return;
        }

        const storedIntent = getStoredBookingIntent();
        const today = getDubaiDateString(0);
        const tomorrow = getDubaiDateString(1);
        const pickupDate = normalizeBookingValue(storedIntent?.startDate) || today;
        const returnDate = normalizeBookingValue(storedIntent?.endDate) || tomorrow;
        const pickupTime = normalizeBookingValue(storedIntent?.pickupTime) || "12:00";
        const dropoffTime = normalizeBookingValue(storedIntent?.dropoffTime) || "12:00";

        homePickupDateInput.min = today;
        homeReturnDateInput.min = today;
        homePickupDateInput.value = pickupDate;
        homeReturnDateInput.value = returnDate >= pickupDate ? returnDate : pickupDate;
        homeReturnDateInput.min = homePickupDateInput.value;

        buildTimeOptions(homePickupTimeInput, pickupTime);
        buildTimeOptions(homeReturnTimeInput, dropoffTime);

        homePickupDateInput.addEventListener("change", () => {
            if (homeReturnDateInput.value < homePickupDateInput.value) {
                homeReturnDateInput.value = homePickupDateInput.value;
            }

            homeReturnDateInput.min = homePickupDateInput.value;
        });

        homeBookingForm.addEventListener("submit", (event) => {
            event.preventDefault();

            const bookingIntent = storeBookingIntent({
                car: storedIntent?.car,
                price: storedIntent?.price,
                startDate: homePickupDateInput.value,
                endDate: homeReturnDateInput.value,
                pickupTime: homePickupTimeInput.value,
                dropoffTime: homeReturnTimeInput.value
            });
            const queryString = buildBookingQuery(bookingIntent).toString();

            emitAnalyticsEvent("booking_sheet_submit", {
                page_path: normalizeBookingValue(window.location.pathname),
                start_date: bookingIntent.startDate,
                end_date: bookingIntent.endDate,
                pickup_time: bookingIntent.pickupTime,
                dropoff_time: bookingIntent.dropoffTime,
                origin: "home_booking_bar"
            });

            window.location.href = `./fleet.html${queryString ? `?${queryString}` : ""}`;
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

    function setOverlayState(isOpen) {
        if (!overlay) {
            return;
        }

        document.body.classList.toggle("hero-lab-overlay-open", isOpen);
        overlay.classList.toggle("is-open", isOpen);
        overlay.setAttribute("aria-hidden", String(!isOpen));
        overlay.toggleAttribute("inert", !isOpen);
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

    initFleetFilterLinks();
    setHeaderScrollState();
    initMobileHeaderDrawer();
    initMobileActionBar();
    initHomeBookingBar();

    window.addEventListener("scroll", setHeaderScrollState, { passive: true });

    if (overlay && openButtons.length > 0) {
        openButtons.forEach((button) => {
            button.addEventListener("click", () => {
                emitAnalyticsEvent("booking_sheet_open", {
                    page_path: normalizeBookingValue(window.location.pathname),
                    page_title: normalizeBookingValue(document.title),
                    cta_label: normalizeBookingValue(button.textContent)
                });
                setOverlayState(true);
            });
        });

        closeButtons.forEach((button) => {
            button.addEventListener("click", () => {
                setOverlayState(false);
            });
        });

        overlayForm?.addEventListener("submit", (event) => {
            event.preventDefault();

            const storedIntent = getStoredBookingIntent();
            const bookingIntent = storeBookingIntent({
                car: storedIntent?.car,
                price: storedIntent?.price,
                startDate: document.getElementById("hero-lab-pickup-date")?.value,
                endDate: document.getElementById("hero-lab-return-date")?.value,
                pickupTime: overlay.querySelector('[aria-label="Pickup time"]')?.value,
                dropoffTime: overlay.querySelector('[aria-label="Return time"]')?.value
            });
            const queryString = buildBookingQuery(bookingIntent).toString();

            emitAnalyticsEvent("booking_sheet_submit", {
                page_path: normalizeBookingValue(window.location.pathname),
                start_date: bookingIntent.startDate,
                end_date: bookingIntent.endDate,
                pickup_time: bookingIntent.pickupTime,
                dropoff_time: bookingIntent.dropoffTime
            });

            window.location.href = `./fleet.html${queryString ? `?${queryString}` : ""}`;
        });

        document.addEventListener("keydown", (event) => {
            if (event.key === "Escape" && overlay.classList.contains("is-open")) {
                setOverlayState(false);
            }
        });
    }
});
