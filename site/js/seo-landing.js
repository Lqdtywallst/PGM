document.addEventListener("DOMContentLoaded", () => {
    const bookingForms = Array.from(document.querySelectorAll(".js-vehicle-booking-form"));

    if (!bookingForms.length) {
        return;
    }

    const BOOKING_INTENT_KEY = "dynastyBookingIntent";
    const searchParams = new URLSearchParams(window.location.search);
    const storedIntent = getStoredBookingIntent();

    function normalizeValue(value) {
        return String(value || "").trim();
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
            return parsedIntent && typeof parsedIntent === "object" ? parsedIntent : null;
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
            // Ignore storage failures.
        }

        return normalizedIntent;
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

    function initStickyMobileCta(form, bookingSection, whatsappHref, persistIntent) {
        if (document.querySelector(".vehicle-mobile-cta")) {
            return;
        }

        const actionBar = document.createElement("div");
        actionBar.className = "vehicle-mobile-cta";
        actionBar.innerHTML = `
            <button type="button" class="vehicle-mobile-cta__primary">Check availability</button>
            <a class="vehicle-mobile-cta__secondary" href="${whatsappHref}" target="_blank" rel="noopener">WhatsApp the team</a>
        `;

        document.body.appendChild(actionBar);
        document.body.classList.add("vehicle-has-mobile-cta");

        const primaryButton = actionBar.querySelector(".vehicle-mobile-cta__primary");
        const secondaryLink = actionBar.querySelector(".vehicle-mobile-cta__secondary");

        primaryButton?.addEventListener("click", () => {
            persistIntent();
            emitAnalyticsEvent("pdp_check_availability_click", {
                car: normalizeValue(form.querySelector('input[name="car"]')?.value),
                page_path: normalizeValue(window.location.pathname),
                placement: "sticky_mobile_cta"
            });

            bookingSection?.scrollIntoView({ behavior: "smooth", block: "start" });
            window.setTimeout(() => {
                const firstEmpty = Array.from(form.querySelectorAll("input[required]")).find((input) => !input.value);
                if (firstEmpty instanceof HTMLElement) {
                    firstEmpty.focus();
                    return;
                }
                form.requestSubmit();
            }, 180);
        });

        secondaryLink?.addEventListener("click", () => {
            emitAnalyticsEvent("pdp_whatsapp_click", {
                car: normalizeValue(form.querySelector('input[name="car"]')?.value),
                page_path: normalizeValue(window.location.pathname),
                placement: "sticky_mobile_cta"
            });
        });
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
        const defaultStart = getPrefillValue("startDate", getDubaiDateString(1));
        const defaultEnd = getPrefillValue("endDate", getDubaiDateString(2));
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
            storeBookingIntent({
                car: carInput?.value,
                price: priceInput?.value,
                startDate: startDateInput.value,
                endDate: endDateInput.value,
                pickupTime: pickupTimeInput.value,
                dropoffTime: dropoffTimeInput.value
            });
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

        form.addEventListener("submit", () => {
            persistIntent();
            emitAnalyticsEvent("pdp_check_availability_click", {
                car: normalizeValue(carInput?.value),
                price: normalizeValue(priceInput?.value),
                start_date: startDateInput.value,
                end_date: endDateInput.value,
                page_path: normalizeValue(window.location.pathname),
                placement: "booking_form"
            });
        });

        whatsappLink?.addEventListener("click", () => {
            emitAnalyticsEvent("pdp_whatsapp_click", {
                car: normalizeValue(carInput?.value),
                page_path: normalizeValue(window.location.pathname),
                placement: "booking_form"
            });
        });

        persistIntent();
        initStickyMobileCta(form, bookingSection, whatsappLink?.href || "https://wa.me/971586122568", persistIntent);
    });
});
