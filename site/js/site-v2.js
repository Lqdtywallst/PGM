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
    const shouldSkipHeroVideo = prefersReducedMotion.matches || dataSaverConnection?.saveData === true;
    const introMemoryKey = "__siteV2HeroIntroSeen";
    const BOOKING_INTENT_KEY = "dynastyBookingIntent";
    const BOOKING_INTENT_MAX_AGE_MS = 1000 * 60 * 60 * 2;
    const ACCEPTED_BOOKING_INTENT_SOURCES = new Set(["home", "fleet"]);
    const CONTACT_PHONE_HREF = "tel:+971586122568";
    const DEFAULT_WHATSAPP_MESSAGE = "Hi, I would like help booking a luxury car in Dubai.";
    const DEFAULT_WHATSAPP_URL = `https://wa.me/971586122568?text=${encodeURIComponent(DEFAULT_WHATSAPP_MESSAGE)}`;
    const HEADER_CONTACT_HREF = "/contact.html";
    const HEADER_LOOKUP_HREF = "/reservation-lookup.html";
    const HEADER_RESERVE_HREF = "/app/reserve/page.html";
    const fleetTypeFilterMap = {
        "luxury cars": "luxury",
        "convertible cars": "convertible",
        "sports cars": "sports",
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
    const overlayPickupDateInput = document.getElementById("hero-lab-pickup-date");
    const overlayReturnDateInput = document.getElementById("hero-lab-return-date");
    const overlayPickupTimeInput = document.getElementById("hero-lab-pickup-time");
    const overlayReturnTimeInput = document.getElementById("hero-lab-return-time");

    let introTimers = [];
    let introStarted = false;
    let introComplete = false;
    let heroVideoReadinessBound = false;
    let lastFocusedElement = null;

    if (overlay) {
        overlay.setAttribute("aria-hidden", "true");
        overlay.setAttribute("inert", "");
    }

    function normalizeBookingValue(value) {
        return String(value || "").trim();
    }

    function escapeCheckoutHtml(value) {
        return String(value || "")
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#039;");
    }

    function getConfiguredBackendUrl() {
        if (typeof window.BACKEND_URL === "string" && window.BACKEND_URL.trim()) {
            return window.BACKEND_URL.trim();
        }

        if (window.STRIPE_CONFIG && typeof window.STRIPE_CONFIG.backendUrl === "string") {
            return window.STRIPE_CONFIG.backendUrl.trim();
        }

        return "";
    }

    function initCheckoutReturnBanner() {
        const params = new URLSearchParams(window.location.search || "");
        const checkoutState = normalizeBookingValue(params.get("checkout")).toLowerCase();

        if (!checkoutState) {
            return;
        }

        const reservationId = normalizeBookingValue(params.get("reservationId"));
        const checkoutSessionId = normalizeBookingValue(params.get("session_id") || params.get("checkoutSessionId"));
        const isSuccess = checkoutState === "success";
        const isCancelled = checkoutState === "cancelled" || checkoutState === "canceled";

        if (!isSuccess && !isCancelled) {
            return;
        }

        try {
            window.sessionStorage.removeItem(BOOKING_INTENT_KEY);
        } catch (error) {
            // Ignore storage failures.
        }

        const style = document.createElement("style");
        style.textContent = `
            .checkout-return {
                position: fixed;
                inset: 18px 18px auto;
                z-index: 80;
                display: flex;
                justify-content: center;
                pointer-events: none;
            }

            .checkout-return__card {
                width: min(680px, calc(100vw - 36px));
                border: 1px solid rgba(23, 23, 23, 0.12);
                border-radius: 24px;
                background: rgba(252, 249, 242, 0.96);
                box-shadow: 0 24px 80px rgba(20, 18, 15, 0.18);
                color: #171717;
                padding: 22px;
                pointer-events: auto;
                backdrop-filter: blur(18px);
            }

            .checkout-return__eyebrow {
                display: block;
                margin-bottom: 8px;
                color: #826844;
                font-size: 0.72rem;
                font-weight: 800;
                letter-spacing: 0.18em;
                text-transform: uppercase;
            }

            .checkout-return__card h2 {
                margin: 0 0 8px;
                font-family: "Instrument Serif", Georgia, serif;
                font-size: clamp(2rem, 4vw, 3.2rem);
                line-height: 0.95;
            }

            .checkout-return__card p {
                margin: 0;
                color: #5f554b;
                font-size: 1rem;
                line-height: 1.55;
            }

            .checkout-return__actions {
                display: flex;
                flex-wrap: wrap;
                gap: 10px;
                margin-top: 18px;
            }

            .checkout-return__actions a,
            .checkout-return__actions button {
                border: 1px solid rgba(23, 23, 23, 0.16);
                border-radius: 999px;
                background: #171717;
                color: #fff;
                cursor: pointer;
                font: inherit;
                font-size: 0.78rem;
                font-weight: 800;
                letter-spacing: 0.12em;
                padding: 12px 16px;
                text-decoration: none;
                text-transform: uppercase;
            }

            .checkout-return__actions button {
                background: transparent;
                color: #171717;
            }

            @media (max-width: 640px) {
                .checkout-return {
                    inset: 10px 10px auto;
                }

                .checkout-return__card {
                    width: calc(100vw - 20px);
                    border-radius: 20px;
                    padding: 18px;
                }
            }
        `;
        document.head.appendChild(style);

        const banner = document.createElement("aside");
        banner.className = "checkout-return";
        banner.setAttribute("role", "status");
        banner.setAttribute("aria-live", "polite");
        document.body.appendChild(banner);

        function render({ eyebrow, title, message, reference, pending = false }) {
            const referenceLine = reference
                ? `<p><strong>Booking reference:</strong> ${escapeCheckoutHtml(reference)}</p>`
                : "";
            const lookupHref = reference
                ? `/reservation-lookup.html?reservationId=${encodeURIComponent(reference)}`
                : "/reservation-lookup.html";

            banner.innerHTML = `
                <section class="checkout-return__card">
                    <span class="checkout-return__eyebrow">${escapeCheckoutHtml(eyebrow)}</span>
                    <h2>${escapeCheckoutHtml(title)}</h2>
                    <p>${escapeCheckoutHtml(message)}</p>
                    ${referenceLine}
                    <div class="checkout-return__actions">
                        <a href="${escapeCheckoutHtml(lookupHref)}">Find booking</a>
                        <a href="https://wa.me/971586122568" target="_blank" rel="noopener">WhatsApp team</a>
                        <button type="button" data-checkout-return-close>${pending ? "Hide" : "Close"}</button>
                    </div>
                </section>
            `;

            banner.querySelector("[data-checkout-return-close]")?.addEventListener("click", () => {
                banner.remove();
            });
        }

        if (isCancelled) {
            render({
                eyebrow: "Checkout cancelled",
                title: "Payment was not completed",
                message: "No payment has been captured. You can restart the reservation or WhatsApp the team if you need help.",
                reference: reservationId
            });
            return;
        }

        render({
            eyebrow: "Payment received",
            title: "Finalising your reservation",
            message: "Stripe has returned you to Dynasty Prestige. We are confirming the booking record now.",
            reference: reservationId,
            pending: true
        });

        if (!checkoutSessionId) {
            render({
                eyebrow: "Payment received",
                title: "Booking reference saved",
                message: "Keep this reference and use Find Booking with your checkout email. If anything looks wrong, WhatsApp the team.",
                reference: reservationId
            });
            return;
        }

        const backendUrl = getConfiguredBackendUrl();
        if (!backendUrl) {
            render({
                eyebrow: "Payment received",
                title: "Booking reference saved",
                message: "The secure reservation service is not configured in this browser. Keep this reference and WhatsApp the team if needed.",
                reference: reservationId
            });
            return;
        }

        fetch(`${backendUrl}/api/reserve/confirm`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({ checkoutSessionId })
        })
            .then((response) => response.json().then((data) => ({ response, data })))
            .then(({ response, data }) => {
                const confirmedReference = normalizeBookingValue(data.reservationId) || reservationId;
                if (!response.ok || data.success === false) {
                    throw new Error(data.error || "Reservation confirmation needs manual review.");
                }

                render({
                    eyebrow: "Reservation confirmed",
                    title: "Your booking is confirmed",
                    message: data.emailSent
                        ? "We have sent the confirmation email. The team will coordinate handover details directly with you."
                        : "Your booking is saved. If the email takes a moment, use Find Booking with this reference and your checkout email.",
                    reference: confirmedReference
                });
            })
            .catch((error) => {
                render({
                    eyebrow: "Payment received",
                    title: "Booking needs a quick check",
                    message: `${error.message} Your payment was received, so keep this reference and WhatsApp the team if the lookup is not updated yet.`,
                    reference: reservationId
                });
            });
    }

    function getStoredBookingIntent() {
        try {
            const rawIntent = window.sessionStorage.getItem(BOOKING_INTENT_KEY);

            if (!rawIntent) {
                return null;
            }

            const parsedIntent = JSON.parse(rawIntent);

            if (!parsedIntent || typeof parsedIntent !== "object") {
                return null;
            }

            const source = normalizeBookingValue(parsedIntent.source).toLowerCase();
            const savedAt = Number(parsedIntent.savedAt || 0);
            const age = Date.now() - savedAt;
            const canRestore = ACCEPTED_BOOKING_INTENT_SOURCES.has(source) &&
                savedAt > 0 &&
                age >= 0 &&
                age <= BOOKING_INTENT_MAX_AGE_MS;

            if (!canRestore) {
                window.sessionStorage.removeItem(BOOKING_INTENT_KEY);
                return null;
            }

            return parsedIntent;
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
            source: normalizeBookingValue(bookingIntent?.source || "home"),
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

    function appendBookingParams(params, bookingIntent) {
        buildBookingQuery(bookingIntent).forEach((value, key) => {
            params.set(key, value);
        });

        return params;
    }

    function buildFleetFilterHref(filterKey, filterValue, bookingIntent = null) {
        const params = new URLSearchParams();
        params.set(filterKey, filterValue);
        if (bookingIntent) {
            appendBookingParams(params, bookingIntent);
        }

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

    function isValidDateInputValue(value) {
        const normalized = normalizeBookingValue(value);

        if (!/^\d{4}-\d{2}-\d{2}$/.test(normalized)) {
            return false;
        }

        const [year, month, day] = normalized.split("-").map(Number);
        const parsed = new Date(year, month - 1, day);
        return parsed.getFullYear() === year &&
            parsed.getMonth() === month - 1 &&
            parsed.getDate() === day;
    }

    function addDaysToDateInputValue(value, offsetDays = 0) {
        if (!isValidDateInputValue(value)) {
            return getDubaiDateString(offsetDays);
        }

        const [year, month, day] = value.split("-").map(Number);
        const date = new Date(year, month - 1, day);
        date.setDate(date.getDate() + offsetDays);
        const nextYear = date.getFullYear();
        const nextMonth = String(date.getMonth() + 1).padStart(2, "0");
        const nextDay = String(date.getDate()).padStart(2, "0");
        return `${nextYear}-${nextMonth}-${nextDay}`;
    }

    function clampBookingDateValue(value, fallbackValue, minDateValue) {
        const normalized = normalizeBookingValue(value);
        const fallback = isValidDateInputValue(fallbackValue) ? fallbackValue : getDubaiDateString(0);
        const minimum = isValidDateInputValue(minDateValue) ? minDateValue : getDubaiDateString(0);

        if (!isValidDateInputValue(normalized)) {
            return fallback < minimum ? minimum : fallback;
        }

        return normalized < minimum ? minimum : normalized;
    }

    function resolveDefaultBookingDates(intent = {}) {
        const safeIntent = intent && typeof intent === "object" ? intent : {};
        const today = getDubaiDateString(0);
        const startDate = clampBookingDateValue(safeIntent.startDate, today, today);
        const rawEndDate = normalizeBookingValue(safeIntent.endDate);
        const defaultEndDate = addDaysToDateInputValue(startDate, 1);
        const endDate = isValidDateInputValue(rawEndDate) && rawEndDate >= startDate
            ? rawEndDate
            : defaultEndDate;

        return { today, startDate, endDate };
    }

    function syncBookingDateInputs(startInput, endInput) {
        if (!(startInput instanceof HTMLInputElement) || !(endInput instanceof HTMLInputElement)) {
            return;
        }

        const today = getDubaiDateString(0);
        startInput.min = today;
        startInput.value = clampBookingDateValue(startInput.value, today, today);
        endInput.min = startInput.value || today;

        if (!endInput.value || endInput.value < endInput.min) {
            endInput.value = addDaysToDateInputValue(startInput.value || today, 1);
        }
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

    function initFloatingBackButton() {
        const navigationMemoryKey = "dynastyPreviousPage";
        const pendingNavigationMaxAgeMs = 30000;

        function normalizeInternalPath(href) {
            if (!href) {
                return "";
            }

            try {
                const url = new URL(href, window.location.href);

                if (url.origin !== window.location.origin) {
                    return "";
                }

                const pathname = url.pathname.replace(/\/index\.html$/i, "/") || "/";
                const normalizedPathname = pathname === "/" ? "/" : pathname.replace(/\/+$/, "");
                return `${normalizedPathname}${url.search}`;
            } catch (error) {
                return "";
            }
        }

        function stripHashAndTrailingSlash(value) {
            const [pathWithSearch] = normalizeBookingValue(value).split("#");
            const [pathname, search = ""] = pathWithSearch.split("?");
            const normalizedPathname = (pathname || "/").replace(/\/index\.html$/i, "/");
            const compactPathname = normalizedPathname === "/" ? "/" : normalizedPathname.replace(/\/+$/, "");
            return `${compactPathname}${search ? `?${search}` : ""}`;
        }

        function pathsEqual(left, right) {
            return stripHashAndTrailingSlash(left) === stripHashAndTrailingSlash(right);
        }

        function readNavigationMemory() {
            try {
                const rawMemory = window.sessionStorage.getItem(navigationMemoryKey);
                const parsedMemory = rawMemory ? JSON.parse(rawMemory) : null;
                return parsedMemory && typeof parsedMemory === "object" ? parsedMemory : {};
            } catch (error) {
                return {};
            }
        }

        function writeNavigationMemory(memory) {
            try {
                window.sessionStorage.setItem(navigationMemoryKey, JSON.stringify(memory));
            } catch (error) {
                // Ignore storage failures in restricted browsing modes.
            }
        }

        function getPendingInternalPreviousPath(memory, currentPath) {
            const pending = memory?.pending;
            const pendingFrom = normalizeInternalPath(pending?.from);
            const pendingTo = normalizeInternalPath(pending?.to);
            const pendingAge = Date.now() - Number(pending?.updatedAt || 0);

            if (
                pendingFrom &&
                pendingTo &&
                pathsEqual(pendingTo, currentPath) &&
                !pathsEqual(pendingFrom, currentPath) &&
                pendingAge >= 0 &&
                pendingAge <= pendingNavigationMaxAgeMs
            ) {
                return pendingFrom;
            }

            return "";
        }

        function getFallbackPreviousPath(currentPath) {
            const [pathname] = stripHashAndTrailingSlash(currentPath).split("?");

            if (!pathname || pathsEqual(pathname, "/")) {
                return "";
            }

            if (document.body.classList.contains("vehicle-page")) {
                return "/fleet.html";
            }

            if (document.body.classList.contains("fleet-page") || pathsEqual(pathname, "/fleet.html")) {
                return "/";
            }

            if (pathname.includes("/app/reserve/page.html")) {
                return "/fleet.html";
            }

            return "/";
        }

        function bindInternalNavigationCapture(currentPath) {
            document.addEventListener("click", (event) => {
                if (
                    event.defaultPrevented ||
                    event.button !== 0 ||
                    event.metaKey ||
                    event.ctrlKey ||
                    event.shiftKey ||
                    event.altKey
                ) {
                    return;
                }

                const link = event.target instanceof Element ? event.target.closest("a[href]") : null;

                if (
                    !(link instanceof HTMLAnchorElement) ||
                    link.closest(".lab-floating-back") ||
                    (link.target && link.target.toLowerCase() !== "_self") ||
                    link.hasAttribute("download")
                ) {
                    return;
                }

                const nextPath = normalizeInternalPath(link.href);

                if (!nextPath || pathsEqual(nextPath, currentPath)) {
                    return;
                }

                writeNavigationMemory({
                    ...readNavigationMemory(),
                    current: currentPath,
                    pending: {
                        from: currentPath,
                        to: nextPath,
                        updatedAt: Date.now()
                    }
                });
            }, { capture: true });
        }

        function bindAdaptiveBackOpacity(button) {
            const importantContentSelector = [
                "h1",
                "h2",
                "h3",
                "h4",
                "p",
                "li",
                "label",
                "legend",
                "summary",
                "a:not(.lab-floating-back)",
                "button",
                "input",
                "select",
                "textarea",
                "[role='button']",
                ".fleet-card",
                ".vehicle-card",
                ".service-card",
                ".location-card",
                ".guide-card",
                ".reservation-summary",
                ".reserve-shell-card",
                ".vehicle-detail-card",
                ".vehicle-spec-card"
            ].join(", ");
            const ignoredSurfaceSelector = ".lab-floating-back, .lab-header, .lab-mobile-drawer, .lab-floating-contact";
            let frameId = 0;

            function isImportantUnderlyingElement(element) {
                if (!element || button.contains(element) || element.closest(ignoredSurfaceSelector)) {
                    return false;
                }

                const importantElement = element.closest(importantContentSelector);
                if (!importantElement || button.contains(importantElement) || importantElement.closest(ignoredSurfaceSelector)) {
                    return false;
                }

                if (importantElement.matches("a, button, input, select, textarea, [role='button']")) {
                    return true;
                }

                return (importantElement.textContent || "").replace(/\s+/g, " ").trim().length > 3;
            }

            function updateOverlapState() {
                frameId = 0;

                if (!button.isConnected || !button.classList.contains("is-visible")) {
                    return;
                }

                const rect = button.getBoundingClientRect();
                const samplePoints = [
                    [rect.left + rect.width * 0.5, rect.top + rect.height * 0.5],
                    [rect.left + rect.width * 0.28, rect.top + rect.height * 0.28],
                    [rect.left + rect.width * 0.72, rect.top + rect.height * 0.28],
                    [rect.left + rect.width * 0.28, rect.top + rect.height * 0.72],
                    [rect.left + rect.width * 0.72, rect.top + rect.height * 0.72]
                ];
                const overlapsImportantContent = samplePoints.some(([x, y]) => (
                    document.elementsFromPoint(x, y).some(isImportantUnderlyingElement)
                ));

                button.classList.toggle("is-over-important-content", overlapsImportantContent);
            }

            function requestOverlapUpdate() {
                if (frameId) {
                    return;
                }

                frameId = window.requestAnimationFrame(updateOverlapState);
            }

            window.addEventListener("scroll", requestOverlapUpdate, { capture: true, passive: true });
            window.addEventListener("resize", requestOverlapUpdate, { passive: true });
            window.addEventListener("orientationchange", requestOverlapUpdate, { passive: true });
            window.setTimeout(requestOverlapUpdate, 250);
            window.setTimeout(requestOverlapUpdate, 900);
            requestOverlapUpdate();
            return requestOverlapUpdate;
        }

        const currentPath = normalizeInternalPath(window.location.href);
        const referrerPath = normalizeInternalPath(document.referrer);
        const storedMemory = readNavigationMemory();
        const pendingPreviousPath = getPendingInternalPreviousPath(storedMemory, currentPath);
        const historyPreviousPath = [
            referrerPath,
            pendingPreviousPath
        ].find((candidate) => candidate && !pathsEqual(candidate, currentPath));
        const fallbackPreviousPath = getFallbackPreviousPath(currentPath);
        const previousPath = historyPreviousPath ||
            (fallbackPreviousPath && !pathsEqual(fallbackPreviousPath, currentPath) ? fallbackPreviousPath : "");

        bindInternalNavigationCapture(currentPath);

        writeNavigationMemory({
            current: currentPath,
            previous: historyPreviousPath || "",
            pending: null,
            updatedAt: Date.now()
        });

        if (pathsEqual(currentPath, "/") || document.body.classList.contains("home-page")) {
            return;
        }

        if (!previousPath || document.querySelector(".lab-floating-back")) {
            return;
        }

        const backButton = document.createElement("a");
        backButton.className = "lab-floating-back";
        backButton.href = previousPath;
        backButton.setAttribute("aria-label", "Go back to the previous Dynasty Prestige page");
        backButton.setAttribute("title", "Back");
        backButton.innerHTML = `
            <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
                <path fill="currentColor" d="M14.7 5.3a1 1 0 0 1 0 1.4L10.41 11H20a1 1 0 1 1 0 2h-9.59l4.3 4.3a1 1 0 0 1-1.42 1.4l-6-6a1 1 0 0 1 0-1.4l6-6a1 1 0 0 1 1.41 0Z"></path>
            </svg>
            <span>Back</span>
        `;

        backButton.addEventListener("click", (event) => {
            const liveReferrerPath = normalizeInternalPath(document.referrer);
            const canUseHistoryBack = window.history.length > 1 && (
                Boolean(historyPreviousPath && pathsEqual(historyPreviousPath, previousPath)) ||
                Boolean(pendingPreviousPath && pathsEqual(pendingPreviousPath, previousPath)) ||
                Boolean(liveReferrerPath && pathsEqual(liveReferrerPath, previousPath))
            );

            if (!canUseHistoryBack) {
                return;
            }

            event.preventDefault();
            window.history.back();
            window.setTimeout(() => {
                if (!document.hidden) {
                    window.location.href = previousPath;
                }
            }, 240);
        });

        document.body.appendChild(backButton);
        const requestBackOverlapUpdate = bindAdaptiveBackOpacity(backButton);
        window.requestAnimationFrame(() => {
            backButton.classList.add("is-visible");
            requestBackOverlapUpdate();
        });
    }

    function normalizeGenericContactLinks() {
        document.querySelectorAll('a[href*="wa.me/971586122568"], a[href*="api.whatsapp.com/send"]').forEach((link) => {
            const rawHref = link.getAttribute("href") || "";

            try {
                const url = new URL(rawHref, window.location.href);
                const whatsappNumber = url.hostname.includes("wa.me")
                    ? url.pathname.replace(/\D/g, "")
                    : (url.searchParams.get("phone") || "").replace(/\D/g, "");

                if (whatsappNumber !== "971586122568" || url.searchParams.get("text")) {
                    return;
                }

                link.setAttribute("href", DEFAULT_WHATSAPP_URL);
            } catch (error) {
                // Leave malformed URLs for the functional auditor to report.
            }
        });
    }

    function initFloatingContactButtons() {
        if (document.querySelector(".lab-floating-contact")) {
            return;
        }

        function bindFloatingContactCollision(contactNav) {
            const collisionSelector = [
                ".home-booking",
                ".home-booking__shell",
                ".home-booking__intro",
                ".home-booking__field",
                ".home-booking__submit",
                ".home-booking input",
                ".home-booking select",
                ".home-trust-strip",
                ".home-trust-strip__item",
                "main h1",
                "main h2",
                "main h3",
                ".lookup-card",
                ".lookup-form",
                ".lookup-form__actions",
                ".lookup-form input",
                ".lookup-form button",
                ".lookup-form a",
                ".services-hero__selector",
                ".services-lane-orb",
                ".services-lane-orb__action",
                ".locations-map-card",
                ".locations-map-card__frame",
                ".locations-map-card__foot",
                ".locations-hero__zone",
                ".fleet-category",
                ".fleet-category__media",
                ".fleet-category__copy",
                ".featured-fleet__intro",
                ".fleet-editorial__intro",
                ".locations-teaser__copy",
                ".guest-reviews__intro",
                ".vehicle-booking__submit",
                ".vehicle-booking__secondary",
                ".reserve-page .btn",
                ".reserve-page .btn-secondary"
            ].join(", ");
            const ignoredSurfaceSelector = ".lab-floating-contact, .lab-floating-back, .lab-header, .lab-mobile-drawer";
            const collisionSafeGapPx = 18;
            let frameId = 0;

            function isCollisionElement(element) {
                if (!element || contactNav.contains(element) || element.closest(ignoredSurfaceSelector)) {
                    return false;
                }

                return Boolean(element.closest(collisionSelector));
            }

            function rectTouchesExpandedTarget(sourceRect, targetRect) {
                return (
                    sourceRect.right > targetRect.left - collisionSafeGapPx &&
                    sourceRect.left < targetRect.right + collisionSafeGapPx &&
                    sourceRect.bottom > targetRect.top - collisionSafeGapPx &&
                    sourceRect.top < targetRect.bottom + collisionSafeGapPx
                );
            }

            function isVisibleCollisionTarget(element) {
                const targetRect = element.getBoundingClientRect();

                return (
                    targetRect.width > 0 &&
                    targetRect.height > 0 &&
                    targetRect.bottom >= 0 &&
                    targetRect.top <= window.innerHeight &&
                    targetRect.right >= 0 &&
                    targetRect.left <= window.innerWidth
                );
            }

            function hasRectCollision(contactRect) {
                return Array.from(document.querySelectorAll(collisionSelector)).some((element) => (
                    element instanceof HTMLElement &&
                    !contactNav.contains(element) &&
                    !element.closest(ignoredSurfaceSelector) &&
                    isVisibleCollisionTarget(element) &&
                    rectTouchesExpandedTarget(contactRect, element.getBoundingClientRect())
                ));
            }

            function updateCollisionState() {
                frameId = 0;

                if (!contactNav.isConnected || !contactNav.classList.contains("is-visible")) {
                    return;
                }

                const rect = contactNav.getBoundingClientRect();
                const samplePoints = [
                    [rect.left + rect.width * 0.5, rect.top + rect.height * 0.5],
                    [rect.left + rect.width * 0.35, rect.top + rect.height * 0.2],
                    [rect.left + rect.width * 0.65, rect.top + rect.height * 0.2],
                    [rect.left + rect.width * 0.35, rect.top + rect.height * 0.8],
                    [rect.left + rect.width * 0.65, rect.top + rect.height * 0.8]
                ];
                const overlapsCardActions = samplePoints.some(([x, y]) => (
                    document.elementsFromPoint(x, y).some(isCollisionElement)
                )) || hasRectCollision(rect);

                contactNav.classList.toggle("is-over-card-actions", overlapsCardActions);
            }

            function requestCollisionUpdate() {
                if (frameId) {
                    return;
                }

                frameId = window.requestAnimationFrame(updateCollisionState);
            }

            window.addEventListener("scroll", requestCollisionUpdate, { capture: true, passive: true });
            window.addEventListener("resize", requestCollisionUpdate, { passive: true });
            window.addEventListener("orientationchange", requestCollisionUpdate, { passive: true });
            window.setTimeout(requestCollisionUpdate, 250);
            window.setTimeout(requestCollisionUpdate, 900);
            requestCollisionUpdate();
            return requestCollisionUpdate;
        }

        const contactNav = document.createElement("nav");
        contactNav.className = "lab-floating-contact";
        contactNav.setAttribute("aria-label", "Quick contact");
        contactNav.innerHTML = `
            <a class="lab-floating-contact__button lab-floating-contact__button--call" href="${CONTACT_PHONE_HREF}" data-contact-channel="call" data-contact-context="generic" aria-label="Call Dynasty Prestige at +971 58 612 2568">
                <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
                    <path fill="currentColor" d="M6.62 10.79a15.5 15.5 0 0 0 6.59 6.59l2.2-2.2c.27-.27.67-.36 1.02-.24 1.12.37 2.33.57 3.57.57.55 0 1 .45 1 1V20c0 .55-.45 1-1 1C10.07 21 3 13.93 3 5c0-.55.45-1 1-1h3.5c.55 0 1 .45 1 1 0 1.24.2 2.45.57 3.57.11.35.03.74-.25 1.02l-2.2 2.2Z"></path>
                </svg>
                <span>Call</span>
            </a>
            <a class="lab-floating-contact__button lab-floating-contact__button--wa" href="${DEFAULT_WHATSAPP_URL}" target="_blank" rel="noopener" data-contact-channel="whatsapp" data-contact-context="generic" aria-label="WhatsApp Dynasty Prestige">
                <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
                    <path fill="currentColor" d="M19.05 4.91A9.82 9.82 0 0 0 12 2a9.94 9.94 0 0 0-8.54 15.02L2 22l5.13-1.35A9.94 9.94 0 1 0 19.05 4.91ZM12 19.01c-1.53 0-3.04-.41-4.36-1.19l-.31-.18-3.04.8.81-2.96-.2-.31a8 8 0 1 1 7.1 3.84Zm4.39-5.91c-.24-.12-1.43-.7-1.65-.78-.22-.08-.38-.12-.54.12-.16.24-.62.78-.76.94-.14.16-.28.18-.52.06-.24-.12-1.01-.37-1.93-1.18-.71-.63-1.2-1.41-1.34-1.65-.14-.24-.02-.37.1-.49.11-.11.24-.28.36-.42.12-.14.16-.24.24-.4.08-.16.04-.3-.02-.42-.06-.12-.54-1.3-.74-1.78-.2-.48-.4-.41-.54-.41l-.46-.01c-.16 0-.42.06-.64.3-.22.24-.84.82-.84 2s.86 2.32.98 2.48c.12.16 1.69 2.58 4.09 3.61.57.25 1.01.39 1.36.49.57.18 1.09.15 1.5.09.46-.07 1.43-.58 1.63-1.14.2-.56.2-1.04.14-1.14-.06-.1-.22-.16-.46-.28Z"></path>
                </svg>
                <span>WhatsApp</span>
            </a>
        `;

        contactNav.querySelectorAll("a").forEach((link) => {
            link.addEventListener("click", () => {
                emitAnalyticsEvent("floating_contact_click", {
                    cta_channel: normalizeBookingValue(link.dataset.contactChannel),
                    cta_context: normalizeBookingValue(link.dataset.contactContext) || "generic",
                    page_path: normalizeBookingValue(window.location.pathname),
                    page_title: normalizeBookingValue(document.title)
                });
            });
        });

        document.body.appendChild(contactNav);
        const requestContactCollisionUpdate = bindFloatingContactCollision(contactNav);
        window.requestAnimationFrame(() => {
            contactNav.classList.add("is-visible");
            requestContactCollisionUpdate();
        });
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
                    CONTACT_PHONE_HREF,
                    "Call Dynasty Prestige",
                    "M6.62 10.79a15.47 15.47 0 0 0 6.59 6.59l2.2-2.2c.27-.27.67-.36 1.02-.24 1.12.37 2.33.57 3.57.57.55 0 1 .45 1 1V20c0 .55-.45 1-1 1C10.07 21 3 13.93 3 5c0-.55.45-1 1-1h3.5c.55 0 1 .45 1 1 0 1.24.2 2.45.57 3.57.11.35.03.74-.25 1.02l-2.2 2.2Z"
                ),
                buildHeaderUtilityLink(
                    "mailto:prestigegoalmotion@gmail.com",
                    "Email Dynasty Prestige",
                    "M20 5H4a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2Zm-.4 2-6.54 5.23a1.7 1.7 0 0 1-2.12 0L4.4 7h15.2ZM4 17V9.05l5.69 4.56a3.7 3.7 0 0 0 4.62 0L20 9.05V17H4Z"
                ),
                buildHeaderUtilityLink(
                    DEFAULT_WHATSAPP_URL,
                    "Open WhatsApp",
                    "M19.05 4.91A9.82 9.82 0 0 0 12 2a9.94 9.94 0 0 0-8.54 15.02L2 22l5.13-1.35A9.94 9.94 0 1 0 19.05 4.91Zm-7.05 14.1c-1.53 0-3.04-.41-4.36-1.19l-.31-.18-3.04.8.81-2.96-.2-.31a8 8 0 1 1 7.1 3.84Zm4.39-5.91c-.24-.12-1.43-.7-1.65-.78-.22-.08-.38-.12-.54.12-.16.24-.62.78-.76.94-.14.16-.28.18-.52.06-.24-.12-1.01-.37-1.93-1.18-.71-.63-1.2-1.41-1.34-1.65-.14-.24-.02-.37.1-.49.11-.11.24-.28.36-.42.12-.14.16-.24.24-.4.08-.16.04-.3-.02-.42-.06-.12-.54-1.3-.74-1.78-.2-.48-.4-.41-.54-.41l-.46-.01c-.16 0-.42.06-.64.3-.22.24-.84.82-.84 2s.86 2.32.98 2.48c.12.16 1.69 2.58 4.09 3.61.57.25 1.01.39 1.36.49.57.18 1.09.15 1.5.09.46-.07 1.43-.58 1.63-1.14.2-.56.2-1.04.14-1.14-.06-.1-.22-.16-.46-.28Z",
                    'target="_blank" rel="noopener"'
                )
            ].join("");
            headerInner.insertBefore(utility, headerNav);
        }

        let mainLinks = Array.from(nav.children).filter((item) => item.matches?.("a"));
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

        mainLinks = Array.from(nav.children).filter((item) => item.matches?.("a"));
        const hasLookupLink = mainLinks.some((link) => pathsMatch(getPathnameFromHref(link.getAttribute("href")), HEADER_LOOKUP_HREF));

        if (!hasLookupLink) {
            const lookupLink = document.createElement("a");
            lookupLink.href = HEADER_LOOKUP_HREF;
            lookupLink.textContent = "Find Booking";
            if (pathsMatch(getCurrentPagePath(), HEADER_LOOKUP_HREF)) {
                lookupLink.setAttribute("aria-current", "page");
            }

            const contactLink = mainLinks.find((link) => pathsMatch(getPathnameFromHref(link.getAttribute("href")), HEADER_CONTACT_HREF));
            nav.insertBefore(lookupLink, contactLink || null);
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

    function getHomeBookingIntentFromControls(overrides = {}) {
        if (!homePickupDateInput || !homeReturnDateInput || !homePickupTimeInput || !homeReturnTimeInput) {
            return null;
        }

        return {
            ...overrides,
            startDate: homePickupDateInput.value,
            endDate: homeReturnDateInput.value,
            pickupTime: homePickupTimeInput.value,
            dropoffTime: homeReturnTimeInput.value
        };
    }

    function initHomeFleetFilterLinks() {
        const links = Array.from(document.querySelectorAll("[data-home-fleet-filter-key][data-home-fleet-filter-value]"));

        links.forEach((link) => {
            const filterKey = normalizeBookingValue(link.dataset.homeFleetFilterKey);
            const filterValue = normalizeBookingValue(link.dataset.homeFleetFilterValue);

            if (!filterKey || !filterValue) {
                return;
            }

            link.setAttribute("href", buildFleetFilterHref(filterKey, filterValue));
            link.addEventListener("click", (event) => {
                const bookingIntent = getHomeBookingIntentFromControls({
                    car: link.dataset.homeFleetCar,
                    price: link.dataset.homeFleetPrice
                });

                if (!bookingIntent) {
                    return;
                }

                event.preventDefault();
                storeBookingIntent(bookingIntent);
                window.location.href = buildFleetFilterHref(filterKey, filterValue, bookingIntent);
            });
        });
    }

    function getHeroVideoSource() {
        if (!(heroVideo instanceof HTMLVideoElement)) {
            return "";
        }

        const desktopSource = normalizeBookingValue(heroVideo.dataset.srcDesktop);
        const mobileSource = normalizeBookingValue(heroVideo.dataset.srcMobile);

        if (mobileViewport.matches) {
            return mobileSource;
        }

        return desktopSource || mobileSource;
    }

    function markHeroVideoReady() {
        if (!hero) {
            return;
        }

        hero.classList.add("is-video-ready");
    }

    function bindHeroVideoReadiness() {
        if (!(heroVideo instanceof HTMLVideoElement)) {
            return;
        }

        if (heroVideo.readyState >= 2) {
            markHeroVideoReady();
            return;
        }

        if (heroVideoReadinessBound) {
            return;
        }

        heroVideoReadinessBound = true;
        heroVideo.addEventListener("loadeddata", markHeroVideoReady, { once: true });
        heroVideo.addEventListener("canplay", markHeroVideoReady, { once: true });
    }

    function hydrateHeroVideo() {
        if (!(heroVideo instanceof HTMLVideoElement) || shouldSkipHeroVideo) {
            return;
        }

        const selectedSource = getHeroVideoSource();
        if (!selectedSource) {
            heroVideo.removeAttribute("src");
            return;
        }

        heroVideo.preload = "metadata";

        if (heroVideo.getAttribute("src") !== selectedSource) {
            heroVideo.setAttribute("src", selectedSource);
            heroVideo.load();
        }

        bindHeroVideoReadiness();
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
        const sectionLinks = (selector) => Array.from(nav.querySelectorAll(selector));
        const buildSectionLinks = (selector) => sectionLinks(selector)
            .map((link) => `<a href="${link.getAttribute("href") || "#"}">${normalizeBookingValue(link.querySelector("strong")?.textContent || link.textContent)}</a>`)
            .join("");
        const buildDisclosureSection = ({ key, label, selector }) => {
            const count = sectionLinks(selector).length;
            if (count === 0) {
                return "";
            }

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
                            <img src="/images/dp-crest-cropped.png" width="192" height="192" loading="lazy" decoding="async" alt="">
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
                        <a class="lab-mobile-drawer__quick-link lab-mobile-drawer__quick-link--call" href="${CONTACT_PHONE_HREF}" aria-label="Call Dynasty Prestige">
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
                        <a class="lab-mobile-drawer__quick-link lab-mobile-drawer__quick-link--wa" href="${DEFAULT_WHATSAPP_URL}" target="_blank" rel="noopener" aria-label="Open WhatsApp Dynasty Prestige">
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

        if (isFleetPage || !isHomePage) {
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
        const { today, startDate, endDate } = resolveDefaultBookingDates(storedIntent);
        const pickupTime = normalizeBookingValue(storedIntent?.pickupTime) || "12:00";
        const dropoffTime = normalizeBookingValue(storedIntent?.dropoffTime) || "12:00";

        homePickupDateInput.min = today;
        homePickupDateInput.value = startDate;
        homeReturnDateInput.min = homePickupDateInput.value;
        homeReturnDateInput.value = endDate;

        buildTimeOptions(homePickupTimeInput, pickupTime);
        buildTimeOptions(homeReturnTimeInput, dropoffTime);

        homePickupDateInput.addEventListener("change", () => {
            syncBookingDateInputs(homePickupDateInput, homeReturnDateInput);
        });

        homeReturnDateInput.addEventListener("change", () => {
            syncBookingDateInputs(homePickupDateInput, homeReturnDateInput);
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

    function initHeroOverlayBookingDefaults() {
        if (!overlay || !overlayPickupDateInput || !overlayReturnDateInput || !overlayPickupTimeInput || !overlayReturnTimeInput) {
            return;
        }

        const storedIntent = getStoredBookingIntent();
        const { today, startDate, endDate } = resolveDefaultBookingDates(storedIntent);
        const pickupTime = normalizeBookingValue(storedIntent?.pickupTime) || "12:00";
        const dropoffTime = normalizeBookingValue(storedIntent?.dropoffTime) || "12:00";

        overlayPickupDateInput.min = today;
        overlayPickupDateInput.value = startDate;
        overlayReturnDateInput.min = overlayPickupDateInput.value;
        overlayReturnDateInput.value = endDate;

        buildTimeOptions(overlayPickupTimeInput, pickupTime);
        buildTimeOptions(overlayReturnTimeInput, dropoffTime);

        overlayPickupDateInput.addEventListener("change", () => {
            syncBookingDateInputs(overlayPickupDateInput, overlayReturnDateInput);
        });

        overlayReturnDateInput.addEventListener("change", () => {
            syncBookingDateInputs(overlayPickupDateInput, overlayReturnDateInput);
        });
    }

    function initLocationsMap() {
        const maps = Array.from(document.querySelectorAll("[data-locations-map]"));

        if (!maps.length) {
            return;
        }

        const tileSize = 256;
        const minLatitude = -85.05112878;
        const maxLatitude = 85.05112878;

        function clampLatitude(latitude) {
            return Math.max(minLatitude, Math.min(maxLatitude, latitude));
        }

        function projectCoordinate(latitude, longitude, zoom) {
            const scale = tileSize * 2 ** zoom;
            const safeLatitude = clampLatitude(latitude);
            const sinLatitude = Math.sin((safeLatitude * Math.PI) / 180);

            return {
                x: ((longitude + 180) / 360) * scale,
                y: (0.5 - Math.log((1 + sinLatitude) / (1 - sinLatitude)) / (4 * Math.PI)) * scale
            };
        }

        function getMarkerCoordinates(markers) {
            return markers
                .map((marker) => ({
                    element: marker,
                    latitude: Number(marker.dataset.lat),
                    longitude: Number(marker.dataset.lng)
                }))
                .filter((marker) => Number.isFinite(marker.latitude) && Number.isFinite(marker.longitude));
        }

        function chooseZoomLevel(coordinates, width, height) {
            const maxZoom = width < 520 ? 8 : 9;
            const minZoom = 6;
            const padding = width < 520 ? 56 : 92;

            for (let zoom = maxZoom; zoom >= minZoom; zoom -= 1) {
                const points = coordinates.map((coordinate) => projectCoordinate(coordinate.latitude, coordinate.longitude, zoom));
                const xs = points.map((point) => point.x);
                const ys = points.map((point) => point.y);
                const spanX = Math.max(...xs) - Math.min(...xs);
                const spanY = Math.max(...ys) - Math.min(...ys);

                if (spanX <= Math.max(1, width - padding * 2) && spanY <= Math.max(1, height - padding * 2)) {
                    return zoom;
                }
            }

            return minZoom;
        }

        function getProjectedBounds(coordinates, zoom) {
            const points = coordinates.map((coordinate) => projectCoordinate(coordinate.latitude, coordinate.longitude, zoom));
            const xs = points.map((point) => point.x);
            const ys = points.map((point) => point.y);

            return {
                minX: Math.min(...xs),
                maxX: Math.max(...xs),
                minY: Math.min(...ys),
                maxY: Math.max(...ys)
            };
        }

        function createTileImage(zoom, tileX, tileY, left, top) {
            const tileCount = 2 ** zoom;

            if (tileY < 0 || tileY >= tileCount) {
                return null;
            }

            const wrappedTileX = ((tileX % tileCount) + tileCount) % tileCount;
            const image = document.createElement("img");
            image.className = "locations-map-card__tile";
            image.alt = "";
            image.decoding = "async";
            image.loading = "lazy";
            image.referrerPolicy = "no-referrer-when-downgrade";
            image.src = `https://tile.openstreetmap.org/${zoom}/${wrappedTileX}/${tileY}.png`;
            image.style.left = `${left}px`;
            image.style.top = `${top}px`;
            image.addEventListener("load", () => {
                image.classList.add("is-loaded");
            }, { once: true });

            return image;
        }

        function renderMap(map) {
            const tileLayer = map.querySelector("[data-locations-map-tiles]");
            const markerElements = Array.from(map.querySelectorAll("[data-location-marker]"));
            const coordinates = getMarkerCoordinates(markerElements);

            if (!tileLayer || !coordinates.length) {
                return;
            }

            const rect = map.getBoundingClientRect();
            const width = Math.round(rect.width);
            const height = Math.round(rect.height);

            if (width <= 0 || height <= 0) {
                return;
            }

            const zoom = chooseZoomLevel(coordinates, width, height);
            const bounds = getProjectedBounds(coordinates, zoom);
            const center = {
                x: (bounds.minX + bounds.maxX) / 2,
                y: (bounds.minY + bounds.maxY) / 2
            };
            const startTileX = Math.floor((center.x - width / 2) / tileSize);
            const endTileX = Math.floor((center.x + width / 2) / tileSize);
            const startTileY = Math.floor((center.y - height / 2) / tileSize);
            const endTileY = Math.floor((center.y + height / 2) / tileSize);
            const fragment = document.createDocumentFragment();

            for (let tileX = startTileX; tileX <= endTileX; tileX += 1) {
                for (let tileY = startTileY; tileY <= endTileY; tileY += 1) {
                    const left = Math.round(tileX * tileSize - center.x + width / 2);
                    const top = Math.round(tileY * tileSize - center.y + height / 2);
                    const tile = createTileImage(zoom, tileX, tileY, left, top);

                    if (tile) {
                        fragment.appendChild(tile);
                    }
                }
            }

            tileLayer.replaceChildren(fragment);
            coordinates.forEach((coordinate) => {
                const point = projectCoordinate(coordinate.latitude, coordinate.longitude, zoom);
                const left = point.x - center.x + width / 2;
                const top = point.y - center.y + height / 2;
                const edgeBuffer = width < 520 ? 104 : 126;
                const nearLeft = left < edgeBuffer;
                const nearRight = left > width - edgeBuffer;
                const nearSide = nearLeft || nearRight;

                coordinate.element.style.left = `${left}px`;
                coordinate.element.style.top = `${top}px`;
                coordinate.element.classList.toggle("is-near-left", nearLeft);
                coordinate.element.classList.toggle("is-near-right", nearRight);
                coordinate.element.classList.toggle("is-near-top", !nearSide && top < 58);
                coordinate.element.classList.toggle("is-near-bottom", !nearSide && top > height - 58);
            });
            map.classList.add("is-rendered");
            map.dataset.mapZoom = String(zoom);
        }

        maps.forEach((map) => {
            renderMap(map);

            if (typeof ResizeObserver === "function") {
                const resizeObserver = new ResizeObserver(() => {
                    window.requestAnimationFrame(() => renderMap(map));
                });
                resizeObserver.observe(map);
            } else {
                window.addEventListener("resize", () => renderMap(map), { passive: true });
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

            if (options.reveal) {
                panel.classList.remove("is-service-updating");
                window.requestAnimationFrame(() => {
                    panel.classList.add("is-service-updating");

                    if (coarsePointer.matches || mobileViewport.matches) {
                        const rect = panel.getBoundingClientRect();
                        const shouldRevealPanel = rect.top > window.innerHeight * 0.58 || rect.bottom > window.innerHeight;

                        if (shouldRevealPanel) {
                            panel.scrollIntoView({
                                block: "center",
                                behavior: prefersReducedMotion.matches ? "auto" : "smooth"
                            });
                        }
                    }
                });
            }
        }

        tabs.forEach((tab, index) => {
            tab.addEventListener("click", (event) => {
                event.preventDefault();
                activateServiceTab(tab, { reveal: true });
            });

            tab.addEventListener("mouseenter", () => {
                if (!coarsePointer.matches) {
                    activateServiceTab(tab);
                }
            });

            tab.addEventListener("focus", () => {
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

    function initVehicleMediaLightbox() {
        const galleryImages = Array.from(document.querySelectorAll([
            ".vehicle-pdp-gallery-top__stage img",
            ".vehicle-pdp-gallery-top__thumb--media img",
            ".vehicle-pdp-gallery-panel__item img",
            ".vehicle-pdp-gallery-card__media img",
            ".vehicle-landing-reserve__stage img",
            ".vehicle-landing-reserve__thumbs img"
        ].join(",")));

        if (galleryImages.length < 2) {
            return;
        }

        const seenSources = new Set();
        const items = [];
        const triggerEntries = [];

        function getCaptionForImage(image) {
            const thumb = image.closest(".vehicle-pdp-gallery-top__thumb");
            const card = image.closest(".vehicle-pdp-gallery-card");
            const figure = image.closest("figure");

            return normalizeBookingValue(
                thumb?.querySelector(".vehicle-pdp-gallery-top__thumb-copy strong")?.textContent ||
                card?.querySelector(".vehicle-pdp-gallery-card__copy h3")?.textContent ||
                figure?.querySelector("figcaption")?.textContent ||
                image.getAttribute("alt") ||
                "Vehicle media"
            );
        }

        galleryImages.forEach((image) => {
            const source = image.getAttribute("src") || image.currentSrc;
            const absoluteSource = image.src || source;

            if (!source || seenSources.has(absoluteSource)) {
                return;
            }

            const item = {
                src: source,
                alt: normalizeBookingValue(image.getAttribute("alt")) || "Vehicle media",
                caption: getCaptionForImage(image)
            };
            const trigger = image.closest(".vehicle-pdp-gallery-top__stage, .vehicle-pdp-gallery-top__thumb--media, .vehicle-pdp-gallery-panel__item, .vehicle-pdp-gallery-card__media, .vehicle-landing-reserve__stage, .vehicle-landing-reserve__thumbs figure");

            seenSources.add(absoluteSource);
            items.push(item);

            if (trigger instanceof HTMLElement) {
                triggerEntries.push({ trigger, index: items.length - 1, item });
            }
        });

        if (items.length < 2 || triggerEntries.length === 0) {
            return;
        }

        const lightbox = document.createElement("div");
        lightbox.className = "vehicle-media-lightbox";
        lightbox.setAttribute("role", "dialog");
        lightbox.setAttribute("aria-modal", "true");
        lightbox.setAttribute("aria-hidden", "true");
        lightbox.setAttribute("aria-label", "Vehicle media gallery");
        lightbox.innerHTML = `
            <button class="vehicle-media-lightbox__scrim" type="button" data-vehicle-media-close aria-label="Close media gallery"></button>
            <div class="vehicle-media-lightbox__panel">
                <button class="vehicle-media-lightbox__close" type="button" data-vehicle-media-close aria-label="Close media gallery">&times;</button>
                <button class="vehicle-media-lightbox__nav vehicle-media-lightbox__nav--prev" type="button" data-vehicle-media-prev aria-label="Previous image">&lsaquo;</button>
                <figure class="vehicle-media-lightbox__figure">
                    <span class="vehicle-media-lightbox__counter" data-vehicle-media-counter></span>
                    <img class="vehicle-media-lightbox__image" src="" alt="">
                    <figcaption class="vehicle-media-lightbox__caption" data-vehicle-media-caption></figcaption>
                </figure>
                <button class="vehicle-media-lightbox__nav vehicle-media-lightbox__nav--next" type="button" data-vehicle-media-next aria-label="Next image">&rsaquo;</button>
            </div>
        `;
        document.body.appendChild(lightbox);

        const image = lightbox.querySelector(".vehicle-media-lightbox__image");
        const caption = lightbox.querySelector("[data-vehicle-media-caption]");
        const counter = lightbox.querySelector("[data-vehicle-media-counter]");
        const closeButton = lightbox.querySelector(".vehicle-media-lightbox__close");
        let activeIndex = 0;
        let lightboxLastFocus = null;

        function renderItem(index) {
            const nextIndex = (index + items.length) % items.length;
            const item = items[nextIndex];

            activeIndex = nextIndex;
            image.src = item.src;
            image.alt = item.alt;
            caption.textContent = item.caption;
            counter.textContent = `${activeIndex + 1} / ${items.length}`;
        }

        function openLightbox(index) {
            lightboxLastFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null;
            renderItem(index);
            lightbox.classList.add("is-open");
            lightbox.setAttribute("aria-hidden", "false");
            document.body.classList.add("vehicle-media-lightbox-open");
            closeButton.focus({ preventScroll: true });
        }

        function closeLightbox() {
            lightbox.classList.remove("is-open");
            lightbox.setAttribute("aria-hidden", "true");
            document.body.classList.remove("vehicle-media-lightbox-open");

            if (lightboxLastFocus instanceof HTMLElement) {
                lightboxLastFocus.focus({ preventScroll: true });
            }
        }

        triggerEntries.forEach(({ trigger, index, item }) => {
            trigger.classList.add("is-lightbox-trigger");
            trigger.setAttribute("role", "button");
            trigger.setAttribute("tabindex", "0");

            if (!trigger.getAttribute("aria-label")) {
                trigger.setAttribute("aria-label", `Open media gallery: ${item.caption}`);
            }

            trigger.addEventListener("click", () => openLightbox(index));
            trigger.addEventListener("keydown", (event) => {
                if (event.key !== "Enter" && event.key !== " ") {
                    return;
                }

                event.preventDefault();
                openLightbox(index);
            });
        });

        lightbox.querySelectorAll("[data-vehicle-media-close]").forEach((button) => {
            button.addEventListener("click", closeLightbox);
        });
        lightbox.querySelector("[data-vehicle-media-prev]")?.addEventListener("click", () => renderItem(activeIndex - 1));
        lightbox.querySelector("[data-vehicle-media-next]")?.addEventListener("click", () => renderItem(activeIndex + 1));

        document.addEventListener("keydown", (event) => {
            if (!lightbox.classList.contains("is-open")) {
                return;
            }

            if (event.key === "Escape") {
                closeLightbox();
            } else if (event.key === "ArrowLeft") {
                renderItem(activeIndex - 1);
            } else if (event.key === "ArrowRight") {
                renderItem(activeIndex + 1);
            }
        });
    }

    function initGoogleReviews() {
        const reviewsSection = document.querySelector("[data-google-reviews]");

        if (!(reviewsSection instanceof HTMLElement)) {
            return;
        }

        const grid = reviewsSection.querySelector("[data-google-reviews-grid]");
        const placeNameElement = reviewsSection.querySelector("[data-google-place-name]");
        const ratingElement = reviewsSection.querySelector("[data-google-rating]");
        const countElement = reviewsSection.querySelector("[data-google-review-count]");
        const reviewsLink = reviewsSection.querySelector("[data-google-reviews-link]");
        const writeReviewLink = reviewsSection.querySelector("[data-google-write-review-link]");
        const fallbackReviewsUrl = reviewsSection.getAttribute("data-google-reviews-url") || "https://www.google.com/maps/search/?api=1&query=Dynasty%20Prestige%20Luxury%20Car%20Rental%20Dubai";
        const fallbackWriteReviewUrl = reviewsSection.getAttribute("data-google-write-review-url") || writeReviewLink?.href || fallbackReviewsUrl;

        function setLink(element, href) {
            if (element instanceof HTMLAnchorElement && href) {
                element.href = href;
            }
        }

        function escapeHtml(value) {
            return String(value || "")
                .replace(/&/g, "&amp;")
                .replace(/</g, "&lt;")
                .replace(/>/g, "&gt;")
                .replace(/"/g, "&quot;")
                .replace(/'/g, "&#039;");
        }

        function getBackendBaseUrl() {
            if (typeof window.getConfiguredBackendUrl === "function") {
                return normalizeBookingValue(window.getConfiguredBackendUrl()).replace(/\/+$/, "");
            }

            return "";
        }

        function renderStatusCard(title, subtitle, message) {
            if (!grid) {
                return;
            }

            grid.innerHTML = `
                <article class="review-card review-card--google review-card--status">
                    <div class="review-card__topline">
                        <div class="review-card__header">
                            <span class="review-card__avatar review-card__avatar--google" aria-hidden="true">G</span>
                            <div>
                                <strong>${escapeHtml(title)}</strong>
                                <span>${escapeHtml(subtitle)}</span>
                            </div>
                        </div>
                        <span class="review-card__source" aria-label="Google review source">G</span>
                    </div>
                    <span class="review-card__stars" aria-hidden="true">&#9733;&#9733;&#9733;&#9733;&#9733;</span>
                    <p>${escapeHtml(message)}</p>
                </article>
            `;
        }

        function starsForRating(rating) {
            const safeRating = Number.isFinite(Number(rating)) ? Number(rating) : 0;
            const rounded = Math.max(0, Math.min(5, Math.round(safeRating)));
            return `${"&#9733;".repeat(rounded)}${"&#9734;".repeat(5 - rounded)}`;
        }

        function renderReviewCard(review) {
            const authorName = normalizeBookingValue(review.authorName) || "Google reviewer";
            const authorInitial = authorName.slice(0, 1).toUpperCase() || "G";
            const reviewText = normalizeBookingValue(review.text) || "This Google review did not include written feedback.";
            const relativeTime = normalizeBookingValue(review.relativeTimeDescription) || "Google review";
            const rating = Number.isFinite(Number(review.rating)) ? Number(review.rating).toFixed(1) : "5.0";

            return `
                <article class="review-card review-card--google">
                    <div class="review-card__topline">
                        <div class="review-card__header">
                            <span class="review-card__avatar review-card__avatar--google" aria-hidden="true">${escapeHtml(authorInitial)}</span>
                            <div>
                                <strong>${escapeHtml(authorName)}</strong>
                                <span>${escapeHtml(relativeTime)}</span>
                            </div>
                        </div>
                        <a class="review-card__source" href="${escapeHtml(reviewsLink?.href || fallbackReviewsUrl)}" target="_blank" rel="noopener noreferrer" aria-label="Open Google reviews">G</a>
                    </div>
                    <span class="review-card__stars" aria-label="${escapeHtml(rating)} out of 5">${starsForRating(review.rating)}</span>
                    <p>${escapeHtml(reviewText)}</p>
                </article>
            `;
        }

        async function loadGoogleReviews() {
            const backendBaseUrl = getBackendBaseUrl();
            const endpoint = backendBaseUrl ? `${backendBaseUrl}/api/reviews/google` : "/api/reviews/google";
            const response = await fetch(endpoint, {
                headers: {
                    Accept: "application/json"
                }
            });

            if (!response.ok) {
                throw new Error(`Google reviews request failed with ${response.status}`);
            }

            return response.json();
        }

        setLink(reviewsLink, fallbackReviewsUrl);
        setLink(writeReviewLink, fallbackWriteReviewUrl);

        const runtimeConfig = window.PGM_RUNTIME_CONFIG && typeof window.PGM_RUNTIME_CONFIG === "object"
            ? window.PGM_RUNTIME_CONFIG
            : {};
        const skipLocalFetch = window.STRIPE_CONFIG?.isDevelopment && runtimeConfig.enableGoogleReviewsFetch !== true;

        if (skipLocalFetch) {
            if (countElement) {
                countElement.textContent = "Official Google profile link ready; live review loading runs in staging and production.";
            }

            renderStatusCard(
                "Google profile ready",
                "Live loading disabled locally",
                "In staging and production, this section loads reviews from the backend Google Places endpoint. Locally, we skip the request to avoid false console errors when the API server is not running."
            );
            return;
        }

        loadGoogleReviews()
            .then((payload) => {
                const place = payload?.place || {};
                const reviews = Array.isArray(payload?.reviews) ? payload.reviews : [];
                const reviewsUrl = normalizeBookingValue(place.reviewsUrl) || fallbackReviewsUrl;
                const writeReviewUrl = normalizeBookingValue(place.writeReviewUrl) || fallbackWriteReviewUrl;
                const rating = Number(place.rating);
                const totalReviews = Number(place.totalReviews);

                setLink(reviewsLink, reviewsUrl);
                setLink(writeReviewLink, writeReviewUrl);

                if (placeNameElement && place.name) {
                    placeNameElement.textContent = place.name;
                }

                if (ratingElement) {
                    ratingElement.textContent = Number.isFinite(rating) ? rating.toFixed(1) : "Google";
                }

                if (countElement) {
                    countElement.textContent = Number.isFinite(totalReviews)
                        ? `Based on ${totalReviews.toLocaleString("en-GB")} Google reviews`
                        : "Based on the official Google Business profile";
                }

                if (!reviews.length) {
                    renderStatusCard(
                        payload?.configured ? "Google profile connected" : "Google profile pending",
                        payload?.configured ? "No written reviews returned" : "Place ID not configured",
                        payload?.message || "Open the official Google profile to read the latest public reviews."
                    );
                    return;
                }

                if (grid) {
                    grid.innerHTML = reviews.slice(0, 3).map(renderReviewCard).join("");
                }
            })
            .catch(() => {
                if (ratingElement) {
                    ratingElement.textContent = "Google";
                }

                if (countElement) {
                    countElement.textContent = "Open the official Google profile for the latest reviews.";
                }

                renderStatusCard(
                    "Google reviews unavailable",
                    "Official profile link remains available",
                    "We could not load live Google review data right now, so we are not showing copied or sample testimonials."
                );
            });
    }

    enhanceHeaderConsistency();
    normalizeGenericContactLinks();
    initServicesLaneSelector();
    initVehicleMediaLightbox();
    initFleetFilterLinks();
    initHomeFleetFilterLinks();
    initFloatingBackButton();
    initFloatingContactButtons();
    initCheckoutReturnBanner();
    setHeaderScrollState();
    initMobileHeaderDrawer();
    initMobileActionBar();
    initHomeBookingBar();
    initHeroOverlayBookingDefaults();
    initLocationsMap();
    initGoogleReviews();

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
                startDate: overlayPickupDateInput?.value,
                endDate: overlayReturnDateInput?.value,
                pickupTime: overlayPickupTimeInput?.value,
                dropoffTime: overlayReturnTimeInput?.value
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
