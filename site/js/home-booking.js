(function () {
    function getTodayInputValue() {
        const today = new Date();
        return new Date(today.getTime() - (today.getTimezoneOffset() * 60000)).toISOString().slice(0, 10);
    }

    function formatIntentDate(dateValue) {
        if (!dateValue) {
            return '';
        }

        const date = new Date(`${dateValue}T00:00:00`);
        if (Number.isNaN(date.getTime())) {
            return '';
        }

        return date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
    }

    function getStorageOrigin() {
        return window.location.origin && window.location.origin !== 'null'
            ? window.location.origin
            : 'http://localhost';
    }

    function init(config) {
        const bookingIntentKey = config && config.bookingIntentKey
            ? config.bookingIntentKey
            : 'dynastyBookingIntent';

        const heroSection = document.querySelector('.hero');
        const heroBookingLauncher = document.getElementById('heroBookingLauncher');
        const heroBookingReveal = document.getElementById('heroBookingReveal');
        const heroBookingBack = document.getElementById('heroBookingBack');
        const heroBookingPanel = document.getElementById('booking');
        const heroAvailabilityForm = document.getElementById('heroAvailabilityForm');
        const heroStartDateInput = document.getElementById('heroStartDate');
        const heroEndDateInput = document.getElementById('heroEndDate');
        const heroStartDateControl = document.getElementById('heroStartDateControl');
        const heroEndDateControl = document.getElementById('heroEndDateControl');
        const heroVehiclePreference = document.getElementById('heroVehiclePreference');
        const heroSearchError = document.getElementById('heroSearchError');
        const fleetIntentBanner = document.getElementById('fleetIntentBanner');
        const fleetIntentValue = document.getElementById('fleetIntentValue');
        const fleetIntentCopy = document.getElementById('fleetIntentCopy');
        const fleetCards = Array.from(document.querySelectorAll('.car-card'));
        const reserveLinks = Array.from(document.querySelectorAll('.reserve-link'));
        const fleetSection = document.getElementById('fleet');
        const defaultTime = '10:00';
        const maxAge = 1000 * 60 * 60 * 24 * 7;

        function syncDateControl(input, control) {
            if (!input || !control) {
                return;
            }

            control.classList.toggle('is-empty', !input.value);
        }

        function setSearchError(message) {
            if (heroSearchError) {
                heroSearchError.textContent = message || '';
            }
        }

        function setBookingPanelState(isOpen, options) {
            const shouldFocusStart = options && options.focusStart;
            const shouldRestoreFocus = options && options.restoreFocus;

            if (heroBookingLauncher) {
                heroBookingLauncher.hidden = isOpen;
            }

            if (heroBookingPanel) {
                heroBookingPanel.hidden = !isOpen;
            }

            if (heroSection) {
                heroSection.classList.toggle('is-booking-open', isOpen);
            }

            if (heroBookingReveal) {
                heroBookingReveal.setAttribute('aria-expanded', String(isOpen));
            }

            if (isOpen && shouldFocusStart && heroStartDateInput) {
                window.setTimeout(() => {
                    heroStartDateInput.focus({ preventScroll: true });
                }, 60);
            }

            if (!isOpen && shouldRestoreFocus && heroBookingReveal) {
                heroBookingReveal.focus({ preventScroll: true });
            }
        }

        function getIntent() {
            return {
                startDate: heroStartDateInput ? heroStartDateInput.value : '',
                endDate: heroEndDateInput ? heroEndDateInput.value : '',
                pickupTime: defaultTime,
                dropoffTime: defaultTime,
                vehiclePreference: heroVehiclePreference ? heroVehiclePreference.value : 'all'
            };
        }

        function isIntentComplete(intent) {
            return !!(intent && intent.startDate && intent.endDate);
        }

        function isIntentValid(intent) {
            if (!isIntentComplete(intent)) {
                return false;
            }

            return new Date(`${intent.endDate}T00:00:00`) > new Date(`${intent.startDate}T00:00:00`);
        }

        function persistIntent(intent) {
            if (!isIntentComplete(intent)) {
                return;
            }

            try {
                window.sessionStorage.setItem(bookingIntentKey, JSON.stringify({
                    ...intent,
                    createdAt: Date.now()
                }));
            } catch (error) {
                console.warn('Could not persist booking intent:', error);
            }
        }

        function readStoredIntent() {
            try {
                const raw = window.sessionStorage.getItem(bookingIntentKey);
                if (!raw) {
                    return null;
                }

                const parsed = JSON.parse(raw);
                if (!parsed || !parsed.createdAt || Date.now() - parsed.createdAt > maxAge) {
                    window.sessionStorage.removeItem(bookingIntentKey);
                    return null;
                }

                return parsed;
            } catch (error) {
                return null;
            }
        }

        function updateReserveLinks(intent) {
            reserveLinks.forEach((link) => {
                const baseHref = link.dataset.baseReserveHref || link.getAttribute('href');
                link.dataset.baseReserveHref = baseHref;

                const url = new URL(baseHref, getStorageOrigin());
                ['startDate', 'endDate', 'pickupTime', 'dropoffTime'].forEach((param) => {
                    url.searchParams.delete(param);
                });

                if (isIntentComplete(intent)) {
                    url.searchParams.set('startDate', intent.startDate);
                    url.searchParams.set('endDate', intent.endDate);
                    url.searchParams.set('pickupTime', intent.pickupTime || defaultTime);
                    url.searchParams.set('dropoffTime', intent.dropoffTime || defaultTime);
                }

                link.setAttribute('href', `${url.pathname}${url.search}${url.hash}`);
            });
        }

        function updateFleetIntentBanner(intent) {
            if (!fleetIntentBanner || !fleetIntentValue || !fleetIntentCopy) {
                return;
            }

            if (!isIntentComplete(intent)) {
                fleetIntentBanner.hidden = true;
                return;
            }

            const filterLabel = heroVehiclePreference && heroVehiclePreference.value !== 'all'
                ? heroVehiclePreference.options[heroVehiclePreference.selectedIndex].text
                : 'All cars';

            const dateLabel = `${formatIntentDate(intent.startDate)} - ${formatIntentDate(intent.endDate)}`;
            fleetIntentValue.textContent = filterLabel === 'All cars'
                ? dateLabel
                : `${dateLabel} | ${filterLabel}`;
            fleetIntentCopy.textContent = filterLabel === 'All cars'
                ? 'Featured models below now carry your selected dates into checkout.'
                : `You are viewing the fleet with ${filterLabel.toLowerCase()} already in focus.`;
            fleetIntentBanner.hidden = false;
        }

        function cardMatchesPreference(card, preference) {
            if (!preference || preference === 'all') {
                return true;
            }

            return card.dataset.brand === preference || card.dataset.vehicleType === preference;
        }

        function applyFleetPreference(intent) {
            const preference = intent && intent.vehiclePreference ? intent.vehiclePreference : 'all';

            fleetCards.forEach((card) => {
                card.hidden = !cardMatchesPreference(card, preference);
            });
        }

        function applyIntent(intent, options) {
            const shouldScroll = options && options.scroll;

            if (heroStartDateInput && intent.startDate) {
                heroStartDateInput.value = intent.startDate;
            }
            if (heroEndDateInput && intent.endDate) {
                heroEndDateInput.value = intent.endDate;
            }
            if (heroVehiclePreference && intent.vehiclePreference) {
                heroVehiclePreference.value = intent.vehiclePreference;
            }

            syncDateControl(heroStartDateInput, heroStartDateControl);
            syncDateControl(heroEndDateInput, heroEndDateControl);
            updateReserveLinks(intent);
            updateFleetIntentBanner(intent);
            applyFleetPreference(intent);
            setBookingPanelState(isIntentComplete(intent), { focusStart: false });

            if (shouldScroll && fleetSection) {
                fleetSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }
        }

        const todayValue = getTodayInputValue();
        if (heroStartDateInput) {
            heroStartDateInput.min = todayValue;
        }
        if (heroEndDateInput) {
            heroEndDateInput.min = todayValue;
        }

        syncDateControl(heroStartDateInput, heroStartDateControl);
        syncDateControl(heroEndDateInput, heroEndDateControl);

        if (heroStartDateInput && heroEndDateInput) {
            const syncMinimumEndDate = () => {
                heroEndDateInput.min = heroStartDateInput.value || todayValue;
                if (heroEndDateInput.value && heroStartDateInput.value && heroEndDateInput.value < heroStartDateInput.value) {
                    heroEndDateInput.value = heroStartDateInput.value;
                }
                syncDateControl(heroEndDateInput, heroEndDateControl);
            };

            heroStartDateInput.addEventListener('change', () => {
                syncDateControl(heroStartDateInput, heroStartDateControl);
                syncMinimumEndDate();
            });

            heroEndDateInput.addEventListener('change', () => {
                syncDateControl(heroEndDateInput, heroEndDateControl);
            });

            syncMinimumEndDate();
        }

        if (heroVehiclePreference) {
            heroVehiclePreference.addEventListener('change', () => {
                const intent = getIntent();
                applyFleetPreference(intent);
                updateFleetIntentBanner(intent);
                updateReserveLinks(intent);
            });
        }

        if (heroBookingReveal) {
            heroBookingReveal.addEventListener('click', () => {
                if (window.location.hash !== '#booking') {
                    window.history.replaceState(null, '', '#booking');
                }
                setBookingPanelState(true, { focusStart: true });
            });
        }

        if (heroBookingBack) {
            heroBookingBack.addEventListener('click', () => {
                if (window.location.hash === '#booking') {
                    window.history.replaceState(null, '', window.location.pathname + window.location.search);
                }
                setBookingPanelState(false, { restoreFocus: true });
            });
        }

        if (heroAvailabilityForm) {
            heroAvailabilityForm.addEventListener('submit', (event) => {
                event.preventDefault();

                const intent = getIntent();
                if (!isIntentComplete(intent)) {
                    setSearchError('Choose delivery and return dates first.');
                    return;
                }

                if (!isIntentValid(intent)) {
                    setSearchError('Return date must be after the delivery date.');
                    return;
                }

                setSearchError('');
                persistIntent(intent);
                applyIntent(intent, { scroll: true });
            });
        }

        const shouldOpenFromQuery = new URLSearchParams(window.location.search).get('booking') === 'open';
        const storedIntent = readStoredIntent();
        if (storedIntent && isIntentValid(storedIntent)) {
            applyIntent(storedIntent, { scroll: false });
        } else {
            setBookingPanelState(false);
            const freshIntent = getIntent();
            updateReserveLinks(freshIntent);
            updateFleetIntentBanner(freshIntent);
            applyFleetPreference(freshIntent);
        }

        if (shouldOpenFromQuery) {
            setBookingPanelState(true);
        }

        if (window.location.hash === '#booking' && !heroStartDateInput?.value && !heroEndDateInput?.value) {
            setBookingPanelState(true);
            window.requestAnimationFrame(() => {
                window.scrollTo({ top: 0, left: 0, behavior: 'auto' });
            });
        }
    }

    window.DynastyHomeBooking = {
        init
    };
})();
