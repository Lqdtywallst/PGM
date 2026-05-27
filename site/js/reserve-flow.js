        // Region (Dubai-only site, AED currency)
        const urlParams = new URLSearchParams(window.location.search);
        const BOOKING_INTENT_KEY = 'dynastyBookingIntent';
        const RESERVE_HISTORY_STEP_KEY = 'dynastyReserveStep';
        const TOTAL_RESERVE_STEPS = 3;
        const GUEST_DETAIL_FIELD_IDS = ['fullName', 'passport', 'phone', 'email', 'address', 'city', 'country'];
        const RESERVE_REGION = 'AE';
        const isAED = true;
        const CURRENCY_SYMBOL = 'AED';
        const CURRENCY_ZERO = 'AED 0.00';
        const SUPPORT_WHATSAPP_MESSAGE = 'Hi, I would like help booking a luxury car in Dubai.';
        const SUPPORT_WHATSAPP_URL = `https://wa.me/971586122568?text=${encodeURIComponent(SUPPORT_WHATSAPP_MESSAGE)}`;
        function normalizeValue(value) {
            return String(value || '').trim();
        }
        function buildSafeCurrentUrl() {
            try {
                const url = new URL(window.location.href);
                ['checkoutMode', 'qaCheckout', 'qaCheckoutToken', 'qaToken'].forEach((param) => url.searchParams.delete(param));
                return url.toString();
            } catch (error) {
                return window.location.href
                    .replace(/([?&](?:checkoutMode|qaCheckout|qaCheckoutToken|qaToken)=)[^&#]*/gi, '$1[removed]');
            }
        }
        function readUtmParam(params, key) {
            return normalizeValue(params.get(key)).slice(0, 180);
        }
        function buildClientContext() {
            const params = new URLSearchParams(window.location.search || '');
            const viewportWidth = window.innerWidth || document.documentElement.clientWidth || 0;
            const viewportHeight = window.innerHeight || document.documentElement.clientHeight || 0;

            return {
                pagePath: normalizeValue(window.location.pathname).slice(0, 180),
                landingUrl: normalizeValue(buildSafeCurrentUrl()).slice(0, 500),
                referrer: normalizeValue(document.referrer).slice(0, 500),
                utmSource: readUtmParam(params, 'utm_source'),
                utmMedium: readUtmParam(params, 'utm_medium'),
                utmCampaign: readUtmParam(params, 'utm_campaign'),
                viewport: `${viewportWidth}x${viewportHeight}`,
                language: normalizeValue(navigator.language).slice(0, 40),
                timezone: normalizeValue(Intl.DateTimeFormat().resolvedOptions().timeZone).slice(0, 80)
            };
        }
        function getNavigationType() {
            return window.performance?.getEntriesByType?.('navigation')?.[0]?.type || '';
        }
        function isReloadNavigation() {
            return getNavigationType() === 'reload';
        }
        function getValidReserveStep(value) {
            const parsed = Number(value);
            return Number.isInteger(parsed) && parsed >= 1 && parsed <= TOTAL_RESERVE_STEPS ? parsed : null;
        }
        function getReserveHistoryStep(state = window.history?.state) {
            return getValidReserveStep(state?.[RESERVE_HISTORY_STEP_KEY]);
        }
        function writeReserveHistoryStep(step, mode = 'replace') {
            const normalizedStep = getValidReserveStep(step);
            if (!normalizedStep || !window.history?.replaceState) {
                return;
            }

            const currentState = window.history.state && typeof window.history.state === 'object'
                ? { ...window.history.state }
                : {};
            const nextState = {
                ...currentState,
                [RESERVE_HISTORY_STEP_KEY]: normalizedStep
            };

            if (mode === 'push' && typeof window.history.pushState === 'function') {
                window.history.pushState(nextState, document.title, window.location.href);
                return;
            }

            window.history.replaceState(nextState, document.title, window.location.href);
        }
        function emitAnalyticsEvent(eventName, payload) {
            const safePayload = { ...payload };
            if (window.google_tag_manager) {
                window.dataLayer = window.dataLayer || [];
                window.dataLayer.push({ event: eventName, ...safePayload });
            } else if (typeof window.gtag === 'function') {
                window.gtag('event', eventName, safePayload);
            } else {
                window.dataLayer = window.dataLayer || [];
                window.dataLayer.push({ event: eventName, ...safePayload });
            }

            document.dispatchEvent(new CustomEvent('dynasty:analytics', {
                detail: {
                    event: eventName,
                    payload: safePayload
                }
            }));
        }
        function formatAmount(n) {
            const num = typeof n === 'number' ? n : parseFloat(n);
            return 'AED ' + num.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
        }
        const HOURS_PER_DAY = 24;
        const UPFRONT_PAYMENT_RATIO = 0.5;
        const RESERVE_CALENDAR_ENABLED = false;
        function formatCount(value) {
            const rounded = Math.round(value * 100) / 100;
            return Number.isInteger(rounded) ? String(rounded) : rounded.toFixed(2);
        }
        function getDateTimeValue(dateValue, timeValue) {
            if (!dateValue || !timeValue) return null;
            return new Date(`${dateValue}T${timeValue}:00`);
        }
        function isValidDateInputValue(value) {
            const normalized = normalizeValue(value);
            if (!/^\d{4}-\d{2}-\d{2}$/.test(normalized)) return false;
            const [year, month, day] = normalized.split('-').map(Number);
            const parsed = new Date(year, month - 1, day);
            return parsed.getFullYear() === year &&
                parsed.getMonth() === month - 1 &&
                parsed.getDate() === day;
        }
        function getDubaiDateString(offsetDays = 0) {
            const dubaiNow = new Date(new Date().toLocaleString('en-US', { timeZone: 'Asia/Dubai' }));
            dubaiNow.setDate(dubaiNow.getDate() + offsetDays);
            return formatDateInput(dubaiNow);
        }
        function addDaysToDateInputValue(value, offsetDays = 0) {
            if (!isValidDateInputValue(value)) {
                return getDubaiDateString(offsetDays);
            }

            const [year, month, day] = value.split('-').map(Number);
            const date = new Date(year, month - 1, day);
            date.setDate(date.getDate() + offsetDays);
            return formatDateInput(date);
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
        function formatDurationLabel(totalHours) {
            if (!Number.isFinite(totalHours) || totalHours <= 0) return '0h';
            const totalMinutes = Math.round(totalHours * 60);
            const days = Math.floor(totalMinutes / (60 * 24));
            const hours = Math.floor((totalMinutes % (60 * 24)) / 60);
            const minutes = totalMinutes % 60;
            const parts = [];
            if (days) parts.push(`${days}d`);
            if (hours) parts.push(`${hours}h`);
            if (minutes) parts.push(`${minutes}m`);
            return parts.join(' ') || '0h';
        }
        function getReservationPricing() {
            const startDateValue = document.getElementById('startDate').value;
            const endDateValue = document.getElementById('endDate').value;
            const pickupTimeValue = document.getElementById('pickupTime').value;
            const dropoffTimeValue = document.getElementById('dropoffTime').value;
            const startDateTime = getDateTimeValue(startDateValue, pickupTimeValue);
            const endDateTime = getDateTimeValue(endDateValue, dropoffTimeValue);

            if (!startDateTime || !endDateTime) {
                return { isValid: false, durationHours: 0, billingDays: 0, total: 0, upfrontAmount: 0, remainingAmount: 0, durationLabel: '0h' };
            }

            const durationMs = endDateTime - startDateTime;
            if (durationMs <= 0) {
                return { isValid: false, durationHours: 0, billingDays: 0, total: 0, upfrontAmount: 0, remainingAmount: 0, durationLabel: '0h' };
            }

            const durationHours = durationMs / (1000 * 60 * 60);
            const billingDays = durationHours / HOURS_PER_DAY;
            const total = billingDays * pricePerDay;
            const upfrontAmount = total * UPFRONT_PAYMENT_RATIO;
            const remainingAmount = total - upfrontAmount;

            return {
                isValid: true,
                durationHours,
                billingDays,
                total,
                upfrontAmount,
                remainingAmount,
                durationLabel: formatDurationLabel(durationHours),
            };
        }
        function initializeTimeSelect(fieldId, defaultValue = '10:00') {
            const select = document.getElementById(fieldId);
            if (!select) return;

            const selectedValue = select.value || defaultValue;
            select.innerHTML = '';
            for (let hour = 0; hour < 24; hour += 1) {
                for (let minute = 0; minute < 60; minute += 30) {
                    const timeValue = `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
                    const option = document.createElement('option');
                    option.value = timeValue;
                    option.textContent = timeValue;
                    if (timeValue === selectedValue) {
                        option.selected = true;
                    }
                    select.appendChild(option);
                }
            }
        }
        function restorePayButtonLabel() {
            const pricing = getReservationPricing();
            return pricing.isValid ? `Pay 50% now (${formatAmount(pricing.upfrontAmount)})` : 'Pay 50% now';
        }
        function applyTransientClass(element, className) {
            if (!element) return;
            element.classList.remove(className);
            void element.offsetWidth;
            element.classList.add(className);
        }
        function triggerPriceRefreshAnimation() {
            [
                document.getElementById('summaryTotal'),
                document.getElementById('summaryDeposit'),
                document.getElementById('summaryRemaining'),
                document.getElementById('totalAmount'),
                document.getElementById('payNowAmount'),
                document.getElementById('remainingBalance')
            ].forEach((element) => applyTransientClass(element, 'price-text-refresh'));

            [
                document.querySelector('.reservation-summary'),
                document.querySelector('.summary-section'),
                document.getElementById('payButton')
            ].forEach((element) => applyTransientClass(element, 'price-refresh'));
        }

        // Form state
        let currentStep = 1;
        let selectedCar = 'Mercedes GLE 53 AMG';
        let pricePerDay = isAED ? 2000 : 500;
        
        // Calendar state
        let currentDate = new Date();
        let selectedStartDate = null;
        let selectedEndDate = null;

        // Stripe
        let stripe = null;
        let elements = null;
        let cardElement = null;
        let paymentIntentClientSecret = null;
        let currentReservationId = null;

        // Get URL parameters (if coming from index.html)
        const carName = urlParams.get('car');
        const price = urlParams.get('price');
        const startDateParam = urlParams.get('startDate');
        const endDateParam = urlParams.get('endDate');
        const pickupTimeParam = urlParams.get('pickupTime');
        const dropoffTimeParam = urlParams.get('dropoffTime');
        const pickupLocationParam = urlParams.get('pickupLocation');

        function getStoredBookingIntent() {
            try {
                const raw = window.sessionStorage.getItem(BOOKING_INTENT_KEY);
                if (!raw) return null;
                const parsed = JSON.parse(raw);
                if (!parsed.savedAt || (Date.now() - parsed.savedAt) > (1000 * 60 * 60 * 24 * 7)) {
                    window.sessionStorage.removeItem(BOOKING_INTENT_KEY);
                    return null;
                }
                return parsed;
            } catch (error) {
                return null;
            }
        }

        function storeBookingIntent(intent) {
            try {
                window.sessionStorage.setItem(BOOKING_INTENT_KEY, JSON.stringify({
                    car: normalizeValue(intent?.car),
                    price: normalizeValue(intent?.price),
                    startDate: normalizeValue(intent?.startDate),
                    endDate: normalizeValue(intent?.endDate),
                    pickupTime: normalizeValue(intent?.pickupTime),
                    dropoffTime: normalizeValue(intent?.dropoffTime),
                    savedAt: Date.now()
                }));
            } catch (error) {
                // Ignore storage failures.
            }
        }

        function persistBookingIntent() {
            storeBookingIntent({
                car: selectedCar,
                price: pricePerDay,
                startDate: document.getElementById('startDate')?.value,
                endDate: document.getElementById('endDate')?.value,
                pickupTime: document.getElementById('pickupTime')?.value,
                dropoffTime: document.getElementById('dropoffTime')?.value,
                step: currentStep
            });
        }

        function clearGuestDetailFields() {
            GUEST_DETAIL_FIELD_IDS.forEach((fieldId) => {
                const input = document.getElementById(fieldId);
                if (input) {
                    input.value = fieldId === 'country' ? 'AE' : '';
                }
            });
        }

        function clearStoredBookingIntent() {
            try {
                window.sessionStorage.removeItem(BOOKING_INTENT_KEY);
            } catch (error) {
                // Ignore storage failures.
            }
        }

        function applyNavigationBookingProgress() {
            if (isReloadNavigation()) {
                clearStoredBookingIntent();
                clearGuestDetailFields();
                currentStep = 1;
                return;
            }

            const historyStep = getReserveHistoryStep();
            if (historyStep) {
                currentStep = historyStep;
            }
        }

        function clearReservationDraft(options = {}) {
            clearGuestDetailFields();
            paymentIntentClientSecret = null;

            GUEST_DETAIL_FIELD_IDS.forEach(clearFieldError);
            showStepValidation('step2', '');

            if (options.resetStep) {
                setReserveStep(1, {
                    historyMode: 'replace',
                    scroll: options.scroll !== false
                });
            }

            if (options.clearStoredIntent) {
                clearStoredBookingIntent();
            } else {
                persistBookingIntent();
            }

            updateMobileReserveUi();

            if (options.emit !== false) {
                emitAnalyticsEvent('reserve_clear_details', {
                    car: selectedCar,
                    step: currentStep,
                    page_path: normalizeValue(window.location.pathname)
                });
            }
        }

        function updateMobileReserveUi() {
            const stepLabel = `Step ${currentStep} of 3`;
            const rateLabel = `${formatAmount(pricePerDay)} / day`;
            const mobileAction = document.getElementById('reserveMobileAction');
            const continueToPaymentBtn = document.getElementById('continueToPaymentBtn');
            const payButton = document.getElementById('payButton');

            const summaryStep = document.getElementById('reserveMobileStep');
            const summaryCar = document.getElementById('reserveMobileCar');
            const summaryRate = document.getElementById('reserveMobileRate');
            const barStep = document.getElementById('reserveMobileBarStep');
            const barCar = document.getElementById('reserveMobileBarCar');

            if (summaryStep) summaryStep.textContent = stepLabel;
            if (summaryCar) summaryCar.textContent = selectedCar;
            if (summaryRate) summaryRate.textContent = rateLabel;
            if (barStep) barStep.textContent = stepLabel;
            if (barCar) barCar.textContent = selectedCar;

            if (!mobileAction) {
                return;
            }

            if (currentStep === 1) {
                mobileAction.textContent = 'Continue to guest details';
                mobileAction.disabled = !!continueToPaymentBtn?.disabled;
                return;
            }

            if (currentStep === 2) {
                mobileAction.textContent = 'Continue to payment';
                mobileAction.disabled = false;
                return;
            }

            mobileAction.textContent = restorePayButtonLabel();
            mobileAction.disabled = !!payButton?.disabled;
        }

        function applyPrefilledBookingSchedule() {
            const storedIntent = getStoredBookingIntent();
            const preferCurrentSessionValue = (paramValue, storedValue) => (
                paramValue || storedValue || ''
            );
            const rawPrefills = {
                startDate: preferCurrentSessionValue(startDateParam, storedIntent?.startDate),
                endDate: preferCurrentSessionValue(endDateParam, storedIntent?.endDate),
                pickupTime: preferCurrentSessionValue(pickupTimeParam, storedIntent?.pickupTime),
                dropoffTime: preferCurrentSessionValue(dropoffTimeParam, storedIntent?.dropoffTime),
                pickupLocation: pickupLocationParam || ''
            };
            const today = getDubaiDateString(0);
            const startDate = clampBookingDateValue(rawPrefills.startDate, today, today);
            const defaultEndDate = rawPrefills.endDate || addDaysToDateInputValue(startDate, 1);
            let endDate = clampBookingDateValue(defaultEndDate, addDaysToDateInputValue(startDate, 1), today);

            if (endDate <= startDate) {
                endDate = addDaysToDateInputValue(startDate, 1);
            }

            const startDateInput = document.getElementById('startDate');
            const endDateInput = document.getElementById('endDate');
            const pickupTimeInput = document.getElementById('pickupTime');
            const dropoffTimeInput = document.getElementById('dropoffTime');
            const pickupLocationInput = document.getElementById('pickupLocation');

            if (startDateInput) {
                startDateInput.min = today;
                startDateInput.value = startDate;
            }

            if (endDateInput) {
                endDateInput.min = startDate;
                endDateInput.value = endDate;
            }

            if (pickupTimeInput && rawPrefills.pickupTime) pickupTimeInput.value = rawPrefills.pickupTime;
            if (dropoffTimeInput && rawPrefills.dropoffTime) dropoffTimeInput.value = rawPrefills.dropoffTime;
            if (pickupLocationInput && rawPrefills.pickupLocation) pickupLocationInput.value = rawPrefills.pickupLocation;

            updateCalendarFromInputs();
        }
        
        console.log('[RESERVE PAGE] Received parameters:', { carName, price, region: RESERVE_REGION });
        
        if (carName) selectedCar = decodeURIComponent(carName);
        if (price) pricePerDay = parseFloat(price);
        
        console.log('[RESERVE PAGE] Selected vehicle:', selectedCar, 'Price:', pricePerDay);
        
        // Update vehicle information
        const selectedCarElement = document.getElementById('selectedCar');
        const summaryPriceElement = document.getElementById('summaryPricePerDay');
        const selectedCarIntroElement = document.getElementById('selectedCarIntro');
        const selectedCarPriceIntroElement = document.getElementById('selectedCarPriceIntro');
        const selectedPlanTitleElement = document.getElementById('selectedPlanTitle');
        const selectedCarRateElement = document.getElementById('selectedCarRate');
        const reserveHeroCarElement = document.getElementById('reserveHeroCar');
        const reserveHeroRateElement = document.getElementById('reserveHeroRate');
        
        if (selectedCarElement) {
            selectedCarElement.textContent = selectedCar;
        }
        if (selectedCarIntroElement) {
            selectedCarIntroElement.textContent = selectedCar;
        }
        if (selectedPlanTitleElement) {
            selectedPlanTitleElement.textContent = selectedCar;
        }
        if (reserveHeroCarElement) {
            reserveHeroCarElement.textContent = selectedCar;
        }
        if (summaryPriceElement) {
            summaryPriceElement.textContent = formatAmount(pricePerDay);
        }
        if (selectedCarPriceIntroElement) {
            selectedCarPriceIntroElement.textContent = `From ${formatAmount(pricePerDay)} per day before prorated scheduling.`;
        }
        if (selectedCarRateElement) {
            selectedCarRateElement.textContent = `${formatAmount(pricePerDay)} / day`;
        }
        if (reserveHeroRateElement) {
            reserveHeroRateElement.textContent = `${formatAmount(pricePerDay)} / day`;
        }

        document.getElementById('reserveMobileAction')?.addEventListener('click', () => {
            if (currentStep < 3) {
                nextStep();
                return;
            }

            submitReservation();
        });

        [document.getElementById('reserveMobileWhatsApp'), document.getElementById('reserveMobileWhatsAppTop')]
            .filter(Boolean)
            .forEach((link) => {
                link.href = SUPPORT_WHATSAPP_URL;
                link.addEventListener('click', () => {
                    emitAnalyticsEvent('reserve_whatsapp_click', {
                        car: selectedCar,
                        page_path: normalizeValue(window.location.pathname),
                        step: currentStep
                    });
                });
            });

        document.querySelectorAll('a[href*="wa.me/"]').forEach((link) => {
            try {
                const whatsappUrl = new URL(link.getAttribute('href') || '', window.location.href);
                if (whatsappUrl.pathname.replace(/\D/g, '') === '971586122568' && !whatsappUrl.searchParams.get('text')) {
                    link.href = SUPPORT_WHATSAPP_URL;
                }
            } catch (error) {
                // Keep the original href; the functional auditor will report malformed contact URLs.
            }

            if (link.id === 'reserveMobileWhatsApp' || link.id === 'reserveMobileWhatsAppTop') {
                return;
            }

            link.addEventListener('click', () => {
                emitAnalyticsEvent('reserve_whatsapp_click', {
                    car: selectedCar,
                    page_path: normalizeValue(window.location.pathname),
                    step: currentStep
                });
            });
        });

        initializeTimeSelect('pickupTime', '10:00');
        initializeTimeSelect('dropoffTime', '10:00');
        applyNavigationBookingProgress();
        applyPrefilledBookingSchedule();
        installReserveHistoryControls();
        persistBookingIntent();
        updateStepDisplay();
        calculateTotal();
        updateMobileReserveUi();
        
        console.log('[RESERVE PAGE] Page initialized successfully');

        function getConfiguredBackendUrl() {
            if (typeof window.getBackendUrl === 'function') {
                return window.getBackendUrl();
            }

            if (typeof window.BACKEND_URL === 'string' && window.BACKEND_URL.trim()) {
                return window.BACKEND_URL.trim();
            }

            if (window.STRIPE_CONFIG?.backendUrl) {
                return window.STRIPE_CONFIG.backendUrl;
            }

            return '';
        }

        function isLocalRuntime() {
            return !!window.STRIPE_CONFIG?.isDevelopment ||
                window.location.protocol === 'file:' ||
                window.location.hostname === 'localhost' ||
                window.location.hostname === '127.0.0.1';
        }
        
        // Initialize Stripe lazily
        const STRIPE_PUBLISHABLE_KEY = typeof window.getStripePublishableKey === 'function'
            ? window.getStripePublishableKey()
            : (window.STRIPE_CONFIG?.publishableKey || '');
        let stripeScriptPromise = null;

        function loadStripeScript() {
            if (typeof Stripe !== 'undefined') {
                return Promise.resolve(window.Stripe);
            }

            if (stripeScriptPromise) {
                return stripeScriptPromise;
            }

            stripeScriptPromise = new Promise((resolve, reject) => {
                const script = document.createElement('script');
                script.src = 'https://js.stripe.com/v3/';
                script.async = true;
                script.onload = () => resolve(window.Stripe);
                script.onerror = () => reject(new Error('Stripe script failed to load.'));
                document.head.appendChild(script);
            });

            return stripeScriptPromise;
        }

        async function ensureStripeReady() {
            if (!STRIPE_PUBLISHABLE_KEY) {
                console.error('[STRIPE INIT] No publishable key configured for this environment. Review config.js before testing payments.');
                return false;
            }

            if (!stripe || !elements) {
                try {
                    await loadStripeScript();
                    stripe = Stripe(STRIPE_PUBLISHABLE_KEY);
                    elements = stripe.elements();
                    console.log('[STRIPE INIT] Stripe initialized successfully');
                } catch (error) {
                    console.error('[STRIPE INIT] Error initializing Stripe:', error);
                    return false;
                }
            }

            return true;
        }

        if (!STRIPE_PUBLISHABLE_KEY) {
            console.error('[STRIPE INIT] No publishable key configured for this environment. Review config.js before testing payments.');
        }
        
        // Initialize calendar when the page loads
        if (document.getElementById('step1').classList.contains('active')) {
            generateCalendar();
        }

        // Step navigation
        function showStepValidation(stepId, message) {
            const feedback = document.getElementById(`${stepId}Validation`);
            if (!feedback) return;
            if (message) {
                feedback.textContent = message;
                feedback.style.display = 'block';
            } else {
                feedback.textContent = '';
                feedback.style.display = 'none';
            }
        }

        function setFieldError(fieldId, message) {
            const input = document.getElementById(fieldId);
            const errorEl = document.getElementById(`${fieldId}-error`);
            if (!input || !errorEl) return;
            input.classList.add('invalid');
            input.setAttribute('aria-invalid', 'true');
            errorEl.textContent = message;
        }

        function clearFieldError(fieldId) {
            const input = document.getElementById(fieldId);
            const errorEl = document.getElementById(`${fieldId}-error`);
            if (!input || !errorEl) return;
            input.classList.remove('invalid');
            input.removeAttribute('aria-invalid');
            errorEl.textContent = '';
        }

        function validateStep1() {
            const required = ['fullName', 'passport', 'email', 'phone'];
            const missing = [];

            required.forEach((fieldId) => {
                const input = document.getElementById(fieldId);
                const label = input?.dataset?.label || fieldId;
                const value = input ? input.value.trim() : '';

                if (!value) {
                    setFieldError(fieldId, `${label} is required.`);
                    missing.push(label);
                    return;
                }

                if (fieldId === 'email' && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
                    setFieldError(fieldId, 'Please enter a valid email address.');
                    missing.push('valid email');
                    return;
                }

                if (fieldId === 'phone' && value.replace(/[^\d+]/g, '').length < 8) {
                    setFieldError(fieldId, 'Please enter a valid phone number.');
                    missing.push('valid phone number');
                    return;
                }

                clearFieldError(fieldId);
            });

            if (missing.length) {
                showStepValidation('step2', 'Please complete all required fields before continuing.');
                return false;
            }

            showStepValidation('step2', '');
            return true;
        }

        function validateStep2() {
            const startDate = document.getElementById('startDate').value;
            const endDate = document.getElementById('endDate').value;
            const pickupTime = document.getElementById('pickupTime').value;
            const dropoffTime = document.getElementById('dropoffTime').value;
            const pickupLocation = document.getElementById('pickupLocation').value.trim();

            clearFieldError('pickupLocation');
            clearFieldError('pickupTime');
            clearFieldError('dropoffTime');

            if (!pickupLocation) {
                setFieldError('pickupLocation', 'Delivery location is required.');
                showStepValidation('step1', 'Please choose dates and provide a delivery location.');
                return false;
            }

            if (!startDate || !endDate || !pickupTime || !dropoffTime) {
                if (!pickupTime) setFieldError('pickupTime', 'Delivery time is required.');
                if (!dropoffTime) setFieldError('dropoffTime', 'Return time is required.');
                showStepValidation('step1', 'Please complete delivery and return date/time.');
                return false;
            }

            if (!getReservationPricing().isValid) {
                showStepValidation('step1', 'Return date/time must be after delivery date/time.');
                return false;
            }

            showStepValidation('step1', '');
            return true;
        }

        function syncStep2RealtimeState() {
            const startDate = document.getElementById('startDate').value;
            const endDate = document.getElementById('endDate').value;
            const pickupTime = document.getElementById('pickupTime').value;
            const dropoffTime = document.getElementById('dropoffTime').value;
            const pickupLocation = document.getElementById('pickupLocation').value.trim();
            const hasAnyValue = [startDate, endDate, pickupTime, dropoffTime, pickupLocation].some(Boolean);

            if (!hasAnyValue) {
                showStepValidation('step1', '');
                return;
            }

            if (startDate && endDate && pickupTime && dropoffTime && pickupLocation) {
                if (!getReservationPricing().isValid) {
                    showStepValidation('step1', 'Return date/time must be after delivery date/time.');
                    return;
                }

                showStepValidation('step1', '');
            }
        }

        function bindRealtimeValidation() {
            ['fullName', 'passport', 'email', 'phone', 'address', 'city', 'country'].forEach((fieldId) => {
                const input = document.getElementById(fieldId);
                if (!input) return;
                const eventName = input.tagName === 'SELECT' ? 'change' : 'input';
                input.addEventListener(eventName, () => {
                    clearFieldError(fieldId);
                    showStepValidation('step2', '');
                    persistBookingIntent();
                });
            });

            const pickupInput = document.getElementById('pickupLocation');
            if (pickupInput) {
                pickupInput.addEventListener('input', () => {
                    clearFieldError('pickupLocation');
                    persistBookingIntent();
                    updateContinueButton();
                    syncStep2RealtimeState();
                });
            }
            ['pickupTime', 'dropoffTime'].forEach((fieldId) => {
                const input = document.getElementById(fieldId);
                if (!input) return;
                input.addEventListener('input', () => {
                    clearFieldError(fieldId);
                    calculateTotal();
                    syncStep2RealtimeState();
                });
            });
        }

        function scrollCurrentStepIntoView() {
            const container = document.querySelector('.reserve-container');
            if (!container) return;

            const headerOffset = parseInt(getComputedStyle(document.documentElement).getPropertyValue('--lab-header-offset'), 10) || 96;
            const targetTop = Math.max(0, window.scrollY + container.getBoundingClientRect().top - Math.min(headerOffset, 110));
            window.scrollTo({ top: targetTop, behavior: 'auto' });
        }

        let reserveBackFallbackTimer = null;

        function clearReserveBackFallbackTimer() {
            if (reserveBackFallbackTimer !== null) {
                window.clearTimeout(reserveBackFallbackTimer);
                reserveBackFallbackTimer = null;
            }
        }

        function setReserveStep(step, options = {}) {
            const nextStepNumber = getValidReserveStep(step);
            if (!nextStepNumber) {
                return false;
            }

            currentStep = nextStepNumber;

            if (options.historyMode) {
                writeReserveHistoryStep(currentStep, options.historyMode);
            }

            updateStepDisplay();

            if (options.scroll !== false) {
                scrollCurrentStepIntoView();
            }

            return true;
        }

        function installReserveHistoryControls() {
            writeReserveHistoryStep(currentStep, 'replace');

            window.addEventListener('popstate', (event) => {
                const historyStep = getReserveHistoryStep(event.state);
                if (!historyStep) {
                    return;
                }

                clearReserveBackFallbackTimer();
                setReserveStep(historyStep, {
                    historyMode: null,
                    scroll: true
                });
            });

            document.addEventListener('click', (event) => {
                const floatingBack = event.target?.closest?.('.lab-floating-back');
                if (!floatingBack || currentStep <= 1) {
                    return;
                }

                event.preventDefault();
                event.stopPropagation();
                event.stopImmediatePropagation();
                prevStep();
            }, true);
        }

        function nextStep() {
            if (currentStep === 1) {
                if (!validateStep2()) {
                    return;
                }
            } else if (currentStep === 2) {
                if (!validateStep1()) {
                    return;
                }

                // Calculate total
                calculateTotal();
            }
            
            // Keep the calendar ready while the schedule step is active
            if (currentStep === 1) {
                generateCalendar();
            }

            if (currentStep < 3) {
                const previousStep = currentStep;
                const nextStepNumber = currentStep + 1;
                emitAnalyticsEvent('reserve_step_advance', {
                    car: selectedCar,
                    from_step: previousStep,
                    to_step: nextStepNumber,
                    page_path: normalizeValue(window.location.pathname)
                });
                setReserveStep(nextStepNumber, {
                    historyMode: 'push',
                    scroll: true
                });
            }
        }

        function prevStep() {
            if (currentStep > 1) {
                const targetStep = currentStep - 1;
                persistBookingIntent();

                if (getReserveHistoryStep() === currentStep && window.history.length > 1) {
                    clearReserveBackFallbackTimer();
                    reserveBackFallbackTimer = window.setTimeout(() => {
                        if (currentStep !== targetStep) {
                            setReserveStep(targetStep, {
                                historyMode: 'replace',
                                scroll: true
                            });
                        }
                    }, 180);
                    window.history.back();
                    return;
                }

                setReserveStep(targetStep, {
                    historyMode: 'replace',
                    scroll: true
                });
            }
        }

        function updateStepDisplay() {
            // Hide every step before showing the active one.
            document.querySelectorAll('.step-content').forEach(step => {
                step.classList.remove('active');
            });

            // Show current step
            document.getElementById(`step${currentStep}`).classList.add('active');

            // Update progress indicators
            document.querySelectorAll('.step-pill').forEach((indicator, index) => {
                const stepNumber = index + 1;
                indicator.classList.toggle('active', stepNumber === currentStep);
                indicator.classList.toggle('completed', stepNumber < currentStep);
                if (stepNumber === currentStep) {
                    applyTransientClass(indicator, 'price-refresh');
                }
            });
            
            // Initialize the calendar when step 1 is visible.
            if (currentStep === 1) {
                generateCalendar();
            }
            
        // Initialize Stripe Elements when step 3 is shown
            if (currentStep === 3) {
                initializeStripeElements();
                emitAnalyticsEvent('reserve_payment_view', {
                    car: selectedCar,
                    page_path: normalizeValue(window.location.pathname)
                });
            }

            updateMobileReserveUi();
            persistBookingIntent();
        }
        
        // Calendar functions
        function generateCalendar() {
            if (!RESERVE_CALENDAR_ENABLED) {
                return;
            }

            const year = currentDate.getFullYear();
            const month = currentDate.getMonth();
            const firstDay = new Date(year, month, 1);
            const lastDay = new Date(year, month + 1, 0);
            const daysInMonth = lastDay.getDate();
            const startingDayOfWeek = firstDay.getDay();

            const monthNames = ['January', 'February', 'March', 'April', 'May', 'June',
                              'July', 'August', 'September', 'October', 'November', 'December'];
            document.getElementById('currentMonth').textContent = `${monthNames[month]} ${year}`;

            const grid = document.getElementById('calendarGrid');
            grid.innerHTML = '';

            // Days of the week
            const weekDays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
            weekDays.forEach(day => {
                const dayElement = document.createElement('div');
                dayElement.className = 'calendar-day header';
                dayElement.textContent = day;
                grid.appendChild(dayElement);
            });

            // Empty slots at the start
            for (let i = 0; i < startingDayOfWeek; i++) {
                const emptyDay = document.createElement('div');
                emptyDay.className = 'calendar-day';
                grid.appendChild(emptyDay);
            }

            // Days of the month
            const today = new Date();
            today.setHours(0, 0, 0, 0);

            for (let day = 1; day <= daysInMonth; day++) {
                const date = new Date(year, month, day);
                const dateStr = formatDate(date);
                const dayElement = document.createElement('div');
                dayElement.className = 'calendar-day';
                dayElement.textContent = day;

                // Check if this is a past date
                if (date < today) {
                    dayElement.classList.add('past', 'unavailable');
                } else {
                    dayElement.classList.add('available');
                    dayElement.onclick = () => selectDate(date);
                }

                // Mark today
                if (dateStr === formatDate(today)) {
                    dayElement.classList.add('today');
                }

                // Mark selected dates and range
                if (selectedStartDate && selectedEndDate) {
                    const startStr = formatDate(selectedStartDate);
                    const endStr = formatDate(selectedEndDate);
                    
                    if (dateStr === startStr) {
                        dayElement.classList.add('selected', 'start-date');
                    } else if (dateStr === endStr) {
                        dayElement.classList.add('selected', 'end-date');
                    } else if (date >= selectedStartDate && date <= selectedEndDate) {
                        dayElement.classList.add('in-range');
                    }
                } else if (selectedStartDate && formatDate(selectedStartDate) === dateStr) {
                    dayElement.classList.add('selected', 'start-date');
                }

                grid.appendChild(dayElement);
            }
        }

        function selectDate(date) {
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            
            // Do not allow selecting past dates
            if (date < today) {
                return;
            }
            
            if (!selectedStartDate || (selectedStartDate && selectedEndDate)) {
                // First selection or reset selection
                selectedStartDate = date;
                selectedEndDate = null;
                document.getElementById('startDate').value = formatDateInput(date);
                document.getElementById('endDate').value = '';
            } else if (date > selectedStartDate) {
                // Second selection (end date)
                selectedEndDate = date;
                document.getElementById('endDate').value = formatDateInput(date);
            } else if (date < selectedStartDate) {
                // If the selected date is before the start, make it the new start
                selectedStartDate = date;
                selectedEndDate = null;
                document.getElementById('startDate').value = formatDateInput(date);
                document.getElementById('endDate').value = '';
            } else {
                // If clicking the same date, reset
                selectedStartDate = null;
                selectedEndDate = null;
                document.getElementById('startDate').value = '';
                document.getElementById('endDate').value = '';
            }
            
            generateCalendar();
            calculateTotal();
            updateContinueButton();
        }

        function changeMonth(direction) {
            if (!RESERVE_CALENDAR_ENABLED) {
                return;
            }

            currentDate.setMonth(currentDate.getMonth() + direction);
            generateCalendar();
        }

        function formatDateInput(date) {
            const year = date.getFullYear();
            const month = String(date.getMonth() + 1).padStart(2, '0');
            const day = String(date.getDate()).padStart(2, '0');
            return `${year}-${month}-${day}`;
        }

        function formatDate(date) {
            return formatDateInput(date);
        }
        
        function updateCalendarFromInputs() {
            const startDateInput = document.getElementById('startDate');
            const endDateInput = document.getElementById('endDate');
            const today = getDubaiDateString(0);

            if (startDateInput) {
                startDateInput.min = today;
                if (startDateInput.value && startDateInput.value < today) {
                    startDateInput.value = today;
                }
            }

            if (endDateInput) {
                endDateInput.min = startDateInput?.value || today;
                if (endDateInput.value && endDateInput.value < endDateInput.min) {
                    endDateInput.value = endDateInput.min;
                }
            }

            const startDateValue = startDateInput?.value || '';
            const endDateValue = endDateInput?.value || '';
            
            if (startDateValue) {
                selectedStartDate = new Date(startDateValue);
            } else {
                selectedStartDate = null;
            }
            
            if (endDateValue) {
                selectedEndDate = new Date(endDateValue);
            } else {
                selectedEndDate = null;
            }
            
            generateCalendar();
            calculateTotal();
            updateContinueButton();
        }
        
        function updateContinueButton() {
            const startDate = document.getElementById('startDate').value;
            const endDate = document.getElementById('endDate').value;
            const pickupTime = document.getElementById('pickupTime').value;
            const dropoffTime = document.getElementById('dropoffTime').value;
            const pickupLocation = document.getElementById('pickupLocation').value.trim();
            const continueBtn = document.getElementById('continueToPaymentBtn');
            
            if (startDate && endDate && pickupTime && dropoffTime && pickupLocation && getReservationPricing().isValid) {
                continueBtn.disabled = false;
                continueBtn.style.opacity = '1';
                continueBtn.style.cursor = 'pointer';
            } else {
                continueBtn.disabled = true;
                continueBtn.style.opacity = '0.5';
                continueBtn.style.cursor = 'not-allowed';
            }
        }

        function calculateTotal() {
            const pricing = getReservationPricing();

            if (pricing.isValid) {
                document.getElementById('summaryDays').textContent = pricing.durationLabel;
                document.getElementById('summaryBillableDays').textContent = formatCount(pricing.billingDays);
                document.getElementById('summaryTotal').textContent = formatAmount(pricing.total);
                document.getElementById('summaryDeposit').textContent = formatAmount(pricing.upfrontAmount);
                document.getElementById('summaryRemaining').textContent = formatAmount(pricing.remainingAmount);
                document.getElementById('totalAmount').textContent = formatAmount(pricing.total);
                document.getElementById('payNowAmount').textContent = formatAmount(pricing.upfrontAmount);
                document.getElementById('remainingBalance').textContent = formatAmount(pricing.remainingAmount);
                document.getElementById('payButton').textContent = `Pay 50% now (${formatAmount(pricing.upfrontAmount)})`;
                triggerPriceRefreshAnimation();
            } else {
                document.getElementById('summaryDays').textContent = '0h';
                document.getElementById('summaryBillableDays').textContent = '0';
                document.getElementById('summaryTotal').textContent = CURRENCY_ZERO;
                document.getElementById('summaryDeposit').textContent = CURRENCY_ZERO;
                document.getElementById('summaryRemaining').textContent = CURRENCY_ZERO;
                document.getElementById('totalAmount').textContent = CURRENCY_ZERO;
                document.getElementById('payNowAmount').textContent = CURRENCY_ZERO;
                document.getElementById('remainingBalance').textContent = CURRENCY_ZERO;
                document.getElementById('payButton').textContent = 'Pay 50% now';
            }

            updateContinueButton();
            persistBookingIntent();
            updateMobileReserveUi();
        }

        // Listen for date changes to calculate the total
        document.getElementById('startDate').addEventListener('change', function() {
            updateCalendarFromInputs();
        });
        document.getElementById('endDate').addEventListener('change', function() {
            updateCalendarFromInputs();
        });
        document.getElementById('pickupTime').addEventListener('change', function() {
            calculateTotal();
        });
        document.getElementById('dropoffTime').addEventListener('change', function() {
            calculateTotal();
        });
        bindRealtimeValidation();

        // Initialize Stripe Elements
        async function initializeStripeElements() {
            console.log('[STRIPE ELEMENTS] Initializing Stripe elements...');

            if (!(await ensureStripeReady())) {
                console.error('[STRIPE ELEMENTS] Stripe is not initialized');
                return;
            }

            // If the element already exists, do not recreate it
            if (cardElement) {
                console.log('[STRIPE ELEMENTS] Card element already exists');
                return;
            }

            try {
                // Create the card element
                console.log('[STRIPE ELEMENTS] Creating card element...');
                cardElement = elements.create('card', {
                    hidePostalCode: true,
                    style: {
                        base: {
                            fontSize: '16px',
                            color: '#17120d',
                            iconColor: '#6f6257',
                            '::placeholder': {
                                color: '#81756a',
                            },
                            fontFamily: 'Segoe UI, Tahoma, Geneva, Verdana, sans-serif',
                        },
                        invalid: {
                            color: '#ef4444',
                            iconColor: '#ef4444',
                        },
                    },
                });

                // Mount the element in the container
                const cardContainer = document.getElementById('card-element');
                if (!cardContainer) {
                    console.error('[STRIPE ELEMENTS] #card-element container not found');
                    return;
                }
                
                cardElement.mount('#card-element');
                console.log('[STRIPE ELEMENTS] Card element mounted successfully');

                // Handle real-time validation errors
                cardElement.on('change', function(event) {
                    const displayError = document.getElementById('card-errors');
                    if (event.error) {
                        console.log('[STRIPE ELEMENTS] Validation error:', event.error.message);
                        displayError.textContent = event.error.message;
                    } else {
                        displayError.textContent = '';
                    }
                });

                // Show the payment form container
                document.getElementById('payment-form-container').style.display = 'block';
                console.log('[STRIPE ELEMENTS] Payment form is visible');
            } catch (error) {
                console.error('[STRIPE ELEMENTS] Error creating element:', error);
            }
        }

        // Function to check server connection
        async function checkServerConnection() {
            const BACKEND_URL = getConfiguredBackendUrl();
            console.log('[CONNECTION CHECK] Checking connection to server:', BACKEND_URL);
            console.log('[CONNECTION CHECK] Current protocol:', window.location.protocol);

            if (!BACKEND_URL) {
                console.error('[CONNECTION CHECK] No secure service URL configured for the current environment.');
                return false;
            }
            
            // Check if we are in file:// (can cause CORS issues)
            if (window.location.protocol === 'file:') {
                console.warn('[CONNECTION CHECK] File opened as file://. This can cause CORS issues.');
                console.warn('[CONNECTION CHECK] Consider using a local web server or opening from http://localhost');
            }
            
            // Try multiple endpoints
            const endpoints = ['/api/test', '/health', '/'];
            
            for (const endpoint of endpoints) {
                try {
                    console.log(`[CONNECTION CHECK] Trying to connect to: ${BACKEND_URL}${endpoint}`);
                    
                    // Create an AbortController for the timeout
                    const controller = new AbortController();
                    const timeoutId = setTimeout(() => controller.abort(), 10000);
                    
                    const response = await fetch(`${BACKEND_URL}${endpoint}`, {
                        method: 'GET',
                        headers: {
                            'Content-Type': 'application/json',
                        },
                        mode: 'cors', // Force CORS
                        signal: controller.signal
                    });
                    
                    clearTimeout(timeoutId);
                    
                    if (response.ok) {
                        const data = await response.json();
                        console.log('[CONNECTION CHECK] Server connected:', data);
                        return true;
                    } else {
                        console.warn(`[CONNECTION CHECK] Non-OK response (${response.status}) from ${endpoint}`);
                    }
                } catch (error) {
                    if (error.name === 'AbortError') {
                        console.error(`[CONNECTION CHECK] Timeout connecting to ${endpoint} (10 seconds)`);
                    } else if (error.message.includes('Failed to fetch') || error.message.includes('NetworkError')) {
                        console.error(`[CONNECTION CHECK] Network error connecting to ${endpoint}:`, error.message);
                        console.error('[CONNECTION CHECK] Possible causes:');
                        console.error('[CONNECTION CHECK] - The server is not running');
                        console.error('[CONNECTION CHECK] - CORS issue (try opening from http://localhost)');
                        console.error('[CONNECTION CHECK] - Firewall blocking the connection');
                    } else {
                        console.warn(`[CONNECTION CHECK] Error with ${endpoint}:`, error.message);
                    }
                    // Continue with the next endpoint
                }
            }
            
            console.error('[CONNECTION CHECK] Could not connect to any endpoint');
            return false;
        }

        function collectReservationFormData() {
            return {
                fullName: document.getElementById('fullName').value,
                passport: document.getElementById('passport').value,
                email: document.getElementById('email').value,
                phone: document.getElementById('phone').value,
                address: document.getElementById('address').value,
                city: document.getElementById('city').value,
                country: document.getElementById('country').value,
                startDate: document.getElementById('startDate').value,
                endDate: document.getElementById('endDate').value,
                pickupTime: document.getElementById('pickupTime').value,
                dropoffTime: document.getElementById('dropoffTime').value,
                pickupLocation: document.getElementById('pickupLocation').value,
            };
        }

        function buildReservationRequestPayload(formData, pricing) {
            const total = pricing.total;
            const upfrontAmount = pricing.upfrontAmount;
            const remainingAmount = pricing.remainingAmount;

            return {
                amount: Math.round(upfrontAmount * 100),
                currency: (window.STRIPE_CONFIG && window.STRIPE_CONFIG.currency) || (isAED ? 'aed' : 'eur'),
                clientContext: buildClientContext(),
                customerData: {
                    name: formData.fullName,
                    email: formData.email,
                    phone: formData.phone,
                    dni: formData.passport,
                    address: formData.address,
                    city: formData.city,
                    country: formData.country,
                },
                reservationData: {
                    car: selectedCar,
                    pricePerDay: pricePerDay,
                    days: Number(pricing.billingDays.toFixed(2)),
                    startDate: formData.startDate.split('T')[0],
                    endDate: formData.endDate.split('T')[0],
                    pickupTime: formData.pickupTime,
                    dropoffTime: formData.dropoffTime,
                    durationHours: Number(pricing.durationHours.toFixed(2)),
                    durationLabel: pricing.durationLabel,
                    totalAmount: Number(total.toFixed(2)),
                    total: formatAmount(total),
                    upfrontAmount: Number(upfrontAmount.toFixed(2)),
                    upfrontDisplay: formatAmount(upfrontAmount),
                    remainingAmount: Number(remainingAmount.toFixed(2)),
                    remainingDisplay: formatAmount(remainingAmount),
                    pickupLocation: formData.pickupLocation,
                }
            };
        }

        async function redirectToHostedCheckout(BACKEND_URL, reservationPayload, payButton) {
            console.warn('[PAYMENT] Stripe Elements unavailable. Trying hosted Stripe checkout fallback.');
            showMessage('Opening Stripe secure checkout...', 'success');
            payButton.textContent = 'Opening Stripe checkout...';
            updateMobileReserveUi();

            try {
                const response = await fetch(`${BACKEND_URL}/api/reserve/checkout-session`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify(reservationPayload)
                });
                const data = await response.json().catch(() => ({}));

                if (!response.ok || !data.checkoutUrl) {
                    throw new Error(data.error || 'Hosted Stripe checkout could not be started.');
                }

                window.location.href = data.checkoutUrl;
            } catch (error) {
                console.error('[PAYMENT] Hosted checkout fallback failed:', error);
                showMessage('We could not open Stripe checkout. ' + error.message, 'error');
                payButton.disabled = false;
                payButton.textContent = restorePayButtonLabel();
                updateMobileReserveUi();
            }
        }

        async function submitReservation() {
            console.log('[PAYMENT] ========== STARTING PAYMENT PROCESS ==========');
            const payButton = document.getElementById('payButton');
            payButton.disabled = true;
            payButton.textContent = 'Processing...';
            updateMobileReserveUi();

            // Check server connection first
            const BACKEND_URL = getConfiguredBackendUrl();
            console.log('[PAYMENT] Checking server connection before processing payment...');
            const isConnected = await checkServerConnection();
            if (!isConnected) {
                const backendTarget = BACKEND_URL || 'the secure reservation service';
                const errorMsg = 'We could not reach the secure reservation service right now. Please try again in a moment or WhatsApp the team.';
                console.error('[PAYMENT]', errorMsg, backendTarget);
                console.error('[PAYMENT] Verify that:');
                if (isLocalRuntime()) {
                    console.error('[PAYMENT] 1. The local server is running on port 3000');
                    console.error('[PAYMENT] 2. The local service is reachable in your browser');
                } else {
                    console.error('[PAYMENT] 1. The deployed backend is reachable');
                    console.error('[PAYMENT] 2. The configured service URL is correct:', backendTarget);
                }
                console.error('[PAYMENT] 3. There are no CORS errors in the console');
                showMessage(errorMsg, 'error');
                payButton.disabled = false;
                payButton.textContent = restorePayButtonLabel();
                updateMobileReserveUi();
                return;
            }
            console.log('[PAYMENT] Server connection verified, proceeding with payment...');

            const formData = collectReservationFormData();

            console.log('[PAYMENT] Collected form data:', {
                fullName: formData.fullName,
                email: formData.email,
                phone: formData.phone,
                startDate: formData.startDate,
                endDate: formData.endDate,
                car: selectedCar,
                pricePerDay: pricePerDay
            });

            // Calculate pricing: 24h base rental + hourly proration
            const pricing = getReservationPricing();
            if (!pricing.isValid) {
                showMessage('Invalid delivery/return schedule. Please review dates and times.', 'error');
                payButton.disabled = false;
                payButton.textContent = restorePayButtonLabel();
                updateMobileReserveUi();
                return;
            }

            const total = pricing.total;
            const upfrontAmount = pricing.upfrontAmount;
            const remainingAmount = pricing.remainingAmount;
            const totalCents = Math.round(upfrontAmount * 100);
            const reservationPayload = buildReservationRequestPayload(formData, pricing);

            emitAnalyticsEvent('reserve_submit', {
                car: selectedCar,
                total_amount: total,
                upfront_amount: upfrontAmount,
                page_path: normalizeValue(window.location.pathname)
            });

            console.log('[PAYMENT] Calculations:', {
                durationHours: pricing.durationHours,
                billingDays: pricing.billingDays,
                total: total,
                upfrontAmount: upfrontAmount,
                remainingAmount: remainingAmount,
                totalCents: totalCents
            });

            const stripeReady = await ensureStripeReady();
            if (!stripeReady) {
                await redirectToHostedCheckout(BACKEND_URL, reservationPayload, payButton);
                return;
            }

            await initializeStripeElements();
            if (!stripe || !cardElement) {
                await redirectToHostedCheckout(BACKEND_URL, reservationPayload, payButton);
                return;
            }

            try {
                // Get reservation service URL
                const BACKEND_URL = getConfiguredBackendUrl();
                console.log('[PAYMENT] Reservation service URL:', BACKEND_URL);
                console.log('[PAYMENT] Existing client secret:', !!paymentIntentClientSecret);

                // If we don't have a clientSecret, create the reservation first
                if (!paymentIntentClientSecret) {
                    console.log('[PAYMENT] No clientSecret, creating reservation...');
                    
                    // Prepare data for the API
                    const reservationData = {
                        amount: totalCents,
                        currency: (window.STRIPE_CONFIG && window.STRIPE_CONFIG.currency) || (isAED ? 'aed' : 'eur'),
                        clientContext: buildClientContext(),
                        customerData: {
                            name: formData.fullName,
                            email: formData.email,
                            phone: formData.phone,
                            dni: formData.passport,
                            address: formData.address,
                            city: formData.city,
                            country: formData.country,
                        },
                        reservationData: {
                            car: selectedCar,
                            pricePerDay: pricePerDay,
                            days: Number(pricing.billingDays.toFixed(2)),
                            startDate: formData.startDate.split('T')[0],
                            endDate: formData.endDate.split('T')[0],
                            pickupTime: formData.pickupTime,
                            dropoffTime: formData.dropoffTime,
                            durationHours: Number(pricing.durationHours.toFixed(2)),
                            durationLabel: pricing.durationLabel,
                            totalAmount: Number(total.toFixed(2)),
                            total: formatAmount(total),
                            upfrontAmount: Number(upfrontAmount.toFixed(2)),
                            upfrontDisplay: formatAmount(upfrontAmount),
                            remainingAmount: Number(remainingAmount.toFixed(2)),
                            remainingDisplay: formatAmount(remainingAmount),
                            pickupLocation: formData.pickupLocation,
                        }
                    };

                    console.log('[PAYMENT] Sending data to the server:', {
                        url: `${BACKEND_URL}/api/reserve`,
                        method: 'POST',
                        data: reservationData
                    });

                    let response;
                    const startTime = Date.now();
                    try {
                        console.log('[PAYMENT] Starting request to server...', {
                            url: `${BACKEND_URL}/api/reserve`,
                            timestamp: new Date().toISOString()
                        });
                        
                        // Use AbortController for better timeout control
                        const controller = new AbortController();
                        const timeoutId = setTimeout(() => {
                            controller.abort();
                            const elapsed = Date.now() - startTime;
                            console.error(`[PAYMENT] Timeout after ${elapsed}ms (180 seconds)`);
                        }, 180000);
                        
                        response = await fetch(`${BACKEND_URL}/api/reserve`, {
                            method: 'POST',
                            headers: {
                                'Content-Type': 'application/json',
                            },
                            body: JSON.stringify(reservationData),
                            signal: controller.signal
                        });
                        
                        clearTimeout(timeoutId);
                        const elapsed = Date.now() - startTime;
                        console.log(`[PAYMENT] Response received in ${elapsed}ms`);
                    } catch (fetchError) {
                        const elapsed = Date.now() - startTime;
                        console.error('[PAYMENT] Connection error:', fetchError);
                        console.error(`[PAYMENT] Elapsed time: ${elapsed}ms`);
                        
                        if (fetchError.name === 'AbortError' || fetchError.message.includes('timeout') || fetchError.message.includes('timed out')) {
                            throw new Error('The secure payment service is taking longer than expected. Please try again in a moment or WhatsApp the team.');
                        } else if (fetchError.message.includes('Failed to fetch') || fetchError.message.includes('NetworkError')) {
                            throw new Error('We could not reach the secure reservation service. Please try again in a moment or WhatsApp the team.');
                        } else {
                            throw new Error('We could not start secure checkout. Please try again or WhatsApp the team.');
                        }
                    }

                    console.log('[PAYMENT] Server response:', {
                        status: response.status,
                        statusText: response.statusText,
                        ok: response.ok
                    });

                    let data;
                    try {
                        data = await response.json();
                    } catch (jsonError) {
                        console.error('[PAYMENT] Error parsing JSON response:', jsonError);
                        const textResponse = await response.text();
                        console.error('[PAYMENT] Server response (text):', textResponse);
                        throw new Error('We could not read the checkout response. Please try again or WhatsApp the team.');
                    }

                    console.log('[PAYMENT] Data received from server:', data);

                    if (!response.ok || !data.clientSecret) {
                        console.error('[PAYMENT] Error in server response:', {
                            ok: response.ok,
                            status: response.status,
                            clientSecret: !!data.clientSecret,
                            error: data.error
                        });
                        throw new Error(data.error || 'We could not start secure checkout. Please try again or WhatsApp the team.');
                    }

                    paymentIntentClientSecret = data.clientSecret;
                    currentReservationId = normalizeValue(data.reservationId) || currentReservationId;
                    console.log('[PAYMENT] Client secret received:', paymentIntentClientSecret ? paymentIntentClientSecret.substring(0, 20) + '...' : 'not received');
                    showMessage('Reservation created. Please complete payment...', 'success');
                } else {
                    console.log('[PAYMENT] Using existing clientSecret');
                }

                // Confirm the payment with Stripe
                console.log('[PAYMENT] Checking Stripe before confirming payment...');
                console.log('[PAYMENT] Stripe available:', !!stripe);
                console.log('[PAYMENT] CardElement available:', !!cardElement);
                
                if (!stripe || !cardElement) {
                    await initializeStripeElements();
                }

                if (!stripe || !cardElement) {
                    console.error('[PAYMENT] Secure payment is not initialized');
                    throw new Error('Secure payment could not be initialized. Please reload the page or WhatsApp the team.');
                }

                console.log('[PAYMENT] Confirming payment with Stripe...');
                const { error: stripeError, paymentIntent } = await stripe.confirmCardPayment(
                    paymentIntentClientSecret,
                    {
                        payment_method: {
                            card: cardElement,
                            billing_details: {
                                name: formData.fullName,
                                email: formData.email,
                                phone: formData.phone,
                                address: {
                                    line1: formData.address,
                                    city: formData.city,
                                    country: formData.country,
                                },
                            },
                        },
                    }
                );

                console.log('[PAYMENT] Stripe confirmation result:', {
                    error: stripeError ? stripeError.message : null,
                    paymentIntent: paymentIntent ? {
                        id: paymentIntent.id,
                        status: paymentIntent.status,
                        amount: paymentIntent.amount
                    } : null
                });

                if (stripeError) {
                    console.error('[PAYMENT] Stripe error:', stripeError);
                    // Show error to the user
                    const displayError = document.getElementById('card-errors');
                    if (displayError) {
                        displayError.textContent = stripeError.message;
                    }
                    throw new Error(stripeError.message);
                }

                if (!paymentIntent) {
                    console.error('[PAYMENT] Payment confirmation was not received');
                    throw new Error('No response received from the payment processor');
                }

                console.log('[PAYMENT] Payment status:', paymentIntent.status);

                // Handle different payment states
                if (paymentIntent.status === 'succeeded') {
                    console.log('[PAYMENT] Payment successful. Payment ID:', paymentIntent.id);
                    showMessage('Payment received. Finalising your reservation...', 'success');
                    
                    // Confirm the reservation in the backend and send emails
                    try {
                        console.log('[PAYMENT] Confirming reservation in the backend...');
                        const BACKEND_URL = getConfiguredBackendUrl();
                        
                        // Prepare full data for the confirmation email
                        const confirmData = {
                            paymentIntentId: paymentIntent.id,
                            reservationData: {
                                reservationId: currentReservationId,
                                car: selectedCar,
                                pricePerDay: pricePerDay,
                                days: Number(pricing.billingDays.toFixed(2)),
                                startDate: formData.startDate.split('T')[0],
                                endDate: formData.endDate.split('T')[0],
                                pickupTime: formData.pickupTime,
                                dropoffTime: formData.dropoffTime,
                                durationHours: Number(pricing.durationHours.toFixed(2)),
                                durationLabel: pricing.durationLabel,
                                pickupLocation: formData.pickupLocation,
                                totalAmount: Number(total.toFixed(2)),
                                total: formatAmount(total),
                                upfrontAmount: Number(upfrontAmount.toFixed(2)),
                                upfrontDisplay: formatAmount(upfrontAmount),
                                remainingAmount: Number(remainingAmount.toFixed(2)),
                                remainingDisplay: formatAmount(remainingAmount)
                            },
                            customerData: {
                                name: formData.fullName,
                                email: formData.email,
                                phone: formData.phone,
                                dni: formData.passport,
                                address: formData.address,
                                city: formData.city,
                                country: formData.country,
                            }
                        };
                        
                        const confirmResponse = await fetch(`${BACKEND_URL}/api/reserve/confirm`, {
                            method: 'POST',
                            headers: {
                                'Content-Type': 'application/json',
                            },
                            body: JSON.stringify(confirmData),
                        });
                        
                        const confirmResult = await confirmResponse.json();
                        console.log('[PAYMENT] Confirmation response:', confirmResult);
                        currentReservationId = normalizeValue(confirmResult.reservationId) || currentReservationId;
                        
                        if (confirmResult.emailSent) {
                            console.log('[PAYMENT] Confirmation email sent');
                        } else {
                            console.warn('[PAYMENT] Confirmation email not sent');
                        }
                    } catch (confirmError) {
                        console.warn('[PAYMENT] Error confirming reservation (non-critical):', confirmError);
                        // Do not fail if confirmation fails; the payment already succeeded
                    }

                    // Show success message and redirect
                    console.log('[PAYMENT] Process completed successfully');
                    clearReservationDraft({
                        clearStoredIntent: true,
                        emit: false,
                        resetStep: true,
                        scroll: false
                    });
                    setTimeout(() => {
                        const bookingReferenceLine = currentReservationId
                            ? `Booking reference: ${currentReservationId}\n`
                            : '';
                        const lookupLine = currentReservationId
                            ? '\nUse this reference with your booking email in Find Booking.'
                            : '';
                        alert(`Payment received.\n\n${bookingReferenceLine}Vehicle: ${selectedCar}\nDuration: ${pricing.durationLabel}\nTotal reservation: ${formatAmount(total)}\nPaid now: ${formatAmount(upfrontAmount)}\nRemaining balance: ${formatAmount(remainingAmount)}\n${lookupLine}\n\nYou will receive a confirmation email and the team will coordinate the handover details.`);
                        window.location.href = '/index.html';
                    }, 1500);
                } else if (paymentIntent.status === 'processing') {
                    console.log('[PAYMENT] Payment is processing.');
                    showMessage('Payment is processing. You will receive a confirmation email shortly.', 'success');
                    payButton.disabled = false;
                    payButton.textContent = restorePayButtonLabel();
                } else if (paymentIntent.status === 'requires_action') {
                    console.log('[PAYMENT] Additional authentication required');
                    showMessage('Please complete the authentication in the popup window...', 'success');
                    // Stripe will automatically handle the 3D Secure flow
                    // The payment record will be updated automatically
                    // The user must complete authentication in the popup
                } else if (paymentIntent.status === 'requires_payment_method') {
                    console.error('[PAYMENT] Payment method failed');
                    showMessage('Payment method failed. Please try a different card.', 'error');
                    payButton.disabled = false;
                    payButton.textContent = restorePayButtonLabel();
                    const displayError = document.getElementById('card-errors');
                    if (displayError) {
                        displayError.textContent = 'Payment method failed. Please try a different card.';
                    }
                } else {
                    console.error('[PAYMENT] Unexpected payment status:', paymentIntent.status);
                    showMessage('Payment is not complete yet. Please try again or WhatsApp the team.', 'error');
                    payButton.disabled = false;
                    payButton.textContent = restorePayButtonLabel();
                }
            } catch (error) {
                console.error('[PAYMENT] GENERAL ERROR:', error);
                console.error('[PAYMENT] Trace:', error.stack);
                showMessage('We could not complete payment. ' + error.message, 'error');
                payButton.disabled = false;
                payButton.textContent = restorePayButtonLabel();
            }
        }

        function showMessage(message, type) {
            const statusDiv = document.getElementById('paymentStatus');
            statusDiv.textContent = message;
            statusDiv.className = type === 'error' ? 'error-message' : 'success-message';
            statusDiv.style.display = 'block';
        }
