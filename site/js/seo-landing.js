document.addEventListener("DOMContentLoaded", () => {
    const bookingForms = Array.from(document.querySelectorAll(".js-vehicle-booking-form"));

    if (!bookingForms.length) {
        return;
    }

    const BOOKING_INTENT_KEY = "dynastyBookingIntent";
    const BOOKING_INTENT_MAX_AGE_MS = 1000 * 60 * 60 * 2;
    const ACCEPTED_PREFILL_SOURCES = new Set(["home", "fleet"]);
    const TOAST_HIDE_DELAY = 5200;
    const AVAILABLE_REDIRECT_DELAY = 900;
    const MANUAL_CONFIRM_REDIRECT_DELAY = 1300;
    const searchParams = new URLSearchParams(window.location.search);
    const storedIntent = getStoredBookingIntent();
    let toastHideTimer = null;

    function normalizeValue(value) {
        return String(value || "").trim();
    }

    function normalizeVehicleName(value) {
        return normalizeValue(value)
            .toLowerCase()
            .replace(/&/g, " and ")
            .replace(/rolls[\s-]?royce/g, "rolls royce")
            .replace(/mercedes[\s-]?benz/g, "mercedes")
            .replace(/[^a-z0-9]+/g, " ")
            .replace(/\s+/g, " ")
            .trim();
    }

    function vehicleSlug(value) {
        return normalizeVehicleName(value).replace(/\s+/g, "-");
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

            const source = normalizeValue(parsedIntent.source).toLowerCase();
            const savedAt = Number(parsedIntent.savedAt || 0);
            const age = Date.now() - savedAt;
            const canPrefillDates = ACCEPTED_PREFILL_SOURCES.has(source) &&
                savedAt > 0 &&
                age >= 0 &&
                age <= BOOKING_INTENT_MAX_AGE_MS;

            if (!canPrefillDates) {
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
            car: normalizeValue(bookingIntent?.car),
            price: normalizeValue(bookingIntent?.price),
            startDate: normalizeValue(bookingIntent?.startDate),
            endDate: normalizeValue(bookingIntent?.endDate),
            pickupTime: normalizeValue(bookingIntent?.pickupTime),
            dropoffTime: normalizeValue(bookingIntent?.dropoffTime),
            source: normalizeValue(bookingIntent?.source || "vehicle"),
            savedAt: Date.now()
        };

        try {
            window.sessionStorage.setItem(BOOKING_INTENT_KEY, JSON.stringify(normalizedIntent));
        } catch (error) {
            // Ignore storage failures.
        }

        return normalizedIntent;
    }

    function getBackendBaseUrl() {
        if (typeof window.getConfiguredBackendUrl === "function") {
            const configuredBackendUrl = window.getConfiguredBackendUrl();
            if (configuredBackendUrl) {
                return configuredBackendUrl;
            }
        }

        if (typeof window.getBackendUrl === "function") {
            const configuredBackendUrl = window.getBackendUrl();
            if (configuredBackendUrl) {
                return configuredBackendUrl;
            }
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

    function ensureAvailabilityToast() {
        let toast = document.querySelector(".vehicle-availability-toast");
        if (toast) {
            return toast;
        }

        toast = document.createElement("div");
        toast.className = "vehicle-availability-toast";
        toast.setAttribute("role", "status");
        toast.setAttribute("aria-live", "polite");
        toast.innerHTML = [
            '<span class="vehicle-availability-toast__mark" aria-hidden="true"></span>',
            '<span class="vehicle-availability-toast__copy">',
            '<strong></strong>',
            '<span></span>',
            '</span>'
        ].join("");
        document.body.appendChild(toast);
        return toast;
    }

    function showAvailabilityToast(type, title, message, options = {}) {
        const toast = ensureAvailabilityToast();
        const titleNode = toast.querySelector("strong");
        const messageNode = toast.querySelector(".vehicle-availability-toast__copy > span");

        window.clearTimeout(toastHideTimer);
        toast.classList.remove(
            "vehicle-availability-toast--success",
            "vehicle-availability-toast--warning",
            "vehicle-availability-toast--error",
            "is-visible"
        );

        titleNode.textContent = title;
        messageNode.textContent = message;
        toast.classList.add(`vehicle-availability-toast--${type || "success"}`);

        window.requestAnimationFrame(() => {
            toast.classList.add("is-visible");
        });

        toastHideTimer = window.setTimeout(() => {
            toast.classList.remove("is-visible");
        }, options.duration || TOAST_HIDE_DELAY);
    }

    function findVehicleAvailability(payload, carName) {
        const normalizedCar = normalizeVehicleName(carName);
        const compactCar = normalizedCar.replace(/\s+/g, "");
        const slug = vehicleSlug(carName);

        return (payload?.vehicles || []).find((vehicle) => {
            const candidates = [
                vehicle.id,
                vehicle.title,
                vehicle.label,
                `${vehicle.brand || ""} ${vehicle.title || ""}`
            ];

            return candidates.some((candidate) => {
                const normalizedCandidate = normalizeVehicleName(candidate);
                if (!normalizedCandidate) {
                    return false;
                }

                const compactCandidate = normalizedCandidate.replace(/\s+/g, "");
                const candidateSlug = vehicleSlug(candidate);

                return normalizedCandidate === normalizedCar ||
                    normalizedCandidate.includes(normalizedCar) ||
                    normalizedCar.includes(normalizedCandidate) ||
                    compactCandidate === compactCar ||
                    compactCandidate.includes(compactCar) ||
                    compactCar.includes(compactCandidate) ||
                    candidateSlug === slug;
            });
        });
    }

    async function checkVehicleAvailability(bookingIntent) {
        const availabilityUrl = buildAvailabilityUrl(bookingIntent);
        if (!availabilityUrl) {
            return { status: "manual" };
        }

        const controller = new AbortController();
        const timeoutId = window.setTimeout(() => controller.abort(), 4500);

        try {
            const response = await fetch(availabilityUrl, {
                headers: { Accept: "application/json" },
                cache: "no-store",
                signal: controller.signal
            });

            if (!response.ok) {
                throw new Error(`Availability returned ${response.status}`);
            }

            const payload = await response.json();
            const vehicle = findVehicleAvailability(payload, bookingIntent.car);

            if (!vehicle || vehicle.available === null || vehicle.available === undefined) {
                return { status: "unknown" };
            }

            return vehicle.available
                ? { status: "available", vehicle }
                : { status: "unavailable", vehicle };
        } catch (error) {
            return { status: "manual", error };
        } finally {
            window.clearTimeout(timeoutId);
        }
    }

    function buildReserveUrl(form) {
        const formData = new FormData(form);
        const targetUrl = new URL(form.getAttribute("action") || "app/reserve/page.html", window.location.href);

        formData.forEach((value, key) => {
            targetUrl.searchParams.set(key, value);
        });

        return targetUrl.toString();
    }

    function syncVehicleReserveLinks(form) {
        const carInput = form.querySelector('input[name="car"]');
        const carName = normalizeValue(carInput?.value);
        const reserveUrl = buildReserveUrl(form);
        const reserveLinks = Array.from(document.querySelectorAll([
            '.lab-reserve[href*="app/reserve/page.html"]'
        ].join(",")));

        reserveLinks.forEach((link) => {
            link.href = reserveUrl;
            link.dataset.vehicleReserveHandoff = "true";

            if (carName) {
                link.setAttribute("aria-label", `Reserve ${carName}`);
            }
        });
    }

    function getDubaiDateString(offsetDays = 0) {
        const dubaiNow = new Date(new Date().toLocaleString("en-US", { timeZone: "Asia/Dubai" }));
        dubaiNow.setDate(dubaiNow.getDate() + offsetDays);

        const year = dubaiNow.getFullYear();
        const month = String(dubaiNow.getMonth() + 1).padStart(2, "0");
        const day = String(dubaiNow.getDate()).padStart(2, "0");

        return `${year}-${month}-${day}`;
    }

    function getPrefillValue(name, fallbackValue) {
        return searchParams.get(name) || storedIntent?.[name] || fallbackValue;
    }

    function clampIsoDate(value, minValue) {
        const normalizedValue = String(value || "");
        return /^\d{4}-\d{2}-\d{2}$/.test(normalizedValue) && normalizedValue >= minValue
            ? normalizedValue
            : minValue;
    }

    bookingForms.forEach((form) => {
        const bookingSection = form.closest(".vehicle-booking");
        const carInput = form.querySelector('input[name="car"]');
        const priceInput = form.querySelector('input[name="price"]');
        const startDateInput = form.querySelector('input[name="startDate"]');
        const endDateInput = form.querySelector('input[name="endDate"]');
        const pickupTimeInput = form.querySelector('input[name="pickupTime"]');
        const dropoffTimeInput = form.querySelector('input[name="dropoffTime"]');
        const whatsappLink = form.querySelector(".vehicle-booking__secondary");

        if (!startDateInput || !endDateInput || !pickupTimeInput || !dropoffTimeInput) {
            return;
        }

        const today = getDubaiDateString(0);
        const defaultStart = clampIsoDate(getPrefillValue("startDate", today), today);
        const defaultEnd = clampIsoDate(getPrefillValue("endDate", getDubaiDateString(1)), defaultStart);
        const defaultPickupTime = getPrefillValue("pickupTime", "12:00");
        const defaultDropoffTime = getPrefillValue("dropoffTime", "12:00");

        startDateInput.min = today;
        endDateInput.min = today;

        if (!startDateInput.value) {
            startDateInput.value = defaultStart;
        }

        if (!endDateInput.value) {
            endDateInput.value = defaultEnd;
        }

        if (!pickupTimeInput.value) {
            pickupTimeInput.value = defaultPickupTime;
        }

        if (!dropoffTimeInput.value) {
            dropoffTimeInput.value = defaultDropoffTime;
        }

        function persistIntent() {
            const bookingIntent = storeBookingIntent({
                car: carInput?.value,
                price: priceInput?.value,
                startDate: startDateInput.value,
                endDate: endDateInput.value,
                pickupTime: pickupTimeInput.value,
                dropoffTime: dropoffTimeInput.value
            });

            syncVehicleReserveLinks(form);
            return bookingIntent;
        }

        function syncReturnMin() {
            endDateInput.min = startDateInput.value || today;

            if (endDateInput.value && startDateInput.value && endDateInput.value < startDateInput.value) {
                endDateInput.value = startDateInput.value;
            }

            persistIntent();
        }

        [startDateInput, endDateInput, pickupTimeInput, dropoffTimeInput].forEach((input) => {
            input.addEventListener("change", persistIntent);
            input.addEventListener("input", persistIntent);
        });

        startDateInput.addEventListener("change", syncReturnMin);
        syncReturnMin();

        form.addEventListener("submit", async (event) => {
            event.preventDefault();

            if (!form.reportValidity()) {
                return;
            }

            const submitButton = form.querySelector(".vehicle-booking__submit");
            const originalSubmitText = submitButton?.textContent || "Check availability";
            const bookingIntent = persistIntent();

            if (submitButton) {
                submitButton.disabled = true;
                submitButton.textContent = "Checking...";
                submitButton.setAttribute("aria-busy", "true");
            }

            emitAnalyticsEvent("pdp_check_availability_click", {
                car: normalizeValue(carInput?.value),
                price: normalizeValue(priceInput?.value),
                start_date: startDateInput.value,
                end_date: endDateInput.value,
                page_path: normalizeValue(window.location.pathname),
                placement: "booking_form"
            });

            const availability = await checkVehicleAvailability(bookingIntent);

            if (availability.status === "unavailable") {
                showAvailabilityToast(
                    "error",
                    "Not available for those dates",
                    "Choose another rental window or WhatsApp the team for the closest option."
                );

                emitAnalyticsEvent("pdp_availability_unavailable", {
                    car: bookingIntent.car,
                    start_date: bookingIntent.startDate,
                    end_date: bookingIntent.endDate,
                    page_path: normalizeValue(window.location.pathname)
                });

                if (submitButton) {
                    submitButton.disabled = false;
                    submitButton.textContent = originalSubmitText;
                    submitButton.removeAttribute("aria-busy");
                }
                return;
            }

            if (availability.status === "available") {
                showAvailabilityToast(
                    "success",
                    "Available for your selected window",
                    "Opening the secure reservation with this car and schedule already attached.",
                    { duration: 2600 }
                );
            } else {
                showAvailabilityToast(
                    "warning",
                    "Live check needs confirmation",
                    "Opening the reservation now; the team will confirm availability before payment.",
                    { duration: 3200 }
                );
            }

            emitAnalyticsEvent("pdp_availability_pass", {
                car: bookingIntent.car,
                status: availability.status,
                start_date: bookingIntent.startDate,
                end_date: bookingIntent.endDate,
                page_path: normalizeValue(window.location.pathname)
            });

            window.setTimeout(() => {
                window.location.href = buildReserveUrl(form);
            }, availability.status === "available" ? AVAILABLE_REDIRECT_DELAY : MANUAL_CONFIRM_REDIRECT_DELAY);
        });

        whatsappLink?.addEventListener("click", () => {
            emitAnalyticsEvent("pdp_whatsapp_click", {
                car: normalizeValue(carInput?.value),
                page_path: normalizeValue(window.location.pathname),
                placement: "booking_form"
            });
        });

        persistIntent();
    });
});
