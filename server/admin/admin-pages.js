function normalizeAdminEnvironment(env = process.env) {
    const raw = String(env.APP_ENV || env.PGM_APP_ENV || env.NODE_ENV || '').trim().toLowerCase();

    if (['production', 'prod'].includes(raw)) return 'production';
    if (['staging', 'stage', 'preview', 'preprod', 'preproduction'].includes(raw)) return 'staging';
    if (raw === 'test') return 'test';
    return 'development';
}

function getAdminEnvironmentLabel(env = process.env) {
    const appEnv = normalizeAdminEnvironment(env);
    if (appEnv === 'production') return 'Production CRM';
    if (appEnv === 'staging') return 'Staging CRM';
    if (appEnv === 'test') return 'Test CRM';
    return 'Local CRM';
}

function renderAdminLoginPage() {
    const environmentLabel = getAdminEnvironmentLabel();

    return `<!doctype html>
<html lang="en">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <meta name="robots" content="noindex,nofollow">
    <title>Dynasty Prestige Admin Login</title>
    <style>
        :root {
            --ink: #f7f0df;
            --muted: #b8ad9b;
            --line: rgba(255, 255, 255, 0.14);
            --panel: rgba(12, 12, 13, 0.88);
            --gold: #e4bd60;
            --gold-soft: #f6df9a;
            --danger: #ff8a8a;
            --bg: #090807;
        }
        * { box-sizing: border-box; }
        body {
            min-height: 100vh;
            margin: 0;
            display: grid;
            place-items: center;
            padding: 28px;
            color: var(--ink);
            font-family: "Georgia", "Times New Roman", serif;
            background:
                radial-gradient(circle at top left, rgba(228, 189, 96, 0.24), transparent 32rem),
                linear-gradient(135deg, #050505 0%, #15100b 58%, #070707 100%);
        }
        .login-card {
            width: min(100%, 460px);
            padding: 34px;
            border: 1px solid var(--line);
            border-radius: 26px;
            background: var(--panel);
            box-shadow: 0 28px 90px rgba(0, 0, 0, 0.46);
        }
        .brand {
            display: flex;
            gap: 14px;
            align-items: center;
            margin-bottom: 28px;
        }
        .brand-mark {
            width: 50px;
            height: 50px;
            display: grid;
            place-items: center;
            border: 1px solid rgba(228, 189, 96, 0.55);
            border-radius: 14px;
            color: var(--gold-soft);
            font-weight: 700;
            letter-spacing: 0.05em;
        }
        .brand strong {
            display: block;
            font-family: Arial, sans-serif;
            font-size: 0.9rem;
            letter-spacing: 0.12em;
            text-transform: uppercase;
        }
        .brand span {
            display: block;
            margin-top: 3px;
            color: var(--muted);
            font-family: Arial, sans-serif;
            font-size: 0.72rem;
            letter-spacing: 0.16em;
            text-transform: uppercase;
        }
        h1 {
            margin: 0 0 10px;
            font-size: clamp(2rem, 7vw, 3.2rem);
            line-height: 0.95;
        }
        p {
            margin: 0 0 24px;
            color: var(--muted);
            font-family: Arial, sans-serif;
            line-height: 1.55;
        }
        label {
            display: block;
            margin: 18px 0 8px;
            color: var(--gold-soft);
            font-family: Arial, sans-serif;
            font-size: 0.72rem;
            font-weight: 800;
            letter-spacing: 0.12em;
            text-transform: uppercase;
        }
        input {
            width: 100%;
            min-height: 50px;
            padding: 0 16px;
            border: 1px solid var(--line);
            border-radius: 14px;
            background: rgba(255, 255, 255, 0.05);
            color: var(--ink);
            font: 600 1rem Arial, sans-serif;
            outline: none;
        }
        input:focus {
            border-color: rgba(228, 189, 96, 0.85);
            box-shadow: 0 0 0 4px rgba(228, 189, 96, 0.12);
        }
        button {
            width: 100%;
            min-height: 54px;
            margin-top: 24px;
            border: 0;
            border-radius: 15px;
            background: linear-gradient(135deg, var(--gold-soft), var(--gold));
            color: #090807;
            cursor: pointer;
            font: 900 0.82rem Arial, sans-serif;
            letter-spacing: 0.11em;
            text-transform: uppercase;
        }
        .message {
            min-height: 20px;
            margin-top: 16px;
            color: var(--danger);
            font: 700 0.88rem Arial, sans-serif;
        }
        .setup-note {
            margin-top: 22px;
            padding-top: 18px;
            border-top: 1px solid var(--line);
            color: var(--muted);
            font: 0.82rem/1.55 Arial, sans-serif;
        }
        code {
            color: var(--gold-soft);
            font-family: Consolas, monospace;
        }
        .environment-pill {
            display: inline-flex;
            margin-bottom: 18px;
            padding: 7px 11px;
            border: 1px solid rgba(228, 189, 96, 0.42);
            border-radius: 999px;
            color: var(--gold-soft);
            background: rgba(228, 189, 96, 0.08);
            font: 800 0.68rem Arial, sans-serif;
            letter-spacing: 0.12em;
            text-transform: uppercase;
        }
    </style>
</head>
<body>
    <main class="login-card" aria-labelledby="admin-title">
        <div class="brand">
            <div class="brand-mark">DP</div>
            <div>
                <strong>Dynasty Prestige</strong>
                <span>Private Admin</span>
            </div>
        </div>
        <div class="environment-pill">${environmentLabel}</div>
        <h1 id="admin-title">Reservations desk.</h1>
        <p>Private access for managing client reservations, payment state and handover follow-up.</p>
        <form id="loginForm" autocomplete="off">
            <label for="username">Admin user</label>
            <input id="username" name="username" autocomplete="username" required>
            <label for="password">Password</label>
            <input id="password" name="password" type="password" autocomplete="current-password" required>
            <button type="submit">Open admin desk</button>
            <div class="message" id="message" role="status" aria-live="polite"></div>
        </form>
        <div class="setup-note">
            Setup uses <code>ADMIN_USER</code>, <code>ADMIN_PASSWORD_HASH</code> and <code>ADMIN_SESSION_SECRET</code>. No admin API opens without them.
        </div>
    </main>
    <script>
        function getSafeNextPath() {
            var nextPath = new URLSearchParams(window.location.search).get('next') || '/admin/reservations.html';

            try {
                var url = new URL(nextPath, window.location.origin);
                var isSameOrigin = url.origin === window.location.origin;
                var isAllowedAdminPage = url.pathname === '/admin/reservations.html';

                if (isSameOrigin && isAllowedAdminPage) {
                    return url.pathname + url.search + url.hash;
                }
            } catch (error) {
                return '/admin/reservations.html';
            }

            return '/admin/reservations.html';
        }

        document.getElementById('loginForm').addEventListener('submit', async function (event) {
            event.preventDefault();
            var message = document.getElementById('message');
            message.textContent = 'Checking access...';

            try {
                var response = await fetch('/api/admin/login', {
                    method: 'POST',
                    credentials: 'same-origin',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        username: document.getElementById('username').value,
                        password: document.getElementById('password').value
                    })
                });
                var data = await response.json().catch(function () { return {}; });
                if (!response.ok) {
                    message.textContent = data.error || 'Access denied.';
                    return;
                }

                window.location.href = getSafeNextPath();
            } catch (error) {
                message.textContent = 'The admin desk is not reachable right now.';
            }
        });
    </script>
</body>
</html>`;
}

function renderAdminReservationsPage() {
    const environmentLabel = getAdminEnvironmentLabel();

    return `<!doctype html>
<html lang="en">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <meta name="robots" content="noindex,nofollow">
    <title>Dynasty Prestige Reservations Desk</title>
    <style>
        :root {
            --bg: #f5efe4;
            --ink: #17120d;
            --muted: #756b61;
            --panel: rgba(255, 255, 255, 0.88);
            --line: rgba(23, 18, 13, 0.12);
            --black: #0d0d0f;
            --gold: #dcb458;
            --gold-soft: #f7df95;
            --green: #1f8f54;
            --red: #b64035;
            --amber: #b47825;
            --shadow: 0 16px 46px rgba(52, 38, 21, 0.11);
        }
        * { box-sizing: border-box; }
        body {
            margin: 0;
            min-height: 100vh;
            color: var(--ink);
            font-family: Arial, sans-serif;
            background:
                radial-gradient(circle at 18% 0%, rgba(220, 180, 88, 0.24), transparent 34rem),
                linear-gradient(135deg, #fbf7ef 0%, var(--bg) 52%, #e7d8c4 100%);
        }
        a { color: inherit; }
        .topbar {
            position: sticky;
            top: 0;
            z-index: 10;
            display: flex;
            justify-content: space-between;
            align-items: center;
            gap: 14px;
            padding: 10px clamp(16px, 3vw, 30px);
            border-bottom: 1px solid var(--line);
            background: rgba(13, 13, 15, 0.92);
            color: #fff8e7;
            backdrop-filter: blur(16px);
        }
        .brand {
            display: flex;
            align-items: center;
            gap: 12px;
        }
        .brand-mark {
            width: 40px;
            height: 40px;
            display: grid;
            place-items: center;
            border: 1px solid rgba(247, 223, 149, 0.58);
            border-radius: 12px;
            color: var(--gold-soft);
            font: 800 0.86rem Georgia, serif;
        }
        .brand strong {
            display: block;
            letter-spacing: 0.12em;
            text-transform: uppercase;
            font-size: 0.82rem;
        }
        .brand span {
            display: block;
            margin-top: 3px;
            color: rgba(255, 248, 231, 0.66);
            letter-spacing: 0.13em;
            text-transform: uppercase;
            font-size: 0.64rem;
        }
        .topbar-actions {
            display: flex;
            align-items: center;
            gap: 10px;
            flex-wrap: wrap;
        }
        .environment-chip {
            min-height: 34px;
            padding: 0 13px;
            border: 1px solid rgba(247, 223, 149, 0.36);
            border-radius: 999px;
            background: rgba(247, 223, 149, 0.1);
            color: var(--gold-soft);
            display: inline-flex;
            align-items: center;
            font-size: 0.66rem;
            font-weight: 900;
            letter-spacing: 0.1em;
            text-transform: uppercase;
        }
        .topbar-link {
            min-height: 38px;
            padding: 0 16px;
            border: 1px solid rgba(247, 223, 149, 0.26);
            border-radius: 13px;
            background: rgba(247, 223, 149, 0.08);
            color: #fff8e7;
            text-decoration: none;
            display: inline-flex;
            align-items: center;
            justify-content: center;
            font-size: 0.78rem;
            font-weight: 800;
            letter-spacing: 0.08em;
            text-transform: uppercase;
        }
        .logout {
            min-height: 38px;
            padding: 0 16px;
            border: 1px solid rgba(255, 255, 255, 0.16);
            border-radius: 13px;
            background: transparent;
            color: #fff8e7;
            cursor: pointer;
            font-weight: 800;
            letter-spacing: 0.08em;
            text-transform: uppercase;
        }
        .layout {
            display: grid;
            grid-template-columns: minmax(0, 1.08fr) minmax(380px, 0.74fr);
            gap: 18px;
            width: min(1680px, 100%);
            margin: 0 auto;
            padding: clamp(14px, 2.4vw, 26px);
        }
        .hero {
            grid-column: 1 / -1;
            display: flex;
            justify-content: space-between;
            gap: 20px;
            align-items: center;
            padding: 18px 22px;
            border: 1px solid var(--line);
            border-radius: 24px;
            background: rgba(255, 255, 255, 0.62);
            box-shadow: var(--shadow);
        }
        h1 {
            margin: 0;
            max-width: 960px;
            font-family: Georgia, "Times New Roman", serif;
            font-size: clamp(1.85rem, 2.5vw, 2.85rem);
            line-height: 1;
            letter-spacing: -0.045em;
        }
        .hero p {
            max-width: 520px;
            margin: 6px 0 0;
            color: var(--muted);
            font-size: 0.94rem;
            line-height: 1.45;
        }
        .hero-actions {
            display: flex;
            align-items: center;
            justify-content: flex-end;
            gap: 10px;
            flex-wrap: wrap;
        }
        .ops-panel {
            grid-column: 1 / -1;
            display: grid;
            grid-template-columns: auto minmax(0, 1fr) auto;
            gap: 10px 14px;
            align-items: center;
            padding: 10px 14px;
            border: 1px solid var(--line);
            border-radius: 16px;
            background: rgba(13, 13, 15, 0.92);
            color: #fff8e7;
            box-shadow: 0 16px 38px rgba(0, 0, 0, 0.18);
        }
        .ops-panel.is-ok { border-color: rgba(31, 143, 84, 0.34); }
        .ops-panel.is-review { border-color: rgba(180, 120, 37, 0.48); }
        .ops-panel.is-bad { border-color: rgba(182, 64, 53, 0.62); }
        .ops-status-main {
            display: flex;
            min-width: 0;
            align-items: center;
            gap: 10px;
        }
        .ops-dot {
            width: 10px;
            height: 10px;
            flex: 0 0 auto;
            border-radius: 999px;
            background: #f1c174;
            box-shadow: 0 0 0 4px rgba(241, 193, 116, 0.12);
        }
        .ops-panel.is-ok .ops-dot {
            background: #8ee0ad;
            box-shadow: 0 0 0 4px rgba(142, 224, 173, 0.12);
        }
        .ops-panel.is-bad .ops-dot {
            background: #ff9a92;
            box-shadow: 0 0 0 4px rgba(255, 154, 146, 0.12);
        }
        .ops-title {
            margin: 0;
            color: var(--gold-soft);
            font-family: Arial, sans-serif;
            font-size: 0.64rem;
            font-weight: 900;
            letter-spacing: 0.12em;
            line-height: 1;
            text-transform: uppercase;
        }
        .ops-copy {
            margin: 4px 0 0;
            color: rgba(255, 248, 231, 0.68);
            line-height: 1.25;
            font-size: 0.78rem;
        }
        .ops-strip {
            display: flex;
            min-width: 0;
            align-items: center;
            justify-content: flex-end;
            gap: 7px;
            flex-wrap: wrap;
        }
        .ops-chip {
            display: inline-flex;
            min-height: 28px;
            align-items: center;
            gap: 6px;
            padding: 0 10px;
            border: 1px solid rgba(255, 255, 255, 0.12);
            border-radius: 999px;
            background: rgba(255, 255, 255, 0.055);
            color: rgba(255, 248, 231, 0.78);
            font-size: 0.72rem;
            white-space: nowrap;
        }
        .ops-chip strong {
            color: #fff8e7;
            font-size: 0.76rem;
        }
        .ops-details-toggle {
            min-height: 32px;
            justify-self: end;
            padding: 0 12px;
            border: 1px solid rgba(247, 223, 149, 0.26);
            border-radius: 999px;
            background: rgba(255, 255, 255, 0.055);
            color: var(--gold-soft);
            cursor: pointer;
            display: inline-flex;
            align-items: center;
            justify-content: center;
            font-size: 0.68rem;
            font-weight: 900;
            letter-spacing: 0.08em;
            text-transform: uppercase;
            white-space: nowrap;
        }
        .ops-details-toggle:hover,
        .ops-details-toggle[aria-expanded="true"] {
            border-color: rgba(247, 223, 149, 0.54);
            background: rgba(247, 223, 149, 0.12);
        }
        .ops-details-panel {
            grid-column: 1 / -1;
            justify-self: stretch;
        }
        .ops-details-panel[hidden] {
            display: none;
        }
        .ops-details-head {
            display: flex;
            align-items: center;
            justify-content: space-between;
            gap: 12px;
            margin-bottom: 8px;
            padding-top: 6px;
        }
        .ops-details-head span {
            color: var(--gold-soft);
            font-size: 0.68rem;
            font-weight: 900;
            letter-spacing: 0.1em;
            text-transform: uppercase;
        }
        .ops-details-close {
            min-height: 30px;
            padding: 0 10px;
            border: 1px solid rgba(255, 255, 255, 0.14);
            border-radius: 999px;
            background: rgba(255, 255, 255, 0.055);
            color: #fff8e7;
            cursor: pointer;
            font-size: 0.62rem;
            font-weight: 900;
            letter-spacing: 0.08em;
            text-transform: uppercase;
        }
        .ops-details-close:hover {
            border-color: rgba(247, 223, 149, 0.4);
            color: var(--gold-soft);
        }
        .ops-grid {
            display: grid;
            grid-template-columns: repeat(5, minmax(0, 1fr));
            gap: 8px;
        }
        .ops-metric,
        .ops-check {
            min-width: 0;
            padding: 10px;
            border: 1px solid rgba(255, 255, 255, 0.11);
            border-radius: 14px;
            background: rgba(255, 255, 255, 0.05);
        }
        .ops-metric span,
        .ops-check span {
            display: block;
            color: rgba(255, 248, 231, 0.56);
            font-size: 0.58rem;
            font-weight: 900;
            letter-spacing: 0.11em;
            text-transform: uppercase;
        }
        .ops-metric strong,
        .ops-check strong {
            display: block;
            margin-top: 4px;
            overflow-wrap: anywhere;
            font-size: 0.88rem;
        }
        .ops-check.is-pass strong { color: #8ee0ad; }
        .ops-check.is-warn strong { color: #f1c174; }
        .ops-check.is-fail strong { color: #ff9a92; }
        .calendar-panel {
            grid-column: 1 / -1;
            overflow: hidden;
            scroll-margin-top: 88px;
            border: 1px solid rgba(122, 92, 37, 0.16);
            border-radius: 24px;
            background:
                linear-gradient(180deg, rgba(255, 255, 255, 0.92), rgba(255, 250, 242, 0.82)),
                radial-gradient(circle at top right, rgba(220, 180, 88, 0.16), transparent 36%);
            box-shadow: var(--shadow);
        }
        .calendar-head {
            display: grid;
            grid-template-columns: minmax(0, 1fr) auto;
            align-items: start;
            gap: 18px;
            padding: 18px;
            border-bottom: 1px solid rgba(122, 92, 37, 0.12);
        }
        .calendar-kicker {
            margin: 0 0 6px;
            color: var(--gold);
            font-size: 0.64rem;
            font-weight: 900;
            letter-spacing: 0.12em;
            text-transform: uppercase;
        }
        .calendar-title {
            margin: 0;
            font-family: Georgia, "Times New Roman", serif;
            font-size: clamp(1.35rem, 2vw, 1.9rem);
            line-height: 1;
        }
        .calendar-summary {
            margin: 7px 0 0;
            color: var(--muted);
            font-size: 0.86rem;
            line-height: 1.42;
        }
        .calendar-toggle {
            min-width: 170px;
            min-height: 44px;
            border-color: rgba(122, 92, 37, 0.2);
            background: #111317;
            color: #fff7e4;
            box-shadow: 0 14px 28px rgba(17, 19, 23, 0.16);
        }
        .calendar-toggle__icon {
            position: relative;
            width: 12px;
            height: 12px;
        }
        .calendar-toggle__icon::before,
        .calendar-toggle__icon::after {
            content: "";
            position: absolute;
            inset: 50% auto auto 50%;
            width: 12px;
            height: 2px;
            border-radius: 999px;
            background: currentColor;
            transform: translate(-50%, -50%);
            transition: transform 160ms ease;
        }
        .calendar-toggle__icon::after {
            transform: translate(-50%, -50%) rotate(90deg);
        }
        .calendar-panel.is-open .calendar-toggle__icon::after {
            transform: translate(-50%, -50%) rotate(0deg);
        }
        .calendar-snapshot {
            display: grid;
            grid-template-columns: repeat(4, minmax(0, 1fr));
            gap: 10px;
            padding: 0 18px 16px;
        }
        .calendar-metric {
            min-width: 0;
            padding: 12px;
            border: 1px solid rgba(122, 92, 37, 0.12);
            border-radius: 16px;
            background: rgba(255, 255, 255, 0.72);
        }
        .calendar-metric span {
            display: block;
            color: var(--muted);
            font-size: 0.58rem;
            font-weight: 900;
            letter-spacing: 0.1em;
            text-transform: uppercase;
        }
        .calendar-metric strong {
            display: block;
            margin-top: 5px;
            overflow: hidden;
            color: var(--ink);
            font-size: 0.92rem;
            text-overflow: ellipsis;
            white-space: nowrap;
        }
        .calendar-body {
            border-top: 1px solid rgba(122, 92, 37, 0.12);
            background: rgba(255, 255, 255, 0.44);
        }
        .calendar-body[hidden] {
            display: none;
        }
        .calendar-toolbar {
            display: grid;
            grid-template-columns: minmax(0, 1fr) auto auto;
            gap: 12px;
            align-items: center;
            padding: 14px 18px 0;
        }
        .calendar-actions {
            display: grid;
            grid-template-columns: auto minmax(150px, 190px) auto auto;
            gap: 8px;
            align-items: center;
        }
        .calendar-actions input[type="month"] {
            min-height: 40px;
            padding: 0 12px;
            border-radius: 13px;
            font-size: 0.82rem;
            font-weight: 800;
        }
        .calendar-view-switch {
            display: inline-grid;
            grid-template-columns: repeat(2, minmax(0, 1fr));
            gap: 4px;
            min-height: 40px;
            padding: 4px;
            border: 1px solid rgba(122, 92, 37, 0.16);
            border-radius: 999px;
            background: rgba(255, 250, 242, 0.82);
            box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.78);
        }
        .calendar-view-switch button {
            appearance: none;
            min-width: 86px;
            border: 0;
            border-radius: 999px;
            background: transparent;
            color: var(--muted);
            cursor: pointer;
            font: inherit;
            font-size: 0.68rem;
            font-weight: 900;
            letter-spacing: 0.08em;
            text-transform: uppercase;
        }
        .calendar-view-switch button:hover,
        .calendar-view-switch button:focus-visible,
        .calendar-view-switch button.is-active {
            background: #111317;
            color: #fff8e7;
            outline: none;
        }
        .calendar-legend {
            display: inline-flex;
            justify-content: flex-end;
            gap: 8px;
            flex-wrap: wrap;
        }
        .calendar-legend span {
            display: inline-flex;
            align-items: center;
            gap: 6px;
            min-height: 30px;
            padding: 0 10px;
            border: 1px solid rgba(122, 92, 37, 0.12);
            border-radius: 999px;
            background: rgba(255, 250, 242, 0.72);
            color: var(--muted);
            font-size: 0.64rem;
            font-weight: 900;
            letter-spacing: 0.06em;
            text-transform: uppercase;
            white-space: nowrap;
        }
        .calendar-legend i,
        .calendar-reservation__status-dot {
            width: 8px;
            height: 8px;
            flex: 0 0 auto;
            border-radius: 999px;
            background: var(--gold);
        }
        .calendar-legend i.confirmed,
        .calendar-reservation.confirmed .calendar-reservation__status-dot {
            background: var(--green);
        }
        .calendar-legend i.pending,
        .calendar-reservation.pending .calendar-reservation__status-dot {
            background: var(--amber);
        }
        .calendar-legend i.issue,
        .calendar-reservation.failed .calendar-reservation__status-dot,
        .calendar-reservation.email .calendar-reservation__status-dot {
            background: var(--red);
        }
        .calendar-vehicle-strip {
            display: flex;
            align-items: center;
            gap: 10px;
            flex-wrap: nowrap;
            overflow-x: auto;
            overscroll-behavior-x: contain;
            padding: 12px 18px 0;
            scrollbar-width: thin;
        }
        .calendar-filter-label {
            flex: 0 0 auto;
            color: var(--muted);
            font-size: 0.62rem;
            font-weight: 900;
            letter-spacing: 0.1em;
            text-transform: uppercase;
            white-space: nowrap;
        }
        .calendar-vehicle-chip {
            appearance: none;
            display: inline-flex;
            align-items: center;
            flex: 0 0 auto;
            gap: 9px;
            min-height: 40px;
            padding: 5px 13px 5px 6px;
            border: 1px solid rgba(122, 92, 37, 0.2);
            border-radius: 999px;
            background: linear-gradient(180deg, rgba(255, 255, 255, 0.92) 0%, rgba(255, 250, 242, 0.84) 100%);
            color: var(--muted);
            font: inherit;
            box-shadow:
                0 8px 18px rgba(52, 38, 21, 0.06),
                inset 0 1px 0 rgba(255, 255, 255, 0.86);
            text-align: left;
            white-space: nowrap;
            transition: border-color 0.16s ease, background 0.16s ease, box-shadow 0.16s ease, transform 0.16s ease;
        }
        .calendar-vehicle-chip[data-calendar-vehicle-filter] {
            cursor: pointer;
        }
        .calendar-vehicle-chip[data-calendar-vehicle-filter]:hover,
        .calendar-vehicle-chip[data-calendar-vehicle-filter]:focus-visible,
        .calendar-vehicle-chip.is-active {
            border-color: rgba(122, 92, 37, 0.42);
            background: #111317;
            color: #fff8e7;
            box-shadow:
                0 12px 24px rgba(17, 19, 23, 0.14),
                0 0 0 4px rgba(220, 180, 88, 0.12);
            transform: translateY(-1px);
            outline: none;
        }
        .calendar-vehicle-chip__count {
            display: inline-grid;
            place-items: center;
            min-width: 27px;
            height: 27px;
            padding: 0 7px;
            border-radius: 999px;
            background: rgba(17, 19, 23, 0.92);
            color: var(--gold-soft);
            font-size: 0.72rem;
            font-weight: 950;
            line-height: 1;
        }
        .calendar-vehicle-chip__text {
            display: grid;
            gap: 2px;
            min-width: 0;
        }
        .calendar-vehicle-chip__label {
            overflow: hidden;
            color: var(--ink);
            font-size: 0.78rem;
            font-weight: 900;
            line-height: 1.1;
            text-overflow: ellipsis;
        }
        .calendar-vehicle-chip__meta {
            color: var(--muted);
            font-size: 0.54rem;
            font-weight: 900;
            letter-spacing: 0.08em;
            line-height: 1.1;
            text-transform: uppercase;
        }
        .calendar-vehicle-chip[data-calendar-vehicle-filter]:hover .calendar-vehicle-chip__count,
        .calendar-vehicle-chip[data-calendar-vehicle-filter]:focus-visible .calendar-vehicle-chip__count,
        .calendar-vehicle-chip.is-active .calendar-vehicle-chip__count {
            background: rgba(220, 180, 88, 0.95);
            color: #111317;
        }
        .calendar-vehicle-chip[data-calendar-vehicle-filter]:hover .calendar-vehicle-chip__label,
        .calendar-vehicle-chip[data-calendar-vehicle-filter]:focus-visible .calendar-vehicle-chip__label,
        .calendar-vehicle-chip.is-active .calendar-vehicle-chip__label {
            color: #fff8e7;
        }
        .calendar-vehicle-chip[data-calendar-vehicle-filter]:hover .calendar-vehicle-chip__meta,
        .calendar-vehicle-chip[data-calendar-vehicle-filter]:focus-visible .calendar-vehicle-chip__meta,
        .calendar-vehicle-chip.is-active .calendar-vehicle-chip__meta {
            color: rgba(255, 248, 231, 0.72);
        }
        .calendar-scroll {
            overflow-x: auto;
            overscroll-behavior-x: contain;
            padding: 12px 18px 18px;
        }
        .calendar-grid {
            display: block;
            min-width: 0;
        }
        .calendar-timeline {
            min-width: max(980px, calc(230px + (var(--timeline-day-count, 31) * 42px)));
            border: 1px solid rgba(122, 92, 37, 0.12);
            border-radius: 18px;
            background: rgba(255, 255, 255, 0.66);
            overflow: visible;
        }
        .calendar-timeline__header,
        .calendar-timeline__row {
            display: grid;
            grid-template-columns: 230px minmax(0, 1fr);
        }
        .calendar-timeline__header {
            position: sticky;
            top: 0;
            z-index: 4;
            border-bottom: 1px solid rgba(122, 92, 37, 0.14);
            background: rgba(255, 250, 242, 0.96);
        }
        .calendar-timeline__corner,
        .calendar-timeline__vehicle {
            position: sticky;
            left: 0;
            z-index: 6;
            border-right: 1px solid rgba(82, 61, 37, 0.24);
            background: rgba(255, 250, 242, 0.98);
            box-shadow: 12px 0 22px rgba(52, 38, 21, 0.11);
        }
        .calendar-timeline__corner {
            z-index: 8;
            padding: 12px;
            color: var(--muted);
            font-size: 0.62rem;
            font-weight: 900;
            letter-spacing: 0.1em;
            text-transform: uppercase;
        }
        .calendar-timeline__days,
        .calendar-timeline__lane {
            display: grid;
            grid-template-columns: repeat(var(--timeline-day-count, 31), minmax(36px, 1fr));
        }
        .calendar-timeline__day {
            min-width: 0;
            padding: 8px 4px;
            border-right: 1px solid rgba(122, 92, 37, 0.08);
            text-align: center;
        }
        .calendar-timeline__day strong,
        .calendar-timeline__day span {
            display: block;
        }
        .calendar-timeline__day strong {
            color: var(--ink);
            font-size: 0.72rem;
            font-weight: 900;
        }
        .calendar-timeline__day span {
            margin-top: 2px;
            color: var(--muted);
            font-size: 0.52rem;
            font-weight: 900;
            letter-spacing: 0.06em;
            text-transform: uppercase;
        }
        .calendar-timeline__day.is-weekend,
        .calendar-timeline__cell.is-weekend {
            background: rgba(17, 19, 23, 0.025);
        }
        .calendar-timeline__day.is-today,
        .calendar-timeline__cell.is-today {
            background: rgba(220, 180, 88, 0.13);
        }
        .calendar-timeline__row {
            border-bottom: 1px solid rgba(122, 92, 37, 0.1);
        }
        .calendar-timeline__row:last-child {
            border-bottom: 0;
        }
        .calendar-timeline__vehicle {
            min-width: 0;
            padding: 12px;
        }
        .calendar-timeline__vehicle strong,
        .calendar-timeline__vehicle span {
            display: block;
            overflow: hidden;
            text-overflow: ellipsis;
            white-space: nowrap;
        }
        .calendar-timeline__vehicle strong {
            color: var(--ink);
            font-size: 0.82rem;
            font-weight: 900;
        }
        .calendar-timeline__vehicle span {
            margin-top: 5px;
            color: var(--muted);
            font-size: 0.68rem;
        }
        .calendar-timeline__lane {
            position: relative;
            grid-template-rows: repeat(var(--lane-count, 1), 38px);
            min-height: calc(var(--lane-count, 1) * 38px + 16px);
            padding: 8px 0;
        }
        .calendar-timeline__cell {
            min-width: 0;
            border-right: 1px solid rgba(122, 92, 37, 0.07);
        }
        .calendar-timeline__booking {
            width: 100%;
            min-width: 0;
            min-height: 30px;
            align-self: center;
            z-index: 2;
            padding: 5px 9px;
            border: 1px solid rgba(66, 50, 31, 0.34);
            border-left: 5px solid var(--gold);
            border-radius: 999px;
            background: linear-gradient(180deg, #ffffff 0%, #fffaf1 100%);
            color: var(--ink);
            cursor: pointer;
            text-align: left;
            box-shadow:
                0 10px 24px rgba(52, 38, 21, 0.13),
                inset 0 0 0 1px rgba(255, 255, 255, 0.86);
            transition: border-color 0.16s ease, box-shadow 0.16s ease, transform 0.16s ease;
        }
        .calendar-timeline__booking:hover,
        .calendar-timeline__booking:focus-visible {
            border-color: rgba(157, 112, 35, 0.9);
            box-shadow:
                0 0 0 4px rgba(220, 180, 88, 0.2),
                0 14px 28px rgba(52, 38, 21, 0.16);
            transform: translateY(-1px);
            outline: none;
        }
        .calendar-timeline__booking.confirmed { border-left-color: var(--green); }
        .calendar-timeline__booking.pending { border-left-color: var(--amber); }
        .calendar-timeline__booking.failed,
        .calendar-timeline__booking.email { border-left-color: var(--red); }
        .calendar-timeline__booking.canceled { opacity: 0.58; }
        .calendar-timeline__booking.is-clipped-start {
            border-top-left-radius: 6px;
            border-bottom-left-radius: 6px;
        }
        .calendar-timeline__booking.is-clipped-end {
            border-top-right-radius: 6px;
            border-bottom-right-radius: 6px;
        }
        .calendar-timeline__client,
        .calendar-timeline__meta {
            display: block;
            overflow: hidden;
            text-overflow: ellipsis;
            white-space: nowrap;
        }
        .calendar-timeline__client {
            font-size: 0.72rem;
            font-weight: 900;
        }
        .calendar-timeline__meta {
            margin-top: 2px;
            color: var(--muted);
            font-size: 0.58rem;
            line-height: 1.1;
        }
        .calendar-month {
            min-width: 960px;
            border: 1px solid rgba(122, 92, 37, 0.12);
            border-radius: 18px;
            background: rgba(255, 255, 255, 0.7);
            overflow: hidden;
        }
        .calendar-month__weekdays,
        .calendar-month__grid {
            display: grid;
            grid-template-columns: repeat(7, minmax(0, 1fr));
        }
        .calendar-month__weekday {
            padding: 10px 12px;
            border-right: 1px solid rgba(122, 92, 37, 0.1);
            border-bottom: 1px solid rgba(122, 92, 37, 0.12);
            background: rgba(255, 250, 242, 0.94);
            color: var(--muted);
            font-size: 0.58rem;
            font-weight: 950;
            letter-spacing: 0.1em;
            text-transform: uppercase;
        }
        .calendar-month__weekday:last-child {
            border-right: 0;
        }
        .calendar-month__day {
            min-height: 138px;
            padding: 10px;
            border-right: 1px solid rgba(122, 92, 37, 0.09);
            border-bottom: 1px solid rgba(122, 92, 37, 0.09);
            background: rgba(255, 255, 255, 0.72);
        }
        .calendar-month__day:nth-child(7n) {
            border-right: 0;
        }
        .calendar-month__day.is-muted {
            background: rgba(17, 19, 23, 0.025);
            color: rgba(74, 68, 61, 0.58);
        }
        .calendar-month__day.is-weekend {
            background: rgba(255, 250, 242, 0.78);
        }
        .calendar-month__day.is-today {
            box-shadow: inset 0 0 0 2px rgba(220, 180, 88, 0.52);
        }
        .calendar-month__day-head {
            display: flex;
            align-items: center;
            justify-content: space-between;
            gap: 8px;
            margin-bottom: 8px;
        }
        .calendar-month__date {
            display: inline-grid;
            place-items: center;
            width: 28px;
            height: 28px;
            border-radius: 999px;
            color: var(--ink);
            font-size: 0.76rem;
            font-weight: 950;
        }
        .calendar-month__day.is-today .calendar-month__date {
            background: #111317;
            color: var(--gold-soft);
        }
        .calendar-month__count {
            color: var(--muted);
            font-size: 0.58rem;
            font-weight: 900;
            letter-spacing: 0.06em;
            text-transform: uppercase;
        }
        .calendar-month__items {
            display: grid;
            gap: 6px;
            max-height: 98px;
            min-width: 0;
            overflow-y: auto;
            scrollbar-width: thin;
        }
        .calendar-month__booking {
            width: 100%;
            min-width: 0;
            padding: 7px 8px;
            border: 1px solid rgba(66, 50, 31, 0.3);
            border-left: 4px solid var(--gold);
            border-radius: 11px;
            background: linear-gradient(180deg, #ffffff 0%, #fffaf1 100%);
            color: var(--ink);
            cursor: pointer;
            text-align: left;
            box-shadow: 0 8px 18px rgba(52, 38, 21, 0.08);
            transition: border-color 0.16s ease, box-shadow 0.16s ease, transform 0.16s ease;
        }
        .calendar-month__booking:hover,
        .calendar-month__booking:focus-visible {
            border-color: rgba(157, 112, 35, 0.86);
            box-shadow:
                0 0 0 4px rgba(220, 180, 88, 0.16),
                0 12px 24px rgba(52, 38, 21, 0.14);
            transform: translateY(-1px);
            outline: none;
        }
        .calendar-month__booking.confirmed { border-left-color: var(--green); }
        .calendar-month__booking.pending { border-left-color: var(--amber); }
        .calendar-month__booking.failed,
        .calendar-month__booking.email { border-left-color: var(--red); }
        .calendar-month__vehicle,
        .calendar-month__meta {
            display: block;
            overflow: hidden;
            text-overflow: ellipsis;
            white-space: nowrap;
        }
        .calendar-month__vehicle {
            font-size: 0.66rem;
            font-weight: 950;
            line-height: 1.1;
        }
        .calendar-month__meta {
            margin-top: 2px;
            color: var(--muted);
            font-size: 0.55rem;
            line-height: 1.1;
        }
        .calendar-month__more {
            display: inline-flex;
            align-items: center;
            min-height: 24px;
            padding: 0 8px;
            border: 1px solid rgba(122, 92, 37, 0.14);
            border-radius: 999px;
            background: rgba(255, 250, 242, 0.72);
            color: var(--muted);
            font-size: 0.58rem;
            font-weight: 900;
        }
        .calendar-agenda {
            display: none;
        }
        .calendar-agenda__day {
            border: 1px solid rgba(122, 92, 37, 0.12);
            border-radius: 16px;
            background: rgba(255, 250, 242, 0.82);
            padding: 10px;
        }
        .calendar-agenda__head {
            display: flex;
            align-items: center;
            justify-content: space-between;
            gap: 10px;
            margin-bottom: 8px;
        }
        .calendar-agenda__head strong {
            font-size: 0.82rem;
        }
        .calendar-agenda__head span {
            color: var(--muted);
            font-size: 0.62rem;
            font-weight: 900;
            text-transform: uppercase;
        }
        .calendar-agenda__items {
            display: grid;
            gap: 7px;
        }
        .calendar-agenda__booking {
            width: 100%;
            padding: 9px;
            border: 1px solid rgba(66, 50, 31, 0.3);
            border-left: 4px solid var(--gold);
            border-radius: 12px;
            background: linear-gradient(180deg, #ffffff 0%, #fffaf1 100%);
            color: var(--ink);
            cursor: pointer;
            text-align: left;
            box-shadow: 0 8px 18px rgba(52, 38, 21, 0.1);
            transition: border-color 0.16s ease, box-shadow 0.16s ease, transform 0.16s ease;
        }
        .calendar-agenda__booking:hover,
        .calendar-agenda__booking:focus-visible {
            border-color: rgba(157, 112, 35, 0.86);
            box-shadow:
                0 0 0 4px rgba(220, 180, 88, 0.18),
                0 12px 24px rgba(52, 38, 21, 0.14);
            transform: translateY(-1px);
            outline: none;
        }
        .calendar-agenda__booking.confirmed { border-left-color: var(--green); }
        .calendar-agenda__booking.pending { border-left-color: var(--amber); }
        .calendar-agenda__booking.failed,
        .calendar-agenda__booking.email { border-left-color: var(--red); }
        .calendar-agenda__booking strong,
        .calendar-agenda__booking span {
            display: block;
        }
        .calendar-agenda__booking strong {
            font-size: 0.78rem;
        }
        .calendar-agenda__booking span {
            margin-top: 3px;
            color: var(--muted);
            font-size: 0.66rem;
        }
        .toolbar,
        .list-panel,
        .detail-panel {
            border: 1px solid var(--line);
            border-radius: 22px;
            background: var(--panel);
            box-shadow: var(--shadow);
        }
        .toolbar {
            padding: 14px;
            margin-bottom: 14px;
        }
        .search-row {
            display: grid;
            grid-template-columns: minmax(0, 1fr) minmax(210px, 260px) auto;
            gap: 10px;
            align-items: end;
        }
        input,
        select,
        textarea {
            width: 100%;
            border: 1px solid var(--line);
            border-radius: 13px;
            background: #fff;
            color: var(--ink);
            font: 600 0.92rem Arial, sans-serif;
            outline: none;
        }
        input {
            min-height: 42px;
            padding: 0 14px;
        }
        select {
            min-height: 42px;
            padding: 0 12px;
        }
        textarea {
            min-height: 92px;
            padding: 12px;
            resize: vertical;
        }
        input:focus,
        select:focus,
        textarea:focus {
            border-color: rgba(220, 180, 88, 0.78);
            box-shadow: 0 0 0 4px rgba(220, 180, 88, 0.16);
        }
        .button,
        .action {
            min-height: 40px;
            border: 1px solid var(--line);
            border-radius: 13px;
            cursor: pointer;
            display: inline-flex;
            align-items: center;
            justify-content: center;
            gap: 8px;
            padding: 0 14px;
            background: #fff;
            color: var(--ink);
            font: 900 0.7rem Arial, sans-serif;
            letter-spacing: 0.08em;
            text-decoration: none;
            text-transform: uppercase;
        }
        .button.primary,
        .action.primary {
            border-color: rgba(220, 180, 88, 0.75);
            background: linear-gradient(135deg, var(--gold-soft), var(--gold));
        }
        .action.danger {
            border-color: rgba(182, 64, 53, 0.26);
            color: var(--red);
        }
        .action[aria-disabled="true"] {
            opacity: 0.45;
            pointer-events: none;
        }
        .queue-field {
            min-width: 0;
        }
        .queue-field label {
            display: block;
            margin: 0 0 6px;
            color: var(--muted);
            font-size: 0.62rem;
            font-weight: 900;
            letter-spacing: 0.12em;
            text-transform: uppercase;
        }
        .queue-field select {
            min-height: 40px;
            border-radius: 13px;
            background: rgba(255, 250, 242, 0.82);
            color: rgba(31, 29, 27, 0.78);
            font: 900 0.72rem Arial, sans-serif;
            letter-spacing: 0.06em;
            text-transform: uppercase;
            box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.66);
        }
        .queue-field select:hover {
            border-color: rgba(220, 180, 88, 0.58);
            color: var(--ink);
        }
        .manual-panel {
            grid-column: 1 / -1;
            border: 1px solid var(--line);
            border-radius: 22px;
            background: rgba(255, 255, 255, 0.88);
            box-shadow: var(--shadow);
            padding: 16px;
        }
        .manual-panel[hidden] {
            display: none;
        }
        .panel-heading {
            display: flex;
            justify-content: space-between;
            gap: 14px;
            align-items: flex-start;
            margin-bottom: 14px;
        }
        .panel-heading h2 {
            margin: 0;
            font-family: Georgia, "Times New Roman", serif;
            font-size: 1.4rem;
            line-height: 1;
        }
        .panel-heading p {
            max-width: 680px;
            margin: 6px 0 0;
            color: var(--muted);
            font-size: 0.88rem;
            line-height: 1.45;
        }
        .form-grid {
            display: grid;
            grid-template-columns: repeat(4, minmax(0, 1fr));
            gap: 12px;
        }
        .form-field {
            min-width: 0;
        }
        .form-field.is-wide {
            grid-column: span 2;
        }
        .form-field label {
            display: block;
            margin-bottom: 6px;
            color: var(--muted);
            font-size: 0.62rem;
            font-weight: 900;
            letter-spacing: 0.1em;
            text-transform: uppercase;
        }
        .form-actions {
            display: flex;
            justify-content: flex-end;
            gap: 10px;
            flex-wrap: wrap;
            margin-top: 14px;
        }
        .list-panel {
            overflow: hidden;
        }
        .stats {
            display: flex;
            justify-content: space-between;
            gap: 12px;
            padding: 14px 16px 0;
            color: var(--muted);
            font-size: 0.82rem;
        }
        .cards {
            display: grid;
            gap: 10px;
            padding: 14px;
        }
        .reservation-card {
            width: 100%;
            text-align: left;
            display: grid;
            grid-template-columns: minmax(0, 1fr) auto;
            gap: 10px;
            padding: 13px 14px;
            border: 1px solid var(--line);
            border-radius: 17px;
            background: #fffaf2;
            color: var(--ink);
            cursor: pointer;
        }
        .reservation-card.is-active {
            border-color: rgba(220, 180, 88, 0.95);
            box-shadow: 0 0 0 4px rgba(220, 180, 88, 0.15);
        }
        .reservation-title {
            margin: 0 0 6px;
            font-family: Georgia, "Times New Roman", serif;
            font-size: 1.1rem;
            line-height: 1.05;
        }
        .reservation-meta {
            display: flex;
            flex-wrap: wrap;
            gap: 6px 12px;
            color: var(--muted);
            font-size: 0.82rem;
            line-height: 1.35;
        }
        .status {
            align-self: start;
            padding: 6px 9px;
            border-radius: 999px;
            background: rgba(117, 107, 97, 0.12);
            color: var(--muted);
            font: 900 0.6rem Arial, sans-serif;
            letter-spacing: 0.08em;
            text-transform: uppercase;
            white-space: nowrap;
        }
        .status.confirmed { background: rgba(31, 143, 84, 0.13); color: var(--green); }
        .status.pending { background: rgba(180, 120, 37, 0.14); color: var(--amber); }
        .status.failed { background: rgba(182, 64, 53, 0.12); color: var(--red); }
        .status.email { background: rgba(180, 120, 37, 0.16); color: var(--amber); }
        .status.canceled { background: rgba(117, 107, 97, 0.16); color: var(--muted); }
        .activity-list {
            display: grid;
            gap: 8px;
        }
        .activity-item {
            padding: 10px;
            border: 1px solid var(--line);
            border-radius: 13px;
            background: rgba(255, 255, 255, 0.7);
        }
        .activity-item strong {
            display: block;
            font-size: 0.88rem;
        }
        .activity-item span {
            display: block;
            margin-top: 3px;
            color: var(--muted);
            font-size: 0.76rem;
        }
        .detail-panel {
            position: sticky;
            top: 72px;
            align-self: start;
            max-height: calc(100vh - 92px);
            overflow: auto;
            padding: 18px;
        }
        .detail-backdrop {
            display: none;
        }
        .workspace-overview {
            display: grid;
            gap: 16px;
        }
        .workspace-head {
            display: flex;
            align-items: flex-start;
            justify-content: space-between;
            gap: 14px;
        }
        .workspace-kicker {
            margin: 0 0 6px;
            color: var(--gold);
            font-size: 0.64rem;
            font-weight: 900;
            letter-spacing: 0.12em;
            text-transform: uppercase;
        }
        .workspace-title {
            margin: 0;
            font-family: Georgia, "Times New Roman", serif;
            font-size: clamp(1.45rem, 2vw, 1.9rem);
            line-height: 1;
            letter-spacing: -0.035em;
        }
        .workspace-copy {
            margin: 8px 0 0;
            color: var(--muted);
            font-size: 0.88rem;
            line-height: 1.45;
        }
        .workspace-grid {
            display: grid;
            grid-template-columns: repeat(2, minmax(0, 1fr));
            gap: 10px;
        }
        .workspace-card {
            min-width: 0;
            padding: 13px;
            border: 1px solid var(--line);
            border-radius: 16px;
            background: rgba(255, 250, 242, 0.72);
        }
        .workspace-card span {
            display: block;
            margin-bottom: 8px;
            color: var(--muted);
            font-size: 0.62rem;
            font-weight: 900;
            letter-spacing: 0.1em;
            text-transform: uppercase;
        }
        .workspace-card strong {
            display: block;
            font-family: Georgia, "Times New Roman", serif;
            font-size: 1.45rem;
            line-height: 1;
        }
        .workspace-actions {
            display: flex;
            gap: 8px;
            flex-wrap: wrap;
        }
        .workspace-list {
            display: grid;
            gap: 8px;
        }
        .workspace-row {
            display: grid;
            grid-template-columns: minmax(0, 1fr) auto;
            gap: 10px;
            align-items: center;
            padding: 10px 11px;
            border: 1px solid var(--line);
            border-radius: 14px;
            background: rgba(255, 255, 255, 0.7);
        }
        .workspace-row strong {
            display: block;
            overflow-wrap: anywhere;
            font-size: 0.88rem;
        }
        .workspace-row span {
            display: block;
            margin-top: 2px;
            color: var(--muted);
            font-size: 0.76rem;
        }
        .detail-header {
            display: flex;
            justify-content: space-between;
            align-items: flex-start;
            gap: 14px;
        }
        .detail-close {
            flex: 0 0 auto;
        }
        .detail-empty {
            padding: 42px 12px;
            text-align: center;
            color: var(--muted);
        }
        .detail-title {
            margin: 0;
            font-family: Georgia, "Times New Roman", serif;
            font-size: clamp(1.55rem, 2.2vw, 2rem);
            line-height: 1;
            letter-spacing: -0.04em;
        }
        .detail-subtitle {
            margin: 8px 0 14px;
            color: var(--muted);
            line-height: 1.45;
        }
        .detail-actions {
            display: grid;
            grid-template-columns: repeat(2, minmax(0, 1fr));
            gap: 8px;
            margin: 14px 0;
        }
        .section {
            padding: 14px 0;
            border-top: 1px solid var(--line);
        }
        .section h2 {
            margin: 0 0 10px;
            font-size: 0.7rem;
            letter-spacing: 0.13em;
            text-transform: uppercase;
        }
        .field-grid {
            display: grid;
            grid-template-columns: repeat(2, minmax(0, 1fr));
            gap: 10px;
        }
        .field {
            min-width: 0;
            padding: 10px;
            border: 1px solid var(--line);
            border-radius: 13px;
            background: rgba(255, 255, 255, 0.7);
        }
        .field span {
            display: block;
            margin-bottom: 4px;
            color: var(--muted);
            font-size: 0.62rem;
            font-weight: 900;
            letter-spacing: 0.1em;
            text-transform: uppercase;
        }
        .field strong {
            display: block;
            overflow-wrap: anywhere;
            font-size: 0.88rem;
        }
        .technical-details {
            margin-top: 4px;
        }
        .technical-details summary {
            min-height: 38px;
            padding: 0 12px;
            border: 1px solid var(--line);
            border-radius: 13px;
            background: rgba(255, 255, 255, 0.72);
            cursor: pointer;
            display: inline-flex;
            align-items: center;
            font-size: 0.68rem;
            font-weight: 900;
            letter-spacing: 0.1em;
            list-style: none;
            text-transform: uppercase;
        }
        .technical-details summary::-webkit-details-marker {
            display: none;
        }
        .technical-details .field-grid {
            margin-top: 10px;
        }
        .empty {
            padding: 22px;
            color: var(--muted);
            text-align: center;
        }
        @media (max-width: 980px) {
            .layout {
                grid-template-columns: 1fr;
            }
            .hero {
                display: block;
            }
            .ops-panel {
                grid-template-columns: minmax(0, 1fr) auto;
            }
            .ops-status-main {
                grid-column: 1 / -1;
            }
            .ops-strip {
                grid-column: 1;
                justify-content: flex-start;
            }
            .ops-details-toggle {
                grid-column: 2;
            }
            .ops-grid {
                grid-template-columns: 1fr;
            }
            .calendar-head {
                display: grid;
                grid-template-columns: 1fr;
            }
            .calendar-toggle {
                justify-self: start;
            }
            .calendar-snapshot {
                grid-template-columns: repeat(2, minmax(0, 1fr));
            }
            .calendar-toolbar {
                grid-template-columns: 1fr;
            }
            .calendar-view-switch {
                justify-self: start;
            }
            .calendar-legend {
                justify-content: flex-start;
            }
            .calendar-actions {
                grid-template-columns: auto minmax(140px, 1fr) auto auto;
            }
            .form-grid {
                grid-template-columns: repeat(2, minmax(0, 1fr));
            }
            .detail-panel {
                position: static;
                max-height: none;
            }
        }
        @media (max-width: 620px) {
            .topbar {
                display: grid;
                grid-template-columns: minmax(0, 1fr) auto;
                align-items: center;
                padding: 8px 14px;
            }
            .brand {
                gap: 8px;
            }
            .brand-mark {
                width: 34px;
                height: 34px;
                border-radius: 10px;
            }
            .brand strong {
                font-size: 0.72rem;
                line-height: 1.1;
            }
            .brand span {
                display: none;
            }
            .topbar-actions {
                display: grid;
                grid-template-columns: auto;
                justify-items: end;
                gap: 6px;
            }
            .environment-chip {
                min-height: 28px;
                padding: 0 10px;
                font-size: 0.58rem;
            }
            .topbar-link {
                display: none;
            }
            .logout {
                min-height: 32px;
                padding: 0 12px;
                border-radius: 999px;
                font-size: 0.66rem;
            }
            .layout {
                gap: 12px;
                padding: 12px;
            }
            .reservations-workspace {
                order: 5;
            }
            .hero,
            .calendar-panel,
            .toolbar,
            .detail-panel {
                border-radius: 18px;
            }
            .hero,
            .toolbar,
            .detail-panel {
                padding: 14px;
            }
            .calendar-head,
            .calendar-snapshot,
            .calendar-toolbar,
            .calendar-vehicle-strip,
            .calendar-scroll {
                padding-left: 14px;
                padding-right: 14px;
            }
            .calendar-head {
                gap: 12px;
            }
            .calendar-toggle {
                width: 100%;
            }
            .calendar-snapshot {
                grid-template-columns: repeat(2, minmax(0, 1fr));
                gap: 8px;
                padding-bottom: 14px;
            }
            .calendar-metric {
                padding: 10px;
                border-radius: 14px;
            }
            .calendar-toolbar {
                gap: 10px;
                padding-top: 12px;
            }
            .calendar-actions {
                grid-template-columns: repeat(3, minmax(0, 1fr));
            }
            .calendar-actions input[type="month"] {
                grid-column: 1 / -1;
            }
            .calendar-view-switch {
                width: 100%;
            }
            .calendar-view-switch button {
                min-width: 0;
                min-height: 34px;
            }
            .calendar-vehicle-strip {
                gap: 8px;
            }
            .calendar-filter-label {
                display: none;
            }
            .calendar-vehicle-chip {
                min-height: 36px;
                padding-right: 11px;
            }
            .calendar-vehicle-chip__meta {
                display: none;
            }
            .calendar-scroll {
                overflow-x: visible;
            }
            .calendar-panel.is-month-view .calendar-scroll {
                overflow-x: auto;
            }
            .calendar-timeline {
                display: none;
            }
            .calendar-month {
                min-width: 820px;
            }
            .calendar-month__day {
                min-height: 128px;
            }
            .calendar-agenda {
                display: grid;
                gap: 10px;
            }
            .calendar-panel.is-month-view .calendar-agenda {
                display: none;
            }
            h1 {
                font-size: clamp(1.55rem, 10vw, 1.95rem);
            }
            .hero p {
                font-size: 0.86rem;
            }
            .hero-actions {
                display: grid;
                grid-template-columns: repeat(2, minmax(0, 1fr));
                gap: 8px;
                margin-top: 12px;
            }
            .hero-actions .button {
                width: 100%;
                min-height: 40px;
                padding: 0 8px;
                font-size: 0.62rem;
            }
            .manual-panel {
                border-radius: 18px;
                padding: 14px;
            }
            .ops-panel,
            .reservation-card,
            .field-grid,
            .form-grid {
                grid-template-columns: 1fr;
            }
            .search-row {
                grid-template-columns: minmax(0, 1fr) minmax(100px, auto);
                gap: 9px;
            }
            #searchInput {
                grid-column: 1 / -1;
            }
            .queue-field {
                grid-column: 1;
            }
            #refreshButton {
                grid-column: 2;
                align-self: end;
                min-width: 104px;
                padding: 0 10px;
            }
            .form-field.is-wide {
                grid-column: span 1;
            }
            .ops-panel {
                grid-template-columns: minmax(0, 1fr) auto;
                gap: 9px;
                padding: 12px;
            }
            .ops-status-main {
                grid-column: 1 / -1;
            }
            .ops-strip {
                grid-column: 1;
            }
            .ops-details-toggle {
                grid-column: 2;
                align-self: end;
                min-height: 30px;
                padding: 0 10px;
                font-size: 0.62rem;
            }
            .ops-grid {
                gap: 7px;
            }
            .reservation-card {
                gap: 8px;
                padding: 12px;
            }
            .reservation-title {
                font-size: 1.12rem;
            }
            .reservation-meta {
                gap: 4px 9px;
                font-size: 0.78rem;
            }
            .reservation-card .status,
            .workspace-row .status {
                justify-self: start;
            }
            .detail-panel {
                order: 4;
                scroll-margin-top: 78px;
            }
            .detail-panel.has-detail {
                position: fixed;
                top: 0;
                right: 0;
                bottom: 0;
                z-index: 30;
                width: min(92vw, 390px);
                height: 100dvh;
                max-height: none;
                overflow-x: hidden;
                overflow-y: auto;
                background: #fffaf2;
                border-radius: 22px 0 0 22px;
                border-top: 0;
                border-right: 0;
                border-bottom: 0;
                box-shadow: -18px 0 44px rgba(0, 0, 0, 0.24);
                overscroll-behavior: contain;
                -webkit-overflow-scrolling: touch;
            }
            .detail-backdrop:not([hidden]) {
                position: fixed;
                inset: 0;
                z-index: 20;
                display: block;
                background: rgba(13, 13, 15, 0.46);
                backdrop-filter: blur(2px);
            }
            body.has-mobile-detail {
                overflow: hidden;
            }
            .detail-header {
                align-items: flex-start;
            }
            .detail-title {
                font-size: clamp(1.42rem, 9vw, 1.82rem);
            }
            .detail-subtitle {
                margin-bottom: 10px;
                font-size: 0.9rem;
            }
            .detail-actions {
                grid-template-columns: repeat(2, minmax(0, 1fr));
            }
            .detail-actions .action.primary {
                grid-column: 1 / -1;
            }
            .detail-close {
                min-width: 78px;
            }
            .section {
                padding: 12px 0;
            }
            .field {
                padding: 9px;
            }
            .workspace-grid {
                grid-template-columns: repeat(2, minmax(0, 1fr));
                gap: 8px;
            }
            .workspace-card {
                padding: 11px;
            }
            .workspace-card strong {
                font-size: 1.25rem;
            }
            .workspace-head {
                display: grid;
                grid-template-columns: minmax(0, 1fr) auto;
                align-items: start;
            }
            .workspace-copy {
                font-size: 0.82rem;
            }
            .workspace-row {
                grid-template-columns: 1fr;
                text-align: left;
            }
        }
    </style>
</head>
<body>
    <header class="topbar">
        <div class="brand">
            <div class="brand-mark">DP</div>
            <div>
                <strong>Dynasty Prestige</strong>
                <span>Private reservations desk</span>
            </div>
        </div>
        <div class="topbar-actions">
            <span class="environment-chip">${environmentLabel}</span>
            <a class="topbar-link" href="/admin/reservations.html">Reservations</a>
            <button class="logout" id="logoutButton" type="button">Logout</button>
        </div>
    </header>
    <main class="layout">
        <section class="hero" aria-labelledby="pageTitle">
            <div>
                <h1 id="pageTitle">Reservations, clients and handovers.</h1>
                <p>Track leads, payment issues, confirmed handovers and pending review work with quick contact actions and private admin notes.</p>
            </div>
            <div class="hero-actions">
                <button class="button primary" id="manualNewButton" type="button">New booking</button>
                <button class="button primary" id="exportCsvButton" type="button">Export CSV</button>
            </div>
        </section>

        <section class="ops-panel is-review" id="operationsPanel" aria-live="polite">
            <div class="ops-status-main">
                <span class="ops-dot" aria-hidden="true"></span>
                <div>
                <h2 class="ops-title">System status</h2>
                <p class="ops-copy" id="operationsSummary">Checking reservation storage, Stripe mode and admin setup...</p>
                </div>
            </div>
            <div class="ops-strip" id="operationsMetrics">
                <span class="ops-chip"><span>Status</span><strong>Checking...</strong></span>
            </div>
            <button class="ops-details-toggle" id="operationsDetailsToggle" type="button" aria-expanded="false" aria-controls="operationsDetailsPanel">Show details</button>
            <div class="ops-details-panel" id="operationsDetailsPanel" hidden>
                <div class="ops-details-head">
                    <span>Readiness details</span>
                    <button class="ops-details-close" id="operationsDetailsClose" type="button">Hide</button>
                </div>
                <div class="ops-grid" id="operationsGrid">
                    <div class="ops-metric"><span>Status</span><strong>Checking...</strong></div>
                </div>
            </div>
        </section>

        <section class="calendar-panel is-collapsed" id="calendarPanel" aria-labelledby="calendarTitle">
            <div class="calendar-head">
                <div>
                    <p class="calendar-kicker">Fleet calendar</p>
                    <h2 class="calendar-title" id="calendarTitle">Reservations by day and car.</h2>
                    <p class="calendar-summary" id="calendarSummary">Loading scheduled bookings...</p>
                </div>
                <button class="action calendar-toggle" id="calendarToggleButton" type="button" aria-expanded="false" aria-controls="calendarBody">
                    <span id="calendarToggleLabel">Open calendar</span>
                    <span class="calendar-toggle__icon" aria-hidden="true"></span>
                </button>
            </div>
            <div class="calendar-snapshot" id="calendarSnapshot" aria-live="polite">
                <span class="calendar-metric"><span>Month</span><strong>Loading...</strong></span>
                <span class="calendar-metric"><span>Bookings</span><strong>Checking</strong></span>
                <span class="calendar-metric"><span>Cars</span><strong>Checking</strong></span>
                <span class="calendar-metric"><span>Busy days</span><strong>Checking</strong></span>
            </div>
            <div class="calendar-body" id="calendarBody" hidden>
                <div class="calendar-toolbar">
                    <div class="calendar-actions" aria-label="Calendar controls">
                        <button class="action" id="calendarPreviousButton" type="button">Previous</button>
                        <input id="calendarMonthInput" type="month" aria-label="Calendar month">
                        <button class="action" id="calendarNextButton" type="button">Next</button>
                        <button class="action primary" id="calendarTodayButton" type="button">Today</button>
                    </div>
                    <div class="calendar-view-switch" role="tablist" aria-label="Calendar view">
                        <button class="is-active" type="button" role="tab" aria-selected="true" data-calendar-view="timeline">Timeline</button>
                        <button type="button" role="tab" aria-selected="false" data-calendar-view="month">Month</button>
                    </div>
                    <div class="calendar-legend" aria-label="Reservation status legend">
                        <span><i class="confirmed" aria-hidden="true"></i>Confirmed</span>
                        <span><i class="pending" aria-hidden="true"></i>Pending</span>
                        <span><i class="issue" aria-hidden="true"></i>Needs action</span>
                    </div>
                </div>
                <div class="calendar-vehicle-strip" id="calendarVehicleSummary" aria-live="polite"></div>
                <div class="calendar-scroll">
                    <div class="calendar-grid" id="reservationCalendarGrid">
                        <div class="empty">Loading calendar...</div>
                    </div>
                </div>
            </div>
        </section>

        <section class="manual-panel" id="manualPanel" hidden>
            <div class="panel-heading">
                <div>
                    <h2 id="manualPanelTitle">New booking</h2>
                    <p id="manualPanelCopy">Create reservations received by WhatsApp, phone or partner handoff without using public checkout.</p>
                </div>
                <button class="action" id="manualCloseButton" type="button">Close</button>
            </div>
            <form id="manualReservationForm">
                <div class="form-grid">
                    <div class="form-field">
                        <label for="manualCustomerName">Client name</label>
                        <input id="manualCustomerName" name="customerName" required>
                    </div>
                    <div class="form-field">
                        <label for="manualCustomerPhone">WhatsApp / phone</label>
                        <input id="manualCustomerPhone" name="customerPhone" required>
                    </div>
                    <div class="form-field">
                        <label for="manualCustomerEmail">Email</label>
                        <input id="manualCustomerEmail" name="customerEmail" type="email">
                    </div>
                    <div class="form-field">
                        <label for="manualCustomerId">ID / passport</label>
                        <input id="manualCustomerId" name="customerIdDocument">
                    </div>
                    <div class="form-field is-wide">
                        <label for="manualVehicle">Vehicle</label>
                        <input id="manualVehicle" name="vehicle" required>
                    </div>
                    <div class="form-field">
                        <label for="manualStatus">Status</label>
                        <select id="manualStatus" name="status">
                            <option value="received">Received</option>
                            <option value="lead_received">Lead received</option>
                            <option value="checkout_started">Checkout started</option>
                            <option value="payment_intent_created">Payment started</option>
                            <option value="payment_requires_action">Payment requires action</option>
                            <option value="customer_processing_failed">Customer processing failed</option>
                            <option value="payment_intent_failed">Payment intent failed</option>
                            <option value="payment_failed">Payment failed</option>
                            <option value="payment_canceled">Payment canceled</option>
                            <option value="confirmed">Confirmed</option>
                            <option value="payment_succeeded">Payment succeeded</option>
                            <option value="reservation_confirmed">Reservation confirmed</option>
                            <option value="confirmed_email_failed">Email issue</option>
                            <option value="failed">Failed</option>
                            <option value="error">Error</option>
                            <option value="admin_canceled">Canceled by admin</option>
                        </select>
                    </div>
                    <div class="form-field">
                        <label for="manualCurrency">Currency</label>
                        <input id="manualCurrency" name="currency" value="AED">
                    </div>
                    <div class="form-field">
                        <label for="manualStartDate">Start date</label>
                        <input id="manualStartDate" name="startDate" type="date">
                    </div>
                    <div class="form-field">
                        <label for="manualEndDate">End date</label>
                        <input id="manualEndDate" name="endDate" type="date">
                    </div>
                    <div class="form-field">
                        <label for="manualPickupTime">Pickup time</label>
                        <input id="manualPickupTime" name="pickupTime" type="time">
                    </div>
                    <div class="form-field">
                        <label for="manualDropoffTime">Dropoff time</label>
                        <input id="manualDropoffTime" name="dropoffTime" type="time">
                    </div>
                    <div class="form-field is-wide">
                        <label for="manualPickupLocation">Pickup location</label>
                        <input id="manualPickupLocation" name="pickupLocation">
                    </div>
                    <div class="form-field is-wide">
                        <label for="manualDropoffLocation">Dropoff location</label>
                        <input id="manualDropoffLocation" name="dropoffLocation">
                    </div>
                    <div class="form-field">
                        <label for="manualTotalAmount">Total</label>
                        <input id="manualTotalAmount" name="totalAmount" inputmode="decimal">
                    </div>
                    <div class="form-field">
                        <label for="manualUpfrontAmount">Upfront</label>
                        <input id="manualUpfrontAmount" name="upfrontAmount" inputmode="decimal">
                    </div>
                    <div class="form-field">
                        <label for="manualRemainingAmount">Remaining</label>
                        <input id="manualRemainingAmount" name="remainingAmount" inputmode="decimal">
                    </div>
                    <div class="form-field is-wide">
                        <label for="manualNotes">Admin notes</label>
                        <textarea id="manualNotes" name="notes"></textarea>
                    </div>
                </div>
                <div class="form-actions">
                    <button class="action" id="manualCancelButton" type="button">Cancel</button>
                    <button class="action primary" id="manualSubmitButton" type="submit">Save booking</button>
                </div>
            </form>
        </section>

        <section class="reservations-workspace">
            <div class="toolbar">
                <div class="search-row">
                    <input id="searchInput" type="search" placeholder="Search client, phone, vehicle or ID">
                    <div class="queue-field">
                        <label for="queueFilterSelect">Work queue</label>
                        <select id="queueFilterSelect">
                            <option value="">All work</option>
                            <option value="new_leads">New leads</option>
                            <option value="new_today">New today</option>
                            <option value="pending_review">Needs review</option>
                            <option value="pending_payment">Awaiting payment</option>
                            <option value="payment_issues">Payment issues</option>
                            <option value="confirmed_to_schedule">Plan handover</option>
                            <option value="email_issue">Email follow-up</option>
                            <option value="pickup_today">Pickup today</option>
                            <option value="next_7_days">Next 7 days</option>
                            <option value="handover_done">Completed</option>
                            <option value="canceled">Canceled</option>
                            <option value="archived">Archived</option>
                        </select>
                    </div>
                    <button class="button primary" id="refreshButton" type="button">Refresh</button>
                </div>
            </div>
            <div class="list-panel">
                <div class="stats">
                    <span id="resultCount">Loading reservations...</span>
                    <span id="storageMode"></span>
                </div>
                <div class="cards" id="reservationList"></div>
            </div>
        </section>

        <div class="detail-backdrop" id="reservationDetailBackdrop" hidden></div>
        <aside class="detail-panel" id="reservationDetail" aria-live="polite">
            <div class="detail-empty">Loading operations overview...</div>
        </aside>
    </main>

    <script>
        var state = {
            quick: '',
            q: '',
            selectedId: '',
            manualMode: 'create',
            currentReservation: null,
            lastListData: null,
            lastCalendarData: null,
            calendarMonth: '',
            calendarView: 'timeline',
            calendarVehicleFilter: '',
            calendarOpen: false,
            calendarLoaded: false
        };
        var searchTimer = null;
        var calendarResizeTimer = null;
        var quickFilterLabels = {
            '': 'All work',
            new_leads: 'New leads',
            new_today: 'New today',
            pending_review: 'Needs review',
            pending_payment: 'Awaiting payment',
            payment_issues: 'Payment issues',
            confirmed_to_schedule: 'Plan handover',
            email_issue: 'Email follow-up',
            pickup_today: 'Pickup today',
            next_7_days: 'Next 7 days',
            handover_done: 'Completed',
            canceled: 'Canceled',
            archived: 'Archived'
        };

        function escapeHtml(value) {
            return String(value == null ? '' : value)
                .replace(/&/g, '&amp;')
                .replace(/</g, '&lt;')
                .replace(/>/g, '&gt;')
                .replace(/"/g, '&quot;')
                .replace(/'/g, '&#039;');
        }

        function display(value, fallback) {
            var clean = value == null ? '' : String(value).trim();
            return clean || (fallback || 'Not set');
        }

        function queueLabel(value) {
            return quickFilterLabels[value || ''] || display(String(value || '').replace(/_/g, ' '));
        }

        function numberFromMoney(value) {
            var numeric = Number.parseFloat(String(value || '').replace(/[^0-9.-]/g, ''));
            return Number.isFinite(numeric) ? numeric : 0;
        }

        function formatDashboardMoney(value) {
            if (!Number.isFinite(value) || value <= 0) return 'AED 0';
            return 'AED ' + Math.round(value).toLocaleString('en-US');
        }

        function formatDate(value) {
            if (!value) return 'Not set';
            var date = new Date(value);
            if (Number.isNaN(date.getTime())) return value;
            return new Intl.DateTimeFormat('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }).format(date);
        }

        function statusClass(item) {
            if (item.flags && item.flags.archived) return 'canceled';
            if (item.flags && item.flags.canceled) return 'canceled';
            if (item.flags && item.flags.emailIssue) return 'email';
            if (item.flags && item.flags.paymentIssue) return 'failed';
            if (item.flags && item.flags.pendingPayment) return 'pending';
            if (item.flags && item.flags.confirmed) return 'confirmed';
            return '';
        }

        function statusWord(value) {
            if (value === 'ok') return 'Ready';
            if (value === 'bad') return 'Needs setup';
            return 'Review';
        }

        function checkWord(value) {
            if (value === 'pass') return 'OK';
            if (value === 'fail') return 'Fix';
            return 'Review';
        }

        function renderOperationsStatus(data) {
            var panel = document.getElementById('operationsPanel');
            var summary = document.getElementById('operationsSummary');
            var metrics = document.getElementById('operationsMetrics');
            var grid = document.getElementById('operationsGrid');
            var overall = data.overallStatus || 'review';
            panel.classList.remove('is-ok', 'is-review', 'is-bad');
            panel.classList.add('is-' + overall);
            var storageMode = data.storage && data.storage.mode ? data.storage.mode : 'unknown';
            var stripeMode = data.services && data.services.stripeMode ? data.services.stripeMode : 'unknown';
            summary.textContent = data.label + ' - ' + statusWord(overall) + ' - ' +
                storageMode + ' - Stripe ' + stripeMode;

            var checks = Array.isArray(data.checks) ? data.checks : [];
            var crmData = data.storage && data.storage.crmData ? data.storage.crmData : {};
            var metricChips = [
                '<span class="ops-chip"><span>Reservations</span><strong>' + escapeHtml(data.storage && data.storage.reservationCount != null ? data.storage.reservationCount : 'Unknown') + '</strong></span>',
                '<span class="ops-chip"><span>Customers</span><strong>' + escapeHtml(crmData.customerCount != null ? crmData.customerCount : 'Unknown') + '</strong></span>',
                '<span class="ops-chip"><span>AI-ready</span><strong>' + escapeHtml(crmData.aiReadyReservationCount != null ? crmData.aiReadyReservationCount : 'Unknown') + '</strong></span>',
                '<span class="ops-chip"><span>Data</span><strong>' + escapeHtml(crmData.averageDataQualityScore != null ? crmData.averageDataQualityScore + '%' : 'Unknown') + '</strong></span>',
                '<span class="ops-chip"><span>DB</span><strong>' + escapeHtml(data.storage && data.storage.databaseConfigured ? 'Postgres' : 'Local') + '</strong></span>'
            ];
            var checkCards = checks.map(function (check) {
                return '<div class="ops-check is-' + escapeHtml(check.status || 'warn') + '">' +
                    '<span>' + escapeHtml(check.label || 'Check') + '</span>' +
                    '<strong>' + escapeHtml(checkWord(check.status)) + '</strong>' +
                '</div>';
            });

            metrics.innerHTML = metricChips.join('');
            grid.innerHTML = checkCards.join('');
        }

        async function loadOperationsStatus() {
            try {
                var response = await api('/api/admin/reservations/operations');
                var data = await response.json();
                renderOperationsStatus(data);
            } catch (error) {
                document.getElementById('operationsSummary').textContent = 'CRM readiness could not be checked.';
                document.getElementById('operationsMetrics').innerHTML =
                    '<span class="ops-chip"><span>Status</span><strong>Unavailable</strong></span>';
                document.getElementById('operationsGrid').innerHTML =
                    '<div class="ops-check is-fail"><span>Status</span><strong>Unavailable</strong></div>';
            }
        }

        function setOperationsDetailsOpen(isOpen) {
            var panel = document.getElementById('operationsDetailsPanel');
            var toggle = document.getElementById('operationsDetailsToggle');
            panel.hidden = !isOpen;
            toggle.setAttribute('aria-expanded', isOpen ? 'true' : 'false');
            toggle.textContent = isOpen ? 'Hide details' : 'Show details';
        }

        async function api(path, options) {
            var response = await fetch(path, Object.assign({ credentials: 'same-origin' }, options || {}));
            if (response.status === 401) {
                window.location.href = '/admin/login.html';
                return Promise.reject(new Error('Admin session required'));
            }
            return response;
        }

        function currentMonthValue(date) {
            var source = date instanceof Date ? date : new Date();
            if (Number.isNaN(source.getTime())) source = new Date();
            return source.getFullYear() + '-' + String(source.getMonth() + 1).padStart(2, '0');
        }

        function addCalendarMonths(monthValue, offset) {
            var parts = String(monthValue || currentMonthValue()).split('-').map(Number);
            var year = Number.isFinite(parts[0]) ? parts[0] : new Date().getFullYear();
            var month = Number.isFinite(parts[1]) ? parts[1] : new Date().getMonth() + 1;
            var date = new Date(year, month - 1 + offset, 1);
            return currentMonthValue(date);
        }

        function setCalendarOpen(open) {
            state.calendarOpen = Boolean(open);
            var panel = document.getElementById('calendarPanel');
            var body = document.getElementById('calendarBody');
            var button = document.getElementById('calendarToggleButton');
            var label = document.getElementById('calendarToggleLabel');
            if (!panel || !body || !button || !label) return;
            panel.classList.toggle('is-open', state.calendarOpen);
            panel.classList.toggle('is-collapsed', !state.calendarOpen);
            body.hidden = !state.calendarOpen;
            button.setAttribute('aria-expanded', state.calendarOpen ? 'true' : 'false');
            label.textContent = state.calendarOpen ? 'Hide calendar' : 'Open calendar';
        }

        function calendarWeekdayLabel(dateIso) {
            var date = new Date(String(dateIso || '') + 'T00:00:00');
            if (Number.isNaN(date.getTime())) return '';
            return new Intl.DateTimeFormat('en-GB', { weekday: 'short' }).format(date);
        }

        function calendarStatusClasses(baseClass, item) {
            var classes = [baseClass];
            if (item.statusClass) classes.push(item.statusClass);
            return classes.join(' ');
        }

        function calendarReservationMeta(item) {
            var pieces = [];
            if (item.customer) pieces.push(item.customer);
            if (item.dayTime) pieces.push(item.dayTime);
            if (item.continuesBefore && !item.isEnd) pieces.push('Continues');
            if (item.isEnd && item.isMultiDay) pieces.push('Return');
            if (item.isStart && item.isMultiDay) pieces.push('Pickup');
            return pieces.join(' - ');
        }

        function calendarTimelineMeta(item) {
            var pieces = [];
            if (item.startsBeforeMonth) {
                pieces.push('Started ' + formatDate(item.startDate));
            } else if (item.pickupTime) {
                pieces.push('Pickup ' + item.pickupTime);
            }
            if (item.endsAfterMonth) {
                pieces.push('Continues after month');
            } else if (item.dropoffTime) {
                pieces.push('Return ' + item.dropoffTime);
            }
            return pieces.join(' - ') || display(item.statusLabel, 'Reservation');
        }

        function renderTimelineDay(day) {
            var classes = ['calendar-timeline__day'];
            if (day.isToday) classes.push('is-today');
            if (day.isWeekend) classes.push('is-weekend');
            return '<span class="' + classes.join(' ') + '">' +
                '<strong>' + escapeHtml(day.dayNumber) + '</strong>' +
                '<span>' + escapeHtml(day.weekday || calendarWeekdayLabel(day.date)) + '</span>' +
            '</span>';
        }

        function renderTimelineCell(day, index, laneCount) {
            var classes = ['calendar-timeline__cell'];
            if (day.isToday) classes.push('is-today');
            if (day.isWeekend) classes.push('is-weekend');
            return '<span class="' + classes.join(' ') + '" style="grid-column:' + escapeHtml(index + 1) + ';grid-row:1 / span ' + escapeHtml(laneCount) + '"></span>';
        }

        function renderTimelineBooking(item) {
            var start = Math.max(1, Number(item.offsetDays || 0) + 1);
            var span = Math.max(1, Number(item.spanDays || 1));
            var row = Math.max(1, Number(item.lane || 0) + 1);
            var classes = calendarStatusClasses('calendar-timeline__booking', item).split(' ');
            if (item.startsBeforeMonth) classes.push('is-clipped-start');
            if (item.endsAfterMonth) classes.push('is-clipped-end');
            var label = 'Open reservation ' + display(item.vehicle, 'Vehicle not set') + ' for ' + display(item.customer, 'guest');
            return '<button class="' + escapeHtml(classes.join(' ')) + '" type="button" data-calendar-reservation-id="' + escapeHtml(item.id) + '" aria-label="' + escapeHtml(label) + '" style="grid-column:' + escapeHtml(start) + ' / span ' + escapeHtml(span) + ';grid-row:' + escapeHtml(row) + '">' +
                '<span class="calendar-timeline__client">' + escapeHtml(display(item.customer, 'Guest not set')) + '</span>' +
                '<span class="calendar-timeline__meta">' + escapeHtml(calendarTimelineMeta(item)) + '</span>' +
            '</button>';
        }

        function renderTimelineVehicleRow(vehicle, days) {
            var reservations = Array.isArray(vehicle.reservations) ? vehicle.reservations : [];
            var laneCount = Math.max(1, Number(vehicle.laneCount || 1));
            var bookingCount = Number(vehicle.reservationCount || reservations.length || 0);
            var dayCount = Number(vehicle.bookingDayCount || 0);
            return '<div class="calendar-timeline__row" style="--lane-count:' + escapeHtml(laneCount) + '">' +
                '<div class="calendar-timeline__vehicle">' +
                    '<strong>' + escapeHtml(display(vehicle.name, 'Vehicle not set')) + '</strong>' +
                    '<span>' + escapeHtml(bookingCount + ' booking' + (bookingCount === 1 ? '' : 's') + ' - ' + dayCount + ' blocked day' + (dayCount === 1 ? '' : 's')) + '</span>' +
                '</div>' +
                '<div class="calendar-timeline__lane" style="--lane-count:' + escapeHtml(laneCount) + ';--timeline-day-count:' + escapeHtml(days.length || 31) + '">' +
                    days.map(function (day, index) { return renderTimelineCell(day, index, laneCount); }).join('') +
                    reservations.map(renderTimelineBooking).join('') +
                '</div>' +
            '</div>';
        }

        function renderCalendarTimeline(data) {
            var timeline = data && data.timeline ? data.timeline : {};
            var days = Array.isArray(timeline.days) ? timeline.days : [];
            var vehicles = Array.isArray(timeline.vehicles) ? timeline.vehicles : [];
            if (!days.length || !vehicles.length) {
                return '<div class="empty">No cars scheduled this month.</div>';
            }
            return '<div class="calendar-timeline" style="--timeline-day-count:' + escapeHtml(days.length) + '">' +
                '<div class="calendar-timeline__header">' +
                    '<div class="calendar-timeline__corner">Fleet</div>' +
                    '<div class="calendar-timeline__days">' + days.map(renderTimelineDay).join('') + '</div>' +
                '</div>' +
                '<div class="calendar-timeline__rows">' + vehicles.map(function (vehicle) {
                    return renderTimelineVehicleRow(vehicle, days);
                }).join('') + '</div>' +
            '</div>';
        }

        function renderMonthBooking(item) {
            var label = 'Open reservation ' + display(item.vehicle, 'Vehicle not set') + ' for ' + display(item.customer, 'guest');
            return '<button class="' + escapeHtml(calendarStatusClasses('calendar-month__booking', item)) + '" type="button" data-calendar-reservation-id="' + escapeHtml(item.id) + '" aria-label="' + escapeHtml(label) + '">' +
                '<span class="calendar-month__vehicle">' + escapeHtml(display(item.vehicle, 'Vehicle not set')) + '</span>' +
                '<span class="calendar-month__meta">' + escapeHtml(calendarReservationMeta(item) || display(item.statusLabel, 'Reservation')) + '</span>' +
            '</button>';
        }

        function renderMonthDay(day) {
            var reservations = Array.isArray(day.reservations) ? day.reservations : [];
            var classes = ['calendar-month__day'];
            if (!day.isCurrentMonth) classes.push('is-muted');
            if (day.isToday) classes.push('is-today');
            if (day.isWeekend) classes.push('is-weekend');
            var countLabel = reservations.length
                ? reservations.length + ' booking' + (reservations.length === 1 ? '' : 's')
                : '';
            return '<section class="' + escapeHtml(classes.join(' ')) + '">' +
                '<div class="calendar-month__day-head">' +
                    '<span class="calendar-month__date">' + escapeHtml(day.dayNumber || String(day.date || '').slice(-2)) + '</span>' +
                    '<span class="calendar-month__count">' + escapeHtml(countLabel) + '</span>' +
                '</div>' +
                '<div class="calendar-month__items">' + reservations.map(renderMonthBooking).join('') + '</div>' +
            '</section>';
        }

        function renderCalendarMonth(data) {
            var days = Array.isArray(data.days) ? data.days : [];
            if (!days.length) {
                return '<div class="empty">No calendar days available.</div>';
            }
            var weekdayLabels = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
            return '<div class="calendar-month">' +
                '<div class="calendar-month__weekdays">' + weekdayLabels.map(function (label) {
                    return '<span class="calendar-month__weekday">' + escapeHtml(label) + '</span>';
                }).join('') + '</div>' +
                '<div class="calendar-month__grid">' + days.map(renderMonthDay).join('') + '</div>' +
            '</div>';
        }

        function renderAgendaBooking(item) {
            var label = 'Open reservation ' + display(item.vehicle, 'Vehicle not set') + ' for ' + display(item.customer, 'guest');
            return '<button class="' + escapeHtml(calendarStatusClasses('calendar-agenda__booking', item)) + '" type="button" data-calendar-reservation-id="' + escapeHtml(item.id) + '" aria-label="' + escapeHtml(label) + '">' +
                '<strong>' + escapeHtml(display(item.vehicle, 'Vehicle not set')) + '</strong>' +
                '<span>' + escapeHtml(calendarReservationMeta(item) || display(item.statusLabel, 'Reservation')) + '</span>' +
            '</button>';
        }

        function renderCalendarAgenda(data) {
            var days = Array.isArray(data.days) ? data.days.filter(function (day) {
                return day.isCurrentMonth && Array.isArray(day.reservations) && day.reservations.length;
            }) : [];
            if (!days.length) {
                return '<div class="calendar-agenda"><div class="empty">No cars scheduled this month.</div></div>';
            }
            return '<div class="calendar-agenda">' + days.map(function (day) {
                return '<section class="calendar-agenda__day">' +
                    '<div class="calendar-agenda__head">' +
                        '<strong>' + escapeHtml(formatDate(day.date)) + '</strong>' +
                        '<span>' + escapeHtml(day.reservations.length + ' booking' + (day.reservations.length === 1 ? '' : 's')) + '</span>' +
                    '</div>' +
                    '<div class="calendar-agenda__items">' + day.reservations.map(renderAgendaBooking).join('') + '</div>' +
                '</section>';
            }).join('') + '</div>';
        }

        function getVisibleCalendarData(data) {
            var selectedVehicle = state.calendarVehicleFilter || '';
            if (!selectedVehicle) return data;

            var timeline = data && data.timeline ? data.timeline : {};
            var visibleTimeline = {
                dayCount: timeline.dayCount,
                days: Array.isArray(timeline.days) ? timeline.days : [],
                vehicles: Array.isArray(timeline.vehicles)
                    ? timeline.vehicles.filter(function (vehicle) {
                        return vehicle.name === selectedVehicle;
                    })
                    : []
            };
            var visibleDays = Array.isArray(data.days)
                ? data.days.map(function (day) {
                    var reservations = Array.isArray(day.reservations)
                        ? day.reservations.filter(function (reservation) {
                            return reservation.vehicle === selectedVehicle;
                        })
                        : [];
                    return {
                        ...day,
                        reservations: reservations
                    };
                })
                : [];

            return {
                ...data,
                timeline: visibleTimeline,
                days: visibleDays
            };
        }

        function renderCalendarBody(data) {
            if (!Array.isArray(data.days) || !data.days.length) {
                return '<div class="empty">No calendar days available.</div>';
            }
            var visibleData = getVisibleCalendarData(data);
            if (state.calendarView === 'month') {
                return renderCalendarMonth(visibleData);
            }
            return isMobileCrmViewport()
                ? renderCalendarAgenda(visibleData)
                : renderCalendarTimeline(visibleData);
        }

        function bindCalendarReservations() {
            document.querySelectorAll('[data-calendar-reservation-id]').forEach(function (button) {
                button.addEventListener('click', function () {
                    openReservation(button.getAttribute('data-calendar-reservation-id'));
                });
            });
        }

        function bindCalendarVehicleFilters() {
            document.querySelectorAll('[data-calendar-vehicle-filter]').forEach(function (button) {
                button.addEventListener('click', function () {
                    state.calendarVehicleFilter = button.getAttribute('data-calendar-vehicle-filter') || '';
                    renderReservationCalendar(state.lastCalendarData);
                });
            });
        }

        function updateCalendarViewControls() {
            var view = state.calendarView === 'month' ? 'month' : 'timeline';
            state.calendarView = view;
            var panel = document.getElementById('calendarPanel');
            if (panel) {
                panel.classList.toggle('is-month-view', view === 'month');
                panel.classList.toggle('is-timeline-view', view !== 'month');
            }
            document.querySelectorAll('[data-calendar-view]').forEach(function (button) {
                var isActive = button.getAttribute('data-calendar-view') === view;
                button.classList.toggle('is-active', isActive);
                button.setAttribute('aria-selected', isActive ? 'true' : 'false');
            });
        }

        function renderCalendarSnapshot(data) {
            var snapshot = document.getElementById('calendarSnapshot');
            if (!snapshot) return;
            var totals = data && data.totals ? data.totals : {};
            var reservations = totals.reservations != null ? totals.reservations : 0;
            var vehicles = totals.vehicles != null ? totals.vehicles : 0;
            var busyDays = totals.daysWithReservations != null ? totals.daysWithReservations : 0;
            var label = data ? display(data.label, data.month || state.calendarMonth || 'Calendar') : 'Calendar';
            snapshot.innerHTML = [
                '<span class="calendar-metric"><span>Month</span><strong>' + escapeHtml(label) + '</strong></span>',
                '<span class="calendar-metric"><span>Bookings</span><strong>' + escapeHtml(reservations) + '</strong></span>',
                '<span class="calendar-metric"><span>Cars</span><strong>' + escapeHtml(vehicles) + '</strong></span>',
                '<span class="calendar-metric"><span>Busy days</span><strong>' + escapeHtml(busyDays) + '</strong></span>'
            ].join('');
        }

        function renderReservationCalendar(data) {
            var summary = document.getElementById('calendarSummary');
            var vehicles = document.getElementById('calendarVehicleSummary');
            var grid = document.getElementById('reservationCalendarGrid');
            var monthInput = document.getElementById('calendarMonthInput');
            state.lastCalendarData = data;
            state.calendarMonth = data.month || state.calendarMonth || currentMonthValue();
            monthInput.value = state.calendarMonth;
            var totalReservations = data.totals && data.totals.reservations != null ? data.totals.reservations : 0;
            var totalVehicles = data.totals && data.totals.vehicles != null ? data.totals.vehicles : 0;
            var totalBusyDays = data.totals && data.totals.daysWithReservations != null ? data.totals.daysWithReservations : 0;
            summary.textContent = display(data.label, state.calendarMonth) + ' - ' +
                totalReservations +
                ' scheduled reservation' + (totalReservations === 1 ? '' : 's') +
                ' across ' + totalVehicles + ' car' +
                (totalVehicles === 1 ? '' : 's') +
                ' on ' + totalBusyDays + ' active day' + (totalBusyDays === 1 ? '' : 's') + '.';
            renderCalendarSnapshot(data);
            var vehicleItems = Array.isArray(data.vehicles) ? data.vehicles : [];
            var vehicleNames = vehicleItems.map(function (vehicle) { return vehicle.name; });
            if (state.calendarVehicleFilter && !vehicleNames.includes(state.calendarVehicleFilter)) {
                state.calendarVehicleFilter = '';
            }
            updateCalendarViewControls();
            vehicles.innerHTML = vehicleItems.length
                ? '<span class="calendar-filter-label">Focus</span>' +
                    '<button class="calendar-vehicle-chip' + (!state.calendarVehicleFilter ? ' is-active' : '') + '" type="button" data-calendar-vehicle-filter="">' +
                    '<span class="calendar-vehicle-chip__count">' + escapeHtml(totalVehicles) + '</span>' +
                    '<span class="calendar-vehicle-chip__text"><span class="calendar-vehicle-chip__label">All cars</span><span class="calendar-vehicle-chip__meta">' + escapeHtml(totalReservations + ' bookings') + '</span></span></button>' +
                    vehicleItems.slice(0, 8).map(function (vehicle) {
                    var isActive = state.calendarVehicleFilter === vehicle.name;
                    var blockedDays = Number(vehicle.bookingDayCount || 0);
                    return '<button class="calendar-vehicle-chip' + (isActive ? ' is-active' : '') + '" type="button" data-calendar-vehicle-filter="' + escapeHtml(vehicle.name) + '">' +
                        '<span class="calendar-vehicle-chip__count">' + escapeHtml(vehicle.reservationCount) + '</span>' +
                        '<span class="calendar-vehicle-chip__text"><span class="calendar-vehicle-chip__label">' + escapeHtml(vehicle.name) + '</span>' +
                        '<span class="calendar-vehicle-chip__meta">' + escapeHtml(blockedDays + ' blocked day' + (blockedDays === 1 ? '' : 's')) + '</span></span></button>';
                }).join('')
                : '<span class="calendar-filter-label">Focus</span><span class="calendar-vehicle-chip"><span class="calendar-vehicle-chip__count">0</span><span class="calendar-vehicle-chip__text"><span class="calendar-vehicle-chip__label">No cars scheduled this month</span></span></span>';
            grid.innerHTML = renderCalendarBody(data);
            bindCalendarReservations();
            bindCalendarVehicleFilters();
        }

        async function loadReservationCalendar() {
            var grid = document.getElementById('reservationCalendarGrid');
            var month = state.calendarMonth || currentMonthValue();
            state.calendarMonth = month;
            document.getElementById('calendarMonthInput').value = month;
            grid.innerHTML = '<div class="empty">Loading calendar...</div>';
            try {
                var response = await api('/api/admin/reservations/calendar?month=' + encodeURIComponent(month));
                var data = await response.json();
                if (!response.ok) throw new Error(data.error || 'Calendar failed');
                renderReservationCalendar(data);
                state.calendarLoaded = true;
            } catch (error) {
                grid.innerHTML = '<div class="empty">Calendar could not be loaded.</div>';
                document.getElementById('calendarSummary').textContent = 'Calendar data could not be checked.';
                renderCalendarSnapshot(null);
            }
        }

        function currentQueryString() {
            var params = new URLSearchParams();
            if (state.quick) params.set('quick', state.quick);
            if (state.q) params.set('q', state.q);
            params.set('limit', '500');
            return params.toString();
        }

        function renderCard(item) {
            var activeClass = item.id === state.selectedId ? ' is-active' : '';
            var dateText = display(item.schedule.startDate) + ' to ' + display(item.schedule.endDate);
            var contactFlag = item.admin.contacted ? 'Contacted' : 'No contact mark';
            if (item.flags.toContact) contactFlag = 'Pending review';
            if (item.flags.handoverDone) contactFlag = 'Handover done';
            if (item.flags.canceled) contactFlag = 'Canceled';
            if (item.flags.archived) contactFlag = 'Archived';
            return '<button class="reservation-card' + activeClass + '" type="button" data-reservation-id="' + escapeHtml(item.id) + '">' +
                '<div>' +
                    '<h2 class="reservation-title">' + escapeHtml(display(item.vehicle.name, 'Vehicle not set')) + '</h2>' +
                    '<div class="reservation-meta">' +
                        '<span>' + escapeHtml(display(item.customer.name, 'Guest not set')) + '</span>' +
                        '<span>' + escapeHtml(display(item.reservationId)) + '</span>' +
                        '<span>' + escapeHtml(dateText) + '</span>' +
                        '<span>' + escapeHtml(display(item.payment.total, 'Total not set')) + '</span>' +
                        '<span>' + escapeHtml(contactFlag) + '</span>' +
                    '</div>' +
                '</div>' +
                '<span class="status ' + statusClass(item) + '">' + escapeHtml(item.statusLabel) + '</span>' +
            '</button>';
        }

        function bindReservationCards() {
            document.querySelectorAll('[data-reservation-id]').forEach(function (button) {
                button.addEventListener('click', function () {
                    openReservation(button.getAttribute('data-reservation-id'));
                });
            });
        }

        function renderList(data) {
            var list = document.getElementById('reservationList');
            state.lastListData = data;
            document.getElementById('resultCount').textContent = data.total + ' reservation' + (data.total === 1 ? '' : 's') + ' found';
            document.getElementById('storageMode').textContent = data.storage ? 'Storage: ' + data.storage : '';

            if (!data.items.length) {
                list.innerHTML = '<div class="empty">No reservations match this view yet.</div>';
                if (!state.selectedId) renderWorkspaceOverview(data);
                return;
            }

            list.innerHTML = data.items.map(renderCard).join('');
            bindReservationCards();

            if (!state.selectedId) {
                renderWorkspaceOverview(data);
            }
        }

        async function loadReservations() {
            var list = document.getElementById('reservationList');
            list.innerHTML = '<div class="empty">Loading reservations...</div>';
            try {
                var response = await api('/api/admin/reservations?' + currentQueryString());
                var data = await response.json();
                renderList(data);
            } catch (error) {
                list.innerHTML = '<div class="empty">Reservations could not be loaded.</div>';
            }
        }

        function field(label, value) {
            return '<div class="field"><span>' + escapeHtml(label) + '</span><strong>' + escapeHtml(display(value)) + '</strong></div>';
        }

        function hasDisplayValue(value) {
            return value != null && String(value).trim() !== '';
        }

        function optionalField(label, value) {
            return hasDisplayValue(value) ? field(label, value) : '';
        }

        function fieldSection(title, fieldsHtml, emptyText) {
            var content = String(fieldsHtml || '').trim();
            if (!content && !emptyText) return '';
            return '<div class="section"><h2>' + escapeHtml(title) + '</h2>' +
                (content ? '<div class="field-grid">' + content + '</div>' : '<div class="empty">' + escapeHtml(emptyText) + '</div>') +
            '</div>';
        }

        function paymentStatusLabel(value) {
            var status = String(value || '').trim();
            if (!status) return '';
            var labels = {
                requires_payment_method: 'Payment not completed',
                requires_action: 'Payment requires action',
                processing: 'Payment processing',
                succeeded: 'Payment received',
                canceled: 'Payment canceled',
                failed: 'Payment failed'
            };
            return labels[status] || status.replace(/_/g, ' ');
        }

        function overviewCount(items, predicate) {
            return items.filter(predicate).length;
        }

        function uniqueClientCount(items) {
            var ids = new Set();
            items.forEach(function (item) {
                var key = display(
                    item.customer && (item.customer.email || item.customer.phone || item.customer.name),
                    item.reservationId || item.id
                ).toLowerCase();
                ids.add(key);
            });
            return ids.size;
        }

        function priorityLabel(item) {
            if (item.flags && item.flags.paymentIssue) return 'Payment issue';
            if (item.flags && item.flags.pickupToday) return 'Pickup today';
            if (item.flags && item.flags.pendingReview) return 'Needs review';
            if (item.flags && item.flags.confirmedToSchedule) return 'Plan handover';
            if (item.flags && item.flags.pendingPayment) return 'Payment pending';
            return item.statusLabel || 'Review';
        }

        function renderWorkspaceOverview(data) {
            var detail = document.getElementById('reservationDetail');
            var items = (data && Array.isArray(data.items)) ? data.items : [];
            var activeItems = items.filter(function (item) { return !item.flags || item.flags.active !== false; });
            var pendingReview = overviewCount(items, function (item) { return item.flags && item.flags.pendingReview; });
            var paymentIssues = overviewCount(items, function (item) { return item.flags && item.flags.paymentIssue; });
            var pickupToday = overviewCount(items, function (item) { return item.flags && item.flags.pickupToday; });
            var nextSeven = overviewCount(items, function (item) { return item.flags && item.flags.next7Days; });
            var totalValue = activeItems.reduce(function (sum, item) {
                return sum + numberFromMoney(item.payment && item.payment.total);
            }, 0);
            var priorities = items
                .filter(function (item) {
                    return item.flags && (
                        item.flags.paymentIssue ||
                        item.flags.pickupToday ||
                        item.flags.pendingReview ||
                        item.flags.confirmedToSchedule ||
                        item.flags.pendingPayment
                    );
                })
                .slice(0, 5);

            detail.classList.remove('has-detail');
            setReservationDetailDrawer(false);
            state.currentReservation = null;
            detail.innerHTML =
                '<div class="workspace-overview">' +
                    '<div class="workspace-head">' +
                        '<div>' +
                            '<p class="workspace-kicker">Operations overview</p>' +
                            '<h2 class="workspace-title">Today at a glance.</h2>' +
                            '<p class="workspace-copy">Use this space to see the current workload. Select a reservation to open the client workspace here.</p>' +
                        '</div>' +
                        '<button class="action primary" type="button" id="overviewNewBooking">New booking</button>' +
                    '</div>' +
                    '<div class="workspace-grid">' +
                        '<div class="workspace-card"><span>Active reservations</span><strong>' + escapeHtml(activeItems.length) + '</strong></div>' +
                        '<div class="workspace-card"><span>Known clients</span><strong>' + escapeHtml(uniqueClientCount(items)) + '</strong></div>' +
                        '<div class="workspace-card"><span>Pending review</span><strong>' + escapeHtml(pendingReview) + '</strong></div>' +
                        '<div class="workspace-card"><span>Payment issues</span><strong>' + escapeHtml(paymentIssues) + '</strong></div>' +
                        '<div class="workspace-card"><span>Pickup today</span><strong>' + escapeHtml(pickupToday) + '</strong></div>' +
                        '<div class="workspace-card"><span>Next 7 days</span><strong>' + escapeHtml(nextSeven) + '</strong></div>' +
                    '</div>' +
                    '<div class="section"><h2>Current value</h2><div class="field-grid">' +
                        field('Visible active value', formatDashboardMoney(totalValue)) +
                        field('Current queue', queueLabel(state.quick)) +
                    '</div></div>' +
                    '<div class="section"><h2>Priority work</h2>' +
                        (
                            priorities.length
                                ? '<div class="workspace-list">' + priorities.map(function (item) {
                                    return '<button class="workspace-row" type="button" data-overview-reservation-id="' + escapeHtml(item.id) + '">' +
                                        '<span><strong>' + escapeHtml(display(item.customer && item.customer.name, 'Guest not set')) + '</strong>' +
                                        '<span>' + escapeHtml(display(item.vehicle && item.vehicle.name, 'Vehicle not set')) + ' - ' + escapeHtml(display(item.schedule && item.schedule.startDate, 'Date not set')) + '</span></span>' +
                                        '<span class="status ' + statusClass(item) + '">' + escapeHtml(priorityLabel(item)) + '</span>' +
                                    '</button>';
                                }).join('') + '</div>'
                                : '<div class="detail-empty">No priority work in this view.</div>'
                        ) +
                    '</div>' +
                    '<div class="section"><h2>Queue shortcuts</h2><div class="workspace-actions">' +
                        '<button class="action" type="button" data-overview-filter="pending_review">Pending review</button>' +
                        '<button class="action" type="button" data-overview-filter="payment_issues">Payment issues</button>' +
                        '<button class="action" type="button" data-overview-filter="next_7_days">Next 7 days</button>' +
                    '</div></div>' +
                '</div>';

            document.getElementById('overviewNewBooking').addEventListener('click', function () {
                openManualPanel('create', null);
            });
            detail.querySelectorAll('[data-overview-reservation-id]').forEach(function (button) {
                button.addEventListener('click', function () {
                    openReservation(button.getAttribute('data-overview-reservation-id'));
                });
            });
            detail.querySelectorAll('[data-overview-filter]').forEach(function (button) {
                button.addEventListener('click', function () {
                    applyQuickFilter(button.getAttribute('data-overview-filter') || '');
                });
            });
        }

        function externalAction(label, href, primary) {
            if (!href) {
                return '<a class="action" aria-disabled="true">' + escapeHtml(label) + '</a>';
            }
            return '<a class="action' + (primary ? ' primary' : '') + '" href="' + escapeHtml(href) + '" target="_blank" rel="noopener">' + escapeHtml(label) + '</a>';
        }

        function setFormValue(id, value) {
            var input = document.getElementById(id);
            if (input) input.value = value == null ? '' : value;
        }

        function rawReservationValue(reservation, key, fallback) {
            var data = reservation && reservation.reservationData ? reservation.reservationData : {};
            return data[key] == null || data[key] === '' ? (fallback || '') : data[key];
        }

        function isMobileCrmViewport() {
            return Boolean(window.matchMedia && window.matchMedia('(max-width: 620px)').matches);
        }

        function openManualPanel(mode, reservation) {
            var panel = document.getElementById('manualPanel');
            var title = document.getElementById('manualPanelTitle');
            var copy = document.getElementById('manualPanelCopy');
            state.manualMode = mode || 'create';
            state.currentReservation = reservation || state.currentReservation;
            if (isMobileCrmViewport()) {
                document.getElementById('reservationDetail').classList.remove('has-detail');
                setReservationDetailDrawer(false);
            }
            document.getElementById('manualReservationForm').reset();
            setFormValue('manualCurrency', 'AED');
            setFormValue('manualStatus', 'received');

            if (state.manualMode === 'edit' && reservation) {
                title.textContent = 'Edit booking';
                copy.textContent = 'Update client, vehicle, schedule, payment and internal notes without deleting the reservation.';
                setFormValue('manualCustomerName', reservation.customer.name);
                setFormValue('manualCustomerPhone', reservation.customer.phone);
                setFormValue('manualCustomerEmail', reservation.customer.email);
                setFormValue('manualCustomerId', reservation.customer.idDocument);
                setFormValue('manualVehicle', reservation.vehicle.name);
                setFormValue('manualStatus', reservation.status || 'received');
                setFormValue('manualCurrency', reservation.payment.currency || rawReservationValue(reservation, 'currency', 'AED'));
                setFormValue('manualStartDate', reservation.schedule.startDate);
                setFormValue('manualEndDate', reservation.schedule.endDate);
                setFormValue('manualPickupTime', reservation.schedule.pickupTime);
                setFormValue('manualDropoffTime', reservation.schedule.dropoffTime);
                setFormValue('manualPickupLocation', reservation.schedule.pickupLocation);
                setFormValue('manualDropoffLocation', reservation.schedule.dropoffLocation);
                setFormValue('manualTotalAmount', rawReservationValue(reservation, 'totalAmount', ''));
                setFormValue('manualUpfrontAmount', rawReservationValue(reservation, 'upfrontAmount', ''));
                setFormValue('manualRemainingAmount', rawReservationValue(reservation, 'remainingAmount', ''));
                setFormValue('manualNotes', reservation.admin.notes || '');
            } else {
                title.textContent = 'New booking';
                copy.textContent = 'Create reservations received by WhatsApp, phone or partner handoff without using public checkout.';
            }

            panel.hidden = false;
            document.getElementById('manualCustomerName').focus();
        }

        function closeManualPanel() {
            document.getElementById('manualPanel').hidden = true;
            state.manualMode = 'create';
        }

        function manualPayloadFromForm() {
            return {
                customerName: document.getElementById('manualCustomerName').value,
                customerEmail: document.getElementById('manualCustomerEmail').value,
                customerPhone: document.getElementById('manualCustomerPhone').value,
                customerIdDocument: document.getElementById('manualCustomerId').value,
                vehicle: document.getElementById('manualVehicle').value,
                status: document.getElementById('manualStatus').value,
                currency: document.getElementById('manualCurrency').value,
                startDate: document.getElementById('manualStartDate').value,
                endDate: document.getElementById('manualEndDate').value,
                pickupTime: document.getElementById('manualPickupTime').value,
                dropoffTime: document.getElementById('manualDropoffTime').value,
                pickupLocation: document.getElementById('manualPickupLocation').value,
                dropoffLocation: document.getElementById('manualDropoffLocation').value,
                totalAmount: document.getElementById('manualTotalAmount').value,
                upfrontAmount: document.getElementById('manualUpfrontAmount').value,
                remainingAmount: document.getElementById('manualRemainingAmount').value,
                notes: document.getElementById('manualNotes').value
            };
        }

        function renderActivity(admin) {
            var items = admin && Array.isArray(admin.activity) ? admin.activity : [];
            if (!items.length) return '';

            return '<div class="section"><h2>Activity</h2><div class="activity-list">' +
                items.map(function (item) {
                    return '<div class="activity-item">' +
                        '<strong>' + escapeHtml(display(item.summary || item.action, 'Admin action')) + '</strong>' +
                        '<span>' + escapeHtml(display(item.by, 'admin')) + ' - ' + escapeHtml(item.at ? formatDate(item.at) : 'Not set') + '</span>' +
                    '</div>';
                }).join('') +
            '</div></div>';
        }

        function setReservationDetailDrawer(isOpen) {
            var backdrop = document.getElementById('reservationDetailBackdrop');
            if (backdrop) backdrop.hidden = !isOpen;
            document.body.classList.toggle('has-mobile-detail', Boolean(isOpen));
        }

        function renderDetail(payload) {
            var r = payload.reservation;
            var detail = document.getElementById('reservationDetail');
            var clientFields =
                field('Name', r.customer.name) +
                optionalField('Email', r.customer.email) +
                optionalField('Phone', r.customer.phone) +
                optionalField('ID / Passport', r.customer.idDocument);
            var reservationFields =
                field('Reservation ID', r.reservationId) +
                field('Vehicle', r.vehicle.name) +
                field('Date range', display(r.schedule.startDate) + ' to ' + display(r.schedule.endDate)) +
                optionalField('Pickup time', r.schedule.pickupTime) +
                optionalField('Dropoff time', r.schedule.dropoffTime) +
                optionalField('Pickup', r.schedule.pickupLocation) +
                optionalField('Dropoff', r.schedule.dropoffLocation);
            var paymentFields =
                optionalField('Total', r.payment.total) +
                optionalField('Upfront', r.payment.upfront) +
                optionalField('Remaining', r.payment.remaining) +
                optionalField('Stripe status', paymentStatusLabel(r.payment.stripeStatus)) +
                optionalField('Payment issue', r.payment.error) +
                optionalField('Email status', r.email.status || r.email.sentAt);
            var workflowFields =
                optionalField('Reviewed at', r.admin.contactedAt ? formatDate(r.admin.contactedAt) : '') +
                optionalField('Handover confirmed', r.admin.handoverConfirmedAt ? formatDate(r.admin.handoverConfirmedAt) : '') +
                optionalField('Archived at', r.admin.archivedAt ? formatDate(r.admin.archivedAt) : '') +
                optionalField('Archive reason', r.admin.archiveReason || '');
            var technicalFields =
                optionalField('Payment intent', r.technical.paymentIntentId) +
                optionalField('Source', r.technical.source) +
                optionalField('Storage', r.technical.storage) +
                optionalField('Updated', r.updatedAt ? formatDate(r.updatedAt) : '');
            state.currentReservation = r;
            detail.classList.add('has-detail');
            setReservationDetailDrawer(true);
            detail.innerHTML =
                '<div class="detail-header">' +
                    '<div>' +
                        '<h2 class="detail-title">' + escapeHtml(display(r.vehicle.name, 'Reservation detail')) + '</h2>' +
                        '<p class="detail-subtitle">' + escapeHtml(display(r.customer.name, 'Guest not set')) + ' - ' + escapeHtml(display(r.reservationId)) + '</p>' +
                    '</div>' +
                    '<button class="action detail-close" type="button" id="closeReservationDetail">Close</button>' +
                '</div>' +
                '<span class="status ' + statusClass(r) + '">' + escapeHtml(r.statusLabel) + '</span>' +
                '<div class="detail-actions">' +
                    externalAction('WhatsApp client', r.customer.whatsappHref, true) +
                    externalAction('Call', r.customer.callHref, false) +
                    externalAction('Email', r.customer.emailHref, false) +
                    '<button class="action" type="button" data-action="mark_contacted">Mark reviewed</button>' +
                    '<button class="action" type="button" id="editReservationButton">Edit booking</button>' +
                '</div>' +
                fieldSection('Client', clientFields) +
                fieldSection('Reservation', reservationFields) +
                fieldSection('Payment', paymentFields, 'No payment details stored yet.') +
                '<div class="section"><h2>Admin notes</h2>' +
                    '<textarea id="adminNotes" placeholder="Internal notes for the team">' + escapeHtml(r.admin.notes || '') + '</textarea>' +
                    '<div class="detail-actions">' +
                        '<button class="action primary" type="button" data-action="update_notes">Save notes</button>' +
                        '<button class="action" type="button" data-action="confirm_handover">Confirm handover</button>' +
                        '<button class="action" type="button" data-action="archive">Archive</button>' +
                        '<button class="action danger" type="button" data-action="cancel">Cancel</button>' +
                        '<button class="action danger" type="button" data-delete-reservation>Delete</button>' +
                    '</div>' +
                    (workflowFields ? '<div class="field-grid">' + workflowFields + '</div>' : '') +
                '</div>' +
                renderActivity(r.admin) +
                (technicalFields ? '<div class="section"><details class="technical-details"><summary>Technical details</summary><div class="field-grid">' + technicalFields + '</div></details></div>' : '');

            detail.querySelectorAll('[data-action]').forEach(function (button) {
                button.addEventListener('click', function () {
                    runAction(button.getAttribute('data-action'));
                });
            });
            document.getElementById('editReservationButton').addEventListener('click', function () {
                openManualPanel('edit', state.currentReservation);
            });
            var deleteButton = detail.querySelector('[data-delete-reservation]');
            if (deleteButton) {
                deleteButton.addEventListener('click', deleteSelectedReservation);
            }
            document.getElementById('closeReservationDetail').addEventListener('click', closeReservationDetail);
        }

        function closeReservationDetail() {
            state.selectedId = '';
            state.currentReservation = null;
            setReservationDetailDrawer(false);
            document.querySelectorAll('[data-reservation-id]').forEach(function (button) {
                button.classList.remove('is-active');
            });
            renderWorkspaceOverview(state.lastListData || { items: [], total: 0 });
        }

        async function openReservation(id) {
            state.selectedId = id;
            document.querySelectorAll('[data-reservation-id]').forEach(function (button) {
                button.classList.toggle('is-active', button.getAttribute('data-reservation-id') === id);
            });
            var detail = document.getElementById('reservationDetail');
            detail.classList.add('has-detail');
            setReservationDetailDrawer(true);
            detail.innerHTML = '<div class="detail-empty">Loading reservation...</div>';
            await loadReservations();

            try {
                var response = await api('/api/admin/reservations/' + encodeURIComponent(id));
                if (!response.ok) throw new Error('Reservation not found');
                var data = await response.json();
                renderDetail(data);
            } catch (error) {
                document.getElementById('reservationDetail').innerHTML = '<div class="detail-empty">Reservation detail could not be loaded.</div>';
            }
        }

        async function runAction(action) {
            if (!state.selectedId) return;
            if (action === 'cancel' && !window.confirm('Cancel this reservation in the admin desk?')) {
                return;
            }
            if (action === 'archive' && !window.confirm('Archive this reservation without deleting it?')) {
                return;
            }

            var notesInput = document.getElementById('adminNotes');
            var payload = {
                action: action,
                notes: notesInput ? notesInput.value : ''
            };

            try {
                var response = await api('/api/admin/reservations/' + encodeURIComponent(state.selectedId), {
                    method: 'PATCH',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload)
                });
                if (!response.ok) throw new Error('Action failed');
                var data = await response.json();
                renderDetail(data);
                await loadReservations();
                await loadReservationCalendar();
            } catch (error) {
                window.alert('This reservation could not be updated.');
            }
        }

        async function deleteSelectedReservation() {
            if (!state.selectedId) return;
            var reservationLabel = state.currentReservation && state.currentReservation.reservationId
                ? state.currentReservation.reservationId
                : state.selectedId;
            if (!window.confirm('Delete reservation ' + reservationLabel + ' permanently? This cannot be undone.')) {
                return;
            }

            try {
                var response = await api('/api/admin/reservations/' + encodeURIComponent(state.selectedId), {
                    method: 'DELETE'
                });
                if (!response.ok) throw new Error('Delete failed');
                state.selectedId = '';
                state.currentReservation = null;
                closeReservationDetail();
                await loadReservations();
                await loadReservationCalendar();
            } catch (error) {
                window.alert('This reservation could not be deleted.');
            }
        }

        async function saveManualReservation(event) {
            event.preventDefault();
            var isEdit = state.manualMode === 'edit' && state.selectedId;
            var submitButton = document.getElementById('manualSubmitButton');
            var payload = manualPayloadFromForm();
            submitButton.disabled = true;
            submitButton.textContent = 'Saving...';

            try {
                var response = await api(
                    isEdit
                        ? '/api/admin/reservations/' + encodeURIComponent(state.selectedId)
                        : '/api/admin/reservations',
                    {
                        method: isEdit ? 'PUT' : 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify(payload)
                    }
                );
                var data = await response.json().catch(function () { return {}; });
                if (!response.ok) throw new Error(data.error || 'Manual booking failed');

                closeManualPanel();
                state.selectedId = data.reservation.id;
                await loadReservations();
                await loadReservationCalendar();
                renderDetail(data);
            } catch (error) {
                window.alert(error.message || 'This manual booking could not be saved.');
            } finally {
                submitButton.disabled = false;
                submitButton.textContent = 'Save booking';
            }
        }

        document.getElementById('refreshButton').addEventListener('click', function () {
            loadOperationsStatus();
            loadReservations();
            loadReservationCalendar();
        });
        document.getElementById('exportCsvButton').addEventListener('click', function () {
            window.location.href = '/api/admin/reservations.csv?' + currentQueryString();
        });
        document.getElementById('manualNewButton').addEventListener('click', function () {
            openManualPanel('create', null);
        });
        document.getElementById('manualCloseButton').addEventListener('click', closeManualPanel);
        document.getElementById('manualCancelButton').addEventListener('click', closeManualPanel);
        document.getElementById('manualReservationForm').addEventListener('submit', saveManualReservation);
        document.getElementById('logoutButton').addEventListener('click', async function () {
            await api('/api/admin/logout', { method: 'POST' }).catch(function () {});
            window.location.href = '/admin/login.html';
        });
        document.getElementById('searchInput').addEventListener('input', function (event) {
            clearTimeout(searchTimer);
            searchTimer = setTimeout(function () {
                state.q = event.target.value.trim();
                loadReservations();
            }, 220);
        });
        function applyQuickFilter(value) {
            state.quick = value || '';
            state.selectedId = '';
            var queueSelect = document.getElementById('queueFilterSelect');
            if (queueSelect && queueSelect.value !== state.quick) {
                queueSelect.value = state.quick;
            }
            loadReservations();
        }
        document.getElementById('queueFilterSelect').addEventListener('change', function (event) {
            applyQuickFilter(event.target.value || '');
        });
        document.getElementById('calendarToggleButton').addEventListener('click', function () {
            setCalendarOpen(this.getAttribute('aria-expanded') !== 'true');
        });
        document.getElementById('calendarPreviousButton').addEventListener('click', function () {
            state.calendarMonth = addCalendarMonths(state.calendarMonth || currentMonthValue(), -1);
            loadReservationCalendar();
        });
        document.getElementById('calendarNextButton').addEventListener('click', function () {
            state.calendarMonth = addCalendarMonths(state.calendarMonth || currentMonthValue(), 1);
            loadReservationCalendar();
        });
        document.getElementById('calendarTodayButton').addEventListener('click', function () {
            state.calendarMonth = currentMonthValue();
            loadReservationCalendar();
        });
        document.getElementById('calendarMonthInput').addEventListener('change', function (event) {
            state.calendarMonth = event.target.value || currentMonthValue();
            loadReservationCalendar();
        });
        document.querySelectorAll('[data-calendar-view]').forEach(function (button) {
            button.addEventListener('click', function () {
                state.calendarView = button.getAttribute('data-calendar-view') === 'month' ? 'month' : 'timeline';
                updateCalendarViewControls();
                if (state.lastCalendarData) {
                    var grid = document.getElementById('reservationCalendarGrid');
                    if (grid) {
                        grid.innerHTML = renderCalendarBody(state.lastCalendarData);
                        bindCalendarReservations();
                    }
                }
            });
        });
        document.getElementById('operationsDetailsToggle').addEventListener('click', function () {
            setOperationsDetailsOpen(this.getAttribute('aria-expanded') !== 'true');
        });
        document.getElementById('operationsDetailsClose').addEventListener('click', function () {
            setOperationsDetailsOpen(false);
        });
        document.getElementById('reservationDetailBackdrop').addEventListener('click', closeReservationDetail);
        window.addEventListener('resize', function () {
            clearTimeout(calendarResizeTimer);
            calendarResizeTimer = setTimeout(function () {
                if (!state.lastCalendarData || !state.calendarLoaded) return;
                var grid = document.getElementById('reservationCalendarGrid');
                if (!grid) return;
                grid.innerHTML = renderCalendarBody(state.lastCalendarData);
                bindCalendarReservations();
            }, 120);
        });

        setCalendarOpen(false);
        loadOperationsStatus();
        loadReservationCalendar();
        loadReservations();
    </script>
</body>
</html>`;
}

module.exports = {
    renderAdminLoginPage,
    renderAdminReservationsPage
};
