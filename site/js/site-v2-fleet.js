document.addEventListener("DOMContentLoaded", () => {
    const browser = document.querySelector(".js-fleet-browser");

    if (!browser) {
        return;
    }

    const cards = Array.from(browser.querySelectorAll(".js-fleet-card"));
    const resultsList = browser.querySelector(".js-fleet-grid");
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
    const dateInputs = Array.from(browser.querySelectorAll(".js-fleet-date"));
    const fieldInputs = Array.from(browser.querySelectorAll(".js-fleet-field-input"));
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

    function tokenList(attributeValue) {
        return (attributeValue || "")
            .split(/\s+/)
            .map((token) => token.trim().toLowerCase())
            .filter(Boolean);
    }

    function formatAed(value) {
        return `AED ${Number(value).toLocaleString("en-US")}`;
    }

    function clampPriceState() {
        state.priceMin = Math.max(catalogMin, Math.min(state.priceMin, state.priceMax));
        state.priceMax = Math.min(catalogMax, Math.max(state.priceMax, state.priceMin));
    }

    function syncDateDefaults() {
        if (!dateInputs.length) {
            return;
        }

        const today = new Date();
        const tomorrow = new Date(today);
        tomorrow.setDate(today.getDate() + 1);

        const formatDate = (date) => {
            const year = date.getFullYear();
            const month = String(date.getMonth() + 1).padStart(2, "0");
            const day = String(date.getDate()).padStart(2, "0");
            return `${year}-${month}-${day}`;
        };

        const defaults = [formatDate(today), formatDate(tomorrow)];

        dateInputs.forEach((input, index) => {
            if (!input.value) {
                input.value = defaults[index] || defaults[0];
            }
        });
    }

    function formatFieldValue(input) {
        if (!input.value) {
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

    function syncFieldDisplays() {
        fieldInputs.forEach((input) => {
            const shell = input.parentElement;
            const display = shell ? shell.querySelector(".js-fleet-field-display") : null;

            if (display) {
                display.textContent = formatFieldValue(input);
            }
        });
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
        const price = Number(card.dataset.price);

        const brandMatch = state.brand === "all" || brand === state.brand;
        const typeMatch = state.type === "all" || types.includes(state.type);
        const priceMatch = Number.isFinite(price) && price >= state.priceMin && price <= state.priceMax;

        return brandMatch && typeMatch && priceMatch;
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
    }

    if (brandSelect) {
        brandSelect.addEventListener("change", () => {
            state.brand = brandSelect.value || defaultState.brand;
            render();
        });
    }

    if (typeSelect) {
        typeSelect.addEventListener("change", () => {
            state.type = typeSelect.value || defaultState.type;
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
        });
    });

    fieldInputs.forEach((input) => {
        const sync = () => {
            syncFieldDisplays();
        };

        input.addEventListener("input", sync);
        input.addEventListener("change", sync);
    });

    syncDateDefaults();
    syncFieldDisplays();
    render();
});
