const assert = require('node:assert/strict');
const test = require('node:test');

const {
    buildGooglePlaceDetailsUrl,
    clearGoogleReviewsCache,
    fetchGoogleReviews,
    getGoogleReviewsConfig,
    normalizeGooglePlaceDetails
} = require('../../server/google-reviews');

test('google reviews config supports place id, review URLs and safe defaults', () => {
    const config = getGoogleReviewsConfig({
        GOOGLE_PLACES_API_KEY: 'test-key',
        GOOGLE_PLACE_ID: 'place_123',
        GOOGLE_REVIEWS_URL: 'https://maps.google.com/?cid=123',
        GOOGLE_WRITE_REVIEW_URL: ''
    });

    assert.equal(config.apiKey, 'test-key');
    assert.equal(config.placeId, 'place_123');
    assert.equal(config.reviewsUrl, 'https://maps.google.com/?cid=123');
    assert.equal(config.writeReviewUrl, 'https://search.google.com/local/writereview?placeid=place_123');
    assert.equal(buildGooglePlaceDetailsUrl(config).includes('fields=name%2Crating%2Cuser_ratings_total%2Creviews%2Curl'), true);
});

test('google place details are normalized without leaking api configuration', () => {
    const payload = normalizeGooglePlaceDetails({
        result: {
            name: 'Dynasty Prestige',
            rating: 4.9,
            user_ratings_total: 27,
            url: 'https://maps.google.com/?cid=123',
            reviews: [
                {
                    author_name: 'A Google Guest',
                    rating: 5,
                    text: 'Professional service and clean handover.',
                    relative_time_description: 'a week ago',
                    time: 1770000000
                }
            ]
        }
    }, {
        apiKey: 'secret-key',
        placeId: 'place_123',
        reviewsUrl: 'https://maps.google.com/?cid=123',
        writeReviewUrl: 'https://search.google.com/local/writereview?placeid=place_123'
    }, '2026-05-08T12:00:00.000Z');

    assert.equal(payload.success, true);
    assert.equal(payload.place.rating, 4.9);
    assert.equal(payload.place.totalReviews, 27);
    assert.equal(payload.reviews[0].authorName, 'A Google Guest');
    assert.equal(JSON.stringify(payload).includes('secret-key'), false);
});

test('google reviews fetch returns honest unavailable payload when not configured', async () => {
    clearGoogleReviewsCache();

    const payload = await fetchGoogleReviews({
        env: {},
        fetchImpl: async () => {
            throw new Error('fetch should not be called without config');
        },
        bypassCache: true
    });

    assert.equal(payload.success, false);
    assert.equal(payload.configured, false);
    assert.equal(payload.reviews.length, 0);
    assert.match(payload.message, /official Google Business profile/);
});

test('google reviews fetch reads official API payload when configured', async () => {
    clearGoogleReviewsCache();

    const payload = await fetchGoogleReviews({
        env: {
            GOOGLE_PLACES_API_KEY: 'test-key',
            GOOGLE_PLACE_ID: 'place_123'
        },
        fetchImpl: async (url) => {
            assert.equal(String(url).includes('place_id=place_123'), true);
            return {
                ok: true,
                json: async () => ({
                    status: 'OK',
                    result: {
                        name: 'Dynasty Prestige',
                        rating: 5,
                        user_ratings_total: 3,
                        reviews: [
                            {
                                author_name: 'Verified Guest',
                                rating: 5,
                                text: 'Excellent support.',
                                relative_time_description: '2 days ago'
                            }
                        ]
                    }
                })
            };
        },
        bypassCache: true
    });

    assert.equal(payload.success, true);
    assert.equal(payload.configured, true);
    assert.equal(payload.reviews[0].text, 'Excellent support.');
});
