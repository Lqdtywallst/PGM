const DEFAULT_GOOGLE_REVIEWS_URL = 'https://www.google.com/maps/search/?api=1&query=Dynasty%20Prestige%20Luxury%20Car%20Rental%20Dubai';
const DEFAULT_CACHE_TTL_MS = 6 * 60 * 60 * 1000;
const MAX_REVIEW_TEXT_LENGTH = 420;

let cachedGoogleReviews = null;
let cachedUntil = 0;

function cleanText(value) {
    return String(value || '')
        .replace(/\s+/g, ' ')
        .trim();
}

function parsePositiveNumber(value) {
    const parsed = Number.parseFloat(String(value || '').replace(/[^0-9.]+/g, ''));
    return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
}

function parseCacheTtl(value) {
    const parsed = Number.parseInt(String(value || ''), 10);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : DEFAULT_CACHE_TTL_MS;
}

function truncateReviewText(value) {
    const text = cleanText(value);

    if (text.length <= MAX_REVIEW_TEXT_LENGTH) {
        return text;
    }

    return `${text.slice(0, MAX_REVIEW_TEXT_LENGTH - 1).trim()}...`;
}

function getGoogleReviewsConfig(env = process.env) {
    const placeId = cleanText(
        env.GOOGLE_PLACE_ID ||
        env.GOOGLE_MAPS_PLACE_ID ||
        env.GOOGLE_BUSINESS_PLACE_ID
    );
    const apiKey = cleanText(env.GOOGLE_PLACES_API_KEY || env.GOOGLE_MAPS_API_KEY);
    const reviewsUrl = cleanText(env.GOOGLE_REVIEWS_URL || env.GOOGLE_MAPS_URL) ||
        (placeId
            ? `https://www.google.com/maps/search/?api=1&query=Dynasty%20Prestige%20Dubai&query_place_id=${encodeURIComponent(placeId)}`
            : DEFAULT_GOOGLE_REVIEWS_URL);
    const writeReviewUrl = cleanText(env.GOOGLE_WRITE_REVIEW_URL) ||
        (placeId ? `https://search.google.com/local/writereview?placeid=${encodeURIComponent(placeId)}` : reviewsUrl);

    return {
        apiKey,
        placeId,
        reviewsUrl,
        writeReviewUrl,
        cacheTtlMs: parseCacheTtl(env.GOOGLE_REVIEWS_CACHE_TTL_MS)
    };
}

function buildGoogleReviewsUnavailablePayload(config = getGoogleReviewsConfig(), reason = 'not_configured') {
    return {
        success: false,
        configured: false,
        source: 'google_places',
        reason,
        place: {
            name: 'Dynasty Prestige',
            rating: null,
            totalReviews: null,
            reviewsUrl: config.reviewsUrl || DEFAULT_GOOGLE_REVIEWS_URL,
            writeReviewUrl: config.writeReviewUrl || config.reviewsUrl || DEFAULT_GOOGLE_REVIEWS_URL,
            fetchedAt: new Date().toISOString()
        },
        reviews: [],
        message: 'Google reviews are shown only when they can be loaded from the official Google Business profile.'
    };
}

function normalizeGoogleReview(review) {
    const authorName = cleanText(review.author_name || review.authorAttribution?.displayName) || 'Google reviewer';
    const profileUrl = cleanText(review.author_url || review.authorAttribution?.uri);
    const profilePhotoUrl = cleanText(review.profile_photo_url || review.authorAttribution?.photoUri);
    const rating = parsePositiveNumber(review.rating);
    const textSource = typeof review.text === 'object' && review.text !== null ? review.text.text : review.text;
    const timestamp = Number.isFinite(review.time) ? new Date(review.time * 1000).toISOString() : null;

    return {
        authorName,
        rating,
        text: truncateReviewText(textSource),
        relativeTimeDescription: cleanText(review.relative_time_description || review.publishTime),
        language: cleanText(review.language),
        profileUrl,
        profilePhotoUrl,
        time: timestamp
    };
}

function normalizeGooglePlaceDetails(data, config = getGoogleReviewsConfig(), fetchedAt = new Date().toISOString()) {
    const result = data?.result || data || {};
    const reviews = Array.isArray(result.reviews) ? result.reviews.map(normalizeGoogleReview) : [];

    return {
        success: true,
        configured: true,
        source: 'google_places',
        place: {
            name: cleanText(result.name) || 'Dynasty Prestige',
            rating: parsePositiveNumber(result.rating),
            totalReviews: parsePositiveNumber(result.user_ratings_total),
            reviewsUrl: cleanText(result.url) || config.reviewsUrl || DEFAULT_GOOGLE_REVIEWS_URL,
            writeReviewUrl: config.writeReviewUrl || config.reviewsUrl || DEFAULT_GOOGLE_REVIEWS_URL,
            fetchedAt
        },
        reviews,
        message: reviews.length
            ? 'Google reviews loaded from the official Google Business profile.'
            : 'Google returned the business profile but no review text for display.'
    };
}

function buildGooglePlaceDetailsUrl(config) {
    const params = new URLSearchParams({
        place_id: config.placeId,
        fields: 'name,rating,user_ratings_total,reviews,url',
        reviews_sort: 'newest',
        key: config.apiKey
    });

    return `https://maps.googleapis.com/maps/api/place/details/json?${params.toString()}`;
}

async function fetchGoogleReviews(options = {}) {
    const config = options.config || getGoogleReviewsConfig(options.env);
    const now = Date.now();

    if (!config.apiKey || !config.placeId) {
        return buildGoogleReviewsUnavailablePayload(config, 'not_configured');
    }

    if (!options.bypassCache && cachedGoogleReviews && cachedUntil > now) {
        return cachedGoogleReviews;
    }

    const fetchImpl = options.fetchImpl || global.fetch;

    if (typeof fetchImpl !== 'function') {
        return buildGoogleReviewsUnavailablePayload(config, 'fetch_unavailable');
    }

    const response = await fetchImpl(buildGooglePlaceDetailsUrl(config), {
        headers: {
            Accept: 'application/json'
        }
    });

    if (!response.ok) {
        const payload = buildGoogleReviewsUnavailablePayload(config, `google_http_${response.status}`);
        payload.status = response.status;
        return payload;
    }

    const data = await response.json();

    if (data.status && data.status !== 'OK') {
        const payload = buildGoogleReviewsUnavailablePayload(config, `google_${String(data.status).toLowerCase()}`);
        payload.googleStatus = data.status;
        payload.errorMessage = cleanText(data.error_message);
        return payload;
    }

    const payload = normalizeGooglePlaceDetails(data, config);
    cachedGoogleReviews = payload;
    cachedUntil = now + config.cacheTtlMs;
    return payload;
}

function clearGoogleReviewsCache() {
    cachedGoogleReviews = null;
    cachedUntil = 0;
}

module.exports = {
    DEFAULT_GOOGLE_REVIEWS_URL,
    buildGooglePlaceDetailsUrl,
    buildGoogleReviewsUnavailablePayload,
    clearGoogleReviewsCache,
    fetchGoogleReviews,
    getGoogleReviewsConfig,
    normalizeGooglePlaceDetails,
    normalizeGoogleReview
};
