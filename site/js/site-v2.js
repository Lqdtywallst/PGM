function initSiteV2() {
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
    const dataSaverConnection = typeof navigator !== "undefined" ? navigator.connection : null;
    const shouldBypassHeroIntro = document.body.classList.contains("home-page") || coarsePointer.matches || mobileViewport.matches;
    const shouldSkipHeroVideo = prefersReducedMotion.matches || Boolean(dataSaverConnection?.saveData);
    const introMemoryKey = "__siteV2HeroIntroSeen";
    const BOOKING_INTENT_KEY = "dynastyBookingIntent";
    const DEFAULT_WHATSAPP_URL = "https://wa.me/971586122568?text=Hi%2C%20I%20would%20like%20help%20booking%20a%20car%20in%20Dubai.";
    const HEADER_CONTACT_HREF = "/contact.html";
    const HEADER_RESERVE_HREF = "/app/reserve/page.html";
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

    function getPathnameFromHref(href) {
        if (!href) {
            return "";
        }

        try {
            return new URL(href, window.location.href).pathname;
        } catch (error) {
            return normalizeBookingValue(href);
        }
    }

    function getCurrentPagePath() {
        const pathname = normalizeBookingValue(window.location.pathname);
        return pathname === "/" ? "/" : pathname.replace(/\/+$/, "");
    }

    function pathsMatch(leftPath, rightPath) {
        const normalizedLeft = normalizeBookingValue(leftPath).replace(/\/+$/, "") || "/";
        const normalizedRight = normalizeBookingValue(rightPath).replace(/\/+$/, "") || "/";
        return normalizedLeft === normalizedRight;
    }

    function buildHeaderUtilityLink(href, label, svgPath, extraAttributes = "") {
        return `
            <a class="lab-header__utility-link" href="${href}" aria-label="${label}" ${extraAttributes}>
                <svg viewBox="0 0 24 24" aria-hidden="true">
                    <path fill="currentColor" d="${svgPath}"></path>
                </svg>
                <span>${label}</span>
            </a>
        `;
    }

    function enhanceHeaderConsistency() {
        const headerInner = header?.querySelector(".lab-header__inner");
        const headerNav = header?.querySelector(".lab-header__nav");
        const nav = headerNav?.querySelector(".lab-nav");

        if (!header || !headerInner || !headerNav || !nav) {
            return;
        }

        if (!headerInner.querySelector(".lab-header__utility")) {
            const utility = document.createElement("nav");
            utility.className = "lab-header__utility";
            utility.setAttribute("aria-label", "Quick contact");
            utility.innerHTML = [
                buildHeaderUtilityLink(
                    "tel:+971586122568",
                    "Call Dynasty Prestige",
                    "M6.62 10.79a15.47 15.47 0 0 0 6.59 6.59l2.2-2.2c.27-.27.67-.36 1.02-.24 1.12.37 2.33.57 3.57.57.55 0 1 .45 1 1V20c0 .55-.45 1-1 1C10.07 21 3 13.93 3 5c0-.55.45-1 1-1h3.5c.55 0 1 .45 1 1 0 1.24.2 2.45.57 3.57.11.35.03.74-.25 1.02l-2.2 2.2Z"
                ),
                buildHeaderUtilityLink(
                    "mailto:prestigegoalmotion@gmail.com",
                    "Email Dynasty Prestige",
                    "M20 5H4a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2Zm-.4 2-6.54 5.23a1.7 1.7 0 0 1-2.12 0L4.4 7h15.2ZM4 17V9.05l5.69 4.56a3.7 3.7 0 0 0 4.62 0L20 9.05V17H4Z"
                ),
                buildHeaderUtilityLink(
                    "https://wa.me/971586122568",
                    "Open WhatsApp",
                    "M19.05 4.91A9.82 9.82 0 0 0 12 2a9.94 9.94 0 0 0-8.54 15.02L2 22l5.13-1.35A9.94 9.94 0 1 0 19.05 4.91Zm-7.05 14.1c-1.53 0-3.04-.41-4.36-1.19l-.31-.18-3.04.8.81-2.96-.2-.31a8 8 0 1 1 7.1 3.84Zm4.39-5.91c-.24-.12-1.43-.7-1.65-.78-.22-.08-.38-.12-.54.12-.16.24-.62.78-.76.94-.14.16-.28.18-.52.06-.24-.12-1.01-.37-1.93-1.18-.71-.63-1.2-1.41-1.34-1.65-.14-.24-.02-.37.1-.49.11-.11.24-.28.36-.42.12-.14.16-.24.24-.4.08-.16.04-.3-.02-.42-.06-.12-.54-1.3-.74-1.78-.2-.48-.4-.41-.54-.41l-.46-.01c-.16 0-.42.06-.64.3-.22.24-.84.82-.84 2s.86 2.32.98 2.48c.12.16 1.69 2.58 4.09 3.61.57.25 1.01.39 1.36.49.57.18 1.09.15 1.5.09.46-.07 1.43-.58 1.63-1.14.2-.56.2-1.04.14-1.14-.06-.1-.22-.16-.46-.28Z",
                    'target="_blank" rel="noopener"'
                )
            ].join("");
            headerInner.insertBefore(utility, headerNav);
        }

        const mainLinks = Array.from(nav.children).filter((item) => item.matches?.("a"));
        const hasContactLink = mainLinks.some((link) => pathsMatch(getPathnameFromHref(link.getAttribute("href")), HEADER_CONTACT_HREF));

        if (!hasContactLink) {
            const contactLink = document.createElement("a");
            contactLink.href = HEADER_CONTACT_HREF;
            contactLink.textContent = "Contact";
            if (pathsMatch(getCurrentPagePath(), HEADER_CONTACT_HREF)) {
                contactLink.setAttribute("aria-current", "page");
            }
            nav.appendChild(contactLink);
        }

        if (!headerNav.querySelector(".lab-reserve")) {
            const reserveLink = document.createElement("a");
            reserveLink.href = HEADER_RESERVE_HREF;
            reserveLink.className = "lab-reserve";
            reserveLink.textContent = "Reserve";
            if (pathsMatch(getCurrentPagePath(), HEADER_RESERVE_HREF)) {
                reserveLink.setAttribute("aria-current", "page");
            }
            headerNav.appendChild(reserveLink);
        }
    }

    function initFleetFilterLinks() {
        document.querySelectorAll(".lab-nav__panel--types .lab-nav__card").forEach((link) => {
            const label = normalizeBookingValue(link.querySelector("strong")?.textContent).toLowerCase();
            const type = fleetTypeFilterMap[label];

            if (type) {
                link.setAttribute("href", buildFleetFilterHref("type", type));
            }
        });
    }

    function getHeroVideoSource() {
        if (!(heroVideo instanceof HTMLVideoElement)) {
            return "";
        }

        const desktopSource = normalizeBookingValue(heroVideo.dataset.srcDesktop);
        const mobileSource = normalizeBookingValue(heroVideo.dataset.srcMobile);

        if (mobileViewport.matches) {
            return mobileSource || desktopSource;
        }

        return desktopSource || mobileSource;
    }

    function hydrateHeroVideo() {
        if (!(heroVideo instanceof HTMLVideoElement) || shouldSkipHeroVideo) {
            return;
        }

        const selectedSource = getHeroVideoSource();
        if (!selectedSource) {
            return;
        }

        heroVideo.preload = mobileViewport.matches ? "metadata" : "auto";

        if (heroVideo.getAttribute("src") !== selectedSource) {
            heroVideo.setAttribute("src", selectedSource);
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
        if (prefersReducedMotion.matches || wasIntroSeenInMemory() || shouldBypassHeroIntro) {
            hero.classList.add("hero-lab--mobile-ready");
            hydrateHeroVideo();
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

    const heroViewportListener = () => {
        if (!hero) {
            return;
        }

        hydrateHeroVideo();
        if (mobileViewport.matches || coarsePointer.matches) {
            revealHeroImmediately();
        }
    };

    if (typeof mobileViewport.addEventListener === "function") {
        mobileViewport.addEventListener("change", heroViewportListener);
    } else if (typeof mobileViewport.addListener === "function") {
        mobileViewport.addListener(heroViewportListener);
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

        function hydrateMegaMenuImages(item) {
            item?.querySelectorAll("img[data-src]").forEach((image) => {
                const source = image.getAttribute("data-src");
                if (!source) {
                    return;
                }

                image.src = source;
                image.removeAttribute("data-src");
            });
        }

        function setMegaMenuState(openItem = null) {
            if (openItem) {
                hydrateMegaMenuImages(openItem);
            }

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

        const reserveLink = headerNav.querySelector(".lab-reserve");
        if (reserveLink) {
            mainLinks.push({
                href: reserveLink.getAttribute("href") || HEADER_RESERVE_HREF,
                label: normalizeBookingValue(reserveLink.textContent) || "Reserve",
                current: reserveLink.getAttribute("aria-current") === "page"
            });
        }

        const sectionLinks = (selector) => Array.from(nav.querySelectorAll(selector));
        const buildSectionLinks = (selector) => sectionLinks(selector)
            .map((link) => `<a href="${link.getAttribute("href") || "#"}">${normalizeBookingValue(link.querySelector("strong")?.textContent || link.textContent)}</a>`)
            .join("");
        const buildDisclosureSection = ({ key, label, selector }) => {
            const count = sectionLinks(selector).length;
            const countLabel = count === 1 ? "1 option" : `${count} options`;

            return `
                <details class="lab-mobile-drawer__section lab-mobile-drawer__section--disclosure" data-mobile-drawer-disclosure="${key}">
                    <summary class="lab-mobile-drawer__summary">
                        <span class="lab-mobile-drawer__label">${label}</span>
                        <span class="lab-mobile-drawer__summary-meta">${countLabel}</span>
                        <span class="lab-mobile-drawer__summary-icon" aria-hidden="true"></span>
                    </summary>
                    <div class="lab-mobile-drawer__links lab-mobile-drawer__links--compact">${buildSectionLinks(selector)}</div>
                </details>
            `;
        };

        const toggle = document.createElement("button");
        toggle.type = "button";
        toggle.className = "lab-mobile-toggle";
        toggle.setAttribute("aria-expanded", "false");
        toggle.setAttribute("aria-controls", "lab-mobile-drawer");
        toggle.setAttribute("aria-label", "Open navigation");
        toggle.innerHTML = `
            <span class="lab-mobile-toggle__line"></span>
            <span class="lab-mobile-toggle__line"></span>
            <span class="lab-mobile-toggle__line"></span>
        `;
        headerInner.insertBefore(toggle, headerNav);

        const drawer = document.createElement("div");
        drawer.className = "lab-mobile-drawer";
        drawer.id = "lab-mobile-drawer";
        drawer.setAttribute("aria-hidden", "true");
        drawer.innerHTML = `
            <div class="lab-mobile-drawer__scrim" data-mobile-nav-close></div>
            <div class="lab-mobile-drawer__panel" role="dialog" aria-modal="true" aria-label="Mobile navigation">
                <div class="lab-mobile-drawer__header">
                    <div class="lab-mobile-drawer__brand">
                        <span class="lab-mobile-drawer__crest" aria-hidden="true">
                            <img src="/icons/icon-192.png" width="192" height="192" loading="lazy" decoding="async" alt="">
                        </span>
                        <div class="lab-mobile-drawer__brand-copy">
                            <strong>Dynasty Prestige</strong>
                            <span>Dubai luxury car rental</span>
                        </div>
                    </div>
                    <button type="button" class="lab-mobile-drawer__close" data-mobile-nav-close>Close</button>
                </div>
                <div class="lab-mobile-drawer__intro">
                    <p>Pick the route that fits the stay, then move straight into the right fleet and reserve flow.</p>
                    <div class="lab-mobile-drawer__quick">
                        <a class="lab-mobile-drawer__quick-link lab-mobile-drawer__quick-link--call" href="tel:+971586122568" aria-label="Call Dynasty Prestige">
                            <span class="lab-mobile-drawer__quick-icon" aria-hidden="true">
                                <svg viewBox="0 0 24 24" focusable="false">
                                    <path fill="currentColor" d="M6.62 10.79a15.5 15.5 0 0 0 6.59 6.59l2.2-2.2c.27-.27.67-.36 1.02-.24 1.12.37 2.33.57 3.57.57.55 0 1 .45 1 1V20c0 .55-.45 1-1 1C10.07 21 3 13.93 3 5c0-.55.45-1 1-1h3.5c.55 0 1 .45 1 1 0 1.24.2 2.45.57 3.57.11.35.03.74-.25 1.02l-2.2 2.2Z"/>
                                </svg>
                            </span>
                            <span class="lab-mobile-drawer__quick-text">Call</span>
                        </a>
                        <a class="lab-mobile-drawer__quick-link lab-mobile-drawer__quick-link--email" href="mailto:prestigegoalmotion@gmail.com" aria-label="Email Dynasty Prestige">
                            <span class="lab-mobile-drawer__quick-icon" aria-hidden="true">
                                <svg viewBox="0 0 24 24" focusable="false">
                                    <path fill="currentColor" d="M4 5h16c.55 0 1 .45 1 1v12c0 .55-.45 1-1 1H4c-.55 0-1-.45-1-1V6c0-.55.45-1 1-1Zm8 7.35L5.4 7H5v.55l7 5.7 7-5.7V7h-.4L12 12.35Z"/>
                                </svg>
                            </span>
                            <span class="lab-mobile-drawer__quick-text">Email</span>
                        </a>
                        <a class="lab-mobile-drawer__quick-link lab-mobile-drawer__quick-link--wa" href="https://wa.me/971586122568" target="_blank" rel="noopener" aria-label="Open WhatsApp Dynasty Prestige">
                            <span class="lab-mobile-drawer__quick-icon" aria-hidden="true">
                                <svg viewBox="0 0 24 24" focusable="false">
                                    <path fill="currentColor" d="M19.05 4.91A9.82 9.82 0 0 0 12 2a9.94 9.94 0 0 0-8.54 15.02L2 22l5.13-1.35A9.94 9.94 0 1 0 19.05 4.91ZM12 19.01c-1.53 0-3.04-.41-4.36-1.19l-.31-.18-3.04.8.81-2.96-.2-.31a8 8 0 1 1 7.1 3.84Zm4.39-5.91c-.24-.12-1.43-.7-1.65-.78-.22-.08-.38-.12-.54.12-.16.24-.62.78-.76.94-.14.16-.28.18-.52.06-.24-.12-1.01-.37-1.93-1.18-.71-.63-1.2-1.41-1.34-1.65-.14-.24-.02-.37.1-.49.11-.11.24-.28.36-.42.12-.14.16-.24.24-.4.08-.16.04-.3-.02-.42-.06-.12-.54-1.3-.74-1.78-.2-.48-.4-.41-.54-.41l-.46-.01c-.16 0-.42.06-.64.3-.22.24-.84.82-.84 2s.86 2.32.98 2.48c.12.16 1.69 2.58 4.09 3.61.57.25 1.01.39 1.36.49.57.18 1.09.15 1.5.09.46-.07 1.43-.58 1.63-1.14.2-.56.2-1.04.14-1.14-.06-.1-.22-.16-.46-.28Z"/>
                                </svg>
                            </span>
                            <span class="lab-mobile-drawer__quick-text">WhatsApp</span>
                        </a>
                    </div>
                </div>
                <div class="lab-mobile-drawer__section">
                    <span class="lab-mobile-drawer__label">Navigate</span>
                    <div class="lab-mobile-drawer__links lab-mobile-drawer__links--nav">
                        ${mainLinks.map((link) => `<a href="${link.href}"${link.current ? " aria-current=\"page\"" : ""}>${link.label}</a>`).join("")}
                    </div>
                </div>
                ${buildDisclosureSection({ key: "brands", label: "Brands", selector: ".lab-nav__panel--brands .lab-nav__card" })}
                ${buildDisclosureSection({ key: "browse", label: "Browse", selector: ".lab-nav__panel--types .lab-nav__card" })}
                <div class="lab-mobile-drawer__actions">
                    <a class="lab-mobile-drawer__action lab-mobile-drawer__action--primary" href="${reserveLink?.getAttribute("href") || HEADER_RESERVE_HREF}">Reserve</a>
                </div>
            </div>
        `;

        document.body.appendChild(drawer);
        drawer.setAttribute("inert", "");

        function setDrawerState(isOpen) {
            document.body.classList.toggle("lab-mobile-nav-open", isOpen);
            drawer.classList.toggle("is-open", isOpen);
            toggle.classList.toggle("is-open", isOpen);
            drawer.setAttribute("aria-hidden", String(!isOpen));
            toggle.setAttribute("aria-expanded", String(isOpen));

            if (isOpen) {
                drawer.removeAttribute("inert");
            } else {
                drawer.setAttribute("inert", "");
            }

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

    function initServicesLaneSelector() {
        const planner = document.querySelector("[data-services-selector]");
        const panel = document.querySelector("[data-service-panel]");

        if (!planner || !panel) {
            return;
        }

        const tabs = Array.from(planner.querySelectorAll("[data-service-selector]"));
        const title = panel.querySelector("[data-service-title]");
        const kicker = panel.querySelector("[data-service-kicker]");
        const copy = panel.querySelector("[data-service-copy]");
        const primary = panel.querySelector("[data-service-primary]");
        const points = {
            one: panel.querySelector('[data-service-point="one"]'),
            two: panel.querySelector('[data-service-point="two"]'),
            three: panel.querySelector('[data-service-point="three"]')
        };

        if (tabs.length < 2) {
            return;
        }

        function setText(element, value) {
            if (element) {
                element.textContent = normalizeAnalyticsValue(value);
            }
        }

        function setPoint(name, value) {
            const element = points[name];

            if (!element) {
                return;
            }

            const text = normalizeAnalyticsValue(value);
            element.textContent = text;
            element.hidden = !text;
        }

        function activateServiceTab(tab, options = {}) {
            if (!(tab instanceof HTMLElement)) {
                return;
            }

            tabs.forEach((candidate) => {
                const isActive = candidate === tab;
                candidate.classList.toggle("is-active", isActive);
                candidate.setAttribute("aria-selected", String(isActive));
                candidate.setAttribute("tabindex", isActive ? "0" : "-1");
            });

            panel.setAttribute("aria-labelledby", tab.id || "");
            setText(kicker, tab.dataset.serviceKicker);
            setText(title, tab.dataset.serviceTitle);
            setText(copy, tab.dataset.serviceCopy);
            setPoint("one", tab.dataset.servicePointOne);
            setPoint("two", tab.dataset.servicePointTwo);
            setPoint("three", tab.dataset.servicePointThree);

            if (primary) {
                primary.textContent = normalizeAnalyticsValue(tab.dataset.servicePrimaryLabel) || normalizeAnalyticsValue(tab.textContent);
                primary.setAttribute("href", tab.dataset.servicePrimaryHref || tab.getAttribute("href") || "#");
                primary.dataset.analyticsService = normalizeAnalyticsValue(tab.dataset.serviceAnalyticsService);
            }

            if (options.focus) {
                tab.focus();
            }
        }

        tabs.forEach((tab, index) => {
            tab.addEventListener("click", (event) => {
                event.preventDefault();
                activateServiceTab(tab);
            });

            tab.addEventListener("keydown", (event) => {
                const direction = event.key === "ArrowRight" || event.key === "ArrowDown"
                    ? 1
                    : event.key === "ArrowLeft" || event.key === "ArrowUp"
                        ? -1
                        : 0;

                if (!direction) {
                    return;
                }

                event.preventDefault();
                const nextIndex = (index + direction + tabs.length) % tabs.length;
                activateServiceTab(tabs[nextIndex], { focus: true });
            });
        });
    }

    enhanceHeaderConsistency();
    initServicesLaneSelector();
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
}

if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initSiteV2, { once: true });
} else {
    initSiteV2();
}
