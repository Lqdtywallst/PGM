(function () {
    function escapeHtml(value) {
        return String(value)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;');
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

    function setStatus(statusElement, type, message) {
        if (!statusElement) {
            return;
        }

        const safeMessage = escapeHtml(message || '');

        if (statusElement.classList.contains('status')) {
            statusElement.className = `status${type ? ` ${type}` : ''}`;
            statusElement.textContent = message || '';
            return;
        }

        if (!type) {
            statusElement.innerHTML = safeMessage;
            return;
        }

        const paragraphClass = type === 'success' ? 'success-message' : 'error-message';
        statusElement.innerHTML = `<p class="${paragraphClass}">${safeMessage}</p>`;
    }

    async function handleSubmit(event) {
        event.preventDefault();

        const form = event.target;
        const statusElement = document.getElementById('contactFormStatus');
        const submitButton = form.querySelector('button[type="submit"]');

        const payload = {
            name: document.getElementById('contactName')?.value.trim() || '',
            email: document.getElementById('contactEmail')?.value.trim() || '',
            phone: document.getElementById('contactPhone')?.value.trim() || '',
            subject: document.getElementById('contactSubject')?.value || '',
            message: document.getElementById('contactMessage')?.value.trim() || ''
        };

        if (!payload.name || !payload.email || !payload.subject || !payload.message) {
            setStatus(statusElement, 'error', 'Please complete all required fields.');
            return;
        }

        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(payload.email)) {
            setStatus(statusElement, 'error', 'Please enter a valid email address.');
            return;
        }

        const backendUrl = getBackendBaseUrl();
        if (!backendUrl) {
            setStatus(statusElement, 'error', 'This contact form is not ready yet. Please use WhatsApp and the team will help.');
            return;
        }

        if (submitButton) {
            submitButton.disabled = true;
            submitButton.dataset.originalText = submitButton.dataset.originalText || submitButton.textContent;
            submitButton.textContent = 'Sending...';
        }

        setStatus(statusElement, '', 'Sending message...');

        try {
            const response = await fetch(`${backendUrl}/api/contact`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(payload)
            });

            const data = await response.json().catch(() => ({}));

            if (!response.ok || !data.success) {
                const errorMessage = data.error || `Request failed with status ${response.status}`;
                throw new Error(errorMessage);
            }

            setStatus(
                statusElement,
                'success',
                data.message || 'Message sent successfully. We will respond soon.'
            );
            form.reset();
        } catch (error) {
            const backendIsLocal = isLocalBackendUrl(backendUrl);
            const message = error && error.message ? error.message : 'There was an error sending the message.';

            if (backendIsLocal && /Failed to fetch|NetworkError|ERR_CONNECTION_REFUSED/i.test(message)) {
                setStatus(
                    statusElement,
                    'error',
                    'We could not reach the contact service right now. Please use WhatsApp and the team will help.'
                );
            } else {
                setStatus(statusElement, 'error', message);
            }
        } finally {
            if (submitButton) {
                submitButton.disabled = false;
                submitButton.textContent = submitButton.dataset.originalText || 'Send message';
            }
        }
    }

    window.DynastyContactForm = {
        getBackendBaseUrl,
        handleSubmit
    };

    window.handleContactSubmit = handleSubmit;
})();
