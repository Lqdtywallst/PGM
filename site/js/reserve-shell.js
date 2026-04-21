(function initReserveShell() {
    const HEADER_RESERVE_HREF = "/app/reserve/page.html";

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

        if (reserveLink) {
            mainLinks.push({
                href: reserveLink.getAttribute("href") || HEADER_RESERVE_HREF,
                label: normalizeValue(reserveLink.textContent) || "Reserve",
                current: reserveLink.getAttribute("aria-current") === "page"
            });
        }

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
                                <img src="/icons/icon-96.png" width="96" height="96" loading="lazy" decoding="async" alt="">
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

    function init() {
        initMegaNav();
        initMobileDrawer();
    }

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", init, { once: true });
    } else {
        init();
    }
}());
