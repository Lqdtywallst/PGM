document.addEventListener("DOMContentLoaded", () => {
    const selectorRoot = document.querySelector("[data-services-selector]");

    if (!selectorRoot) {
        return;
    }

    const tabs = Array.from(selectorRoot.querySelectorAll("[data-service-selector]"));
    const panel = selectorRoot.querySelector("[data-service-panel]");

    if (!panel || tabs.length === 0) {
        return;
    }

    const primaryLink = panel.querySelector("[data-service-primary]");
    const kicker = panel.querySelector("[data-service-kicker]");
    const title = panel.querySelector("[data-service-title]");
    const copy = panel.querySelector("[data-service-copy]");
    const compactViewport = window.matchMedia("(max-width: 1024px)");
    const points = {
        one: panel.querySelector('[data-service-point="one"]'),
        two: panel.querySelector('[data-service-point="two"]'),
        three: panel.querySelector('[data-service-point="three"]')
    };

    if (!primaryLink || !kicker || !title || !copy) {
        return;
    }

    function setTabState(activeTab) {
        tabs.forEach((tab) => {
            const isActive = tab === activeTab;
            tab.classList.toggle("is-active", isActive);
            tab.setAttribute("aria-selected", String(isActive));
            tab.tabIndex = isActive ? 0 : -1;
        });
    }

    function updatePoint(element, value) {
        if (!element) {
            return;
        }

        if (!value) {
            element.hidden = true;
            element.textContent = "";
            return;
        }

        element.hidden = false;
        element.textContent = value;
    }

    function applyService(tab) {
        setTabState(tab);

        panel.setAttribute("aria-labelledby", tab.id);
        kicker.textContent = tab.dataset.serviceKicker || "";
        title.textContent = tab.dataset.serviceTitle || "";
        copy.textContent = tab.dataset.serviceCopy || "";

        updatePoint(points.one, tab.dataset.servicePointOne);
        updatePoint(points.two, tab.dataset.servicePointTwo);
        updatePoint(points.three, tab.dataset.servicePointThree);

        primaryLink.textContent = tab.dataset.servicePrimaryLabel || "Explore service";
        primaryLink.href = tab.dataset.servicePrimaryHref || "./services.html";

        const analyticsService = tab.dataset.serviceAnalyticsService || "services_hub";
        primaryLink.dataset.analyticsService = analyticsService;
    }

    tabs.forEach((tab, index) => {
        const previewTab = () => {
            if (compactViewport.matches) {
                return;
            }

            applyService(tab);
        };

        tab.addEventListener("mouseenter", previewTab);
        tab.addEventListener("focus", previewTab);

        tab.addEventListener("keydown", (event) => {
            const moveNext = event.key === "ArrowRight" || event.key === "ArrowDown";
            const movePrev = event.key === "ArrowLeft" || event.key === "ArrowUp";

            if (!moveNext && !movePrev) {
                return;
            }

            event.preventDefault();

            const nextIndex = moveNext
                ? (index + 1) % tabs.length
                : (index - 1 + tabs.length) % tabs.length;

            const nextTab = tabs[nextIndex];
            applyService(nextTab);
            nextTab.focus();
        });
    });

    const initiallyActive = tabs.find((tab) => tab.classList.contains("is-active")) || tabs[0];
    applyService(initiallyActive);
});
