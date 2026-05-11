function renderAdminVisualEditorPage() {
    return `<!doctype html>
<html lang="en">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <meta name="robots" content="noindex,nofollow">
    <title>Dynasty Prestige Visual Editor</title>
    <style>
        :root {
            --bg: #f5efe3;
            --ink: #17120d;
            --muted: #766a5e;
            --panel: rgba(255, 255, 255, 0.92);
            --line: rgba(23, 18, 13, 0.12);
            --line-strong: rgba(23, 18, 13, 0.2);
            --black: #0d0d0f;
            --gold: #dcb458;
            --gold-soft: #fff0b8;
            --danger: #b64035;
            --success: #237c4a;
            --shadow: 0 22px 70px rgba(47, 34, 19, 0.14);
        }

        * { box-sizing: border-box; }

        body {
            margin: 0;
            min-height: 100vh;
            color: var(--ink);
            font-family: Arial, sans-serif;
            background:
                radial-gradient(circle at 7% 0%, rgba(220, 180, 88, 0.25), transparent 32rem),
                radial-gradient(circle at 96% 8%, rgba(14, 14, 18, 0.12), transparent 28rem),
                linear-gradient(135deg, #fbf7ee 0%, var(--bg) 58%, #eadcc6 100%);
        }

        button,
        input,
        select {
            font: inherit;
        }

        .topbar {
            position: sticky;
            top: 0;
            z-index: 20;
            display: flex;
            justify-content: space-between;
            align-items: center;
            gap: 16px;
            padding: 12px clamp(16px, 3vw, 30px);
            border-bottom: 1px solid rgba(255, 255, 255, 0.08);
            background: rgba(13, 13, 15, 0.95);
            color: #fff8e7;
            backdrop-filter: blur(16px);
        }

        .brand {
            display: flex;
            align-items: center;
            gap: 12px;
        }

        .brand-mark {
            width: 42px;
            height: 42px;
            display: grid;
            place-items: center;
            border: 1px solid rgba(247, 223, 149, 0.58);
            border-radius: 12px;
            color: var(--gold-soft);
            font: 800 0.9rem Georgia, serif;
        }

        .brand strong {
            display: block;
            font-size: 0.92rem;
            letter-spacing: 0.08em;
            text-transform: uppercase;
        }

        .brand span {
            display: block;
            margin-top: 2px;
            color: rgba(255, 248, 231, 0.72);
            font-size: 0.74rem;
        }

        .topbar-actions {
            display: flex;
            align-items: center;
            justify-content: flex-end;
            flex-wrap: wrap;
            gap: 10px;
        }

        .topbar-link,
        .logout,
        .button {
            min-height: 42px;
            padding: 0 16px;
            border: 1px solid rgba(255, 255, 255, 0.14);
            border-radius: 999px;
            background: transparent;
            color: inherit;
            text-decoration: none;
            cursor: pointer;
            display: inline-flex;
            align-items: center;
            justify-content: center;
            font-size: 0.82rem;
            font-weight: 700;
            letter-spacing: 0.08em;
            text-transform: uppercase;
        }

        .button {
            border-color: rgba(23, 18, 13, 0.14);
            color: var(--ink);
            background: rgba(255, 255, 255, 0.78);
        }

        .button-primary,
        .topbar-link--primary {
            border-color: rgba(247, 223, 149, 0.38);
            background: linear-gradient(135deg, rgba(247, 223, 149, 0.2), rgba(220, 180, 88, 0.16));
        }

        .button-danger {
            border-color: rgba(182, 64, 53, 0.32);
            color: var(--danger);
        }

        .page {
            display: grid;
            grid-template-columns: minmax(0, 1fr) minmax(340px, 420px);
            gap: 18px;
            padding: clamp(16px, 2.4vw, 28px);
        }

        .stage,
        .inspector {
            min-width: 0;
            border: 1px solid var(--line);
            border-radius: 26px;
            background: var(--panel);
            box-shadow: var(--shadow);
            overflow: hidden;
        }

        .stage {
            display: grid;
            grid-template-rows: auto minmax(520px, 1fr);
            min-height: calc(100vh - 116px);
        }

        .stage-toolbar {
            display: grid;
            grid-template-columns: minmax(210px, 0.7fr) minmax(0, 1fr) auto;
            gap: 12px;
            align-items: end;
            padding: 16px;
            border-bottom: 1px solid var(--line);
            background: rgba(255, 255, 255, 0.6);
        }

        label span,
        .field-label {
            display: block;
            margin-bottom: 7px;
            color: var(--muted);
            font-size: 0.72rem;
            font-weight: 800;
            letter-spacing: 0.08em;
            text-transform: uppercase;
        }

        select,
        input {
            width: 100%;
            min-height: 42px;
            border: 1px solid var(--line-strong);
            border-radius: 14px;
            padding: 0 12px;
            background: rgba(255, 255, 255, 0.84);
            color: var(--ink);
        }

        input::placeholder {
            color: rgba(23, 18, 13, 0.34);
        }

        .mode-strip {
            display: flex;
            flex-wrap: wrap;
            gap: 8px;
            align-items: center;
        }

        .frame-shell {
            position: relative;
            display: grid;
            place-items: start center;
            min-height: 0;
            padding: 18px;
            background:
                linear-gradient(45deg, rgba(23, 18, 13, 0.04) 25%, transparent 25%),
                linear-gradient(-45deg, rgba(23, 18, 13, 0.04) 25%, transparent 25%),
                linear-gradient(45deg, transparent 75%, rgba(23, 18, 13, 0.04) 75%),
                linear-gradient(-45deg, transparent 75%, rgba(23, 18, 13, 0.04) 75%);
            background-size: 22px 22px;
            background-position: 0 0, 0 11px, 11px -11px, -11px 0;
            overflow: auto;
        }

        .frame-inner {
            width: 100%;
            min-width: 280px;
            height: 100%;
            min-height: 680px;
            border: 1px solid rgba(23, 18, 13, 0.18);
            border-radius: 20px;
            background: #fff;
            box-shadow: 0 24px 70px rgba(23, 18, 13, 0.22);
            overflow: hidden;
            transition: width 180ms ease;
        }

        .frame-shell[data-viewport="mobile"] .frame-inner { width: 390px; }
        .frame-shell[data-viewport="tablet"] .frame-inner { width: 768px; }
        .frame-shell[data-viewport="laptop"] .frame-inner { width: min(100%, 1180px); }
        .frame-shell[data-viewport="desktop"] .frame-inner { width: min(100%, 1440px); }

        iframe {
            display: block;
            width: 100%;
            height: 100%;
            min-height: 680px;
            border: 0;
            background: #fff;
        }

        .inspector {
            align-self: start;
            position: sticky;
            top: 78px;
            max-height: calc(100vh - 98px);
            overflow: auto;
        }

        .inspector-section {
            padding: 18px;
            border-bottom: 1px solid var(--line);
        }

        .inspector-section h1,
        .inspector-section h2 {
            margin: 0 0 8px;
            font-size: 1rem;
        }

        .inspector-section p {
            margin: 0;
            color: var(--muted);
            line-height: 1.5;
            font-size: 0.9rem;
        }

        .selected-card {
            display: grid;
            gap: 10px;
            margin-top: 12px;
            padding: 14px;
            border: 1px solid var(--line);
            border-radius: 18px;
            background: rgba(255, 255, 255, 0.72);
        }

        .selected-card code {
            display: block;
            max-width: 100%;
            padding: 10px;
            border-radius: 12px;
            background: rgba(13, 13, 15, 0.06);
            color: #342c24;
            overflow-wrap: anywhere;
            font-size: 0.78rem;
        }

        .family-card {
            display: grid;
            gap: 12px;
            margin-top: 14px;
            padding: 14px;
            border: 1px solid rgba(220, 180, 88, 0.32);
            border-radius: 18px;
            background: linear-gradient(135deg, rgba(255, 248, 231, 0.82), rgba(255, 255, 255, 0.66));
        }

        .family-card__top {
            display: flex;
            align-items: center;
            justify-content: space-between;
            gap: 10px;
        }

        .family-badge {
            display: inline-flex;
            align-items: center;
            min-height: 28px;
            padding: 0 10px;
            border-radius: 999px;
            background: rgba(13, 13, 15, 0.92);
            color: #fff8e7;
            font-size: 0.7rem;
            font-weight: 800;
            letter-spacing: 0.08em;
            text-transform: uppercase;
        }

        .family-risk {
            color: var(--muted);
            font-size: 0.76rem;
            font-weight: 800;
            letter-spacing: 0.08em;
            text-transform: uppercase;
        }

        .family-card p {
            margin: 0;
            color: var(--muted);
            line-height: 1.5;
            font-size: 0.86rem;
        }

        .quick-actions {
            display: grid;
            grid-template-columns: repeat(2, minmax(0, 1fr));
            gap: 8px;
        }

        .quick-action {
            min-height: 38px;
            padding: 0 10px;
            border: 1px solid rgba(23, 18, 13, 0.14);
            border-radius: 12px;
            background: rgba(255, 255, 255, 0.82);
            color: var(--ink);
            cursor: pointer;
            font-size: 0.76rem;
            font-weight: 800;
            letter-spacing: 0.04em;
            text-transform: uppercase;
        }

        .quick-action:hover {
            border-color: rgba(220, 180, 88, 0.58);
            background: rgba(255, 248, 231, 0.92);
        }

        .property-grid {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 12px;
        }

        .property-grid label.full {
            grid-column: 1 / -1;
        }

        .actions {
            display: flex;
            flex-wrap: wrap;
            gap: 10px;
            margin-top: 14px;
        }

        .status {
            min-height: 22px;
            margin-top: 12px;
            color: var(--muted);
            font-size: 0.84rem;
        }

        .status.is-error { color: var(--danger); }
        .status.is-ok { color: var(--success); }

        .rule-list {
            display: grid;
            gap: 10px;
            margin-top: 12px;
        }

        .rule-item {
            display: grid;
            gap: 8px;
            padding: 12px;
            border: 1px solid var(--line);
            border-radius: 16px;
            background: rgba(255, 255, 255, 0.66);
        }

        .rule-item strong {
            display: block;
            overflow-wrap: anywhere;
        }

        .rule-item small {
            color: var(--muted);
            overflow-wrap: anywhere;
        }

        .rule-item-actions {
            display: flex;
            gap: 8px;
            flex-wrap: wrap;
        }

        .empty {
            padding: 14px;
            border: 1px dashed var(--line-strong);
            border-radius: 16px;
            color: var(--muted);
            background: rgba(255, 255, 255, 0.42);
        }

        @media (max-width: 1100px) {
            .page {
                grid-template-columns: 1fr;
            }

            .inspector {
                position: static;
                max-height: none;
            }
        }

        @media (max-width: 760px) {
            .topbar {
                align-items: flex-start;
                flex-direction: column;
            }

            .stage-toolbar {
                grid-template-columns: 1fr;
            }

            .property-grid {
                grid-template-columns: 1fr;
            }

            .quick-actions {
                grid-template-columns: 1fr;
            }

            .frame-shell {
                padding: 10px;
            }

            .frame-shell[data-viewport] .frame-inner {
                width: 100%;
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
                <span>Visual editor</span>
            </div>
        </div>
        <div class="topbar-actions">
            <a class="topbar-link" href="/admin/content.html">Content editor</a>
            <a class="topbar-link" href="/admin/reservations.html">Reservations</a>
            <button class="logout" id="logoutButton" type="button">Logout</button>
        </div>
    </header>

    <main class="page">
        <section class="stage" aria-label="Visual preview">
            <div class="stage-toolbar">
                <label>
                    <span>Page</span>
                    <select id="pageSelect"></select>
                </label>
                <div>
                    <span class="field-label">Viewport</span>
                    <div class="mode-strip">
                        <button class="button" type="button" data-viewport="mobile">Mobile</button>
                        <button class="button" type="button" data-viewport="tablet">Tablet</button>
                        <button class="button" type="button" data-viewport="laptop">Laptop</button>
                        <button class="button button-primary" type="button" data-viewport="desktop">Desktop</button>
                    </div>
                </div>
                <button class="button button-primary" id="selectModeButton" type="button">Selecting on</button>
            </div>
            <div class="frame-shell" id="frameShell" data-viewport="desktop">
                <div class="frame-inner">
                    <iframe id="visualPreviewFrame" title="Website preview"></iframe>
                </div>
            </div>
        </section>

        <aside class="inspector">
            <section class="inspector-section">
                <h1>Inspector</h1>
                <p>Click an element in the preview. Then adjust size, color, spacing or movement and save it as a safe CSS override.</p>
                <div class="selected-card" id="selectedCard">
                    <strong id="selectedLabel">No element selected yet</strong>
                    <code id="selectedSelector">Click inside the preview to inspect an element.</code>
                    <p id="selectedComputed">Computed styles will appear here.</p>
                </div>
                <div class="family-card" id="elementFamilyCard">
                    <div class="family-card__top">
                        <span class="family-badge" id="elementFamilyBadge">Waiting</span>
                        <span class="family-risk" id="elementFamilyRisk">Select an element</span>
                    </div>
                    <p id="elementFamilyAdvice">The inspector will adapt once you pick a button, text, card, form, media block or layout container.</p>
                    <div class="quick-actions" id="quickActions"></div>
                </div>
            </section>

            <section class="inspector-section">
                <h2>Typography and color</h2>
                <div class="property-grid">
                    <label class="full">
                        <span>Font family</span>
                        <select data-prop="fontFamily">
                            <option value="">Keep current</option>
                            <option value="'Manrope', system-ui, sans-serif">Manrope</option>
                            <option value="'El Messiri', 'Cormorant Garamond', serif">El Messiri display</option>
                            <option value="'Cormorant Garamond', Georgia, serif">Cormorant Garamond</option>
                            <option value="'Montserrat', system-ui, sans-serif">Montserrat</option>
                            <option value="'Inter', system-ui, sans-serif">Inter</option>
                            <option value="Georgia, 'Times New Roman', serif">Georgia serif</option>
                        </select>
                    </label>
                    <label>
                        <span>Font size px</span>
                        <input data-prop="fontSize" data-unit="px" type="number" min="8" max="120" step="1">
                    </label>
                    <label>
                        <span>Font weight</span>
                        <input data-prop="fontWeight" type="text" placeholder="400, 700, bold">
                    </label>
                    <label>
                        <span>Text color</span>
                        <input data-prop="color" type="text" placeholder="#17120d">
                    </label>
                    <label>
                        <span>Background</span>
                        <input data-prop="backgroundColor" type="text" placeholder="#ffffff">
                    </label>
                </div>
            </section>

            <section class="inspector-section">
                <h2>Layout and alignment</h2>
                <div class="property-grid">
                    <label>
                        <span>Display</span>
                        <select data-prop="display">
                            <option value="">Keep current</option>
                            <option value="block">Block</option>
                            <option value="inline-block">Inline block</option>
                            <option value="flex">Flex</option>
                            <option value="inline-flex">Inline flex</option>
                            <option value="grid">Grid</option>
                            <option value="none">Hide</option>
                        </select>
                    </label>
                    <label>
                        <span>Direction</span>
                        <select data-prop="flexDirection">
                            <option value="">Keep current</option>
                            <option value="row">Row</option>
                            <option value="column">Column</option>
                            <option value="row-reverse">Row reverse</option>
                            <option value="column-reverse">Column reverse</option>
                        </select>
                    </label>
                    <label>
                        <span>Justify</span>
                        <select data-prop="justifyContent">
                            <option value="">Keep current</option>
                            <option value="flex-start">Start</option>
                            <option value="center">Center</option>
                            <option value="flex-end">End</option>
                            <option value="space-between">Space between</option>
                            <option value="space-around">Space around</option>
                            <option value="space-evenly">Space evenly</option>
                        </select>
                    </label>
                    <label>
                        <span>Align</span>
                        <select data-prop="alignItems">
                            <option value="">Keep current</option>
                            <option value="stretch">Stretch</option>
                            <option value="flex-start">Start</option>
                            <option value="center">Center</option>
                            <option value="flex-end">End</option>
                            <option value="baseline">Baseline</option>
                        </select>
                    </label>
                    <label>
                        <span>Text align</span>
                        <select data-prop="textAlign">
                            <option value="">Keep current</option>
                            <option value="left">Left</option>
                            <option value="center">Center</option>
                            <option value="right">Right</option>
                            <option value="start">Start</option>
                            <option value="end">End</option>
                        </select>
                    </label>
                    <label>
                        <span>Gap px</span>
                        <input data-prop="gap" data-unit="px" type="number" min="0" max="260" step="1">
                    </label>
                    <label>
                        <span>Row gap px</span>
                        <input data-prop="rowGap" data-unit="px" type="number" min="0" max="260" step="1">
                    </label>
                    <label>
                        <span>Column gap px</span>
                        <input data-prop="columnGap" data-unit="px" type="number" min="0" max="260" step="1">
                    </label>
                    <label>
                        <span>Line height</span>
                        <input data-prop="lineHeight" type="number" min="0.7" max="3.2" step="0.05">
                    </label>
                    <label>
                        <span>Letter spacing px</span>
                        <input data-prop="letterSpacing" data-unit="px" type="number" min="-10" max="30" step="0.5">
                    </label>
                    <label>
                        <span>Opacity</span>
                        <input data-prop="opacity" type="number" min="0" max="1" step="0.05">
                    </label>
                </div>
            </section>

            <section class="inspector-section">
                <h2>Size and box</h2>
                <div class="property-grid">
                    <label>
                        <span>Width px</span>
                        <input data-prop="width" type="text" placeholder="320px or 100%">
                    </label>
                    <label>
                        <span>Max width px</span>
                        <input data-prop="maxWidth" type="text" placeholder="620px or 90%">
                    </label>
                    <label>
                        <span>Min width px</span>
                        <input data-prop="minWidth" type="text" placeholder="180px">
                    </label>
                    <label>
                        <span>Height px</span>
                        <input data-prop="height" type="text" placeholder="320px or 60%">
                    </label>
                    <label>
                        <span>Min height px</span>
                        <input data-prop="minHeight" type="text" placeholder="280px">
                    </label>
                    <label>
                        <span>Radius px</span>
                        <input data-prop="borderRadius" data-unit="px" type="number" min="0" max="260" step="1">
                    </label>
                </div>
            </section>

            <section class="inspector-section">
                <h2>Spacing</h2>
                <div class="property-grid">
                    <label>
                        <span>Padding top</span>
                        <input data-prop="paddingTop" data-unit="px" type="number" min="0" max="260" step="1">
                    </label>
                    <label>
                        <span>Padding right</span>
                        <input data-prop="paddingRight" data-unit="px" type="number" min="0" max="260" step="1">
                    </label>
                    <label>
                        <span>Padding bottom</span>
                        <input data-prop="paddingBottom" data-unit="px" type="number" min="0" max="260" step="1">
                    </label>
                    <label>
                        <span>Padding left</span>
                        <input data-prop="paddingLeft" data-unit="px" type="number" min="0" max="260" step="1">
                    </label>
                    <label>
                        <span>Margin top</span>
                        <input data-prop="marginTop" data-unit="px" type="number" min="-260" max="260" step="1">
                    </label>
                    <label>
                        <span>Margin bottom</span>
                        <input data-prop="marginBottom" data-unit="px" type="number" min="-260" max="260" step="1">
                    </label>
                    <label>
                        <span>Margin left</span>
                        <input data-prop="marginLeft" data-unit="px" type="number" min="-260" max="260" step="1">
                    </label>
                    <label>
                        <span>Margin right</span>
                        <input data-prop="marginRight" data-unit="px" type="number" min="-260" max="260" step="1">
                    </label>
                </div>
            </section>

            <section class="inspector-section">
                <h2>Move</h2>
                <div class="property-grid">
                    <label>
                        <span>Move X px</span>
                        <input data-prop="translateX" data-unit="px" type="number" min="-900" max="900" step="1">
                    </label>
                    <label>
                        <span>Move Y px</span>
                        <input data-prop="translateY" data-unit="px" type="number" min="-900" max="900" step="1">
                    </label>
                    <label class="full">
                        <span>Flex order</span>
                        <input data-prop="order" type="number" min="-50" max="50" step="1" placeholder="Only works inside flex/grid groups">
                    </label>
                </div>
                <div class="actions">
                    <button class="button button-primary" id="saveRuleButton" type="button">Save change</button>
                    <button class="button" id="resetFormButton" type="button">Clear fields</button>
                    <button class="button button-danger" id="deleteRuleButton" type="button">Delete saved rule</button>
                </div>
                <div class="status" id="statusMessage"></div>
            </section>

            <section class="inspector-section">
                <h2>Saved visual rules</h2>
                <p>These are the visual tweaks already saved from this editor.</p>
                <div class="rule-list" id="ruleList"></div>
            </section>
        </aside>
    </main>

    <script>
        (function () {
            'use strict';

            const pageSelect = document.getElementById('pageSelect');
            const frame = document.getElementById('visualPreviewFrame');
            const frameShell = document.getElementById('frameShell');
            const selectModeButton = document.getElementById('selectModeButton');
            const saveRuleButton = document.getElementById('saveRuleButton');
            const resetFormButton = document.getElementById('resetFormButton');
            const deleteRuleButton = document.getElementById('deleteRuleButton');
            const logoutButton = document.getElementById('logoutButton');
            const selectedLabel = document.getElementById('selectedLabel');
            const selectedSelector = document.getElementById('selectedSelector');
            const selectedComputed = document.getElementById('selectedComputed');
            const elementFamilyBadge = document.getElementById('elementFamilyBadge');
            const elementFamilyRisk = document.getElementById('elementFamilyRisk');
            const elementFamilyAdvice = document.getElementById('elementFamilyAdvice');
            const quickActions = document.getElementById('quickActions');
            const statusMessage = document.getElementById('statusMessage');
            const ruleList = document.getElementById('ruleList');
            const fields = Array.from(document.querySelectorAll('[data-prop]'));
            const fieldByProp = new Map(fields.map(function (field) {
                return [field.dataset.prop, field];
            }));
            const CSS_PROPERTIES = {
                display: 'display',
                flexDirection: 'flex-direction',
                justifyContent: 'justify-content',
                alignItems: 'align-items',
                textAlign: 'text-align',
                fontFamily: 'font-family',
                fontSize: 'font-size',
                fontWeight: 'font-weight',
                lineHeight: 'line-height',
                letterSpacing: 'letter-spacing',
                color: 'color',
                backgroundColor: 'background-color',
                width: 'width',
                minWidth: 'min-width',
                maxWidth: 'max-width',
                height: 'height',
                minHeight: 'min-height',
                maxHeight: 'max-height',
                paddingTop: 'padding-top',
                paddingRight: 'padding-right',
                paddingBottom: 'padding-bottom',
                paddingLeft: 'padding-left',
                marginTop: 'margin-top',
                marginRight: 'margin-right',
                marginBottom: 'margin-bottom',
                marginLeft: 'margin-left',
                gap: 'gap',
                rowGap: 'row-gap',
                columnGap: 'column-gap',
                borderRadius: 'border-radius',
                opacity: 'opacity',
                order: 'order'
            };

            let pages = [];
            let visual = { rules: [] };
            let selected = null;
            let hoverElement = null;
            let selectMode = true;
            let pendingRule = null;

            function setStatus(message, kind) {
                statusMessage.textContent = message || '';
                statusMessage.className = 'status' + (kind ? ' is-' + kind : '');
            }

            function elementSignature(element) {
                const tag = element && element.tagName ? element.tagName.toLowerCase() : '';
                const classes = Array.from(element && element.classList || []).join(' ').toLowerCase();
                const role = String(element && element.getAttribute && element.getAttribute('role') || '').toLowerCase();
                const type = String(element && element.getAttribute && element.getAttribute('type') || '').toLowerCase();

                return { tag, classes, role, type };
            }

            function signatureIncludes(signature, words) {
                return words.some(function (word) {
                    return signature.classes.includes(word) ||
                        signature.role.includes(word) ||
                        signature.type.includes(word) ||
                        signature.tag === word;
                });
            }

            function classifyElement(element) {
                const signature = elementSignature(element);

                if (
                    signature.tag === 'button' ||
                    signature.tag === 'a' ||
                    signature.role === 'button' ||
                    signatureIncludes(signature, ['button', 'btn', 'cta', 'submit', 'primary', 'secondary', 'whatsapp', 'call'])
                ) {
                    return {
                        key: 'button',
                        label: 'Button / CTA',
                        risk: 'High impact',
                        advice: 'Edit size, spacing, hierarchy and movement carefully. Main CTAs should stay clear, tappable and visually dominant only when needed.'
                    };
                }

                if (signatureIncludes(signature, ['card', 'panel', 'surface', 'tile', 'result', 'fleet-card', 'vehicle-card'])) {
                    return {
                        key: 'card',
                        label: 'Card / Panel',
                        risk: 'Medium impact',
                        advice: 'Good candidates for width, padding, radius, gap and height changes. Keep cards in the same row visually aligned.'
                    };
                }

                if (
                    signature.tag === 'form' ||
                    signatureIncludes(signature, ['form', 'field', 'input', 'select', 'booking', 'lookup', 'reserve', 'contact'])
                ) {
                    return {
                        key: 'form',
                        label: 'Form / Booking',
                        risk: 'High impact',
                        advice: 'Prioritize readability and tap targets. Avoid moving forms below the first viewport on mobile or laptop.'
                    };
                }

                if (
                    signature.tag === 'img' ||
                    signature.tag === 'picture' ||
                    signature.tag === 'video' ||
                    signatureIncludes(signature, ['image', 'media', 'gallery', 'visual', 'photo', 'thumb'])
                ) {
                    return {
                        key: 'media',
                        label: 'Media / Image',
                        risk: 'Medium impact',
                        advice: 'Use width, height, radius and movement for visual balance. Cropping controls will be a later phase.'
                    };
                }

                if (
                    /^h[1-6]$/.test(signature.tag) ||
                    signature.tag === 'p' ||
                    signature.tag === 'span' ||
                    signatureIncludes(signature, ['headline', 'title', 'lead', 'eyebrow', 'copy', 'text', 'kicker'])
                ) {
                    return {
                        key: 'text',
                        label: 'Text / Hero copy',
                        risk: 'Medium impact',
                        advice: 'Use typography, max width, line height and alignment. Keep one clear headline and avoid oversized text on small screens.'
                    };
                }

                if (
                    signature.tag === 'section' ||
                    signature.tag === 'main' ||
                    signature.tag === 'header' ||
                    signature.tag === 'footer' ||
                    signatureIncludes(signature, ['grid', 'row', 'stack', 'layout', 'section', 'shell', 'inner', 'container', 'actions'])
                ) {
                    return {
                        key: 'layout',
                        label: 'Layout / Section',
                        risk: 'High impact',
                        advice: 'Layout changes affect many children. Prefer gap, alignment and order before absolute movement.'
                    };
                }

                return {
                    key: 'generic',
                    label: 'Generic element',
                    risk: 'Low impact',
                    advice: 'Use small spacing, size and movement changes first. If it controls layout, test all viewport buttons before saving.'
                };
            }

            function setFieldValue(prop, value) {
                const field = fieldByProp.get(prop);

                if (!field) {
                    return;
                }

                field.value = field.dataset.unit === 'px' ? stripPx(value) : String(value);
            }

            function applyPreset(properties, message) {
                if (!selected) {
                    setStatus('Select an element in the preview first.', 'error');
                    return;
                }

                Object.entries(properties).forEach(function (entry) {
                    setFieldValue(entry[0], entry[1]);
                });

                applyLivePreview();
                setStatus(message || 'Preset applied in preview. Save it if it looks right.', 'ok');
            }

            function quickActionPresets(familyKey) {
                const presets = {
                    button: [
                        ['Make bigger', { minHeight: '54px', paddingTop: '14px', paddingBottom: '14px', paddingLeft: '24px', paddingRight: '24px', borderRadius: '999px', fontWeight: '800', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }],
                        ['Make smaller', { minHeight: '44px', paddingTop: '10px', paddingBottom: '10px', paddingLeft: '16px', paddingRight: '16px', fontSize: '14px' }],
                        ['Move up', { translateY: '-12px' }],
                        ['Center button', { display: 'inline-flex', alignItems: 'center', justifyContent: 'center', textAlign: 'center' }]
                    ],
                    text: [
                        ['Hero title feel', { fontFamily: "'El Messiri', 'Cormorant Garamond', serif", fontWeight: '700', lineHeight: '1.05', letterSpacing: '-1px' }],
                        ['Body copy feel', { fontFamily: "'Manrope', system-ui, sans-serif", fontWeight: '400', lineHeight: '1.55', letterSpacing: '0px' }],
                        ['Center text', { textAlign: 'center' }],
                        ['Narrow width', { maxWidth: '620px' }]
                    ],
                    card: [
                        ['Roomier card', { paddingTop: '24px', paddingRight: '24px', paddingBottom: '24px', paddingLeft: '24px', borderRadius: '24px', gap: '16px' }],
                        ['Compact card', { paddingTop: '16px', paddingRight: '16px', paddingBottom: '16px', paddingLeft: '16px', borderRadius: '16px', gap: '10px' }],
                        ['Taller card', { minHeight: '320px' }],
                        ['Move up', { translateY: '-12px' }]
                    ],
                    form: [
                        ['Roomier form', { paddingTop: '24px', paddingRight: '24px', paddingBottom: '24px', paddingLeft: '24px', gap: '14px', borderRadius: '22px' }],
                        ['Compact form', { paddingTop: '16px', paddingRight: '16px', paddingBottom: '16px', paddingLeft: '16px', gap: '10px' }],
                        ['Make wider', { maxWidth: '520px' }],
                        ['Move up', { translateY: '-14px' }]
                    ],
                    media: [
                        ['Soft radius', { borderRadius: '24px' }],
                        ['Square radius', { borderRadius: '8px' }],
                        ['Wider media', { width: '100%' }],
                        ['Move up', { translateY: '-12px' }]
                    ],
                    layout: [
                        ['Flex row', { display: 'flex', flexDirection: 'row', alignItems: 'center', gap: '16px' }],
                        ['Stack column', { display: 'flex', flexDirection: 'column', gap: '14px' }],
                        ['Center children', { display: 'flex', alignItems: 'center', justifyContent: 'center', textAlign: 'center' }],
                        ['Spread children', { display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '16px' }]
                    ],
                    generic: [
                        ['Move up', { translateY: '-12px' }],
                        ['Move down', { translateY: '12px' }],
                        ['More spacing', { marginTop: '16px', marginBottom: '16px' }],
                        ['Hide element', { display: 'none' }]
                    ]
                };

                return presets[familyKey] || presets.generic;
            }

            function renderFamilyPanel(family) {
                elementFamilyBadge.textContent = family.label;
                elementFamilyRisk.textContent = family.risk;
                elementFamilyAdvice.textContent = family.advice;
                quickActions.innerHTML = '';

                quickActionPresets(family.key).forEach(function (preset) {
                    const button = document.createElement('button');
                    button.className = 'quick-action';
                    button.type = 'button';
                    button.textContent = preset[0];
                    button.addEventListener('click', function () {
                        applyPreset(preset[1], preset[0] + ' applied in preview. Save it if it looks right.');
                    });
                    quickActions.appendChild(button);
                });
            }

            function resetFamilyPanel() {
                elementFamilyBadge.textContent = 'Waiting';
                elementFamilyRisk.textContent = 'Select an element';
                elementFamilyAdvice.textContent = 'The inspector will adapt once you pick a button, text, card, form, media block or layout container.';
                quickActions.innerHTML = '';
            }

            function cssEscape(value) {
                if (window.CSS && typeof window.CSS.escape === 'function') {
                    return window.CSS.escape(value);
                }

                return String(value || '').replace(/[^a-zA-Z0-9_-]/g, function (character) {
                    return '\\\\' + character;
                });
            }

            function apiJson(url, options) {
                return fetch(url, options).then(function (response) {
                    return response.json().catch(function () {
                        return {};
                    }).then(function (data) {
                        if (!response.ok) {
                            throw new Error(data.error || 'Request failed.');
                        }

                        return data;
                    });
                });
            }

            function previewUrl(publicPath) {
                return '/admin/preview/page?path=' + encodeURIComponent(publicPath || '/');
            }

            function renderPages() {
                pageSelect.innerHTML = '';
                pages.forEach(function (page) {
                    const option = document.createElement('option');
                    option.value = page.publicPath;
                    option.textContent = page.label + ' - ' + page.publicPath;
                    pageSelect.appendChild(option);
                });
            }

            function loadPreview() {
                selected = null;
                frame.dataset.visualReady = 'false';
                clearFields();
                clearSelectedInfo();
                frame.src = previewUrl(pageSelect.value || '/');
            }

            function clearSelectedInfo() {
                selectedLabel.textContent = 'No element selected yet';
                selectedSelector.textContent = 'Click inside the preview to inspect an element.';
                selectedComputed.textContent = 'Computed styles will appear here.';
                resetFamilyPanel();
            }

            function installFrameStyle(doc) {
                let style = doc.getElementById('pgm-visual-editor-tools');

                if (!style) {
                    style = doc.createElement('style');
                    style.id = 'pgm-visual-editor-tools';
                    doc.head.appendChild(style);
                }

                style.textContent = '[data-pgm-visual-hover] { outline: 2px solid #dcb458 !important; outline-offset: 3px !important; cursor: crosshair !important; }' +
                    '[data-pgm-visual-selected] { outline: 3px solid #111111 !important; outline-offset: 4px !important; box-shadow: 0 0 0 7px rgba(220, 180, 88, 0.24) !important; }';
            }

            function clearHover() {
                if (hoverElement) {
                    hoverElement.removeAttribute('data-pgm-visual-hover');
                    hoverElement = null;
                }
            }

            function clearSelectedMarker(doc) {
                Array.from(doc.querySelectorAll('[data-pgm-visual-selected]')).forEach(function (element) {
                    element.removeAttribute('data-pgm-visual-selected');
                });
            }

            function attachFrameTools() {
                const doc = frame.contentDocument;

                if (!doc || !doc.body) {
                    return;
                }

                installFrameStyle(doc);
                frame.dataset.visualReady = 'true';
                doc.addEventListener('mouseover', function (event) {
                    if (!selectMode || !event.target || event.target === doc.documentElement) {
                        return;
                    }

                    clearHover();
                    hoverElement = event.target;
                    hoverElement.setAttribute('data-pgm-visual-hover', 'true');
                }, true);

                doc.addEventListener('mouseout', function () {
                    clearHover();
                }, true);

                doc.addEventListener('click', function (event) {
                    if (!selectMode || !event.target) {
                        return;
                    }

                    event.preventDefault();
                    event.stopPropagation();
                    selectElement(event.target);
                }, true);

                if (pendingRule) {
                    window.setTimeout(function () {
                        const rule = pendingRule;
                        pendingRule = null;
                        focusElementFromRule(rule);
                    }, 120);
                }
            }

            function nthOfType(element) {
                let index = 1;
                let sibling = element.previousElementSibling;

                while (sibling) {
                    if (sibling.tagName === element.tagName) {
                        index += 1;
                    }

                    sibling = sibling.previousElementSibling;
                }

                return index;
            }

            function isStableClass(className) {
                return className &&
                    !/^is-/.test(className) &&
                    !/^has-/.test(className) &&
                    !/^js-/.test(className) &&
                    !/^pgm-visual/.test(className);
            }

            function buildSelector(element) {
                const doc = frame.contentDocument;

                if (!element || element === doc.documentElement || element === doc.body) {
                    return 'body';
                }

                if (element.id) {
                    return '#' + cssEscape(element.id);
                }

                const parts = [];
                let current = element;

                while (current && current.nodeType === 1 && current !== doc.body && parts.length < 6) {
                    let part = current.tagName.toLowerCase();
                    const classes = Array.from(current.classList || []).filter(isStableClass).slice(0, 2);

                    if (classes.length) {
                        part += '.' + classes.map(cssEscape).join('.');
                    } else {
                        part += ':nth-of-type(' + nthOfType(current) + ')';
                    }

                    parts.unshift(part);
                    const candidate = parts.join(' > ');

                    try {
                        if (doc.querySelectorAll(candidate).length === 1) {
                            return candidate;
                        }
                    } catch (error) {
                        break;
                    }

                    current = current.parentElement;
                }

                return parts.join(' > ') || 'body';
            }

            function bodyScope() {
                const doc = frame.contentDocument;
                const body = doc && doc.body;

                if (!body) {
                    return 'body';
                }

                const classes = Array.from(body.classList || []).filter(isStableClass).slice(0, 4);
                return classes.length ? 'body.' + classes.map(cssEscape).join('.') : 'body';
            }

            function elementLabel(element) {
                const tag = element.tagName ? element.tagName.toLowerCase() : 'element';
                const id = element.id ? '#' + element.id : '';
                const classes = Array.from(element.classList || []).filter(isStableClass).slice(0, 2).join('.');
                const classLabel = classes ? '.' + classes : '';
                const text = String(element.innerText || element.getAttribute('aria-label') || '').replace(/\\s+/g, ' ').trim().slice(0, 58);

                return tag + id + classLabel + (text ? ' - ' + text : '');
            }

            function rgbToHex(value) {
                const match = String(value || '').match(/rgba?\\((\\d+),\\s*(\\d+),\\s*(\\d+)(?:,\\s*([\\d.]+))?\\)/i);

                if (!match || match[4] === '0') {
                    return '';
                }

                return '#' + [match[1], match[2], match[3]].map(function (part) {
                    return Number(part).toString(16).padStart(2, '0');
                }).join('');
            }

            function stripPx(value) {
                const parsed = Number.parseFloat(String(value || '').replace(/px$/i, ''));
                return Number.isFinite(parsed) ? String(Math.round(parsed * 100) / 100) : '';
            }

            function setPlaceholder(prop, value) {
                const field = fieldByProp.get(prop);

                if (!field) {
                    return;
                }

                field.placeholder = field.dataset.unit === 'px' ? stripPx(value) : value;
            }

            function fillComputedPlaceholders(element) {
                const computed = frame.contentWindow.getComputedStyle(element);
                const rect = element.getBoundingClientRect();
                const backgroundHex = rgbToHex(computed.backgroundColor);

                setPlaceholder('display', computed.display);
                setPlaceholder('flexDirection', computed.flexDirection);
                setPlaceholder('justifyContent', computed.justifyContent);
                setPlaceholder('alignItems', computed.alignItems);
                setPlaceholder('textAlign', computed.textAlign);
                setPlaceholder('fontSize', computed.fontSize);
                setPlaceholder('fontWeight', computed.fontWeight);
                setPlaceholder('lineHeight', computed.lineHeight);
                setPlaceholder('letterSpacing', computed.letterSpacing);
                setPlaceholder('color', rgbToHex(computed.color));
                setPlaceholder('backgroundColor', backgroundHex || 'transparent');
                setPlaceholder('width', rect.width ? String(Math.round(rect.width)) : computed.width);
                setPlaceholder('height', rect.height ? String(Math.round(rect.height)) : computed.height);
                setPlaceholder('minHeight', computed.minHeight);
                setPlaceholder('maxWidth', computed.maxWidth);
                setPlaceholder('gap', computed.gap);
                setPlaceholder('rowGap', computed.rowGap);
                setPlaceholder('columnGap', computed.columnGap);
                setPlaceholder('paddingTop', computed.paddingTop);
                setPlaceholder('paddingRight', computed.paddingRight);
                setPlaceholder('paddingBottom', computed.paddingBottom);
                setPlaceholder('paddingLeft', computed.paddingLeft);
                setPlaceholder('marginTop', computed.marginTop);
                setPlaceholder('marginRight', computed.marginRight);
                setPlaceholder('marginBottom', computed.marginBottom);
                setPlaceholder('marginLeft', computed.marginLeft);
                setPlaceholder('borderRadius', computed.borderRadius);
                setPlaceholder('opacity', computed.opacity);
                selectedComputed.textContent = 'display ' + computed.display + ' | font ' + computed.fontSize + ' / weight ' + computed.fontWeight + ' | box ' + Math.round(rect.width) + 'x' + Math.round(rect.height) + 'px';
            }

            function clearFields() {
                fields.forEach(function (field) {
                    field.value = '';
                    field.placeholder = '';
                });
                applyLivePreview();
            }

            function valueForField(field, value) {
                if (!value) {
                    return '';
                }

                if (field.dataset.unit === 'px') {
                    return stripPx(value);
                }

                return value;
            }

            function fillFieldsFromRule(rule) {
                clearFields();

                if (!rule || !rule.properties) {
                    return;
                }

                Object.entries(rule.properties).forEach(function (entry) {
                    const prop = entry[0];
                    const value = entry[1];
                    const field = fieldByProp.get(prop);

                    if (field) {
                        field.value = valueForField(field, value);
                    }
                });

                applyLivePreview();
            }

            function matchingRuleForSelection(publicPath, selector, scopeSelector) {
                return visual.rules.find(function (rule) {
                    return rule.publicPath === publicPath &&
                        rule.selector === selector &&
                        (rule.scopeSelector || '') === (scopeSelector || '');
                });
            }

            function selectElement(element, forcedRule) {
                const doc = frame.contentDocument;
                const publicPath = pageSelect.value || '/';
                const selector = forcedRule ? forcedRule.selector : buildSelector(element);
                const scopeSelector = forcedRule ? (forcedRule.scopeSelector || '') : bodyScope();
                const label = forcedRule ? forcedRule.label : elementLabel(element);
                const rule = forcedRule || matchingRuleForSelection(publicPath, selector, scopeSelector);
                const family = classifyElement(element);

                clearHover();
                clearSelectedMarker(doc);
                element.setAttribute('data-pgm-visual-selected', 'true');

                selected = {
                    element: element,
                    ruleId: rule ? rule.id : '',
                    publicPath: publicPath,
                    selector: selector,
                    scopeSelector: scopeSelector,
                    label: label,
                    family: family.key
                };

                selectedLabel.textContent = label;
                selectedSelector.textContent = (scopeSelector && selector !== 'body' ? scopeSelector + ' ' : '') + selector;
                renderFamilyPanel(family);
                fillComputedPlaceholders(element);
                fillFieldsFromRule(rule);
                setStatus(rule ? 'Loaded saved rule for this element.' : 'Element selected. Change any field and preview it live.', rule ? 'ok' : '');
            }

            function focusElementFromRule(rule) {
                const doc = frame.contentDocument;

                if (!doc || !rule) {
                    return;
                }

                let element = null;

                try {
                    element = doc.querySelector(rule.selector);
                } catch (error) {
                    element = null;
                }

                if (!element) {
                    setStatus('The saved selector could not be found on this page anymore.', 'error');
                    return;
                }

                selectElement(element, rule);
                element.scrollIntoView({ block: 'center', inline: 'center', behavior: 'smooth' });
            }

            function collectProperties() {
                const properties = {};

                fields.forEach(function (field) {
                    let value = String(field.value || '').trim();

                    if (!value) {
                        return;
                    }

                    if (field.dataset.unit === 'px') {
                        value += 'px';
                    }

                    properties[field.dataset.prop] = value;
                });

                return properties;
            }

            function scopedSelector(scopeSelector, selector) {
                if (!scopeSelector || /^body\\b/i.test(selector)) {
                    return selector;
                }

                return scopeSelector + ' ' + selector;
            }

            function buildCss(selector, properties) {
                const lines = [];
                const translateX = properties.translateX || '';
                const translateY = properties.translateY || '';

                Object.keys(CSS_PROPERTIES).forEach(function (prop) {
                    if (properties[prop]) {
                        lines.push('    ' + CSS_PROPERTIES[prop] + ': ' + properties[prop] + ' !important;');
                    }
                });

                if (translateX || translateY) {
                    lines.push('    transform: translate(' + (translateX || '0px') + ', ' + (translateY || '0px') + ') !important;');
                }

                return lines.length ? selector + ' {\\n' + lines.join('\\n') + '\\n}' : '';
            }

            function applyLivePreview() {
                const doc = frame.contentDocument;

                if (!doc || !selected) {
                    return;
                }

                let style = doc.getElementById('pgm-visual-live-style');

                if (!style) {
                    style = doc.createElement('style');
                    style.id = 'pgm-visual-live-style';
                    doc.head.appendChild(style);
                }

                const properties = collectProperties();
                style.textContent = buildCss(scopedSelector(selected.scopeSelector, selected.selector), properties);
            }

            function renderRuleList() {
                ruleList.innerHTML = '';

                if (!visual.rules || visual.rules.length === 0) {
                    const empty = document.createElement('div');
                    empty.className = 'empty';
                    empty.textContent = 'No saved visual changes yet.';
                    ruleList.appendChild(empty);
                    return;
                }

                visual.rules.forEach(function (rule) {
                    const item = document.createElement('article');
                    item.className = 'rule-item';

                    const title = document.createElement('strong');
                    title.textContent = rule.label || rule.selector;

                    const meta = document.createElement('small');
                    meta.textContent = rule.publicPath + ' | ' + rule.selector;

                    const actions = document.createElement('div');
                    actions.className = 'rule-item-actions';

                    const inspect = document.createElement('button');
                    inspect.className = 'button';
                    inspect.type = 'button';
                    inspect.textContent = 'Inspect';
                    inspect.addEventListener('click', function () {
                        pageSelect.value = rule.publicPath;
                        pendingRule = rule;
                        loadPreview();
                    });

                    const remove = document.createElement('button');
                    remove.className = 'button button-danger';
                    remove.type = 'button';
                    remove.textContent = 'Delete';
                    remove.addEventListener('click', function () {
                        deleteRule(rule.id);
                    });

                    actions.appendChild(inspect);
                    actions.appendChild(remove);
                    item.appendChild(title);
                    item.appendChild(meta);
                    item.appendChild(actions);
                    ruleList.appendChild(item);
                });
            }

            function refreshState(data) {
                visual = data.visual || { rules: [] };
                renderRuleList();
            }

            function saveRule() {
                if (!selected) {
                    setStatus('Select an element in the preview first.', 'error');
                    return;
                }

                const properties = collectProperties();

                if (Object.keys(properties).length === 0) {
                    setStatus('Change at least one property before saving.', 'error');
                    return;
                }

                setStatus('Saving visual change...', '');

                apiJson('/api/admin/visual-editor/rule', {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        id: selected.ruleId,
                        publicPath: selected.publicPath,
                        selector: selected.selector,
                        scopeSelector: selected.scopeSelector,
                        label: selected.label,
                        properties: properties
                    })
                }).then(function (data) {
                    refreshState(data);
                    const rule = data.rule || matchingRuleForSelection(selected.publicPath, selected.selector, selected.scopeSelector);
                    selected.ruleId = rule ? rule.id : selected.ruleId;
                    setStatus('Saved. The generated CSS now applies to the public page too.', 'ok');
                }).catch(function (error) {
                    setStatus(error.message, 'error');
                });
            }

            function deleteRule(ruleId) {
                const id = ruleId || (selected && selected.ruleId);

                if (!id) {
                    setStatus('This selected element has no saved rule yet.', 'error');
                    return;
                }

                setStatus('Deleting visual rule...', '');

                apiJson('/api/admin/visual-editor/rule/' + encodeURIComponent(id), {
                    method: 'DELETE'
                }).then(function (data) {
                    refreshState(data);
                    if (selected && selected.ruleId === id) {
                        selected.ruleId = '';
                        clearFields();
                    }
                    setStatus('Deleted visual rule.', 'ok');
                }).catch(function (error) {
                    setStatus(error.message, 'error');
                });
            }

            function loadEditor() {
                apiJson('/api/admin/visual-editor').then(function (data) {
                    pages = data.pages || [];
                    refreshState(data);
                    renderPages();
                    loadPreview();
                }).catch(function (error) {
                    setStatus(error.message, 'error');
                });
            }

            frame.addEventListener('load', attachFrameTools);
            pageSelect.addEventListener('change', loadPreview);
            fields.forEach(function (field) {
                field.addEventListener('input', applyLivePreview);
                field.addEventListener('change', applyLivePreview);
            });
            document.querySelectorAll('[data-viewport]').forEach(function (button) {
                button.addEventListener('click', function () {
                    frameShell.dataset.viewport = button.dataset.viewport;
                });
            });
            selectModeButton.addEventListener('click', function () {
                selectMode = !selectMode;
                selectModeButton.textContent = selectMode ? 'Selecting on' : 'Selecting off';
                selectModeButton.classList.toggle('button-primary', selectMode);
            });
            saveRuleButton.addEventListener('click', saveRule);
            resetFormButton.addEventListener('click', function () {
                clearFields();
                setStatus('Fields cleared. Nothing changes until you save.', '');
            });
            deleteRuleButton.addEventListener('click', function () {
                deleteRule();
            });
            logoutButton.addEventListener('click', function () {
                fetch('/api/admin/logout', { method: 'POST' }).finally(function () {
                    window.location.href = '/admin/login.html';
                });
            });

            loadEditor();
        }());
    </script>
</body>
</html>`;
}

module.exports = {
    renderAdminVisualEditorPage
};
