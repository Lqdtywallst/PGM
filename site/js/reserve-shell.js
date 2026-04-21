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
                            <a class="lab-mobile-drawer__quick-link" href="tel:+971586122568">Call</a>
                            <a class="lab-mobile-drawer__quick-link" href="mailto:prestigegoalmotion@gmail.com">Email</a>
                            <a class="lab-mobile-drawer__quick-link" href="https://wa.me/971586122568" target="_blank" rel="noopener">WhatsApp</a>
                        </div>
                    </div>
                    <div class="lab-mobile-drawer__section">
                        <span class="lab-mobile-drawer__label">Navigate</span>
                        <div class="lab-mobile-drawer__links lab-mobile-drawer__links--nav">
                            ${mainLinks.map((link) => `<a href="${escapeHtml(link.href)}"${link.current ? ' aria-current="page"' : ""}>${escapeHtml(link.label)}</a>`).join("")}
                        </div>
                    </div>
                    <div class="lab-mobile-drawer__section">
                        <span class="lab-mobile-drawer__label">Brands</span>
                        <div class="lab-mobile-drawer__links lab-mobile-drawer__links--compact">${buildSectionLinks(nav, ".lab-nav__panel--brands .lab-nav__card")}</div>
                    </div>
                    <div class="lab-mobile-drawer__section">
                        <span class="lab-mobile-drawer__label">Browse</span>
                        <div class="lab-mobile-drawer__links lab-mobile-drawer__links--compact">${buildSectionLinks(nav, ".lab-nav__panel--types .lab-nav__card")}</div>
                    </div>
                    <div class="lab-mobile-drawer__actions">
                        <a class="lab-mobile-drawer__action lab-mobile-drawer__action--primary" href="${escapeHtml(reserveLink?.getAttribute("href") || HEADER_RESERVE_HREF)}">Reserve</a>
                        <a class="lab-mobile-drawer__action lab-mobile-drawer__action--secondary" href="https://wa.me/971586122568" target="_blank" rel="noopener">WhatsApp now</a>
                        <a class="lab-mobile-drawer__action lab-mobile-drawer__action--secondary" href="tel:+971586122568">Call</a>
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
