const {
    sendReservationMobileNotification
} = require('../integrations/mobile-notifications');

function getAdminData(record = {}) {
    const admin = record.reservationData?.admin;
    return admin && typeof admin === 'object' ? admin : {};
}

function notificationAlreadySent(record = {}, event) {
    const notifications = getAdminData(record).mobileNotifications || {};
    return notifications[event]?.status === 'sent';
}

function buildNotificationAdminPatch(record = {}, event, result = {}, now = new Date()) {
    const admin = getAdminData(record);
    const mobileNotifications = {
        ...(admin.mobileNotifications || {}),
        [event]: {
            status: result.success ? 'sent' : (result.configured === false ? 'skipped' : 'failed'),
            attemptedAt: now.toISOString(),
            channels: result.channels || [],
            attemptedChannels: result.attemptedChannels || result.channels || [],
            error: result.error || null
        }
    };

    return {
        ...admin,
        mobileNotifications
    };
}

async function notifyReservationMobile(record = {}, event = 'reservation_received', options = {}) {
    if (!record || (!record.reservationId && !record.paymentIntentId)) {
        return { success: false, skipped: true, error: 'Reservation record is missing an identifier.' };
    }

    if (notificationAlreadySent(record, event)) {
        return { success: true, skipped: true, reason: 'already_sent' };
    }

    const sendFn = options.sendReservationMobileNotification || sendReservationMobileNotification;
    const saveFn = options.saveReservationRecord || require('./reservation-store').saveReservationRecord;
    const now = options.now ? new Date(options.now) : new Date();
    const result = await sendFn(record, {
        event,
        env: options.env,
        fetchImpl: options.fetchImpl,
        config: options.config
    });
    const admin = buildNotificationAdminPatch(record, event, result, now);

    await saveFn({
        reservationId: record.reservationId,
        paymentIntentId: record.paymentIntentId,
        reservationData: {
            admin
        }
    });

    return result;
}

function queueReservationMobileNotification(record = {}, event = 'reservation_received', options = {}) {
    Promise.resolve()
        .then(() => notifyReservationMobile(record, event, options))
        .then((result) => {
            if (result.skipped) {
                return;
            }

            if (result.success) {
                console.log('[MOBILE NOTIFY] Reservation notification sent:', {
                    event,
                    reservationId: record.reservationId,
                    channels: result.channels
                });
                return;
            }

            console.warn('[MOBILE NOTIFY] Reservation notification not sent:', {
                event,
                reservationId: record.reservationId,
                error: result.error
            });
        })
        .catch((error) => {
            console.warn('[MOBILE NOTIFY] Reservation notification failed:', {
                event,
                reservationId: record.reservationId,
                error: error.message
            });
        });
}

module.exports = {
    buildNotificationAdminPatch,
    notifyReservationMobile,
    queueReservationMobileNotification
};
