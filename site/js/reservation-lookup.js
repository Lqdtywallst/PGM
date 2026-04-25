(function initReservationLookup() {
    const form = document.querySelector('[data-reservation-lookup-form]');
    const statusElement = document.getElementById('reservationLookupStatus');
    const resultElement = document.getElementById('reservationLookupResult');

    if (!form || !statusElement || !resultElement) {
        return;
    }

    function escapeHtml(value) {
        return String(value ?? '')
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;');
    }

    function normalizeValue(value) {
        return String(value || '').replace(/\s+/g, ' ').trim();
    }

    function getBackendBaseUrl() {
        if (typeof window.getBackendUrl === 'function') {
            return window.getBackendUrl();
        }

        if (typeof window.getConfiguredBackendUrl === 'function') {
            return window.getConfiguredBackendUrl();
        }

        if (typeof window.BACKEND_URL === 'string' && window.BACKEND_URL.trim()) {
            return window.BACKEND_URL.trim();
        }

        if (window.STRIPE_CONFIG && typeof window.STRIPE_CONFIG.backendUrl === 'string') {
            return window.STRIPE_CONFIG.backendUrl.trim();
        }

        return '';
    }

    function isLocalBackendUrl(url) {
        return typeof url === 'string' && (url.includes('localhost') || url.includes('127.0.0.1'));
    }

    function setStatus(type, message) {
        statusElement.className = `lookup-status${type ? ` is-${type}` : ''}`;
        statusElement.textContent = message || '';
    }

    function formatDate(value) {
        const normalized = normalizeValue(value);
        if (!/^\d{4}-\d{2}-\d{2}/.test(normalized)) {
            return normalized || 'To be confirmed';
        }

        const date = new Date(`${normalized.slice(0, 10)}T00:00:00`);
        return new Intl.DateTimeFormat('en-GB', {
            day: '2-digit',
            month: 'short',
            year: 'numeric'
        }).format(date);
    }

    function formatDateRange(reservation) {
        const startDate = formatDate(reservation.startDate);
        const endDate = formatDate(reservation.endDate);
        const pickupTime = normalizeValue(reservation.pickupTime);
        const dropoffTime = normalizeValue(reservation.dropoffTime);

        if (startDate === 'To be confirmed' && endDate === 'To be confirmed') {
            return 'Dates to be confirmed';
        }

        return [
            `${startDate}${pickupTime ? `, ${pickupTime}` : ''}`,
            `${endDate}${dropoffTime ? `, ${dropoffTime}` : ''}`
        ].join(' to ');
    }

    function detail(label, value) {
        const safeValue = normalizeValue(value) || 'To be confirmed';
        return `
            <div class="lookup-detail">
                <strong>${escapeHtml(label)}</strong>
                <span>${escapeHtml(safeValue)}</span>
            </div>
        `;
    }

    function buildWhatsAppUrl(reservationId) {
        const message = `Hi, I would like help with my Dynasty Prestige reservation ${reservationId || ''}.`;
        return `https://wa.me/971586122568?text=${encodeURIComponent(message.trim())}`;
    }

    function renderResult(reservation) {
        const reservationId = normalizeValue(reservation.reservationId);
        const vehicle = normalizeValue(reservation.vehicle) || 'Vehicle to be confirmed';
        const statusLabel = normalizeValue(reservation.statusLabel) || 'In review';
        const nextStep = normalizeValue(reservation.nextStep) || 'The team will confirm the next step with you.';
        const whatsappUrl = buildWhatsAppUrl(reservationId);

        resultElement.hidden = false;
        resultElement.innerHTML = `
            <article class="lookup-result-card" aria-label="Reservation summary">
                <p class="lookup-result-card__eyebrow">${escapeHtml(statusLabel)}</p>
                <h3>${escapeHtml(vehicle)}</h3>
                <p class="lookup-result-card__meta">Reservation ${escapeHtml(reservationId || 'matched')}</p>
                <div class="lookup-detail-grid">
                    ${detail('Dates', formatDateRange(reservation))}
                    ${detail('Duration', reservation.durationLabel)}
                    ${detail('Pickup', reservation.pickupLocationSummary)}
                    ${detail('Payment status', reservation.paymentStatus || reservation.status)}
                    ${detail('Total', reservation.totalDisplay)}
                    ${detail('Remaining', reservation.remainingDisplay)}
                </div>
                <p class="lookup-result-card__next">${escapeHtml(nextStep)}</p>
                <div class="lookup-result-card__actions">
                    <a class="contact-button contact-button--whatsapp" href="${escapeHtml(whatsappUrl)}" target="_blank" rel="noopener">WhatsApp the team</a>
                    <a class="contact-button contact-button--secondary" href="./app/reserve/page.html">Start a new reservation</a>
                </div>
            </article>
        `;
    }

    function clearResult() {
        resultElement.hidden = true;
        resultElement.innerHTML = '';
    }

    form.addEventListener('submit', async (event) => {
        event.preventDefault();
        clearResult();

        const submitButton = form.querySelector('button[type="submit"]');
        const payload = {
            reservationId: normalizeValue(form.elements.reservationId?.value),
            email: normalizeValue(form.elements.email?.value)
        };

        if (!payload.reservationId || !payload.email) {
            setStatus('error', 'Enter your reservation ID and booking email.');
            return;
        }

        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(payload.email)) {
            setStatus('error', 'Enter a valid booking email.');
            return;
        }

        const backendUrl = getBackendBaseUrl();
        if (!backendUrl) {
            setStatus('error', 'Reservation lookup is not configured yet. WhatsApp the team and they will help.');
            return;
        }

        if (submitButton) {
            submitButton.disabled = true;
            submitButton.dataset.originalText = submitButton.dataset.originalText || submitButton.textContent;
            submitButton.textContent = 'Checking...';
        }

        setStatus('', 'Checking your reservation...');

        try {
            const response = await fetch(`${backendUrl}/api/reserve/lookup`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(payload)
            });

            const data = await response.json().catch(() => ({}));

            if (!response.ok || !data.success || !data.reservation) {
                throw new Error(data.error || 'We could not match those details. Check the reservation ID and email, or WhatsApp the team.');
            }

            setStatus('success', 'Reservation found.');
            renderResult(data.reservation);
        } catch (error) {
            const message = error && error.message ? error.message : 'Reservation lookup is temporarily unavailable.';

            if (isLocalBackendUrl(backendUrl) && /Failed to fetch|NetworkError|ERR_CONNECTION_REFUSED/i.test(message)) {
                setStatus('error', 'We could not reach the reservation lookup service right now. Please use WhatsApp and the team will help.');
            } else {
                setStatus('error', message);
            }
        } finally {
            if (submitButton) {
                submitButton.disabled = false;
                submitButton.textContent = submitButton.dataset.originalText || 'Find booking';
            }
        }
    });
}());
