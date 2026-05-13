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
                var isAllowedAdminPage = url.pathname === '/admin/reservations.html' ||
                    url.pathname === '/admin/content.html' ||
                    url.pathname === '/admin/visual.html';

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
            grid-template-columns: minmax(220px, 0.7fr) minmax(0, 1.3fr);
            gap: 14px;
            padding: 16px;
            border: 1px solid var(--line);
            border-radius: 22px;
            background: rgba(13, 13, 15, 0.92);
            color: #fff8e7;
            box-shadow: var(--shadow);
        }
        .ops-panel.is-ok { border-color: rgba(31, 143, 84, 0.34); }
        .ops-panel.is-review { border-color: rgba(180, 120, 37, 0.48); }
        .ops-panel.is-bad { border-color: rgba(182, 64, 53, 0.62); }
        .ops-title {
            margin: 0;
            font-family: Georgia, "Times New Roman", serif;
            font-size: 1.35rem;
            line-height: 1;
        }
        .ops-copy {
            margin: 7px 0 0;
            color: rgba(255, 248, 231, 0.68);
            line-height: 1.42;
            font-size: 0.86rem;
        }
        .ops-grid {
            display: grid;
            grid-template-columns: repeat(4, minmax(0, 1fr));
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
            grid-template-columns: minmax(0, 1fr) auto;
            gap: 10px;
            margin-bottom: 12px;
        }
        input,
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
        textarea {
            min-height: 92px;
            padding: 12px;
            resize: vertical;
        }
        input:focus,
        textarea:focus {
            border-color: rgba(220, 180, 88, 0.78);
            box-shadow: 0 0 0 4px rgba(220, 180, 88, 0.16);
        }
        .button,
        .filter,
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
        .filters {
            display: flex;
            flex-wrap: wrap;
            gap: 8px;
        }
        .filter.is-active {
            background: var(--black);
            color: #fff8e7;
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
        .detail-panel {
            position: sticky;
            top: 72px;
            align-self: start;
            max-height: calc(100vh - 92px);
            overflow: auto;
            padding: 18px;
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
            .ops-panel,
            .ops-grid {
                grid-template-columns: 1fr;
            }
            .detail-panel {
                position: static;
                max-height: none;
            }
        }
        @media (max-width: 620px) {
            .topbar {
                align-items: flex-start;
            }
            .brand span {
                display: none;
            }
            .layout {
                padding: 14px;
            }
            .hero,
            .toolbar,
            .detail-panel {
                border-radius: 20px;
                padding: 18px;
            }
            .search-row,
            .reservation-card,
            .detail-actions,
            .field-grid {
                grid-template-columns: 1fr;
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
            <a class="topbar-link" href="/admin/content.html">Content editor</a>
            <a class="topbar-link" href="/admin/visual.html">Visual editor</a>
            <button class="logout" id="logoutButton" type="button">Logout</button>
        </div>
    </header>
    <main class="layout">
        <section class="hero" aria-labelledby="pageTitle">
            <div>
                <h1 id="pageTitle">Reservations, clients and handovers.</h1>
                <p>Track every booking from checkout to confirmed handover, with quick contact actions and private admin notes.</p>
            </div>
            <div class="hero-actions">
                <a class="button" href="/admin/content.html">Open content editor</a>
                <button class="button primary" id="exportCsvButton" type="button">Export CSV</button>
            </div>
        </section>

        <section class="ops-panel is-review" id="operationsPanel" aria-live="polite">
            <div>
                <h2 class="ops-title">CRM readiness</h2>
                <p class="ops-copy" id="operationsSummary">Checking reservation storage, Stripe mode and admin setup...</p>
            </div>
            <div class="ops-grid" id="operationsGrid">
                <div class="ops-metric"><span>Status</span><strong>Checking...</strong></div>
            </div>
        </section>

        <section>
            <div class="toolbar">
                <div class="search-row">
                    <input id="searchInput" type="search" placeholder="Search by client, email, phone, vehicle or reservation ID">
                    <button class="button primary" id="refreshButton" type="button">Refresh</button>
                </div>
                <div class="filters" id="filters">
                    <button class="filter is-active" type="button" data-filter="">All</button>
                    <button class="filter" type="button" data-filter="pending_payment">Pending payment</button>
                    <button class="filter" type="button" data-filter="confirmed">Confirmed</button>
                    <button class="filter" type="button" data-filter="today">Today</button>
                    <button class="filter" type="button" data-filter="next_7_days">Next 7 days</button>
                    <button class="filter" type="button" data-filter="needs_contact">Needs contact</button>
                    <button class="filter" type="button" data-filter="failed_payment">Failed payment</button>
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

        <aside class="detail-panel" id="reservationDetail" aria-live="polite">
            <div class="detail-empty">Select a reservation to see client details, payment state and admin actions.</div>
        </aside>
    </main>

    <script>
        var state = { quick: '', q: '', selectedId: '' };
        var searchTimer = null;

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

        function formatDate(value) {
            if (!value) return 'Not set';
            var date = new Date(value);
            if (Number.isNaN(date.getTime())) return value;
            return new Intl.DateTimeFormat('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }).format(date);
        }

        function statusClass(item) {
            if (item.flags && item.flags.failedPayment) return 'failed';
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
            var grid = document.getElementById('operationsGrid');
            var overall = data.overallStatus || 'review';
            panel.classList.remove('is-ok', 'is-review', 'is-bad');
            panel.classList.add('is-' + overall);
            summary.textContent = data.label + ' - ' + statusWord(overall) + '. Storage: ' +
                (data.storage && data.storage.mode ? data.storage.mode : 'unknown') +
                '. Stripe: ' + (data.services && data.services.stripeMode ? data.services.stripeMode : 'unknown') + '.';

            var checks = Array.isArray(data.checks) ? data.checks : [];
            var metricCards = [
                '<div class="ops-metric"><span>Environment</span><strong>' + escapeHtml(data.label || 'CRM') + '</strong></div>',
                '<div class="ops-metric"><span>Reservations</span><strong>' + escapeHtml(data.storage && data.storage.reservationCount != null ? data.storage.reservationCount : 'Unknown') + '</strong></div>',
                '<div class="ops-metric"><span>Database</span><strong>' + escapeHtml(data.storage && data.storage.databaseConfigured ? 'Postgres' : 'Local fallback') + '</strong></div>',
                '<div class="ops-metric"><span>Updated</span><strong>' + escapeHtml(data.storage && data.storage.latestUpdatedAt ? formatDate(data.storage.latestUpdatedAt) : 'No records yet') + '</strong></div>'
            ];
            var checkCards = checks.map(function (check) {
                return '<div class="ops-check is-' + escapeHtml(check.status || 'warn') + '">' +
                    '<span>' + escapeHtml(check.label || 'Check') + '</span>' +
                    '<strong>' + escapeHtml(checkWord(check.status)) + '</strong>' +
                '</div>';
            });

            grid.innerHTML = metricCards.concat(checkCards).join('');
        }

        async function loadOperationsStatus() {
            try {
                var response = await api('/api/admin/reservations/operations');
                var data = await response.json();
                renderOperationsStatus(data);
            } catch (error) {
                document.getElementById('operationsSummary').textContent = 'CRM readiness could not be checked.';
                document.getElementById('operationsGrid').innerHTML =
                    '<div class="ops-check is-fail"><span>Status</span><strong>Unavailable</strong></div>';
            }
        }

        async function api(path, options) {
            var response = await fetch(path, Object.assign({ credentials: 'same-origin' }, options || {}));
            if (response.status === 401) {
                window.location.href = '/admin/login.html';
                return Promise.reject(new Error('Admin session required'));
            }
            return response;
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
            var contactFlag = item.flags.needsContact ? 'Needs contact' : (item.admin.contacted ? 'Contacted' : 'No contact mark');
            return '<button class="reservation-card' + activeClass + '" type="button" data-reservation-id="' + escapeHtml(item.id) + '">' +
                '<div>' +
                    '<h2 class="reservation-title">' + escapeHtml(display(item.vehicle.name, 'Vehicle not set')) + '</h2>' +
                    '<div class="reservation-meta">' +
                        '<span>' + escapeHtml(display(item.customer.name, 'Guest not set')) + '</span>' +
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
            document.getElementById('resultCount').textContent = data.total + ' reservation' + (data.total === 1 ? '' : 's') + ' found';
            document.getElementById('storageMode').textContent = data.storage ? 'Storage: ' + data.storage : '';

            if (!data.items.length) {
                list.innerHTML = '<div class="empty">No reservations match this view yet.</div>';
                return;
            }

            list.innerHTML = data.items.map(renderCard).join('');
            bindReservationCards();
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

        function externalAction(label, href, primary) {
            if (!href) {
                return '<a class="action" aria-disabled="true">' + escapeHtml(label) + '</a>';
            }
            return '<a class="action' + (primary ? ' primary' : '') + '" href="' + escapeHtml(href) + '" target="_blank" rel="noopener">' + escapeHtml(label) + '</a>';
        }

        function renderDetail(payload) {
            var r = payload.reservation;
            var detail = document.getElementById('reservationDetail');
            detail.innerHTML =
                '<h2 class="detail-title">' + escapeHtml(display(r.vehicle.name, 'Reservation detail')) + '</h2>' +
                '<p class="detail-subtitle">' + escapeHtml(display(r.customer.name, 'Guest not set')) + ' · ' + escapeHtml(display(r.reservationId)) + '</p>' +
                '<span class="status ' + statusClass(r) + '">' + escapeHtml(r.statusLabel) + '</span>' +
                '<div class="detail-actions">' +
                    externalAction('WhatsApp client', r.customer.whatsappHref, true) +
                    externalAction('Call', r.customer.callHref, false) +
                    externalAction('Email', r.customer.emailHref, false) +
                    '<button class="action" type="button" data-action="mark_contacted">Mark contacted</button>' +
                '</div>' +
                '<div class="section"><h2>Client</h2><div class="field-grid">' +
                    field('Name', r.customer.name) +
                    field('Email', r.customer.email) +
                    field('Phone', r.customer.phone) +
                    field('ID / Passport', r.customer.idDocument) +
                '</div></div>' +
                '<div class="section"><h2>Reservation</h2><div class="field-grid">' +
                    field('Vehicle', r.vehicle.name) +
                    field('Date range', display(r.schedule.startDate) + ' to ' + display(r.schedule.endDate)) +
                    field('Pickup time', r.schedule.pickupTime) +
                    field('Dropoff time', r.schedule.dropoffTime) +
                    field('Pickup', r.schedule.pickupLocation) +
                    field('Dropoff', r.schedule.dropoffLocation) +
                '</div></div>' +
                '<div class="section"><h2>Payment</h2><div class="field-grid">' +
                    field('Total', r.payment.total) +
                    field('Upfront', r.payment.upfront) +
                    field('Remaining', r.payment.remaining) +
                    field('Stripe status', r.payment.stripeStatus) +
                    field('Payment issue', r.payment.error) +
                    field('Email status', r.email.status || r.email.sentAt) +
                '</div></div>' +
                '<div class="section"><h2>Admin notes</h2>' +
                    '<textarea id="adminNotes" placeholder="Internal notes for the team">' + escapeHtml(r.admin.notes || '') + '</textarea>' +
                    '<div class="detail-actions">' +
                        '<button class="action primary" type="button" data-action="update_notes">Save notes</button>' +
                        '<button class="action" type="button" data-action="confirm_handover">Confirm handover</button>' +
                        '<button class="action danger" type="button" data-action="cancel">Cancel</button>' +
                    '</div>' +
                    '<div class="field-grid">' +
                        field('Contacted at', r.admin.contactedAt ? formatDate(r.admin.contactedAt) : '') +
                        field('Handover confirmed', r.admin.handoverConfirmedAt ? formatDate(r.admin.handoverConfirmedAt) : '') +
                    '</div>' +
                '</div>' +
                '<div class="section"><h2>Technical</h2><div class="field-grid">' +
                    field('Payment intent', r.technical.paymentIntentId) +
                    field('Source', r.technical.source) +
                    field('Storage', r.technical.storage) +
                    field('Updated', r.updatedAt ? formatDate(r.updatedAt) : '') +
                '</div></div>';

            detail.querySelectorAll('[data-action]').forEach(function (button) {
                button.addEventListener('click', function () {
                    runAction(button.getAttribute('data-action'));
                });
            });
        }

        async function openReservation(id) {
            state.selectedId = id;
            document.querySelectorAll('[data-reservation-id]').forEach(function (button) {
                button.classList.toggle('is-active', button.getAttribute('data-reservation-id') === id);
            });
            document.getElementById('reservationDetail').innerHTML = '<div class="detail-empty">Loading reservation...</div>';
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
            } catch (error) {
                window.alert('This reservation could not be updated.');
            }
        }

        document.getElementById('refreshButton').addEventListener('click', function () {
            loadOperationsStatus();
            loadReservations();
        });
        document.getElementById('exportCsvButton').addEventListener('click', function () {
            window.location.href = '/api/admin/reservations.csv?' + currentQueryString();
        });
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
        document.querySelectorAll('[data-filter]').forEach(function (button) {
            button.addEventListener('click', function () {
                document.querySelectorAll('[data-filter]').forEach(function (item) { item.classList.remove('is-active'); });
                button.classList.add('is-active');
                state.quick = button.getAttribute('data-filter') || '';
                loadReservations();
            });
        });

        loadOperationsStatus();
        loadReservations();
    </script>
</body>
</html>`;
}

module.exports = {
    renderAdminLoginPage,
    renderAdminReservationsPage
};
