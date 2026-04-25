const DEFAULT_PRICING_POLICY = Object.freeze({
    currency: 'AED',
    lookaheadDays: 30,
    recentDemandDays: 14,
    priceStep: 50,
    undercutPct: 0.025,
    maxChangePct: 0.08,
    minEffectiveChange: 25,
    staleCompetitorDays: 14,
    requireFreshCompetitorsForApply: true,
    defaultUnits: 1,
    defaultFloorPct: 0.78,
    defaultCeilingPct: 1.35,
    demand: Object.freeze({
        lowUtilizationPct: 0.15,
        highUtilizationPct: 0.55,
        veryHighUtilizationPct: 0.75,
        lowDemandAdjustmentPct: -0.03,
        highDemandAdjustmentPct: 0.04,
        veryHighDemandAdjustmentPct: 0.08,
        recentBookingBoostPct: 0.02,
        unavailableCompetitorBoostPct: 0.03
    })
});

function normalizeText(value = '') {
    return String(value || '')
        .replace(/&amp;/g, '&')
        .replace(/[^a-z0-9]+/gi, ' ')
        .replace(/\s+/g, ' ')
        .trim()
        .toLowerCase();
}

function parseMoneyValue(value) {
    if (value === undefined || value === null || value === '') {
        return null;
    }

    const numeric = typeof value === 'number'
        ? value
        : Number.parseFloat(String(value).replace(/[^0-9.-]+/g, ''));

    return Number.isFinite(numeric) ? numeric : null;
}

function toDate(value) {
    if (!value) {
        return null;
    }

    const date = value instanceof Date ? value : new Date(String(value));
    return Number.isNaN(date.getTime()) ? null : date;
}

function dateOnly(date) {
    const parsed = toDate(date);
    if (!parsed) {
        return null;
    }

    return new Date(Date.UTC(parsed.getUTCFullYear(), parsed.getUTCMonth(), parsed.getUTCDate()));
}

function addDays(date, days) {
    const next = new Date(date.getTime());
    next.setUTCDate(next.getUTCDate() + Number(days || 0));
    return next;
}

function daysBetween(start, end) {
    const startDate = dateOnly(start);
    const endDate = dateOnly(end);
    if (!startDate || !endDate) {
        return 0;
    }

    return Math.max(0, Math.ceil((endDate - startDate) / (24 * 60 * 60 * 1000)));
}

function overlapDays(start, end, windowStart, windowEnd) {
    const startDate = dateOnly(start);
    const endDate = dateOnly(end);
    if (!startDate || !endDate || endDate <= startDate) {
        return 0;
    }

    const overlapStart = new Date(Math.max(startDate.getTime(), windowStart.getTime()));
    const overlapEnd = new Date(Math.min(endDate.getTime(), windowEnd.getTime()));
    return daysBetween(overlapStart, overlapEnd);
}

function clamp(value, min, max) {
    return Math.min(Math.max(value, min), max);
}

function roundToStep(value, step = 50) {
    const numericStep = Number(step) > 0 ? Number(step) : 50;
    return Math.round(Number(value || 0) / numericStep) * numericStep;
}

function median(values = []) {
    const sorted = values
        .map(Number)
        .filter(Number.isFinite)
        .sort((left, right) => left - right);

    if (sorted.length === 0) {
        return null;
    }

    const middle = Math.floor(sorted.length / 2);
    return sorted.length % 2 === 0
        ? (sorted[middle - 1] + sorted[middle]) / 2
        : sorted[middle];
}

function mergePolicy(policy = {}) {
    return {
        ...DEFAULT_PRICING_POLICY,
        ...(policy.global || {}),
        ...policy,
        demand: {
            ...DEFAULT_PRICING_POLICY.demand,
            ...(policy.global?.demand || {}),
            ...(policy.demand || {})
        },
        vehicles: {
            ...(policy.vehicles || {})
        }
    };
}

function vehicleAliases(card = {}) {
    return [
        card.id,
        card.copy?.title,
        `${card.brand || ''} ${card.copy?.title || ''}`,
        String(card.href || '').replace(/^\.\//, '').replace(/\.html$/i, '').replace(/-/g, ' ')
    ].map(normalizeText).filter(Boolean);
}

function matchVehicleId(value, fleetCards = []) {
    const normalized = normalizeText(value);
    if (!normalized) {
        return '';
    }

    const exact = fleetCards.find((card) => vehicleAliases(card).includes(normalized));
    if (exact) {
        return exact.id;
    }

    const fuzzy = fleetCards.find((card) => vehicleAliases(card).some((alias) => (
        alias.includes(normalized) || normalized.includes(alias)
    )));

    return fuzzy?.id || '';
}

function normalizeReservationForPricing(record = {}, fleetCards = []) {
    const reservationData = record.reservationData || {};
    const payment = record.payment || record.paymentData || {};
    const vehicleId = reservationData.vehicleId ||
        reservationData.carId ||
        matchVehicleId(reservationData.car || record.car, fleetCards);
    const startDate = reservationData.startDate || record.startDate || record.start_date;
    const endDate = reservationData.endDate || record.endDate || record.end_date;
    const createdAt = record.createdAt || record.created_at || record.updatedAt || record.updated_at;
    const status = normalizeText(record.status || payment.status || 'received');

    if (!vehicleId || !toDate(startDate) || !toDate(endDate)) {
        return null;
    }

    if (/cancel|failed|expired|refunded/i.test(status)) {
        return null;
    }

    return {
        vehicleId,
        startDate,
        endDate,
        createdAt,
        status
    };
}

function normalizeCompetitorSnapshot(snapshot = {}, fleetCards = [], now = new Date()) {
    const sourceEntries = [
        ...(Array.isArray(snapshot.prices) ? snapshot.prices : []),
        ...(Array.isArray(snapshot.competitors) ? snapshot.competitors : []),
        ...Object.entries(snapshot.vehicles || {}).flatMap(([vehicleId, entries]) => (
            Array.isArray(entries)
                ? entries.map((entry) => ({ ...entry, vehicleId }))
                : []
        ))
    ];
    const normalizedNow = toDate(now) || new Date();

    return sourceEntries
        .map((entry) => {
            const price = parseMoneyValue(entry.dailyPrice ?? entry.pricePerDay ?? entry.price);
            const vehicleId = entry.vehicleId || entry.carId || matchVehicleId(entry.vehicle || entry.vehicleLabel || entry.car || entry.model, fleetCards);
            const capturedAt = toDate(entry.capturedAt || entry.updatedAt || snapshot.generatedAt);
            const ageDays = capturedAt ? Math.max(0, (normalizedNow - capturedAt) / (24 * 60 * 60 * 1000)) : null;
            const availability = normalizeText(entry.availability || entry.status || 'available');

            return {
                vehicleId,
                company: String(entry.company || entry.competitor || 'Unknown competitor').trim(),
                dailyPrice: price,
                capturedAt: capturedAt ? capturedAt.toISOString() : '',
                ageDays,
                available: !/unavailable|sold|booked|not available/i.test(availability),
                source: String(entry.source || entry.url || snapshot.source || 'manual').trim(),
                url: String(entry.url || '').trim()
            };
        })
        .filter((entry) => entry.vehicleId && Number.isFinite(entry.dailyPrice) && entry.dailyPrice > 0);
}

function buildDemandProfiles({ reservations = [], fleetCards = [], policy = {}, now = new Date() } = {}) {
    const mergedPolicy = mergePolicy(policy);
    const normalizedNow = dateOnly(now) || dateOnly(new Date());
    const windowEnd = addDays(normalizedNow, mergedPolicy.lookaheadDays);
    const recentWindowStart = addDays(normalizedNow, -mergedPolicy.recentDemandDays);
    const normalizedReservations = reservations
        .map((record) => normalizeReservationForPricing(record, fleetCards))
        .filter(Boolean);

    return Object.fromEntries(fleetCards.map((card) => {
        const vehiclePolicy = mergedPolicy.vehicles?.[card.id] || {};
        const units = Number(vehiclePolicy.units || mergedPolicy.defaultUnits || 1);
        const matchingReservations = normalizedReservations.filter((reservation) => reservation.vehicleId === card.id);
        const reservedDays = matchingReservations.reduce((sum, reservation) => (
            sum + overlapDays(reservation.startDate, reservation.endDate, normalizedNow, windowEnd)
        ), 0);
        const recentBookings = matchingReservations.filter((reservation) => {
            const createdAt = dateOnly(reservation.createdAt);
            return createdAt && createdAt >= recentWindowStart && createdAt <= normalizedNow;
        }).length;
        const capacityDays = Math.max(1, units * mergedPolicy.lookaheadDays);
        const utilizationPct = clamp(reservedDays / capacityDays, 0, 1);

        return [card.id, {
            vehicleId: card.id,
            units,
            lookaheadDays: mergedPolicy.lookaheadDays,
            totalReservations: normalizedReservations.length,
            reservedDays,
            capacityDays,
            utilizationPct,
            recentBookings,
            futureReservations: matchingReservations.length
        }];
    }));
}

function demandAdjustmentFor(profile = {}, policy = {}) {
    const demand = mergePolicy(policy).demand;
    let adjustmentPct = 0;
    const reasons = [];

    if (Number(profile.totalReservations || 0) === 0) {
        return {
            adjustmentPct: 0,
            reasons: ['no own reservation history available yet']
        };
    }

    if (profile.utilizationPct >= demand.veryHighUtilizationPct) {
        adjustmentPct += demand.veryHighDemandAdjustmentPct;
        reasons.push(`very high utilization (${Math.round(profile.utilizationPct * 100)}%)`);
    } else if (profile.utilizationPct >= demand.highUtilizationPct) {
        adjustmentPct += demand.highDemandAdjustmentPct;
        reasons.push(`high utilization (${Math.round(profile.utilizationPct * 100)}%)`);
    } else if (profile.utilizationPct <= demand.lowUtilizationPct) {
        adjustmentPct += demand.lowDemandAdjustmentPct;
        reasons.push(`soft utilization (${Math.round(profile.utilizationPct * 100)}%)`);
    } else {
        reasons.push(`stable utilization (${Math.round(profile.utilizationPct * 100)}%)`);
    }

    if (profile.recentBookings > 0) {
        adjustmentPct += demand.recentBookingBoostPct;
        reasons.push(`${profile.recentBookings} recent booking signal(s)`);
    }

    return {
        adjustmentPct,
        reasons
    };
}

function competitorStatsForVehicle(entries = [], vehicleId, policy = {}, now = new Date()) {
    const mergedPolicy = mergePolicy(policy);
    const normalizedNow = toDate(now) || new Date();
    const vehicleEntries = entries.filter((entry) => entry.vehicleId === vehicleId);
    const freshEntries = vehicleEntries.filter((entry) => (
        entry.ageDays === null ||
        entry.ageDays <= Number(mergedPolicy.staleCompetitorDays)
    ));
    const availableEntries = freshEntries.filter((entry) => entry.available);
    const availablePrices = availableEntries.map((entry) => entry.dailyPrice);
    const unavailableCount = freshEntries.filter((entry) => !entry.available).length;
    const oldestFreshAgeDays = freshEntries.reduce((maxAge, entry) => (
        Math.max(maxAge, Number(entry.ageDays || 0))
    ), 0);

    return {
        generatedAt: normalizedNow.toISOString(),
        totalSamples: vehicleEntries.length,
        freshSamples: freshEntries.length,
        availableSamples: availableEntries.length,
        unavailableSamples: unavailableCount,
        lowestAvailablePrice: availablePrices.length ? Math.min(...availablePrices) : null,
        medianAvailablePrice: median(availablePrices),
        companies: [...new Set(availableEntries.map((entry) => entry.company).filter(Boolean))],
        oldestFreshAgeDays: Math.round(oldestFreshAgeDays * 10) / 10
    };
}

function recommendPriceForVehicle({ card, demandProfile, competitorStats, policy = {} } = {}) {
    const mergedPolicy = mergePolicy(policy);
    const vehiclePolicy = mergedPolicy.vehicles?.[card.id] || {};
    const currentPrice = Number(card.pricePerDay);
    const floor = Number(vehiclePolicy.floor || Math.round(currentPrice * mergedPolicy.defaultFloorPct));
    const ceiling = Number(vehiclePolicy.ceiling || Math.round(currentPrice * mergedPolicy.defaultCeilingPct));
    const maxChangePct = Number(vehiclePolicy.maxChangePct || mergedPolicy.maxChangePct);
    const undercutPct = Number(vehiclePolicy.undercutPct || mergedPolicy.undercutPct);
    const priceStep = Number(vehiclePolicy.priceStep || mergedPolicy.priceStep);
    const reasons = [];
    const demandSignal = demandAdjustmentFor(demandProfile, mergedPolicy);
    let candidate = currentPrice * (1 + demandSignal.adjustmentPct);

    reasons.push(...demandSignal.reasons);

    if (competitorStats?.lowestAvailablePrice) {
        const competitorTarget = competitorStats.lowestAvailablePrice * (1 - undercutPct);
        reasons.push(`fresh competitor floor ${Math.round(competitorStats.lowestAvailablePrice)} AED`);
        reasons.push(`targeting ${Math.round(undercutPct * 1000) / 10}% better than lowest comparable offer`);

        if (currentPrice > competitorTarget) {
            candidate = Math.min(candidate, competitorTarget);
        } else if (currentPrice < competitorTarget * 0.94) {
            candidate = Math.min(competitorTarget, Math.max(candidate, currentPrice * 1.03));
            reasons.push('current price is safely below market; nudging upward without losing edge');
        } else {
            candidate = Math.min(candidate, competitorTarget);
        }
    } else {
        reasons.push('no fresh competitor sample; using own demand signal only');
    }

    if (competitorStats?.unavailableSamples > competitorStats?.availableSamples) {
        const scarcityBoost = Number(mergedPolicy.demand.unavailableCompetitorBoostPct || 0);
        candidate *= (1 + scarcityBoost);
        reasons.push('competitor supply looks constrained');
    }

    const guardedMin = currentPrice * (1 - maxChangePct);
    const guardedMax = currentPrice * (1 + maxChangePct);
    const bounded = clamp(candidate, Math.max(floor, guardedMin), Math.min(ceiling, guardedMax));
    const rounded = roundToStep(bounded, priceStep);
    const recommendedPrice = Math.abs(rounded - currentPrice) >= Number(mergedPolicy.minEffectiveChange)
        ? rounded
        : currentPrice;
    const delta = recommendedPrice - currentPrice;
    const status = delta === 0 ? 'keep' : 'change';
    const canApply = !mergedPolicy.requireFreshCompetitorsForApply || Number(competitorStats?.freshSamples || 0) > 0;

    return {
        vehicleId: card.id,
        title: card.copy?.title || card.id,
        brand: card.brand || '',
        currentPrice,
        recommendedPrice,
        delta,
        deltaPct: currentPrice ? Math.round((delta / currentPrice) * 10000) / 100 : 0,
        status,
        canApply,
        guardrails: {
            floor,
            ceiling,
            maxChangePct,
            priceStep
        },
        demand: demandProfile,
        competitor: competitorStats,
        reasons
    };
}

function buildPricingReport({ fleetCards = [], reservations = [], competitorSnapshot = {}, policy = {}, now = new Date() } = {}) {
    const mergedPolicy = mergePolicy(policy);
    const competitorEntries = normalizeCompetitorSnapshot(competitorSnapshot, fleetCards, now);
    const demandProfiles = buildDemandProfiles({
        reservations,
        fleetCards,
        policy: mergedPolicy,
        now
    });
    const recommendations = fleetCards.map((card) => recommendPriceForVehicle({
        card,
        demandProfile: demandProfiles[card.id],
        competitorStats: competitorStatsForVehicle(competitorEntries, card.id, mergedPolicy, now),
        policy: mergedPolicy
    }));
    const changed = recommendations.filter((recommendation) => recommendation.status === 'change');

    return {
        generatedAt: (toDate(now) || new Date()).toISOString(),
        currency: mergedPolicy.currency,
        policy: {
            lookaheadDays: mergedPolicy.lookaheadDays,
            recentDemandDays: mergedPolicy.recentDemandDays,
            undercutPct: mergedPolicy.undercutPct,
            maxChangePct: mergedPolicy.maxChangePct,
            requireFreshCompetitorsForApply: mergedPolicy.requireFreshCompetitorsForApply
        },
        summary: {
            vehicleCount: fleetCards.length,
            changedCount: changed.length,
            keepCount: recommendations.length - changed.length,
            competitorSamples: competitorEntries.length,
            vehiclesWithFreshCompetitors: recommendations.filter((entry) => entry.competitor.freshSamples > 0).length,
            applyBlockedCount: changed.filter((entry) => !entry.canApply).length
        },
        recommendations
    };
}

module.exports = {
    DEFAULT_PRICING_POLICY,
    buildDemandProfiles,
    buildPricingReport,
    competitorStatsForVehicle,
    demandAdjustmentFor,
    matchVehicleId,
    normalizeCompetitorSnapshot,
    normalizeReservationForPricing,
    parseMoneyValue,
    recommendPriceForVehicle,
    roundToStep
};
