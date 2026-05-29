(function initReserveShell() {
    const HEADER_RESERVE_HREF = "/app/reserve/page.html";
    const HEADER_LOOKUP_HREF = "/reservation-lookup.html";
    const HEADER_CONTACT_HREF = "/contact.html";
    const CONTACT_PHONE_HREF = "tel:+971586122568";
    const DEFAULT_WHATSAPP_MESSAGE = "Hi, I would like help booking a luxury car in Dubai.";
    const DEFAULT_WHATSAPP_URL = `https://wa.me/971586122568?text=${encodeURIComponent(DEFAULT_WHATSAPP_MESSAGE)}`;

    function normalizeValue(value) {
        return String(value || "").replace(/\s+/g, " ").trim();
    }

    function escapeHtml(value) {
        return normalizeValue(value)
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;");
    }

    function emitShellEvent(eventName, payload = {}) {
        window.dataLayer = window.dataLayer || [];
        window.dataLayer.push({ event: eventName, ...payload });
    }

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

    function initMegaNav() {
        const megaNavItems = Array.from(document.querySelectorAll(".js-nav-mega"));
        const hoverCapable = window.matchMedia("(hover: hover) and (pointer: fine)");

        if (megaNavItems.length === 0) {
            return;
        }

        let closeTimer = null;

        function setMegaMenuState(openItem = null) {
            if (openItem) {
                hydrateMegaMenuImages(openItem);
            }

            megaNavItems.forEach((item) => {
                const trigger = item.querySelector(".lab-nav__trigger");
                const isOpen = item === openItem;
                item.classList.toggle("is-open", isOpen);
                trigger?.setAttribute("aria-expanded", String(isOpen));
            });
        }

        function clearCloseTimer() {
            if (closeTimer !== null) {
                window.clearTimeout(closeTimer);
                closeTimer = null;
            }
        }

        function scheduleClose() {
            clearCloseTimer();
            closeTimer = window.setTimeout(() => setMegaMenuState(null), 320);
        }

        megaNavItems.forEach((item) => {
            const trigger = item.querySelector(".lab-nav__trigger");
            const panel = item.querySelector(".lab-nav__panel");

            trigger?.addEventListener("click", (event) => {
                event.preventDefault();
                clearCloseTimer();

                if (hoverCapable.matches) {
                    setMegaMenuState(item);
                    trigger.blur();
                    return;
                }

                setMegaMenuState(item.classList.contains("is-open") ? null : item);
            });

            trigger?.addEventListener("mouseenter", () => {
                if (hoverCapable.matches) {
                    clearCloseTimer();
                    setMegaMenuState(item);
                }
            });

            trigger?.addEventListener("mouseleave", () => {
                if (hoverCapable.matches) {
                    scheduleClose();
                }
            });

            panel?.addEventListener("mouseenter", () => {
                if (hoverCapable.matches) {
                    clearCloseTimer();
                    setMegaMenuState(item);
                }
            });

            panel?.addEventListener("mouseleave", () => {
                if (hoverCapable.matches) {
                    scheduleClose();
                }
            });
        });

        document.addEventListener("click", (event) => {
            clearCloseTimer();
            if (!megaNavItems.some((item) => item.contains(event.target))) {
                setMegaMenuState(null);
            }
        });

        document.addEventListener("keydown", (event) => {
            if (event.key === "Escape") {
                clearCloseTimer();
                setMegaMenuState(null);
            }
        });
    }

    function buildSectionLinks(nav, selector) {
        return Array.from(nav.querySelectorAll(selector))
            .map((link) => {
                const href = link.getAttribute("href") || "#";
                const label = link.querySelector("strong")?.textContent || link.textContent;
                return `<a href="${escapeHtml(href)}">${escapeHtml(label)}</a>`;
            })
            .join("");
    }

    function buildDisclosureSection(nav, { key, label, selector }) {
        const count = Array.from(nav.querySelectorAll(selector)).length;
        if (count === 0) {
            return "";
        }

        const countLabel = count === 1 ? "1 option" : `${count} options`;

        return `
            <details class="lab-mobile-drawer__section lab-mobile-drawer__section--disclosure" data-mobile-drawer-disclosure="${escapeHtml(key)}">
                <summary class="lab-mobile-drawer__summary">
                    <span class="lab-mobile-drawer__label">${escapeHtml(label)}</span>
                    <span class="lab-mobile-drawer__summary-meta">${escapeHtml(countLabel)}</span>
                    <span class="lab-mobile-drawer__summary-icon" aria-hidden="true"></span>
                </summary>
                <div class="lab-mobile-drawer__links lab-mobile-drawer__links--compact">${buildSectionLinks(nav, selector)}</div>
            </details>
        `;
    }

    function initFloatingBackButton() {
        const navigationMemoryKey = "dynastyPreviousPage";

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
            const [pathWithSearch] = normalizeValue(value).split("#");
            const [pathname, search = ""] = pathWithSearch.split("?");
            const normalizedPathname = (pathname || "/").replace(/\/index\.html$/i, "/");
            const compactPathname = normalizedPathname === "/" ? "/" : normalizedPathname.replace(/\/+$/, "");
            return `${compactPathname}${search ? `?${search}` : ""}`;
        }

        function pathsEqual(left, right) {
            return stripHashAndTrailingSlash(left) === stripHashAndTrailingSlash(right);
        }

        function getFallbackPreviousPath(currentPath) {
            const [pathname] = stripHashAndTrailingSlash(currentPath).split("?");

            if (!pathname || pathsEqual(pathname, "/")) {
                return "";
            }

            if (pathname.includes("/app/reserve/page.html")) {
                return "/fleet.html";
            }

            return "/";
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
        const storedCurrentPath = normalizeInternalPath(storedMemory.current);
        const storedPreviousPath = normalizeInternalPath(storedMemory.previous);
        const historyPreviousPath = [
            referrerPath,
            storedCurrentPath && !pathsEqual(storedCurrentPath, currentPath) ? storedCurrentPath : "",
            storedPreviousPath
        ].find((candidate) => candidate && !pathsEqual(candidate, currentPath));
        const fallbackPreviousPath = getFallbackPreviousPath(currentPath);
        const previousPath = historyPreviousPath ||
            (fallbackPreviousPath && !pathsEqual(fallbackPreviousPath, currentPath) ? fallbackPreviousPath : "");

        writeNavigationMemory({
            current: currentPath,
            previous: historyPreviousPath || "",
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
                emitShellEvent("floating_contact_click", {
                    cta_channel: normalizeValue(link.dataset.contactChannel),
                    cta_context: normalizeValue(link.dataset.contactContext) || "generic",
                    page_path: normalizeValue(window.location.pathname),
                    page_title: normalizeValue(document.title)
                });
            });
        });

        document.body.appendChild(contactNav);
        window.requestAnimationFrame(() => contactNav.classList.add("is-visible"));
    }

    function initMobileDrawer() {
        const header = document.querySelector(".lab-header");
        const headerInner = header?.querySelector(".lab-header__inner");
        const headerNav = header?.querySelector(".lab-header__nav");
        const nav = header?.querySelector(".lab-nav");

        if (!header || !headerInner || !headerNav || !nav) {
            return;
        }

        const reserveLink = headerNav.querySelector(".lab-reserve");
        const mainLinks = Array.from(nav.children)
            .filter((item) => item.matches?.("a"))
            .map((link) => ({
                href: link.getAttribute("href") || "#",
                label: normalizeValue(link.textContent),
                current: link.getAttribute("aria-current") === "page"
            }));

        let toggle = header.querySelector(".lab-mobile-toggle");
        if (!toggle) {
            toggle = document.createElement("button");
            toggle.type = "button";
            toggle.className = "lab-mobile-toggle";
            toggle.innerHTML = [
                '<span class="lab-mobile-toggle__line"></span>',
                '<span class="lab-mobile-toggle__line"></span>',
                '<span class="lab-mobile-toggle__line"></span>'
            ].join("");
            headerInner.insertBefore(toggle, headerNav);
        }
        toggle.setAttribute("aria-expanded", "false");
        toggle.setAttribute("aria-controls", "lab-mobile-drawer");
        toggle.setAttribute("aria-label", "Open navigation");

        let drawer = null;

        function ensureDrawer() {
            if (drawer) {
                return drawer;
            }

            drawer = document.createElement("div");
            drawer.className = "lab-mobile-drawer";
            drawer.id = "lab-mobile-drawer";
            drawer.setAttribute("aria-hidden", "true");
            drawer.setAttribute("inert", "");
            drawer.innerHTML = `
                <div class="lab-mobile-drawer__scrim" data-mobile-nav-close></div>
                <div class="lab-mobile-drawer__panel" role="dialog" aria-modal="true" aria-label="Mobile navigation">
                    <div class="lab-mobile-drawer__header">
                        <div class="lab-mobile-drawer__brand">
                            <span class="lab-mobile-drawer__crest" aria-hidden="true">
                                <img src="/images/dp-crest-optimized.png" width="192" height="214" loading="lazy" decoding="async" alt="">
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
                            ${mainLinks.map((link) => `<a href="${escapeHtml(link.href)}"${link.current ? ' aria-current="page"' : ""}>${escapeHtml(link.label)}</a>`).join("")}
                        </div>
                    </div>
                    ${buildDisclosureSection(nav, { key: "brands", label: "Brands", selector: ".lab-nav__panel--brands .lab-nav__card" })}
                    ${buildDisclosureSection(nav, { key: "browse", label: "Browse", selector: ".lab-nav__panel--types .lab-nav__card" })}
                    <div class="lab-mobile-drawer__actions">
                        <a class="lab-mobile-drawer__action lab-mobile-drawer__action--primary" href="${escapeHtml(reserveLink?.getAttribute("href") || HEADER_RESERVE_HREF)}">Reserve</a>
                    </div>
                </div>
            `;
            document.body.appendChild(drawer);
            drawer.querySelectorAll("[data-mobile-nav-close], a").forEach((element) => {
                element.addEventListener("click", () => setDrawerState(false));
            });
            return drawer;
        }

        function setDrawerState(isOpen) {
            const activeDrawer = ensureDrawer();
            document.body.classList.toggle("lab-mobile-nav-open", isOpen);
            activeDrawer.classList.toggle("is-open", isOpen);
            toggle.classList.toggle("is-open", isOpen);
            activeDrawer.setAttribute("aria-hidden", String(!isOpen));
            toggle.setAttribute("aria-expanded", String(isOpen));

            if (isOpen) {
                activeDrawer.removeAttribute("inert");
                emitShellEvent("mobile_menu_open", {
                    page_path: normalizeValue(window.location.pathname),
                    page_title: normalizeValue(document.title)
                });
            } else {
                activeDrawer.setAttribute("inert", "");
            }
        }

        toggle.addEventListener("click", () => setDrawerState(!drawer?.classList.contains("is-open")));

        window.__reserveOpenMobileDrawer = () => setDrawerState(true);
        window.__reserveCloseMobileDrawer = () => setDrawerState(false);

        document.addEventListener("keydown", (event) => {
            if (event.key === "Escape" && drawer?.classList.contains("is-open")) {
                setDrawerState(false);
            }
        });
    }

    function normalizePathname(href) {
        try {
            return new URL(href, window.location.href).pathname.replace(/\/+$/, "") || "/";
        } catch (error) {
            return normalizeValue(href).replace(/\/+$/, "") || "/";
        }
    }

    function pathsMatch(leftPath, rightPath) {
        return normalizePathname(leftPath) === normalizePathname(rightPath);
    }

    function enhanceReserveNavigation() {
        const nav = document.querySelector(".lab-header .lab-nav");
        if (!nav) {
            return;
        }

        const mainLinks = Array.from(nav.children).filter((item) => item.matches?.("a"));
        const hasLookupLink = mainLinks.some((link) => pathsMatch(link.getAttribute("href"), HEADER_LOOKUP_HREF));

        if (hasLookupLink) {
            return;
        }

        const lookupLink = document.createElement("a");
        lookupLink.href = HEADER_LOOKUP_HREF;
        lookupLink.textContent = "Find Booking";
        if (pathsMatch(window.location.pathname, HEADER_LOOKUP_HREF)) {
            lookupLink.setAttribute("aria-current", "page");
        }

        const contactLink = mainLinks.find((link) => pathsMatch(link.getAttribute("href"), HEADER_CONTACT_HREF));
        nav.insertBefore(lookupLink, contactLink || null);
    }

    function init() {
        initMegaNav();
        normalizeGenericContactLinks();
        enhanceReserveNavigation();
        initMobileDrawer();
        initFloatingBackButton();
        initFloatingContactButtons();
    }

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", init, { once: true });
    } else {
        init();
    }
}());
