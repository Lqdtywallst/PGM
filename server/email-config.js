const nodemailer = require('nodemailer');

const DEFAULT_EMAIL_USER = 'prestigegoalmotion@gmail.com';

function firstDefined(...values) {
    for (const value of values) {
        if (typeof value === 'string' && value.trim()) {
            return value.trim();
        }
    }
    return '';
}

function parseBoolean(value, fallback = false) {
    if (typeof value !== 'string' || !value.trim()) {
        return fallback;
    }
    return value.trim().toLowerCase() === 'true';
}

function parsePort(value, fallback) {
    const parsed = Number.parseInt(value, 10);
    return Number.isFinite(parsed) ? parsed : fallback;
}

const smtpHost = firstDefined(process.env.SMTP_HOST);
const smtpSecure = parseBoolean(process.env.SMTP_SECURE, false);
const smtpPort = parsePort(process.env.SMTP_PORT, smtpSecure ? 465 : 587);
const smtpService = firstDefined(process.env.SMTP_SERVICE, process.env.EMAIL_SERVICE, smtpHost ? '' : 'gmail');
const smtpUser = firstDefined(process.env.SMTP_USER, process.env.EMAIL_USER, DEFAULT_EMAIL_USER);
const smtpPassword = firstDefined(
    process.env.SMTP_PASSWORD,
    process.env.SMTP_PASS,
    process.env.EMAIL_PASSWORD,
    process.env.EMAIL_APP_PASSWORD
);
const smtpFrom = firstDefined(process.env.EMAIL_FROM, process.env.SMTP_FROM, smtpUser, DEFAULT_EMAIL_USER);
const smtpRequireTls = parseBoolean(process.env.SMTP_REQUIRE_TLS, !smtpSecure);

const EMAIL_CONFIG = {
    host: smtpHost,
    port: smtpPort,
    secure: smtpSecure,
    requireTLS: smtpRequireTls,
    service: smtpService,
    user: smtpUser,
    password: smtpPassword,
    from: smtpFrom,
    allowSelfSigned: process.env.SMTP_ALLOW_SELF_SIGNED === 'true',
    logOnlyInDevelopment:
        process.env.CONTACT_FORM_LOG_ONLY === 'true' ||
        (!smtpPassword && (process.env.NODE_ENV || 'development') !== 'production')
};

function isEmailConfigured() {
    return Boolean(EMAIL_CONFIG.user && EMAIL_CONFIG.password && (EMAIL_CONFIG.host || EMAIL_CONFIG.service));
}

function buildTransportOptions() {
    if (!isEmailConfigured()) {
        return null;
    }

    const sharedOptions = {
        auth: {
            user: EMAIL_CONFIG.user,
            pass: EMAIL_CONFIG.password
        },
        tls: EMAIL_CONFIG.allowSelfSigned ? { rejectUnauthorized: false } : undefined,
        connectionTimeout: 10000,
        greetingTimeout: 10000,
        socketTimeout: 10000
    };

    if (EMAIL_CONFIG.host) {
        return {
            host: EMAIL_CONFIG.host,
            port: EMAIL_CONFIG.port,
            secure: EMAIL_CONFIG.secure,
            requireTLS: EMAIL_CONFIG.requireTLS,
            ...sharedOptions
        };
    }

    return {
        service: EMAIL_CONFIG.service,
        ...sharedOptions
    };
}

function createUnconfiguredTransporter() {
    const errorFactory = () => new Error('Email transport is not configured');

    return {
        async sendMail() {
            throw errorFactory();
        },
        verify(callback) {
            const error = errorFactory();
            if (typeof callback === 'function') {
                callback(error);
                return;
            }
            return Promise.reject(error);
        }
    };
}

function createEmailTransporter() {
    const transportOptions = buildTransportOptions();
    if (!transportOptions) {
        return createUnconfiguredTransporter();
    }
    return nodemailer.createTransport(transportOptions);
}

function getEmailDiagnostics() {
    return {
        hasUser: Boolean(EMAIL_CONFIG.user),
        hasPassword: Boolean(EMAIL_CONFIG.password),
        host: EMAIL_CONFIG.host || null,
        port: EMAIL_CONFIG.port,
        service: EMAIL_CONFIG.service || null,
        secure: EMAIL_CONFIG.secure,
        from: EMAIL_CONFIG.from,
        logOnlyInDevelopment: EMAIL_CONFIG.logOnlyInDevelopment
    };
}

module.exports = {
    EMAIL_CONFIG,
    createEmailTransporter,
    getEmailDiagnostics,
    isEmailConfigured
};
