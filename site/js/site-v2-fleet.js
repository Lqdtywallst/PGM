document.addEventListener("DOMContentLoaded", () => {
    const browser = document.querySelector(".js-fleet-browser");

    if (!browser) {
        return;
    }

    const BOOKING_INTENT_KEY = "dynastyBookingIntent";
    const DEFAULT_WHATSAPP_URL = "https://wa.me/971586122568?text=Hi%2C%20I%20would%20like%20help%20booking%20a%20luxury%20car%20in%20Dubai.";
    const searchParams = new URLSearchParams(window.location.search);
    const cards = Array.from(browser.querySelectorAll(".js-fleet-card"));
    const results = browser.querySelector(".fleet-results");
    const resultsHeader = browser.querySelector(".fleet-results__header");
    const resultsList = browser.querySelector(".js-fleet-grid");
    const sidebar = browser.querySelector(".fleet-sidebar");
    const sidebarTopbar = sidebar?.querySelector(".fleet-sidebar__topbar");
    const sortSelect = browser.querySelector(".js-fleet-sort");
    const brandSelect = browser.querySelector(".js-fleet-brand-select");
    const typeSelect = browser.querySelector(".js-fleet-type-select");
    const priceRange = browser.querySelector(".js-fleet-price-range");
    const priceMinInput = browser.querySelector(".js-fleet-price-min");
    const priceMaxInput = browser.querySelector(".js-fleet-price-max");
    const priceSelected = browser.querySelector(".js-fleet-price-selected");
    const priceFloor = browser.querySelector(".js-fleet-price-floor");
    const priceCeiling = browser.querySelector(".js-fleet-price-ceiling");
    const resultCount = browser.querySelector(".js-fleet-results-count");
    const emptyState = browser.querySelector(".js-fleet-empty");
    const resetButtons = Array.from(browser.querySelectorAll(".js-fleet-reset"));
    const fieldInputs = Array.from(browser.querySelectorAll(".js-fleet-field-input"));
    const pickupDateInput = document.getElementById("fleet-pickup-date");
    const pickupTimeInput = document.getElementById("fleet-pickup-time");
    const returnDateInput = document.getElementById("fleet-return-date");
    const returnTimeInput = document.getElementById("fleet-return-time");
    const availabilityByVehicleId = new Map();
    let availabilityStatus = "idle";
    let availabilityRequestId = 0;

    if (!resultsList || !priceMinInput || !priceMaxInput) {
        return;
    }

    const featuredOrder = new Map(cards.map((card, index) => [card, index]));
    const prices = cards
        .map((card) => Number(card.dataset.price))
        .filter((price) => Number.isFinite(price));

    const catalogMin = prices.length ? Math.min(...prices) : Number(priceMinInput.min || 0);
    const catalogMax = prices.length ? Math.max(...prices) : Number(priceMaxInput.max || 0);

    const defaultState = {
        brand: "all",
        type: "all",
        vehicle: "all",
        sort: "featured",
        priceMin: catalogMin,
        priceMax: catalogMax
    };

    const state = { ...defaultState };

    priceMinInput.min = String(catalogMin);
    priceMinInput.max = String(catalogMax);
    priceMinInput.value = String(defaultState.priceMin);
    priceMaxInput.min = String(catalogMin);
    priceMaxInput.max = String(catalogMax);
    priceMaxInput.value = String(defaultState.priceMax);

    function normalizeValue(value) {
        return String(value || "").trim();
    }

    function normalizeFilterValue(value) {
        return normalizeValue(value).toLowerCase();
    }

    function emitAnalyticsEvent(eventName, payload) {
        const safePayload = { ...payload };

        if (window.google_tag_manager) {
            window.dataLayer = window.dataLayer || [];
            window.dataLayer.push({ event: eventName, ...safePayload });
        } else if (typeof window.gtag === "function") {
            window.gtag("event", eventName, safePayload);
        } else {
            window.dataLayer = window.dataLayer || [];
            window.dataLayer.push({ event: eventName, ...safePayload });
        }

        document.dispatchEvent(new CustomEvent("dynasty:analytics", {
            detail: {
                event: eventName,
                payload: safePayload
            }
        }));
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
        const normalized = normalizeValue(value);

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
        const normalized = normalizeValue(value);
        const fallback = isValidDateInputValue(fallbackValue) ? fallbackValue : getDubaiDateString(0);
        const minimum = isValidDateInputValue(minDateValue) ? minDateValue : getDubaiDateString(0);

        if (!isValidDateInputValue(normalized)) {
            return fallback < minimum ? minimum : fallback;
        }

        return normalized < minimum ? minimum : normalized;
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

            return parsedIntent;
        } catch (error) {
            return null;
        }
    }

    function storeBookingIntent(bookingIntent) {
        const normalizedIntent = {
            car: normalizeValue(bookingIntent?.car),
            price: normalizeValue(bookingIntent?.price),
            startDate: normalizeValue(bookingIntent?.startDate),
            endDate: normalizeValue(bookingIntent?.endDate),
            pickupTime: normalizeValue(bookingIntent?.pickupTime),
            dropoffTime: normalizeValue(bookingIntent?.dropoffTime),
            savedAt: Date.now()
        };

        try {
            window.sessionStorage.setItem(BOOKING_INTENT_KEY, JSON.stringify(normalizedIntent));
        } catch (error) {
            // Ignore sessionStorage failures.
        }

        return normalizedIntent;
    }

    function getIncomingBookingIntent() {
        const storedIntent = getStoredBookingIntent();
        return {
            startDate: searchParams.get("startDate") || storedIntent?.startDate || "",
            endDate: searchParams.get("endDate") || storedIntent?.endDate || "",
            pickupTime: searchParams.get("pickupTime") || storedIntent?.pickupTime || "",
            dropoffTime: searchParams.get("dropoffTime") || storedIntent?.dropoffTime || ""
        };
    }

    function hasSchedule(intent) {
        return Boolean(normalizeValue(intent?.startDate) && normalizeValue(intent?.endDate));
    }

    function normalizeScheduleTime(value, fallbackValue = "12:00") {
        const normalized = normalizeValue(value || fallbackValue);
        return /^\d{2}:\d{2}$/.test(normalized) ? normalized : fallbackValue;
    }

    function isScheduleRangeValid(schedule) {
        if (!hasSchedule(schedule)) {
            return false;
        }

        if (!isValidDateInputValue(schedule.startDate) || !isValidDateInputValue(schedule.endDate)) {
            return false;
        }

        if (schedule.startDate > schedule.endDate) {
            return false;
        }

        if (schedule.startDate === schedule.endDate) {
            const pickupTime = normalizeScheduleTime(schedule.pickupTime);
            const dropoffTime = normalizeScheduleTime(schedule.dropoffTime);
            return dropoffTime > pickupTime;
        }

        return true;
    }

    function getBackendBaseUrl() {
        if (typeof window.getBackendUrl === "function") {
            return window.getBackendUrl();
        }

        if (typeof window.getConfiguredBackendUrl === "function") {
            return window.getConfiguredBackendUrl();
        }

        if (typeof window.BACKEND_URL === "string" && window.BACKEND_URL.trim()) {
            return window.BACKEND_URL.trim();
        }

        if (window.STRIPE_CONFIG && typeof window.STRIPE_CONFIG.backendUrl === "string") {
            return window.STRIPE_CONFIG.backendUrl.trim();
        }

        return "";
    }

    function buildAvailabilityUrl(schedule) {
        const backendBaseUrl = getBackendBaseUrl();
        if (!backendBaseUrl) {
            return "";
        }

        const params = new URLSearchParams({
            startDate: schedule.startDate,
            endDate: schedule.endDate,
            pickupTime: schedule.pickupTime || "12:00",
            dropoffTime: schedule.dropoffTime || "12:00"
        });

        return `${backendBaseUrl.replace(/\/+$/, "")}/api/availability?${params.toString()}`;
    }

    function availabilityForCard(card) {
        return availabilityByVehicleId.get(card.dataset.id || "");
    }

    function cardIsAvailableForCurrentSchedule(card) {
        const schedule = getCurrentSchedule();

        if (!isScheduleRangeValid(schedule) || availabilityStatus !== "loaded") {
            return true;
        }

        const availability = availabilityForCard(card);
        return !availability || availability.available !== false;
    }

    function ensureAvailabilityNode(card) {
        let node = card.querySelector(".fleet-card__availability");
        if (node) {
            return node;
        }

        node = document.createElement("span");
        node.className = "fleet-card__availability";
        node.setAttribute("aria-live", "polite");
        card.querySelector(".fleet-card__booking")?.appendChild(node);
        return node;
    }

    function tokenList(attributeValue) {
        return (attributeValue || "")
            .split(/\s+/)
            .map((token) => token.trim().toLowerCase())
            .filter(Boolean);
    }

    function formatAed(value) {
        return `AED ${Number(value).toLocaleString("en-US")}`;
    }

    function formatFieldValue(input) {
        if (!input?.value) {
            return "";
        }

        if (input.type === "date") {
            const [year, month, day] = input.value.split("-");

            if (year && month && day) {
                return `${day}/${month}/${year}`;
            }
        }

        if (input.type === "time") {
            return input.value.slice(0, 5);
        }

        return input.value;
    }

    function formatCompactDateLabel(value) {
        const normalized = normalizeValue(value);

        if (!isValidDateInputValue(normalized)) {
            return "";
        }

        const [, month, day] = normalized.split("-");
        const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
        const monthIndex = Number(month) - 1;
        const dayNumber = Number(day);

        if (!Number.isFinite(dayNumber) || monthIndex < 0 || monthIndex >= monthNames.length) {
            return "";
        }

        return `${dayNumber} ${monthNames[monthIndex]}`;
    }

    function getCurrentSchedule() {
        return {
            startDate: pickupDateInput?.value || "",
            endDate: returnDateInput?.value || "",
            pickupTime: pickupTimeInput?.value || "",
            dropoffTime: returnTimeInput?.value || ""
        };
    }

    function syncFieldDisplays() {
        fieldInputs.forEach((input) => {
            const shell = input.parentElement;
            const display = shell ? shell.querySelector(".js-fleet-field-display") : null;

            if (display) {
                display.textContent = formatFieldValue(input);
            }
        });
    }

    const fallbackPickerClicks = new WeakSet();

    function openNativeSchedulePicker(input) {
        if (!(input instanceof HTMLInputElement) || input.disabled || input.readOnly) {
            return;
        }

        if (fallbackPickerClicks.has(input)) {
            return;
        }

        input.focus({ preventScroll: true });

        if (typeof input.showPicker === "function") {
            try {
                input.showPicker();
                return;
            } catch (error) {
                // Some browsers only expose showPicker for specific input types or user gestures.
            }
        }

        fallbackPickerClicks.add(input);
        input.click();
        window.setTimeout(() => fallbackPickerClicks.delete(input), 0);
    }

    function bindSchedulePickerHitAreas() {
        fieldInputs.forEach((input) => {
            const shell = input.closest(".fleet-sidebar__field-shell");

            if (!shell) {
                return;
            }

            shell.addEventListener("click", () => {
                openNativeSchedulePicker(input);
            });
        });
    }

    let scheduleCaptured = false;

    function normalizeScheduleInputs(changedInput = null) {
        const pickupDate = pickupDateInput?.value || "";

        if (!returnDateInput) {
            return;
        }

        const minimumReturnDate = pickupDate || getDubaiDateString(0);
        returnDateInput.min = minimumReturnDate;

        if (pickupDate && returnDateInput.value && returnDateInput.value < pickupDate) {
            returnDateInput.value = changedInput === pickupDateInput
                ? addDaysToDateInputValue(pickupDate, 1)
                : pickupDate;
        }

        if (pickupDate && returnDateInput.value === pickupDate) {
            const pickupTime = normalizeScheduleTime(pickupTimeInput?.value);
            const dropoffTime = normalizeScheduleTime(returnTimeInput?.value);

            if (dropoffTime <= pickupTime) {
                returnDateInput.value = addDaysToDateInputValue(pickupDate, 1);
            }
        }
    }

    function syncDateDefaults() {
        const incomingIntent = getIncomingBookingIntent();
        const today = getDubaiDateString(0);
        const hasIncomingStartDate = isValidDateInputValue(incomingIntent.startDate);
        const hasIncomingEndDate = isValidDateInputValue(incomingIntent.endDate);
        const hasIncomingScheduleDates = hasIncomingStartDate && hasIncomingEndDate;
        const fallbackStartDate = hasIncomingEndDate && incomingIntent.endDate > today
            ? addDaysToDateInputValue(incomingIntent.endDate, -1)
            : today;
        const incomingStartDate = clampBookingDateValue(
            hasIncomingStartDate ? incomingIntent.startDate : fallbackStartDate,
            today,
            today
        );
        const defaultEndDate = addDaysToDateInputValue(incomingStartDate, 1);
        const incomingEndFallback = hasIncomingScheduleDates || (hasIncomingEndDate && incomingIntent.endDate > incomingStartDate)
            ? incomingIntent.endDate
            : defaultEndDate;
        const incomingEndDate = clampBookingDateValue(incomingEndFallback, incomingEndFallback, incomingStartDate);

        if (pickupDateInput) {
            pickupDateInput.min = today;
            pickupDateInput.value = incomingStartDate;
        }

        if (returnDateInput) {
            returnDateInput.min = pickupDateInput?.value || today;
            returnDateInput.value = incomingEndDate;
        }

        if (pickupTimeInput) {
            pickupTimeInput.value = incomingIntent.pickupTime || pickupTimeInput.value || "12:00";
        }

        if (returnTimeInput) {
            returnTimeInput.value = incomingIntent.dropoffTime || returnTimeInput.value || "12:00";
        }

        if (pickupDateInput && returnDateInput && pickupDateInput.value && returnDateInput.value < pickupDateInput.value) {
            returnDateInput.value = addDaysToDateInputValue(pickupDateInput.value, 1);
        }

        normalizeScheduleInputs();
        scheduleCaptured = hasSchedule(getCurrentSchedule());
        storeBookingIntent(getCurrentSchedule());
    }

    function clampPriceState() {
        state.priceMin = Math.max(catalogMin, Math.min(state.priceMin, state.priceMax));
        state.priceMax = Math.min(catalogMax, Math.max(state.priceMax, state.priceMin));
    }

    function updateSelectStates() {
        if (brandSelect) {
            brandSelect.value = state.brand;
        }

        if (typeSelect) {
            typeSelect.value = state.type;
        }
    }

    function updateSortState() {
        if (sortSelect) {
            sortSelect.value = state.sort;
        }
    }

    function syncStateFromControls() {
        if (brandSelect) {
            state.brand = normalizeFilterValue(brandSelect.value) || defaultState.brand;
        }

        if (typeSelect) {
            state.type = normalizeFilterValue(typeSelect.value) || defaultState.type;
        }

        if (sortSelect) {
            state.sort = normalizeValue(sortSelect.value) || defaultState.sort;
        }

        const nextPriceMin = Number(priceMinInput.value);
        const nextPriceMax = Number(priceMaxInput.value);

        if (Number.isFinite(nextPriceMin)) {
            state.priceMin = nextPriceMin;
        }

        if (Number.isFinite(nextPriceMax)) {
            state.priceMax = nextPriceMax;
        }

        clampPriceState();
    }

    function applyIncomingFleetFilters() {
        const availableBrands = new Set(
            Array.from(brandSelect?.options || [])
                .map((option) => normalizeFilterValue(option.value))
                .filter(Boolean)
        );
        const availableTypes = new Set(
            Array.from(typeSelect?.options || [])
                .map((option) => normalizeFilterValue(option.value))
                .filter(Boolean)
        );
        const incomingBrand = normalizeFilterValue(searchParams.get("brand"));
        const incomingType = normalizeFilterValue(searchParams.get("type"));
        const incomingVehicle = normalizeFilterValue(searchParams.get("vehicle") || searchParams.get("model"));

        if (incomingBrand && availableBrands.has(incomingBrand)) {
            state.brand = incomingBrand;
        }

        if (incomingType && availableTypes.has(incomingType)) {
            state.type = incomingType;
        }

        if (incomingVehicle && cards.some((card) => normalizeFilterValue(card.dataset.id) === incomingVehicle)) {
            state.vehicle = incomingVehicle;
        }
    }

    function updatePriceUi() {
        clampPriceState();

        priceMinInput.value = String(state.priceMin);
        priceMaxInput.value = String(state.priceMax);

        if (priceSelected) {
            priceSelected.textContent = `${formatAed(state.priceMin)} - ${formatAed(state.priceMax)}`;
        }

        if (priceFloor) {
            priceFloor.textContent = formatAed(catalogMin);
        }

        if (priceCeiling) {
            priceCeiling.textContent = formatAed(catalogMax);
        }

        if (priceRange && catalogMax > catalogMin) {
            const start = ((state.priceMin - catalogMin) / (catalogMax - catalogMin)) * 100;
            const end = ((state.priceMax - catalogMin) / (catalogMax - catalogMin)) * 100;
            priceRange.style.setProperty("--range-start", `${start}%`);
            priceRange.style.setProperty("--range-end", `${end}%`);
        }
    }

    function countLabel(visibleCount) {
        return `${visibleCount} ${visibleCount === 1 ? "model" : "models"} visible`;
    }

    function cardMatches(card) {
        const brand = (card.dataset.brand || "").toLowerCase();
        const types = tokenList(card.dataset.type);
        const vehicle = normalizeFilterValue(card.dataset.id);
        const price = Number(card.dataset.price);

        const brandMatch = state.brand === "all" || brand === state.brand;
        const typeMatch = state.type === "all" || types.includes(state.type);
        const vehicleMatch = state.vehicle === "all" || vehicle === state.vehicle;
        const priceMatch = Number.isFinite(price) && price >= state.priceMin && price <= state.priceMax;
        const availabilityMatch = cardIsAvailableForCurrentSchedule(card);

        return brandMatch && typeMatch && vehicleMatch && priceMatch && availabilityMatch;
    }

    function sortCards(sortedCards) {
        const comparator =
            state.sort === "price-asc"
                ? (left, right) => Number(left.dataset.price) - Number(right.dataset.price)
                : state.sort === "price-desc"
                    ? (left, right) => Number(right.dataset.price) - Number(left.dataset.price)
                    : (left, right) => featuredOrder.get(left) - featuredOrder.get(right);

        sortedCards.sort(comparator);
        sortedCards.forEach((card) => resultsList.appendChild(card));
    }

    function buildReserveHref(card) {
        const schedule = getCurrentSchedule();
        const title = normalizeValue(card.querySelector(".fleet-card__title a")?.textContent);
        const params = new URLSearchParams({
            car: title,
            price: normalizeValue(card.dataset.price)
        });

        if (schedule.startDate) {
            params.set("startDate", schedule.startDate);
        }

        if (schedule.endDate) {
            params.set("endDate", schedule.endDate);
        }

        if (schedule.pickupTime) {
            params.set("pickupTime", schedule.pickupTime);
        }

        if (schedule.dropoffTime) {
            params.set("dropoffTime", schedule.dropoffTime);
        }

        return `./app/reserve/page.html?${params.toString()}`;
    }

    function applyReserveAvailability(card, reserveLink, availability) {
        const statusNode = ensureAvailabilityNode(card);
        const schedule = getCurrentSchedule();
        const hasRentalWindow = hasSchedule(schedule);

        card.classList.remove("fleet-card--available", "fleet-card--unavailable", "fleet-card--availability-error");
        reserveLink?.removeAttribute("aria-disabled");
        reserveLink?.removeAttribute("tabindex");

        if (!hasRentalWindow) {
            statusNode.hidden = true;
            return;
        }

        statusNode.hidden = false;

        if (availabilityStatus === "loading") {
            statusNode.textContent = "Checking CRM availability...";
            return;
        }

        if (availabilityStatus === "error") {
            card.classList.add("fleet-card--availability-error");
            statusNode.textContent = "Availability check unavailable. The team will confirm.";
            return;
        }

        if (!availability || availability.available === null) {
            statusNode.textContent = "Team will confirm availability.";
            return;
        }

        if (availability.available) {
            card.classList.add("fleet-card--available");
            statusNode.textContent = "Available for these dates";
            return;
        }

        card.classList.add("fleet-card--unavailable");
        statusNode.textContent = "Unavailable for these dates";

        if (reserveLink) {
            reserveLink.textContent = "Unavailable";
            reserveLink.removeAttribute("href");
            reserveLink.setAttribute("aria-disabled", "true");
            reserveLink.setAttribute("tabindex", "-1");
        }
    }

    function isInteractiveCardTarget(target) {
        return Boolean(target?.closest?.([
            "a",
            "button",
            "input",
            "select",
            "textarea",
            "label",
            "[role='button']",
            "[data-no-card-nav]"
        ].join(",")));
    }

    function getCardDetailHref(card) {
        return normalizeValue(
            card.dataset.detailHref ||
            card.querySelector(".fleet-card__title a")?.getAttribute("href") ||
            card.querySelector(".fleet-card__media")?.getAttribute("href")
        );
    }

    function navigateToCardDetail(card) {
        const href = getCardDetailHref(card);

        if (href) {
            window.location.href = href;
        }
    }

    function syncCardActions() {
        cards.forEach((card, index) => {
            const title = normalizeValue(card.querySelector(".fleet-card__title a")?.textContent);
            const reserveLink = card.querySelector(".fleet-card__primary");
            const whatsappLink = card.querySelector(".fleet-card__secondary--wa");
            const image = card.querySelector(".fleet-card__media img");
            const specs = Array.from(card.querySelectorAll(".fleet-card__spec"));

            if (image) {
                image.loading = "eager";
                image.decoding = "async";
            }

            if (specs.length > 3) {
                specs.slice(3).forEach((spec) => spec.remove());
            }

            const detailHref = getCardDetailHref(card);

            if (detailHref) {
                card.dataset.detailHref = detailHref;
            }

            if (card.dataset.fleetCardNavBound !== "true") {
                card.dataset.fleetCardNavBound = "true";
                card.addEventListener("click", (event) => {
                    if (
                        event.defaultPrevented ||
                        event.button !== 0 ||
                        event.metaKey ||
                        event.ctrlKey ||
                        event.shiftKey ||
                        event.altKey ||
                        isInteractiveCardTarget(event.target)
                    ) {
                        return;
                    }

                    navigateToCardDetail(card);
                });

                card.addEventListener("keydown", (event) => {
                    if (
                        isInteractiveCardTarget(event.target) ||
                        (event.key !== "Enter" && event.key !== " ")
                    ) {
                        return;
                    }

                    event.preventDefault();
                    navigateToCardDetail(card);
                });
            }

            if (reserveLink) {
                reserveLink.textContent = "Reserve";
                reserveLink.setAttribute("href", buildReserveHref(card));
                reserveLink.classList.add("fleet-card__reserve");
                applyReserveAvailability(card, reserveLink, availabilityForCard(card));
                if (reserveLink.dataset.fleetReserveBound !== "true") {
                    reserveLink.dataset.fleetReserveBound = "true";
                    reserveLink.addEventListener("click", (event) => {
                        if (reserveLink.getAttribute("aria-disabled") === "true") {
                            event.preventDefault();
                            return;
                        }

                        const schedule = getCurrentSchedule();
                        reserveLink.setAttribute("href", buildReserveHref(card));
                        storeBookingIntent({
                            car: title,
                            price: card.dataset.price,
                            ...schedule
                        });

                        emitAnalyticsEvent("fleet_reserve_click", {
                            car: title,
                            price: normalizeValue(card.dataset.price),
                            start_date: schedule.startDate,
                            end_date: schedule.endDate,
                            page_path: normalizeValue(window.location.pathname)
                        });
                    });
                }
            }

            if (whatsappLink) {
                if (whatsappLink.dataset.fleetWhatsappBound !== "true") {
                    whatsappLink.dataset.fleetWhatsappBound = "true";
                    whatsappLink.addEventListener("click", () => {
                        const currentTitle = normalizeValue(card.querySelector(".fleet-card__title a")?.textContent);
                        emitAnalyticsEvent("fleet_whatsapp_click", {
                            car: currentTitle,
                            price: normalizeValue(card.dataset.price),
                            page_path: normalizeValue(window.location.pathname)
                        });
                    });
                }
            }
        });
    }

    function persistSchedule() {
        normalizeScheduleInputs(document.activeElement);
        scheduleCaptured = hasSchedule(getCurrentSchedule());
        storeBookingIntent(getCurrentSchedule());
        syncCardActions();
        updateDatePrompts();
        updateFilterChips();
        refreshAvailability();
    }

    async function refreshAvailability() {
        const schedule = getCurrentSchedule();
        const requestId = availabilityRequestId + 1;
        availabilityRequestId = requestId;
        availabilityByVehicleId.clear();

        if (!hasSchedule(schedule)) {
            availabilityStatus = "idle";
            syncCardActions();
            render();
            return;
        }

        if (!isScheduleRangeValid(schedule)) {
            availabilityStatus = "idle";
            syncCardActions();
            render();
            return;
        }

        const availabilityUrl = buildAvailabilityUrl(schedule);
        if (!availabilityUrl) {
            availabilityStatus = "error";
            syncCardActions();
            render();
            return;
        }

        availabilityStatus = "loading";
        syncCardActions();
        render();

        try {
            const response = await fetch(availabilityUrl, {
                headers: { Accept: "application/json" },
                cache: "no-store"
            });

            if (!response.ok) {
                throw new Error(`Availability returned ${response.status}`);
            }

            const payload = await response.json();

            if (requestId !== availabilityRequestId) {
                return;
            }

            (payload.vehicles || []).forEach((vehicle) => {
                if (vehicle?.id) {
                    availabilityByVehicleId.set(vehicle.id, vehicle);
                }
            });

            availabilityStatus = "loaded";
        } catch (error) {
            if (requestId !== availabilityRequestId) {
                return;
            }

            availabilityStatus = "error";
        }

        render();
        syncCardActions();
    }

    let mobileControls = null;
    let topDatePrompt = null;
    let lastFilterTrigger = null;

    function setFilterSheetState(isOpen) {
        if (!mobileControls?.scrim) {
            return;
        }

        browser.classList.toggle("fleet-filters-open", isOpen);
        document.body.classList.toggle("fleet-filter-sheet-open", isOpen);
        mobileControls.scrim.hidden = !isOpen;
        sidebar?.setAttribute("aria-modal", String(isOpen));
        sidebar?.setAttribute("role", isOpen ? "dialog" : "complementary");

        if (isOpen) {
            lastFilterTrigger = document.activeElement instanceof HTMLElement
                ? document.activeElement
                : mobileControls.toggle;

            const scrollArea = sidebar?.querySelector(".fleet-sidebar__scroll");
            if (scrollArea) {
                scrollArea.scrollTop = 0;
                window.requestAnimationFrame(() => {
                    scrollArea.scrollTop = 0;
                });
            }
            window.requestAnimationFrame(() => {
                mobileControls.closeTop?.focus({ preventScroll: true });
            });
            return;
        }

        window.requestAnimationFrame(() => {
            const target = lastFilterTrigger && document.contains(lastFilterTrigger)
                ? lastFilterTrigger
                : mobileControls.toggle;
            target?.focus?.({ preventScroll: true });
            lastFilterTrigger = null;
        });
    }

    function visibleFleetCount() {
        return cards.filter((card) => !card.hidden).length;
    }

    function formatShowCarsLabel(count) {
        if (count === 1) {
            return "Show 1 car";
        }

        return `Show ${count} cars`;
    }

    function updateFilterSheetExit(count = visibleFleetCount()) {
        if (!mobileControls) {
            return;
        }

        const label = formatShowCarsLabel(count);

        if (mobileControls.closeInline) {
            mobileControls.closeInline.textContent = label;
        }

        if (mobileControls.apply) {
            mobileControls.apply.textContent = label;
        }
    }

    function createPromptButton(placement) {
        const prompt = document.createElement("button");
        prompt.type = "button";
        prompt.className = "fleet-date-prompt";
        prompt.innerHTML = `
            <strong>Choose dates first</strong>
            <span>Carry your rental window into every Reserve CTA.</span>
        `;
        prompt.addEventListener("click", () => {
            emitAnalyticsEvent("booking_sheet_open", {
                page_path: normalizeValue(window.location.pathname),
                placement
            });
            setFilterSheetState(true);
            pickupDateInput?.focus();
        });
        return prompt;
    }

    function updateDatePrompts() {
        const showPrompt = !scheduleCaptured;

        if (topDatePrompt) {
            topDatePrompt.hidden = !showPrompt;
        }
    }

    function getScheduleChipCopy() {
        const schedule = getCurrentSchedule();
        const pickupTime = normalizeValue(schedule.pickupTime || "12:00");
        const dropoffTime = normalizeValue(schedule.dropoffTime || "12:00");
        const timeLabel = pickupTime && dropoffTime
            ? `${pickupTime} / ${dropoffTime}`
            : pickupTime || dropoffTime;

        if (!hasSchedule(schedule)) {
            return {
                eyebrow: "Rental dates",
                value: timeLabel ? `Choose dates | ${timeLabel}` : "Choose pickup & return"
            };
        }

        const startShort = formatCompactDateLabel(schedule.startDate);
        const endShort = formatCompactDateLabel(schedule.endDate);

        if (startShort && endShort) {
            return {
                eyebrow: "Rental dates",
                value: `${startShort} ${pickupTime} - ${endShort} ${dropoffTime}`
            };
        }

        return {
            eyebrow: "Rental dates",
            value: "Edit pickup & return"
        };
    }

    function updateMobileDateChip() {
        if (!mobileControls?.dates) {
            return;
        }

        const copy = getScheduleChipCopy();
        const eyebrow = document.createElement("span");
        const value = document.createElement("span");

        eyebrow.className = "fleet-mobile-chip__eyebrow";
        eyebrow.textContent = copy.eyebrow;
        value.className = "fleet-mobile-chip__value";
        value.textContent = copy.value;

        mobileControls.dates.replaceChildren(eyebrow, value);
        mobileControls.dates.setAttribute("aria-label", `${copy.eyebrow}: ${copy.value}. Opens rental period filters.`);
        mobileControls.dates.title = `${copy.eyebrow}: ${copy.value}`;
    }

    function updateFilterChips() {
        if (!mobileControls) {
            return;
        }

        updateMobileDateChip();

        const activeFilterCount = [
            state.brand !== defaultState.brand,
            state.type !== defaultState.type,
            state.vehicle !== defaultState.vehicle,
            state.priceMin !== defaultState.priceMin,
            state.priceMax !== defaultState.priceMax,
            state.sort !== defaultState.sort
        ].filter(Boolean).length;

        mobileControls.toggle.textContent = activeFilterCount > 0
            ? `Filters (${activeFilterCount})`
            : "Filters";
    }

    function initMobileFilters() {
        if (!sidebar || !results) {
            return;
        }

        const toolbar = document.createElement("div");
        toolbar.className = "fleet-mobile-toolbar";
        toolbar.innerHTML = `
            <button type="button" class="fleet-mobile-chip fleet-mobile-chip--dates js-fleet-mobile-dates">
                <span class="fleet-mobile-chip__eyebrow">Rental dates</span>
                <span class="fleet-mobile-chip__value">Choose pickup & return</span>
            </button>
            <button type="button" class="fleet-mobile-filter-toggle">Filters</button>
        `;

        const scrim = document.createElement("button");
        scrim.type = "button";
        scrim.className = "fleet-filter-scrim";
        scrim.hidden = true;
        scrim.setAttribute("aria-label", "Close filters");

        results.insertBefore(toolbar, resultsHeader?.nextSibling || results.firstChild);
        browser.appendChild(scrim);

        const sheetHeader = document.createElement("div");
        sheetHeader.className = "fleet-filter-sheet-head";
        sheetHeader.innerHTML = `
            <div class="fleet-filter-sheet-head__copy">
                <span>Filters</span>
                <strong>Refine the fleet</strong>
            </div>
        `;

        const closeTopButton = document.createElement("button");
        closeTopButton.type = "button";
        closeTopButton.className = "fleet-filter-close fleet-filter-close--top";
        closeTopButton.innerHTML = `
            <span class="fleet-filter-close__icon" aria-hidden="true"></span>
            <span class="fleet-filter-close__label">Back to cars</span>
        `;
        closeTopButton.setAttribute("aria-label", "Back to cars and close filters");
        sheetHeader.appendChild(closeTopButton);
        sidebar.insertBefore(sheetHeader, sidebar.firstChild);

        const sheetFooter = document.createElement("div");
        sheetFooter.className = "fleet-filter-sheet-footer";
        const applyButton = document.createElement("button");
        applyButton.type = "button";
        applyButton.className = "fleet-filter-close fleet-filter-apply";
        applyButton.textContent = "Show cars";
        applyButton.setAttribute("aria-label", "Show car results");
        sheetFooter.appendChild(applyButton);
        sidebar.appendChild(sheetFooter);

        mobileControls = {
            toolbar,
            scrim,
            dates: toolbar.querySelector(".js-fleet-mobile-dates"),
            toggle: toolbar.querySelector(".fleet-mobile-filter-toggle"),
            closeTop: closeTopButton,
            closeInline: null,
            apply: applyButton
        };

        const openSheet = () => {
            setFilterSheetState(true);
        };

        mobileControls.toggle?.addEventListener("click", openSheet);
        mobileControls.dates?.addEventListener("click", () => {
            openSheet();
            pickupDateInput?.focus();
        });
        [mobileControls.closeTop, mobileControls.closeInline, mobileControls.apply].forEach((button) => {
            button?.addEventListener("click", () => {
                setFilterSheetState(false);
            });
        });
        scrim.addEventListener("click", () => {
            setFilterSheetState(false);
        });
        document.addEventListener("dynasty:fleet-open-dates", () => {
            setFilterSheetState(true);
            pickupDateInput?.focus();
        });
        document.addEventListener("keydown", (event) => {
            if (event.key === "Escape" && browser.classList.contains("fleet-filters-open")) {
                setFilterSheetState(false);
            }
        });

        updateFilterChips();
        updateFilterSheetExit();
    }

    function initDatePrompts() {
        if (!resultsHeader || !resultsList) {
            return;
        }

        topDatePrompt = createPromptButton("top");
        resultsHeader.insertAdjacentElement("afterend", topDatePrompt);
        updateDatePrompts();
    }

    function initHeroActions() {
        const heroDateButtons = Array.from(browser.querySelectorAll(".js-fleet-open-dates"));

        heroDateButtons.forEach((button) => {
            button.addEventListener("click", () => {
                if (window.matchMedia("(max-width: 960px)").matches) {
                    setFilterSheetState(true);
                    pickupDateInput?.focus();
                    return;
                }

                sidebar?.scrollIntoView({ behavior: "smooth", block: "start" });
                window.requestAnimationFrame(() => {
                    pickupDateInput?.focus({ preventScroll: true });
                });
            });
        });
    }

    function render() {
        updatePriceUi();
        updateSelectStates();
        updateSortState();

        const sortedCards = [...cards];
        sortCards(sortedCards);

        let visibleCount = 0;

        sortedCards.forEach((card) => {
            const matches = cardMatches(card);
            card.hidden = !matches;

            if (matches) {
                visibleCount += 1;
            }
        });

        if (resultCount) {
            resultCount.textContent = countLabel(visibleCount);
        }

        if (emptyState) {
            emptyState.hidden = visibleCount !== 0;
        }

        updateDatePrompts();
        updateFilterSheetExit(visibleCount);
    }

    if (brandSelect) {
        brandSelect.addEventListener("change", () => {
            state.brand = brandSelect.value || defaultState.brand;
            updateFilterChips();
            render();
        });
    }

    if (typeSelect) {
        typeSelect.addEventListener("change", () => {
            state.type = typeSelect.value || defaultState.type;
            updateFilterChips();
            render();
        });
    }

    if (sortSelect) {
        sortSelect.addEventListener("change", () => {
            state.sort = sortSelect.value || defaultState.sort;
            render();
        });
    }

    priceMinInput.addEventListener("input", () => {
        state.priceMin = Number(priceMinInput.value);
        if (state.priceMin > state.priceMax) {
            state.priceMax = state.priceMin;
        }
        render();
    });

    priceMaxInput.addEventListener("input", () => {
        state.priceMax = Number(priceMaxInput.value);
        if (state.priceMax < state.priceMin) {
            state.priceMin = state.priceMax;
        }
        render();
    });

    resetButtons.forEach((button) => {
        button.addEventListener("click", () => {
            Object.assign(state, defaultState);
            render();
            updateFilterChips();
        });
    });

    fieldInputs.forEach((input) => {
        const sync = () => {
            normalizeScheduleInputs(input);
            syncFieldDisplays();
            persistSchedule();
        };

        input.addEventListener("input", sync);
        input.addEventListener("change", sync);
    });

    window.addEventListener("pageshow", () => {
        window.requestAnimationFrame(() => {
            syncStateFromControls();
            syncFieldDisplays();
            persistSchedule();
            render();
        });
    });

    syncStateFromControls();
    applyIncomingFleetFilters();
    syncDateDefaults();
    syncFieldDisplays();
    bindSchedulePickerHitAreas();
    syncCardActions();
    initMobileFilters();
    initDatePrompts();
    initHeroActions();
    render();
    refreshAvailability();
});
