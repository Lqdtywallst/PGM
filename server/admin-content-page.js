function renderAdminContentEditorPage() {
    return `<!doctype html>
<html lang="en">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <meta name="robots" content="noindex,nofollow">
    <title>Dynasty Prestige Content Editor</title>
    <style>
        :root {
            --bg: #f6efe2;
            --ink: #17120d;
            --muted: #74685d;
            --panel: rgba(255, 255, 255, 0.9);
            --line: rgba(23, 18, 13, 0.12);
            --line-strong: rgba(23, 18, 13, 0.2);
            --black: #0d0d0f;
            --gold: #dcb458;
            --gold-soft: #f7df95;
            --shadow: 0 20px 60px rgba(52, 38, 21, 0.12);
            --success: #1f8f54;
            --danger: #b64035;
        }
        * { box-sizing: border-box; }
        body {
            margin: 0;
            min-height: 100vh;
            color: var(--ink);
            font-family: Arial, sans-serif;
            background:
                radial-gradient(circle at 10% 0%, rgba(220, 180, 88, 0.22), transparent 34rem),
                linear-gradient(135deg, #fbf7ef 0%, var(--bg) 55%, #e7d8c4 100%);
        }
        a { color: inherit; }
        button,
        input,
        textarea,
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
            background: rgba(13, 13, 15, 0.94);
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
            letter-spacing: 0.12em;
            text-transform: uppercase;
        }
        .topbar-actions {
            display: flex;
            align-items: center;
            gap: 10px;
            flex-wrap: wrap;
            justify-content: flex-end;
        }
        .topbar-link,
        .logout {
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
            font-size: 0.84rem;
            font-weight: 700;
            letter-spacing: 0.08em;
            text-transform: uppercase;
        }
        .topbar-link--primary {
            border-color: rgba(247, 223, 149, 0.38);
            background: linear-gradient(135deg, rgba(247, 223, 149, 0.18), rgba(220, 180, 88, 0.16));
        }
        .page {
            padding: clamp(18px, 3vw, 30px);
        }
        .hero {
            display: grid;
            grid-template-columns: minmax(0, 1.5fr) minmax(280px, 0.9fr);
            gap: 18px;
            align-items: start;
            margin-bottom: 18px;
        }
        .hero-card,
        .note-card,
        .panel {
            border: 1px solid var(--line);
            border-radius: 24px;
            background: var(--panel);
            box-shadow: var(--shadow);
        }
        .hero-card {
            padding: clamp(20px, 4vw, 30px);
        }
        .hero-card h1 {
            margin: 0 0 10px;
            font: 700 clamp(2rem, 4vw, 3.4rem) / 0.96 Georgia, serif;
        }
        .hero-card p {
            margin: 0;
            max-width: 60rem;
            color: var(--muted);
            line-height: 1.65;
        }
        .note-card {
            padding: 20px;
        }
        .note-card strong {
            display: block;
            margin-bottom: 10px;
            font-size: 0.82rem;
            letter-spacing: 0.12em;
            text-transform: uppercase;
        }
        .note-card p {
            margin: 0 0 12px;
            color: var(--muted);
            line-height: 1.55;
        }
        .note-card code {
            color: #6b4a0b;
            font-family: Consolas, monospace;
            font-size: 0.9em;
        }
        .workspace {
            display: grid;
            grid-template-columns: minmax(0, 1.08fr) minmax(380px, 0.92fr);
            gap: 18px;
            align-items: start;
        }
        .stack {
            display: grid;
            gap: 18px;
        }
        .panel {
            overflow: hidden;
        }
        .panel--advanced {
            overflow: hidden;
        }
        .panel--advanced summary {
            list-style: none;
            cursor: pointer;
        }
        .panel--advanced summary::-webkit-details-marker {
            display: none;
        }
        .panel-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            gap: 12px;
            padding: 18px 20px;
            border-bottom: 1px solid var(--line);
        }
        .panel-title strong {
            display: block;
            font-size: 1.05rem;
        }
        .panel-title span {
            display: block;
            margin-top: 4px;
            color: var(--muted);
            font-size: 0.9rem;
        }
        .panel-kicker {
            display: inline-flex;
            align-items: center;
            min-height: 28px;
            padding: 0 10px;
            border-radius: 999px;
            background: rgba(220, 180, 88, 0.14);
            color: #6b4a0b;
            font-size: 0.72rem;
            font-weight: 800;
            letter-spacing: 0.08em;
            text-transform: uppercase;
        }
        .panel-kicker--danger {
            background: rgba(182, 64, 53, 0.12);
            color: var(--danger);
        }
        .panel-body {
            padding: 20px;
        }
        .field-grid {
            display: grid;
            grid-template-columns: repeat(2, minmax(0, 1fr));
            gap: 14px;
        }
        .field {
            display: grid;
            gap: 8px;
        }
        .field--full {
            grid-column: 1 / -1;
        }
        .field label {
            font-size: 0.78rem;
            font-weight: 800;
            letter-spacing: 0.1em;
            text-transform: uppercase;
            color: #5b4e42;
        }
        .field input,
        .field textarea,
        .field select {
            width: 100%;
            border: 1px solid var(--line-strong);
            border-radius: 14px;
            background: #fffdf9;
            color: var(--ink);
            padding: 13px 14px;
            outline: none;
        }
        .field textarea {
            min-height: 110px;
            resize: vertical;
        }
        .field select {
            min-height: 52px;
        }
        .field input[type="color"] {
            min-height: 52px;
            padding: 6px;
            cursor: pointer;
        }
        .field input:focus,
        .field textarea:focus,
        .field select:focus {
            border-color: rgba(220, 180, 88, 0.84);
            box-shadow: 0 0 0 4px rgba(220, 180, 88, 0.12);
        }
        .panel-actions {
            display: flex;
            gap: 10px;
            flex-wrap: wrap;
            align-items: center;
            margin-top: 18px;
        }
        .button {
            min-height: 46px;
            padding: 0 18px;
            border: 0;
            border-radius: 999px;
            cursor: pointer;
            display: inline-flex;
            align-items: center;
            justify-content: center;
            font-size: 0.82rem;
            font-weight: 800;
            letter-spacing: 0.09em;
            text-transform: uppercase;
            text-decoration: none;
        }
        .button-primary {
            background: linear-gradient(135deg, var(--gold-soft), var(--gold));
            color: #090807;
        }
        .button-secondary {
            border: 1px solid var(--line-strong);
            background: #fffdf9;
            color: var(--ink);
        }
        .status {
            min-height: 20px;
            color: var(--muted);
            font-size: 0.92rem;
        }
        .status.is-success {
            color: var(--success);
        }
        .status.is-error {
            color: var(--danger);
        }
        .fleet-editor {
            display: grid;
            gap: 14px;
        }
        .fleet-item {
            border: 1px solid var(--line);
            border-radius: 18px;
            background: rgba(255, 255, 255, 0.82);
        }
        .fleet-item summary {
            list-style: none;
            cursor: pointer;
            display: flex;
            justify-content: space-between;
            gap: 12px;
            align-items: center;
            padding: 16px 18px;
        }
        .fleet-item summary::-webkit-details-marker {
            display: none;
        }
        .fleet-item strong {
            display: block;
            font-size: 1rem;
        }
        .fleet-item span {
            display: block;
            margin-top: 4px;
            color: var(--muted);
            font-size: 0.88rem;
        }
        .fleet-item-body {
            padding: 0 18px 18px;
        }
        .collection-stack {
            display: grid;
            gap: 18px;
        }
        .collection-section {
            display: grid;
            gap: 14px;
            padding: 18px;
            border: 1px solid var(--line);
            border-radius: 20px;
            background: rgba(255, 255, 255, 0.72);
        }
        .collection-head {
            display: flex;
            justify-content: space-between;
            gap: 12px;
            align-items: start;
        }
        .collection-head strong {
            display: block;
            font-size: 1rem;
        }
        .collection-head span {
            display: block;
            margin-top: 4px;
            color: var(--muted);
            font-size: 0.88rem;
            line-height: 1.45;
        }
        .collection-list {
            display: grid;
            gap: 12px;
        }
        .editor-item {
            border: 1px solid var(--line);
            border-radius: 18px;
            background: #fffdf9;
        }
        .editor-item summary {
            list-style: none;
            cursor: pointer;
            display: flex;
            justify-content: space-between;
            gap: 12px;
            align-items: center;
            padding: 14px 16px;
        }
        .editor-item summary::-webkit-details-marker {
            display: none;
        }
        .editor-item strong {
            display: block;
            font-size: 0.98rem;
        }
        .editor-item span {
            display: block;
            margin-top: 4px;
            color: var(--muted);
            font-size: 0.84rem;
        }
        .editor-item-body {
            padding: 0 16px 16px;
        }
        .editor-grid {
            display: grid;
            grid-template-columns: repeat(2, minmax(0, 1fr));
            gap: 14px;
        }
        .editor-grid .field--full {
            grid-column: 1 / -1;
        }
        .checkbox-field {
            display: flex;
            align-items: center;
            gap: 12px;
            min-height: 52px;
            padding: 0 14px;
            border: 1px solid var(--line-strong);
            border-radius: 14px;
            background: #fffdf9;
        }
        .checkbox-field input {
            width: auto;
            margin: 0;
        }
        .item-actions {
            display: flex;
            flex-wrap: wrap;
            gap: 8px;
            margin-top: 14px;
        }
        .mini-button {
            min-height: 38px;
            padding: 0 14px;
            border: 1px solid var(--line-strong);
            border-radius: 999px;
            background: #fffdf9;
            color: var(--ink);
            cursor: pointer;
            font-size: 0.74rem;
            font-weight: 800;
            letter-spacing: 0.08em;
            text-transform: uppercase;
        }
        .mini-button--danger {
            border-color: rgba(182, 64, 53, 0.24);
            color: var(--danger);
        }
        .collection-toolbar {
            display: flex;
            justify-content: space-between;
            gap: 12px;
            align-items: center;
            flex-wrap: wrap;
        }
        .collection-count {
            color: var(--muted);
            font-size: 0.84rem;
        }
        .helper-text {
            color: var(--muted);
            font-size: 0.84rem;
            line-height: 1.55;
        }
        .style-preview {
            display: grid;
            grid-template-columns: minmax(0, 1.2fr) minmax(220px, 0.8fr);
            gap: 14px;
            margin-top: 16px;
            padding: 14px;
            border: 1px solid var(--line);
            border-radius: 20px;
            background: #fffdf9;
        }
        .style-preview-hero {
            position: relative;
            min-height: 220px;
            overflow: hidden;
            border-radius: 14px;
            color: #fff;
            background:
                linear-gradient(135deg, rgba(10, 12, 15, 0.2), rgba(10, 12, 15, 0.84)),
                radial-gradient(circle at 74% 34%, rgba(220, 180, 88, 0.55), transparent 16rem),
                linear-gradient(135deg, #1e252c, #07080a);
        }
        .style-preview-hero__shade {
            position: absolute;
            inset: 0;
            background: linear-gradient(180deg, rgba(0, 0, 0, 0.12), rgba(0, 0, 0, 0.82));
        }
        .style-preview-hero__copy {
            position: absolute;
            inset: auto 0 0;
            z-index: 1;
            padding: 18px;
        }
        .style-preview-hero__tag {
            display: inline-flex;
            margin-bottom: 10px;
            padding: 6px 10px;
            border: 1px solid rgba(255, 255, 255, 0.18);
            border-radius: 999px;
            background: rgba(8, 10, 12, 0.48);
            font-size: 0.68rem;
            font-weight: 800;
            letter-spacing: 0.12em;
            text-transform: uppercase;
        }
        .style-preview-hero h3 {
            margin: 0 0 8px;
            max-width: 12ch;
            font-size: 2.5rem;
            line-height: 0.92;
            letter-spacing: -0.04em;
        }
        .style-preview-hero p {
            margin: 0 0 14px;
            max-width: 30rem;
            color: rgba(255, 255, 255, 0.82);
            font-size: 0.92rem;
            line-height: 1.5;
        }
        .style-preview-button {
            display: inline-flex;
            align-items: center;
            justify-content: center;
            min-height: 42px;
            padding: 0 16px;
            border-radius: 8px;
            background: #15191f;
            color: #fff;
            font-size: 0.78rem;
            font-weight: 800;
            text-decoration: none;
        }
        .style-preview-card {
            display: grid;
            align-content: start;
            gap: 12px;
            padding: 18px;
            border: 1px solid var(--line);
            border-radius: 14px;
            background: linear-gradient(180deg, #ffffff, #f5f2ea);
        }
        .style-preview-card span {
            color: #7a5f3a;
            font-size: 0.7rem;
            font-weight: 800;
            letter-spacing: 0.16em;
            text-transform: uppercase;
        }
        .style-preview-card strong {
            display: block;
            color: #171717;
            font-size: 2rem;
            line-height: 1;
        }
        .style-preview-card p {
            margin: 0;
            color: #514336;
            line-height: 1.5;
        }
        .favicon-picker {
            display: grid;
            gap: 14px;
            padding: 16px;
            border: 1px solid var(--line);
            border-radius: 20px;
            background: rgba(255, 255, 255, 0.72);
        }
        .favicon-current {
            display: grid;
            grid-template-columns: 74px minmax(0, 1fr);
            gap: 14px;
            align-items: center;
            padding: 14px;
            border: 1px solid var(--line);
            border-radius: 16px;
            background: #fffdf9;
        }
        .favicon-current__media {
            width: 74px;
            height: 74px;
            display: grid;
            place-items: center;
            border-radius: 16px;
            border: 1px solid var(--line);
            background:
                linear-gradient(45deg, rgba(23, 18, 13, 0.04) 25%, transparent 25%),
                linear-gradient(-45deg, rgba(23, 18, 13, 0.04) 25%, transparent 25%),
                linear-gradient(45deg, transparent 75%, rgba(23, 18, 13, 0.04) 75%),
                linear-gradient(-45deg, transparent 75%, rgba(23, 18, 13, 0.04) 75%);
            background-position: 0 0, 0 8px, 8px -8px, -8px 0;
            background-size: 16px 16px;
        }
        .favicon-current__media img {
            width: 48px;
            height: 48px;
            object-fit: contain;
        }
        .favicon-current strong {
            display: block;
            margin-bottom: 4px;
            font-size: 1rem;
        }
        .favicon-current span {
            display: block;
            color: var(--muted);
            font-size: 0.9rem;
            line-height: 1.45;
            word-break: break-word;
        }
        .favicon-option-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(132px, 1fr));
            gap: 10px;
        }
        .favicon-option {
            min-height: 126px;
            padding: 12px;
            border: 1px solid var(--line);
            border-radius: 16px;
            background: #fffdf9;
            color: var(--ink);
            cursor: pointer;
            display: grid;
            justify-items: center;
            align-content: start;
            gap: 9px;
            text-align: center;
            transition: border-color 160ms ease, box-shadow 160ms ease, transform 160ms ease;
        }
        .favicon-option:hover,
        .favicon-option:focus-visible {
            border-color: rgba(220, 180, 88, 0.68);
            box-shadow: 0 10px 24px rgba(52, 38, 21, 0.1);
            outline: none;
            transform: translateY(-1px);
        }
        .favicon-option.is-selected {
            border-color: rgba(220, 180, 88, 0.95);
            background: linear-gradient(180deg, #fffdf9, rgba(247, 223, 149, 0.24));
            box-shadow: 0 0 0 4px rgba(220, 180, 88, 0.14);
        }
        .favicon-option__media {
            width: 52px;
            height: 52px;
            display: grid;
            place-items: center;
            border-radius: 14px;
            border: 1px solid rgba(23, 18, 13, 0.1);
            background: rgba(255, 255, 255, 0.82);
        }
        .favicon-option__media img {
            max-width: 38px;
            max-height: 38px;
            object-fit: contain;
        }
        .favicon-option strong {
            display: block;
            width: 100%;
            overflow: hidden;
            color: #2f271f;
            font-size: 0.78rem;
            line-height: 1.25;
            text-overflow: ellipsis;
            white-space: nowrap;
        }
        .favicon-option span {
            display: block;
            width: 100%;
            overflow: hidden;
            color: var(--muted);
            font-size: 0.72rem;
            text-overflow: ellipsis;
            white-space: nowrap;
        }
        .favicon-path-field {
            margin-top: 14px;
        }
        .browser-tab-preview {
            display: grid;
            grid-template-columns: 32px minmax(0, 1fr);
            gap: 12px;
            align-items: center;
            max-width: 560px;
            min-height: 58px;
            margin-top: 16px;
            padding: 12px 16px;
            border: 1px solid var(--line);
            border-radius: 14px 14px 0 0;
            background: #fffdf9;
            box-shadow: 0 10px 20px rgba(52, 38, 21, 0.08);
        }
        .browser-tab-preview img {
            width: 28px;
            height: 28px;
            object-fit: contain;
        }
        .browser-tab-preview span {
            overflow: hidden;
            white-space: nowrap;
            text-overflow: ellipsis;
            font-size: 0.88rem;
        }
        .audit-summary-grid {
            display: grid;
            grid-template-columns: repeat(4, minmax(0, 1fr));
            gap: 12px;
        }
        .audit-metric {
            padding: 14px;
            border: 1px solid var(--line);
            border-radius: 8px;
            background: #fffdf9;
        }
        .audit-metric span {
            display: block;
            color: var(--muted);
            font-size: 0.72rem;
            font-weight: 800;
            letter-spacing: 0.08em;
            text-transform: uppercase;
        }
        .audit-metric strong {
            display: block;
            margin-top: 8px;
            font-size: 1.42rem;
            line-height: 1;
        }
        .audit-list {
            display: grid;
            gap: 10px;
            margin-top: 16px;
        }
        .audit-finding {
            display: grid;
            gap: 6px;
            padding: 14px;
            border: 1px solid var(--line);
            border-radius: 8px;
            background: rgba(255, 255, 255, 0.72);
        }
        .audit-finding strong {
            display: flex;
            justify-content: space-between;
            gap: 12px;
            font-size: 0.92rem;
        }
        .audit-finding span,
        .audit-finding p {
            margin: 0;
            color: var(--muted);
            font-size: 0.86rem;
            line-height: 1.5;
        }
        .audit-severity {
            display: inline-flex;
            align-items: center;
            min-height: 24px;
            padding: 0 8px;
            border-radius: 999px;
            font-size: 0.68rem;
            font-weight: 800;
            letter-spacing: 0.08em;
            text-transform: uppercase;
        }
        .audit-severity--high {
            background: rgba(182, 64, 53, 0.12);
            color: var(--danger);
        }
        .audit-severity--medium {
            background: rgba(220, 180, 88, 0.16);
            color: #6b4a0b;
        }
        .audit-severity--low {
            background: rgba(31, 143, 84, 0.11);
            color: var(--success);
        }
        .source-editor {
            min-height: 520px;
            resize: vertical;
            font: 0.88rem/1.6 Consolas, "Courier New", monospace;
            white-space: pre;
        }
        .source-meta {
            margin-top: 12px;
            color: var(--muted);
            font-size: 0.84rem;
            line-height: 1.55;
        }
        .advanced-warning {
            margin-top: 0;
            margin-bottom: 16px;
            padding: 14px 16px;
            border: 1px solid rgba(182, 64, 53, 0.18);
            border-radius: 16px;
            background: rgba(182, 64, 53, 0.06);
            color: #73453f;
            font-size: 0.9rem;
            line-height: 1.55;
        }
        .preview-column {
            position: sticky;
            top: 86px;
            display: grid;
            gap: 18px;
            max-height: calc(100vh - 104px);
            overflow-y: auto;
            overscroll-behavior: contain;
            padding-right: 6px;
            scrollbar-gutter: stable;
        }
        .preview-column::-webkit-scrollbar {
            width: 10px;
        }
        .preview-column::-webkit-scrollbar-track {
            background: rgba(23, 18, 13, 0.06);
            border-radius: 999px;
        }
        .preview-column::-webkit-scrollbar-thumb {
            background: rgba(116, 104, 93, 0.34);
            border-radius: 999px;
        }
        .preview-panel {
            border: 1px solid var(--line);
            border-radius: 24px;
            overflow: hidden;
            background: rgba(11, 11, 13, 0.95);
            color: #f7f0df;
            box-shadow: var(--shadow);
        }
        .preview-panel-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            gap: 12px;
            padding: 16px 18px;
            border-bottom: 1px solid rgba(255, 255, 255, 0.08);
        }
        .preview-panel-header strong {
            display: block;
            font-size: 0.98rem;
        }
        .preview-panel-header span {
            display: block;
            margin-top: 4px;
            color: rgba(247, 240, 223, 0.68);
            font-size: 0.85rem;
        }
        .preview-panel-body {
            padding: 18px;
        }
        .hero-preview {
            position: relative;
            padding: 26px;
            border-radius: 22px;
            overflow: hidden;
            background:
                linear-gradient(180deg, rgba(9, 9, 11, 0.24), rgba(9, 9, 11, 0.72)),
                radial-gradient(circle at top right, rgba(220, 180, 88, 0.3), transparent 16rem),
                linear-gradient(135deg, #1f1711 0%, #09090b 58%, #060606 100%);
        }
        .hero-preview-kicker {
            display: inline-flex;
            align-items: center;
            gap: 10px;
            color: rgba(247, 223, 149, 0.95);
            font-size: 0.76rem;
            letter-spacing: 0.18em;
            text-transform: uppercase;
        }
        .hero-preview-kicker::before {
            content: "";
            width: 36px;
            height: 1px;
            background: currentColor;
            opacity: 0.72;
        }
        .hero-preview h2 {
            margin: 14px 0 12px;
            max-width: 12ch;
            font: 700 clamp(2rem, 5vw, 3.4rem) / 0.92 Georgia, serif;
        }
        .hero-preview p {
            margin: 0;
            max-width: 32rem;
            color: rgba(247, 240, 223, 0.8);
            line-height: 1.6;
        }
        .hero-preview-launcher {
            margin-top: 22px;
            padding: 18px;
            border: 1px solid rgba(255, 255, 255, 0.08);
            border-radius: 18px;
            background: rgba(255, 255, 255, 0.05);
        }
        .hero-preview-launcher strong {
            display: block;
            margin-bottom: 10px;
            font-size: 1.04rem;
        }
        .hero-preview-actions {
            display: flex;
            gap: 10px;
            flex-wrap: wrap;
            margin-top: 16px;
        }
        .preview-cta {
            min-height: 42px;
            padding: 0 16px;
            border-radius: 999px;
            display: inline-flex;
            align-items: center;
            justify-content: center;
            text-decoration: none;
            font-size: 0.78rem;
            font-weight: 800;
            letter-spacing: 0.08em;
            text-transform: uppercase;
        }
        .preview-cta--primary {
            background: linear-gradient(135deg, var(--gold-soft), var(--gold));
            color: #090807;
        }
        .preview-cta--secondary {
            border: 1px solid rgba(255, 255, 255, 0.12);
            color: #fff8e7;
            background: rgba(255, 255, 255, 0.04);
        }
        .fleet-preview-grid {
            display: grid;
            gap: 14px;
        }
        .fleet-preview-card {
            border: 1px solid rgba(255, 255, 255, 0.09);
            border-radius: 20px;
            padding: 18px;
            background: rgba(255, 255, 255, 0.04);
        }
        .fleet-preview-top {
            display: flex;
            justify-content: space-between;
            gap: 10px;
            align-items: flex-start;
        }
        .fleet-preview-badge {
            display: inline-flex;
            padding: 6px 10px;
            border-radius: 999px;
            background: rgba(247, 223, 149, 0.14);
            color: rgba(247, 223, 149, 0.92);
            font-size: 0.72rem;
            font-weight: 700;
            letter-spacing: 0.08em;
            text-transform: uppercase;
        }
        .fleet-preview-trust {
            color: rgba(247, 240, 223, 0.62);
            font-size: 0.8rem;
        }
        .fleet-preview-card h3 {
            margin: 14px 0 8px;
            font: 700 1.28rem/1.05 Georgia, serif;
        }
        .fleet-preview-copy {
            margin: 0 0 10px;
            color: rgba(247, 240, 223, 0.78);
            line-height: 1.55;
            font-size: 0.94rem;
        }
        .fleet-preview-line {
            margin: 0;
            color: rgba(247, 223, 149, 0.88);
            font-size: 0.84rem;
        }
        .fleet-preview-footer {
            display: flex;
            justify-content: space-between;
            gap: 10px;
            align-items: center;
            margin-top: 16px;
            padding-top: 14px;
            border-top: 1px solid rgba(255, 255, 255, 0.08);
        }
        .fleet-preview-price strong {
            display: block;
            font-size: 1.08rem;
        }
        .fleet-preview-price span {
            display: block;
            margin-top: 4px;
            color: rgba(247, 240, 223, 0.62);
            font-size: 0.8rem;
        }
        .page-details {
            display: grid;
            gap: 12px;
            margin-bottom: 16px;
        }
        .page-detail {
            padding: 14px 16px;
            border: 1px solid rgba(255, 255, 255, 0.08);
            border-radius: 18px;
            background: rgba(255, 255, 255, 0.05);
        }
        .page-detail strong {
            display: block;
            margin-bottom: 6px;
            font-size: 0.78rem;
            letter-spacing: 0.1em;
            text-transform: uppercase;
            color: rgba(247, 223, 149, 0.94);
        }
        .page-detail span {
            color: rgba(247, 240, 223, 0.78);
            font-size: 0.9rem;
            line-height: 1.5;
            word-break: break-word;
        }
        .page-preview-frame {
            width: 100%;
            height: 460px;
            border: 1px solid rgba(255, 255, 255, 0.08);
            border-radius: 18px;
            background: #ffffff;
        }
        .muted-note {
            margin-top: 12px;
            color: rgba(247, 240, 223, 0.62);
            font-size: 0.82rem;
            line-height: 1.55;
        }
        .loading {
            color: var(--muted);
            padding: 10px 0;
        }
        @media (max-width: 1220px) {
            .workspace {
                grid-template-columns: 1fr;
            }
            .preview-column {
                position: static;
                max-height: none;
                overflow: visible;
                padding-right: 0;
            }
        }
        @media (max-width: 900px) {
            .hero {
                grid-template-columns: 1fr;
            }
        }
        @media (max-width: 720px) {
            .field-grid {
                grid-template-columns: 1fr;
            }
            .editor-grid {
                grid-template-columns: 1fr;
            }
            .style-preview {
                grid-template-columns: 1fr;
            }
            .audit-summary-grid {
                grid-template-columns: repeat(2, minmax(0, 1fr));
            }
            .topbar {
                align-items: flex-start;
                flex-direction: column;
            }
            .topbar-actions {
                width: 100%;
                justify-content: flex-start;
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
                <span>Content editor</span>
            </div>
        </div>
        <div class="topbar-actions">
            <a class="topbar-link" href="/admin/reservations.html">Reservations</a>
            <a class="topbar-link topbar-link--primary" href="http://localhost:8080/index.html" target="_blank" rel="noopener">Open local preview</a>
            <button class="logout" id="logoutButton" type="button">Logout</button>
        </div>
    </header>

    <main class="page">
        <section class="hero">
            <article class="hero-card">
                <h1>Easy changes first. Technical editing only if needed.</h1>
                <p>This screen should help someone make common website changes without touching code. The simple editors below are the main workflow. Raw HTML is now hidden as an advanced tool for technical cases only.</p>
            </article>
            <aside class="note-card">
                <strong>What is easy right now</strong>
                <p>No HTML needed for the sections below:</p>
                <p>1. Global header tabs, categories and reserve button.</p>
                <p>2. Visual style controls for colors, fonts and brand pages.</p>
                <p>3. Home main message and buttons.</p>
                <p>4. Fleet cars, prices and sales copy.</p>
                <p>5. Services cards, locations cards and booking steps.</p>
                <p>Start <code>npm run http</code> if you want the preview on the right to show the live public page.</p>
            </aside>
        </section>

        <section class="workspace">
            <div class="stack">
                <article class="panel">
                    <div class="panel-header">
                        <div class="panel-title">
                            <strong>Global header and navigation</strong>
                            <span>Add, remove and reorder top navigation links, dropdown categories, quick contact buttons and the main reserve button.</span>
                        </div>
                        <span class="panel-kicker">Simple editor</span>
                    </div>
                    <div class="panel-body">
                        <div class="collection-stack">
                            <div id="headerUtilityLinks"></div>
                            <div id="headerNavItems"></div>
                            <div id="headerPrimaryButton"></div>
                        </div>
                        <div class="panel-actions">
                            <button class="button button-primary" id="saveHeaderButton" type="button">Save global header</button>
                            <button class="button button-secondary" id="reloadHeaderButton" type="button">Reload current values</button>
                            <a class="button button-secondary" href="http://localhost:8080/index.html" target="_blank" rel="noopener">Open site preview</a>
                            <div class="status" id="headerStatus" role="status" aria-live="polite"></div>
                        </div>
                    </div>
                </article>

                <article class="panel">
                    <div class="panel-header">
                        <div class="panel-title">
                            <strong>Browser tab and favicon</strong>
                            <span>Change the tab title for each page, the SEO description and the favicon used across the site.</span>
                        </div>
                        <span class="panel-kicker">Simple editor</span>
                    </div>
                    <div class="panel-body">
                        <div class="field-grid">
                            <div class="field field--full">
                                <label for="appearancePageSelect">Page</label>
                                <select id="appearancePageSelect"></select>
                            </div>
                            <div class="field field--full">
                                <label for="appearanceTitle">Browser tab title</label>
                                <input id="appearanceTitle" required>
                            </div>
                            <div class="field field--full">
                                <label for="appearanceDescription">SEO description</label>
                                <textarea id="appearanceDescription" required></textarea>
                            </div>
                            <div class="field field--full">
                                <label>Favicon image</label>
                                <div class="favicon-picker">
                                    <div class="favicon-current">
                                        <div class="favicon-current__media">
                                            <img id="appearanceFaviconLargePreview" src="/favicon.ico" alt="">
                                        </div>
                                        <div>
                                            <strong id="appearanceFaviconNamePreview">Current favicon</strong>
                                            <span id="appearanceFaviconPathPreview">/favicon.ico</span>
                                        </div>
                                    </div>
                                    <div class="favicon-option-grid" id="faviconOptionGrid"></div>
                                    <p class="helper-text">Click one of these images to choose the favicon. The path field below is only for advanced/manual paths.</p>
                                </div>
                            </div>
                            <div class="field field--full favicon-path-field">
                                <label for="appearanceFaviconHref">Advanced favicon path</label>
                                <input id="appearanceFaviconHref" list="faviconOptions" required>
                                <datalist id="faviconOptions"></datalist>
                            </div>
                        </div>
                        <div class="browser-tab-preview" aria-hidden="true">
                            <img id="appearanceFaviconPreview" src="/favicon.ico" alt="">
                            <span id="appearanceTitlePreview"></span>
                        </div>
                        <div class="panel-actions">
                            <button class="button button-secondary" id="loadAppearanceButton" type="button">Load selected page</button>
                            <button class="button button-primary" id="saveAppearanceButton" type="button">Save tab and favicon</button>
                            <div class="status" id="appearanceStatus" role="status" aria-live="polite"></div>
                        </div>
                    </div>
                </article>

                <article class="panel">
                    <div class="panel-header">
                        <div class="panel-title">
                            <strong>Consistency audit</strong>
                            <span>Check whether pages share the same header, favicon, font imports, titles, descriptions and H1 structure.</span>
                        </div>
                        <span class="panel-kicker">Quality check</span>
                    </div>
                    <div class="panel-body">
                        <div class="audit-summary-grid" id="auditSummaryGrid">
                            <div class="audit-metric">
                                <span>Pages</span>
                                <strong>-</strong>
                            </div>
                            <div class="audit-metric">
                                <span>Findings</span>
                                <strong>-</strong>
                            </div>
                            <div class="audit-metric">
                                <span>High</span>
                                <strong>-</strong>
                            </div>
                            <div class="audit-metric">
                                <span>Medium</span>
                                <strong>-</strong>
                            </div>
                        </div>
                        <div class="audit-list" id="auditFindingsList">
                            <p class="helper-text">Run the audit to see whether the public pages are coherent.</p>
                        </div>
                        <div class="panel-actions">
                            <button class="button button-primary" id="runConsistencyAuditButton" type="button">Run consistency audit</button>
                            <div class="status" id="auditStatus" role="status" aria-live="polite"></div>
                        </div>
                    </div>
                </article>

                <article class="panel">
                    <div class="panel-header">
                        <div class="panel-title">
                            <strong>Style editor</strong>
                            <span>Change global look and brand-page proportions from safe controls. The generated CSS includes desktop, tablet and mobile rules.</span>
                        </div>
                        <span class="panel-kicker">Visual editor</span>
                    </div>
                    <div class="panel-body">
                        <form id="styleForm">
                            <div class="collection-stack">
                                <section class="collection-section">
                                    <div class="collection-head">
                                        <div>
                                            <strong>Global appearance</strong>
                                            <span>Fonts, accent color, header background, button color and basic corner radius across the public website.</span>
                                        </div>
                                    </div>
                                    <div class="field-grid">
                                        <div class="field">
                                            <label for="styleFontSans">Main font</label>
                                            <select id="styleFontSans">
                                                <option value="'Manrope', system-ui, sans-serif">Manrope</option>
                                                <option value="'Inter', system-ui, sans-serif">Inter</option>
                                                <option value="'Montserrat', system-ui, sans-serif">Montserrat</option>
                                            </select>
                                        </div>
                                        <div class="field">
                                            <label for="styleFontDisplay">Title font</label>
                                            <select id="styleFontDisplay">
                                                <option value="'El Messiri', 'Cormorant Garamond', serif">El Messiri</option>
                                                <option value="'Cormorant Garamond', Georgia, serif">Cormorant Garamond</option>
                                                <option value="'Montserrat', system-ui, sans-serif">Montserrat</option>
                                                <option value="Georgia, 'Times New Roman', serif">Georgia</option>
                                            </select>
                                        </div>
                                        <div class="field">
                                            <label for="styleAccentColor">Accent color</label>
                                            <input id="styleAccentColor" type="color">
                                        </div>
                                        <div class="field">
                                            <label for="styleHeaderBackground">Header background</label>
                                            <input id="styleHeaderBackground" type="color">
                                        </div>
                                        <div class="field">
                                            <label for="styleButtonBackground">Button background</label>
                                            <input id="styleButtonBackground" type="color">
                                        </div>
                                        <div class="field">
                                            <label for="styleButtonTextColor">Button text</label>
                                            <input id="styleButtonTextColor" type="color">
                                        </div>
                                        <div class="field">
                                            <label for="styleButtonRadiusPx">Button roundness px</label>
                                            <input id="styleButtonRadiusPx" type="number" min="0" max="999" step="1">
                                        </div>
                                        <div class="field">
                                            <label for="styleCardRadiusPx">Card roundness px</label>
                                            <input id="styleCardRadiusPx" type="number" min="0" max="42" step="1">
                                        </div>
                                    </div>
                                </section>

                                <section class="collection-section">
                                    <div class="collection-head">
                                        <div>
                                            <strong>Brand pages</strong>
                                            <span>Controls for Lamborghini, Ferrari, Mercedes, Porsche and Rolls-Royce landing pages. Mobile values are separate so a big desktop edit does not crush the phone layout.</span>
                                        </div>
                                    </div>
                                    <div class="field-grid">
                                        <div class="field">
                                            <label for="styleHeroHeightWideRem">Hero image height desktop rem</label>
                                            <input id="styleHeroHeightWideRem" type="number" min="18" max="44" step="0.1">
                                        </div>
                                        <div class="field">
                                            <label for="styleHeroHeightLaptopRem">Hero image height laptop rem</label>
                                            <input id="styleHeroHeightLaptopRem" type="number" min="16" max="38" step="0.1">
                                        </div>
                                        <div class="field">
                                            <label for="styleHeroHeightMobileRem">Hero image height mobile rem</label>
                                            <input id="styleHeroHeightMobileRem" type="number" min="18" max="38" step="0.1">
                                        </div>
                                        <div class="field">
                                            <label for="styleHeroGapRem">Hero gap rem</label>
                                            <input id="styleHeroGapRem" type="number" min="0.4" max="3" step="0.1">
                                        </div>
                                        <div class="field">
                                            <label for="styleHeroTitleDesktopRem">Hero title desktop rem</label>
                                            <input id="styleHeroTitleDesktopRem" type="number" min="1.7" max="5" step="0.1">
                                        </div>
                                        <div class="field">
                                            <label for="styleHeroTitleMobileRem">Hero title mobile rem</label>
                                            <input id="styleHeroTitleMobileRem" type="number" min="1.8" max="4.4" step="0.1">
                                        </div>
                                        <div class="field">
                                            <label for="styleHeroLeadSizeRem">Subtitle size rem</label>
                                            <input id="styleHeroLeadSizeRem" type="number" min="0.72" max="1.35" step="0.01">
                                        </div>
                                        <div class="field">
                                            <label for="styleBookingMinWidthPx">Booking card width px</label>
                                            <input id="styleBookingMinWidthPx" type="number" min="260" max="460" step="1">
                                        </div>
                                        <div class="field">
                                            <label for="styleBookingPaddingRem">Booking padding rem</label>
                                            <input id="styleBookingPaddingRem" type="number" min="0.8" max="2.4" step="0.05">
                                        </div>
                                        <div class="field">
                                            <label for="styleBookingPriceSizeRem">Price size rem</label>
                                            <input id="styleBookingPriceSizeRem" type="number" min="1.8" max="4.4" step="0.1">
                                        </div>
                                        <div class="field">
                                            <label for="styleBrandBorderRadiusPx">Brand page roundness px</label>
                                            <input id="styleBrandBorderRadiusPx" type="number" min="0" max="40" step="1">
                                        </div>
                                        <div class="field">
                                            <label for="styleBrandButtonBackground">Brand button background</label>
                                            <input id="styleBrandButtonBackground" type="color">
                                        </div>
                                        <div class="field">
                                            <label for="styleBrandButtonTextColor">Brand button text</label>
                                            <input id="styleBrandButtonTextColor" type="color">
                                        </div>
                                        <div class="field">
                                            <label for="styleOverlayDarkness">Image darkness</label>
                                            <input id="styleOverlayDarkness" type="number" min="0.35" max="0.95" step="0.01">
                                        </div>
                                        <div class="field">
                                            <label>Hero button</label>
                                            <div class="checkbox-field">
                                                <input id="styleShowHeroCta" type="checkbox">
                                                <span>Show hero CTA button</span>
                                            </div>
                                        </div>
                                        <div class="field">
                                            <label>Secondary booking button</label>
                                            <div class="checkbox-field">
                                                <input id="styleShowBookingSecondary" type="checkbox">
                                                <span>Show secondary booking action</span>
                                            </div>
                                        </div>
                                    </div>
                                </section>
                            </div>

                            <div class="style-preview" id="stylePreview" aria-hidden="true">
                                <div class="style-preview-hero" id="stylePreviewHero">
                                    <div class="style-preview-hero__shade" id="stylePreviewShade"></div>
                                    <div class="style-preview-hero__copy">
                                        <span class="style-preview-hero__tag" id="stylePreviewTag">Lamborghini in Dubai</span>
                                        <h3 id="stylePreviewTitle">Rent a Lamborghini in Dubai</h3>
                                        <p id="stylePreviewLead">Fast visual preview of the hero title, overlay, radius and button style.</p>
                                        <span class="style-preview-button" id="stylePreviewButton">Check availability</span>
                                    </div>
                                </div>
                                <div class="style-preview-card" id="stylePreviewCard">
                                    <span>From per day</span>
                                    <strong id="stylePreviewPrice">3,200 AED</strong>
                                    <p>Booking card preview. Desktop and mobile values are saved together.</p>
                                    <span class="style-preview-button" id="stylePreviewCardButton">Check availability</span>
                                    <span class="style-preview-button style-preview-button--secondary" id="stylePreviewSecondaryButton">WhatsApp confirmation</span>
                                </div>
                            </div>

                            <div class="panel-actions">
                                <button class="button button-primary" id="saveStyleButton" type="button">Save style editor</button>
                                <button class="button button-secondary" id="reloadStyleButton" type="button">Reload current values</button>
                                <a class="button button-secondary" href="http://localhost:8080/lamborghini-rental-dubai.html" target="_blank" rel="noopener">Open brand preview</a>
                                <div class="status" id="styleStatus" role="status" aria-live="polite"></div>
                            </div>
                        </form>
                    </div>
                </article>

                <article class="panel">
                    <div class="panel-header">
                        <div class="panel-title">
                            <strong>Homepage main section</strong>
                            <span>Change the main headline, supporting text and the two main buttons. No HTML needed.</span>
                        </div>
                        <span class="panel-kicker">Simple editor</span>
                    </div>
                    <div class="panel-body">
                        <form id="homeForm">
                            <div class="field-grid">
                                <div class="field">
                                    <label for="heroEyebrow">Eyebrow</label>
                                    <input id="heroEyebrow" name="eyebrow" required>
                                </div>
                                <div class="field">
                                    <label for="heroHeadline">Headline</label>
                                    <input id="heroHeadline" name="headline" required>
                                </div>
                                <div class="field field--full">
                                    <label for="heroLead">Lead paragraph</label>
                                    <textarea id="heroLead" name="lead" required></textarea>
                                </div>
                                <div class="field">
                                    <label for="launcherHeading">Support heading</label>
                                    <input id="launcherHeading" name="launcherHeading" required>
                                </div>
                                <div class="field field--full">
                                    <label for="launcherText">Support paragraph</label>
                                    <textarea id="launcherText" name="launcherText" required></textarea>
                                </div>
                                <div class="field">
                                    <label for="primaryCtaLabel">Primary CTA label</label>
                                    <input id="primaryCtaLabel" name="primaryCtaLabel" required>
                                </div>
                                <div class="field">
                                    <label for="primaryCtaHref">Primary CTA link</label>
                                    <input id="primaryCtaHref" name="primaryCtaHref" required>
                                </div>
                                <div class="field">
                                    <label for="secondaryCtaLabel">Secondary CTA label</label>
                                    <input id="secondaryCtaLabel" name="secondaryCtaLabel" required>
                                </div>
                                <div class="field">
                                    <label for="secondaryCtaHref">Secondary CTA link</label>
                                    <input id="secondaryCtaHref" name="secondaryCtaHref" required>
                                </div>
                            </div>
                            <div class="panel-actions">
                                <button class="button button-primary" type="submit">Save home hero</button>
                                <button class="button button-secondary" id="reloadHomeButton" type="button">Reload current values</button>
                                <div class="status" id="homeStatus" role="status" aria-live="polite"></div>
                            </div>
                        </form>
                    </div>
                </article>

                <article class="panel">
                    <div class="panel-header">
                        <div class="panel-title">
                            <strong>Fleet cars</strong>
                            <span>Edit titles, prices, short descriptions and contact text from one place. No HTML needed.</span>
                        </div>
                        <span class="panel-kicker">Simple editor</span>
                    </div>
                    <div class="panel-body">
                        <div class="fleet-editor" id="fleetEditor">
                            <div class="loading">Loading fleet cards...</div>
                        </div>
                        <div class="panel-actions">
                            <button class="button button-primary" id="saveFleetButton" type="button">Save fleet cards</button>
                            <button class="button button-secondary" id="reloadFleetButton" type="button">Reload current values</button>
                            <div class="status" id="fleetStatus" role="status" aria-live="polite"></div>
                        </div>
                    </div>
                </article>

                <article class="panel">
                    <div class="panel-header">
                        <div class="panel-title">
                            <strong>Services cards</strong>
                            <span>Add, duplicate, delete and reorder the main service cards and support routes without touching HTML.</span>
                        </div>
                        <span class="panel-kicker">Simple editor</span>
                    </div>
                    <div class="panel-body">
                        <div class="collection-stack">
                            <div id="servicesLanes"></div>
                            <div id="servicesAdditionalRoutes"></div>
                            <div id="servicesGuideRoutes"></div>
                        </div>
                        <div class="panel-actions">
                            <button class="button button-primary" id="saveServicesButton" type="button">Save services</button>
                            <button class="button button-secondary" id="reloadServicesButton" type="button">Reload current values</button>
                            <a class="button button-secondary" href="http://localhost:8080/services.html" target="_blank" rel="noopener">Open services page</a>
                            <div class="status" id="servicesStatus" role="status" aria-live="polite"></div>
                        </div>
                    </div>
                </article>

                <article class="panel">
                    <div class="panel-header">
                        <div class="panel-title">
                            <strong>Locations cards</strong>
                            <span>Manage priority locations, route cards and booking steps from simple fields. No HTML needed.</span>
                        </div>
                        <span class="panel-kicker">Simple editor</span>
                    </div>
                    <div class="panel-body">
                        <div class="collection-stack">
                            <div id="locationsHeroZones"></div>
                            <div id="locationsGuideCards"></div>
                            <div id="locationsZoneCards"></div>
                            <div id="locationsProcessSteps"></div>
                        </div>
                        <div class="panel-actions">
                            <button class="button button-primary" id="saveLocationsButton" type="button">Save locations</button>
                            <button class="button button-secondary" id="reloadLocationsButton" type="button">Reload current values</button>
                            <a class="button button-secondary" href="http://localhost:8080/locations.html" target="_blank" rel="noopener">Open locations page</a>
                            <div class="status" id="locationsStatus" role="status" aria-live="polite"></div>
                        </div>
                    </div>
                </article>

                <details class="panel panel--advanced">
                    <summary class="panel-header">
                        <div class="panel-title">
                            <strong>Advanced HTML editor</strong>
                            <span>Only use this if you know HTML and need a technical full-page edit.</span>
                        </div>
                        <span class="panel-kicker panel-kicker--danger">Advanced</span>
                    </summary>
                    <div class="panel-body">
                        <p class="advanced-warning">This area edits raw HTML source. It is not meant for normal day-to-day content updates. A wrong change here can break a whole page layout.</p>
                        <div class="field-grid">
                            <div class="field field--full">
                                <label for="pageSelect">Public page</label>
                                <select id="pageSelect"></select>
                            </div>
                            <div class="field field--full">
                                <label for="pageSource">HTML source</label>
                                <textarea id="pageSource" class="source-editor" spellcheck="false"></textarea>
                            </div>
                        </div>
                        <div class="source-meta" id="pageSourceMeta">Load a page to start editing the full HTML source.</div>
                        <div class="panel-actions">
                            <button class="button button-secondary" id="loadPageButton" type="button">Load selected page</button>
                            <button class="button button-primary" id="savePageButton" type="button">Save full page</button>
                            <a class="button button-secondary" id="openPagePreviewLink" href="http://localhost:8080/index.html" target="_blank" rel="noopener">Open selected page</a>
                            <div class="status" id="pageStatus" role="status" aria-live="polite"></div>
                        </div>
                    </div>
                </details>
            </div>

            <aside class="preview-column">
                <article class="preview-panel">
                    <div class="preview-panel-header">
                        <div>
                            <strong>Home preview</strong>
                            <span>Instant visual read of the first viewport copy.</span>
                        </div>
                        <button class="button button-secondary" id="syncHomePreviewButton" type="button">Refresh</button>
                    </div>
                    <div class="preview-panel-body">
                        <div class="hero-preview">
                            <span class="hero-preview-kicker" id="previewEyebrow"></span>
                            <h2 id="previewHeadline"></h2>
                            <p id="previewLead"></p>
                            <div class="hero-preview-launcher">
                                <strong id="previewLauncherHeading"></strong>
                                <p id="previewLauncherText"></p>
                                <div class="hero-preview-actions">
                                    <a class="preview-cta preview-cta--primary" id="previewPrimaryCta" href="#"></a>
                                    <a class="preview-cta preview-cta--secondary" id="previewSecondaryCta" href="#"></a>
                                </div>
                            </div>
                        </div>
                        <p class="muted-note">This is an editorial preview, not the full front-end renderer. Use the live page preview below for full validation.</p>
                    </div>
                </article>

                <article class="preview-panel">
                    <div class="preview-panel-header">
                        <div>
                            <strong>Fleet preview</strong>
                            <span>Quick sanity check for titles, prices and notes.</span>
                        </div>
                        <button class="button button-secondary" id="syncFleetPreviewButton" type="button">Refresh</button>
                    </div>
                    <div class="preview-panel-body">
                        <div class="fleet-preview-grid" id="fleetPreviewGrid"></div>
                    </div>
                </article>

                <article class="preview-panel">
                    <div class="preview-panel-header">
                        <div>
                            <strong>Selected page preview</strong>
                            <span>Works against the local preview server at localhost:8080.</span>
                        </div>
                        <button class="button button-secondary" id="reloadPagePreviewButton" type="button">Reload preview</button>
                    </div>
                    <div class="preview-panel-body">
                        <div class="page-details">
                            <div class="page-detail">
                                <strong>Route</strong>
                                <span id="selectedPagePath">/</span>
                            </div>
                            <div class="page-detail">
                                <strong>Source file</strong>
                                <span id="selectedPageFile">index.html</span>
                            </div>
                            <div class="page-detail">
                                <strong>Loaded page</strong>
                                <span id="selectedPageLabel">Home</span>
                            </div>
                        </div>
                        <iframe class="page-preview-frame" id="pagePreviewFrame" title="Selected page preview" src="http://localhost:8080/index.html"></iframe>
                        <p class="muted-note">If this preview is blank, make sure <code>npm run http</code> is running in the repo root.</p>
                    </div>
                </article>
            </aside>
        </section>
    </main>

    <script>
        (function () {
            var state = {
                header: null,
                appearance: null,
                style: null,
                home: null,
                fleet: [],
                services: null,
                locations: null,
                pages: [],
                currentPage: null
            };

            function escapeHtml(value) {
                return String(value == null ? '' : value)
                    .replace(/&/g, '&amp;')
                    .replace(/</g, '&lt;')
                    .replace(/>/g, '&gt;')
                    .replace(/"/g, '&quot;')
                    .replace(/'/g, '&#39;');
            }

            async function api(url, options) {
                var response = await fetch(url, Object.assign({ credentials: 'same-origin' }, options || {}));
                if (response.status === 401) {
                    window.location.href = '/admin/login.html';
                    throw new Error('Not authenticated');
                }
                return response;
            }

            function setStatus(id, text, mode) {
                var element = document.getElementById(id);
                element.textContent = text || '';
                element.className = 'status' + (mode ? ' is-' + mode : '');
            }

            function previewUrlForPath(publicPath) {
                if (publicPath === '/') {
                    return 'http://localhost:8080/index.html';
                }

                return 'http://localhost:8080' + publicPath;
            }

            function cloneData(value) {
                return JSON.parse(JSON.stringify(value));
            }

            var styleDefaults = {
                global: {
                    fontSans: "'Manrope', system-ui, sans-serif",
                    fontDisplay: "'El Messiri', 'Cormorant Garamond', serif",
                    accentColor: '#d8b45f',
                    headerBackground: '#08090c',
                    buttonBackground: '#d8b45f',
                    buttonTextColor: '#17120d',
                    buttonRadiusPx: 999,
                    cardRadiusPx: 8
                },
                brandPages: {
                    heroHeightWideRem: 26.5,
                    heroHeightLaptopRem: 22.4,
                    heroHeightMobileRem: 25,
                    heroGapRem: 1,
                    heroTitleDesktopRem: 3.05,
                    heroTitleMobileRem: 3.2,
                    heroLeadSizeRem: 0.9,
                    bookingMinWidthPx: 300,
                    bookingPaddingRem: 1.25,
                    bookingPriceSizeRem: 2.75,
                    borderRadiusPx: 8,
                    buttonBackground: '#15191f',
                    buttonTextColor: '#ffffff',
                    overlayDarkness: 0.9,
                    showHeroCta: true,
                    showBookingSecondary: false
                }
            };

            function setInputValue(id, value) {
                document.getElementById(id).value = value == null ? '' : value;
            }

            function readNumberInput(id, fallback) {
                var value = Number.parseFloat(document.getElementById(id).value);
                return Number.isFinite(value) ? value : fallback;
            }

            function readColorInput(id, fallback) {
                var value = document.getElementById(id).value.trim();
                return value || fallback;
            }

            function renderStyleForm(style) {
                var safeStyle = style || styleDefaults;
                var global = Object.assign({}, styleDefaults.global, safeStyle.global || {});
                var brandPages = Object.assign({}, styleDefaults.brandPages, safeStyle.brandPages || {});

                state.style = { global: global, brandPages: brandPages };
                setInputValue('styleFontSans', global.fontSans);
                setInputValue('styleFontDisplay', global.fontDisplay);
                setInputValue('styleAccentColor', global.accentColor);
                setInputValue('styleHeaderBackground', global.headerBackground);
                setInputValue('styleButtonBackground', global.buttonBackground);
                setInputValue('styleButtonTextColor', global.buttonTextColor);
                setInputValue('styleButtonRadiusPx', global.buttonRadiusPx);
                setInputValue('styleCardRadiusPx', global.cardRadiusPx);
                setInputValue('styleHeroHeightWideRem', brandPages.heroHeightWideRem);
                setInputValue('styleHeroHeightLaptopRem', brandPages.heroHeightLaptopRem);
                setInputValue('styleHeroHeightMobileRem', brandPages.heroHeightMobileRem);
                setInputValue('styleHeroGapRem', brandPages.heroGapRem);
                setInputValue('styleHeroTitleDesktopRem', brandPages.heroTitleDesktopRem);
                setInputValue('styleHeroTitleMobileRem', brandPages.heroTitleMobileRem);
                setInputValue('styleHeroLeadSizeRem', brandPages.heroLeadSizeRem);
                setInputValue('styleBookingMinWidthPx', brandPages.bookingMinWidthPx);
                setInputValue('styleBookingPaddingRem', brandPages.bookingPaddingRem);
                setInputValue('styleBookingPriceSizeRem', brandPages.bookingPriceSizeRem);
                setInputValue('styleBrandBorderRadiusPx', brandPages.borderRadiusPx);
                setInputValue('styleBrandButtonBackground', brandPages.buttonBackground);
                setInputValue('styleBrandButtonTextColor', brandPages.buttonTextColor);
                setInputValue('styleOverlayDarkness', brandPages.overlayDarkness);
                document.getElementById('styleShowHeroCta').checked = Boolean(brandPages.showHeroCta);
                document.getElementById('styleShowBookingSecondary').checked = Boolean(brandPages.showBookingSecondary);
                updateStylePreview();
            }

            function getStyleValues() {
                return {
                    global: {
                        fontSans: document.getElementById('styleFontSans').value,
                        fontDisplay: document.getElementById('styleFontDisplay').value,
                        accentColor: readColorInput('styleAccentColor', styleDefaults.global.accentColor),
                        headerBackground: readColorInput('styleHeaderBackground', styleDefaults.global.headerBackground),
                        buttonBackground: readColorInput('styleButtonBackground', styleDefaults.global.buttonBackground),
                        buttonTextColor: readColorInput('styleButtonTextColor', styleDefaults.global.buttonTextColor),
                        buttonRadiusPx: readNumberInput('styleButtonRadiusPx', styleDefaults.global.buttonRadiusPx),
                        cardRadiusPx: readNumberInput('styleCardRadiusPx', styleDefaults.global.cardRadiusPx)
                    },
                    brandPages: {
                        heroHeightWideRem: readNumberInput('styleHeroHeightWideRem', styleDefaults.brandPages.heroHeightWideRem),
                        heroHeightLaptopRem: readNumberInput('styleHeroHeightLaptopRem', styleDefaults.brandPages.heroHeightLaptopRem),
                        heroHeightMobileRem: readNumberInput('styleHeroHeightMobileRem', styleDefaults.brandPages.heroHeightMobileRem),
                        heroGapRem: readNumberInput('styleHeroGapRem', styleDefaults.brandPages.heroGapRem),
                        heroTitleDesktopRem: readNumberInput('styleHeroTitleDesktopRem', styleDefaults.brandPages.heroTitleDesktopRem),
                        heroTitleMobileRem: readNumberInput('styleHeroTitleMobileRem', styleDefaults.brandPages.heroTitleMobileRem),
                        heroLeadSizeRem: readNumberInput('styleHeroLeadSizeRem', styleDefaults.brandPages.heroLeadSizeRem),
                        bookingMinWidthPx: readNumberInput('styleBookingMinWidthPx', styleDefaults.brandPages.bookingMinWidthPx),
                        bookingPaddingRem: readNumberInput('styleBookingPaddingRem', styleDefaults.brandPages.bookingPaddingRem),
                        bookingPriceSizeRem: readNumberInput('styleBookingPriceSizeRem', styleDefaults.brandPages.bookingPriceSizeRem),
                        borderRadiusPx: readNumberInput('styleBrandBorderRadiusPx', styleDefaults.brandPages.borderRadiusPx),
                        buttonBackground: readColorInput('styleBrandButtonBackground', styleDefaults.brandPages.buttonBackground),
                        buttonTextColor: readColorInput('styleBrandButtonTextColor', styleDefaults.brandPages.buttonTextColor),
                        overlayDarkness: readNumberInput('styleOverlayDarkness', styleDefaults.brandPages.overlayDarkness),
                        showHeroCta: document.getElementById('styleShowHeroCta').checked,
                        showBookingSecondary: document.getElementById('styleShowBookingSecondary').checked
                    }
                };
            }

            function updateStylePreview() {
                var style = getStyleValues();
                var global = style.global;
                var brandPages = style.brandPages;
                var overlaySoft = Math.max(0.08, brandPages.overlayDarkness - 0.78);
                var overlayMid = Math.max(0.22, brandPages.overlayDarkness - 0.42);

                document.getElementById('stylePreviewHero').style.minHeight = Math.round(brandPages.heroHeightWideRem * 8) + 'px';
                document.getElementById('stylePreviewHero').style.borderRadius = brandPages.borderRadiusPx + 'px';
                document.getElementById('stylePreviewShade').style.background =
                    'linear-gradient(180deg, rgba(0,0,0,' + overlaySoft + '), rgba(0,0,0,' + brandPages.overlayDarkness + '))';
                document.getElementById('stylePreviewTitle').style.fontFamily = global.fontDisplay;
                document.getElementById('stylePreviewTitle').style.fontSize = brandPages.heroTitleDesktopRem + 'rem';
                document.getElementById('stylePreviewLead').style.fontSize = brandPages.heroLeadSizeRem + 'rem';
                document.getElementById('stylePreviewTag').style.color = global.accentColor;
                document.getElementById('stylePreviewCard').style.borderRadius = brandPages.borderRadiusPx + 'px';
                document.getElementById('stylePreviewCard').style.padding = brandPages.bookingPaddingRem + 'rem';
                document.getElementById('stylePreviewPrice').style.fontSize = brandPages.bookingPriceSizeRem + 'rem';
                document.querySelectorAll('.style-preview-button').forEach(function (button) {
                    var isSecondaryBookingButton = button.id === 'stylePreviewSecondaryButton';
                    var isBrandButton = button.id === 'stylePreviewButton' || button.id === 'stylePreviewCardButton' || isSecondaryBookingButton;
                    button.style.background = isSecondaryBookingButton ? 'transparent' : (isBrandButton ? brandPages.buttonBackground : global.buttonBackground);
                    button.style.color = isSecondaryBookingButton ? brandPages.buttonBackground : (isBrandButton ? brandPages.buttonTextColor : global.buttonTextColor);
                    button.style.border = isSecondaryBookingButton ? '1px solid ' + brandPages.buttonBackground : '1px solid transparent';
                    button.style.borderRadius = (isBrandButton ? brandPages.borderRadiusPx : global.buttonRadiusPx) + 'px';
                    button.style.display =
                        (button.id === 'stylePreviewButton' && !brandPages.showHeroCta) ||
                        (isSecondaryBookingButton && !brandPages.showBookingSecondary)
                            ? 'none'
                            : 'inline-flex';
                });
            }

            var servicesLaneFields = [
                { key: 'navLabel', label: 'Tab label' },
                { key: 'navMeta', label: 'Small line' },
                { key: 'href', label: 'Page link' },
                { key: 'imageSrc', label: 'Image path' },
                { key: 'imageAlt', label: 'Image alt text', full: true },
                { key: 'cardKicker', label: 'Panel kicker' },
                { key: 'cardTitle', label: 'Panel title' },
                { key: 'cardCopy', label: 'Panel description', type: 'textarea', full: true },
                { key: 'pointOne', label: 'Point one' },
                { key: 'pointTwo', label: 'Point two' },
                { key: 'pointThree', label: 'Point three', full: true },
                { key: 'buttonLabel', label: 'Button label' },
                { key: 'isActive', label: 'Selected by default', type: 'checkbox' }
            ];

            var simpleCardFields = [
                { key: 'label', label: 'Small label' },
                { key: 'title', label: 'Title' },
                { key: 'copy', label: 'Description', type: 'textarea', full: true },
                { key: 'href', label: 'Page link', full: true }
            ];

            var servicesRouteFields = [
                { key: 'eyebrow', label: 'Small label' },
                { key: 'title', label: 'Title' },
                { key: 'copy', label: 'Description', type: 'textarea', full: true },
                { key: 'href', label: 'Page link', full: true }
            ];

            var processStepFields = [
                { key: 'title', label: 'Step title' },
                { key: 'copy', label: 'Step description', type: 'textarea', full: true }
            ];

            function fieldMarkup(field, value) {
                var wrapperClass = 'field' + (field.full ? ' field--full' : '');

                if (field.type === 'checkbox') {
                    return [
                        '<div class="' + wrapperClass + '">',
                            '<label>' + escapeHtml(field.label) + '</label>',
                            '<div class="checkbox-field">',
                                '<input type="checkbox" data-field="' + escapeHtml(field.key) + '"' + (value ? ' checked' : '') + '>',
                                '<span>' + escapeHtml(field.label) + '</span>',
                            '</div>',
                        '</div>'
                    ].join('');
                }

                if (field.type === 'select') {
                    return [
                        '<div class="' + wrapperClass + '">',
                            '<label>' + escapeHtml(field.label) + '</label>',
                            '<select data-field="' + escapeHtml(field.key) + '">',
                                (field.options || []).map(function (option) {
                                    var selected = String(option.value) === String(value) ? ' selected' : '';
                                    return '<option value="' + escapeHtml(option.value) + '"' + selected + '>' + escapeHtml(option.label) + '</option>';
                                }).join(''),
                            '</select>',
                        '</div>'
                    ].join('');
                }

                if (field.type === 'textarea') {
                    return [
                        '<div class="' + wrapperClass + '">',
                            '<label>' + escapeHtml(field.label) + '</label>',
                            '<textarea data-field="' + escapeHtml(field.key) + '">' + escapeHtml(value || '') + '</textarea>',
                        '</div>'
                    ].join('');
                }

                return [
                    '<div class="' + wrapperClass + '">',
                        '<label>' + escapeHtml(field.label) + '</label>',
                        '<input data-field="' + escapeHtml(field.key) + '" value="' + escapeHtml(value || '') + '">',
                    '</div>'
                ].join('');
            }

            function readFieldValue(itemElement, field) {
                var element = itemElement.querySelector('[data-field="' + field.key + '"]');
                if (!element) {
                    return field.type === 'checkbox' ? false : '';
                }

                if (field.type === 'checkbox') {
                    return Boolean(element.checked);
                }

                return element.value.trim();
            }

            function renderFlatCollection(rootId, options) {
                var root = document.getElementById(rootId);
                var items = Array.isArray(options.items) ? options.items : [];

                root.innerHTML = [
                    '<section class="collection-section">',
                        '<div class="collection-head">',
                            '<div>',
                                '<strong>' + escapeHtml(options.title) + '</strong>',
                                '<span>' + escapeHtml(options.description) + '</span>',
                            '</div>',
                        '</div>',
                        '<div class="collection-toolbar">',
                            '<div class="collection-count">' + escapeHtml(items.length + ' item' + (items.length === 1 ? '' : 's')) + '</div>',
                            '<button class="mini-button" type="button" data-collection-action="add">Add ' + escapeHtml(options.addLabel) + '</button>',
                        '</div>',
                        '<div class="collection-list">',
                            (items.map(function (item, index) {
                                var openAttribute = index === 0 ? ' open' : '';
                                return [
                                    '<details class="editor-item" data-item-index="' + index + '"' + openAttribute + '>',
                                        '<summary>',
                                            '<div>',
                                                '<strong>' + escapeHtml(options.getTitle(item, index)) + '</strong>',
                                                '<span>' + escapeHtml(options.getMeta(item, index)) + '</span>',
                                            '</div>',
                                            '<span>' + escapeHtml(options.itemLabel + ' ' + (index + 1)) + '</span>',
                                        '</summary>',
                                        '<div class="editor-item-body">',
                                            '<div class="editor-grid">',
                                                options.fields.map(function (field) {
                                                    return fieldMarkup(field, item[field.key]);
                                                }).join(''),
                                            '</div>',
                                            '<div class="item-actions">',
                                                '<button class="mini-button" type="button" data-collection-action="duplicate" data-item-index="' + index + '">Duplicate</button>',
                                                '<button class="mini-button" type="button" data-collection-action="move-up" data-item-index="' + index + '">Move up</button>',
                                                '<button class="mini-button" type="button" data-collection-action="move-down" data-item-index="' + index + '">Move down</button>',
                                                '<button class="mini-button mini-button--danger" type="button" data-collection-action="delete" data-item-index="' + index + '">Delete</button>',
                                            '</div>',
                                        '</div>',
                                    '</details>'
                                ].join('');
                            }).join('')) || '<p class="helper-text">No items yet. Use the add button to create the first one.</p>',
                        '</div>',
                    '</section>'
                ].join('');
            }

            function getFlatCollectionValues(rootId, fields) {
                return Array.from(document.querySelectorAll('#' + rootId + ' details[data-item-index]')).map(function (itemElement) {
                    var nextItem = {};

                    fields.forEach(function (field) {
                        nextItem[field.key] = readFieldValue(itemElement, field);
                    });

                    return nextItem;
                });
            }

            function renderZoneCardCollection(rootId, items, title, description) {
                var root = document.getElementById(rootId);
                root.innerHTML = [
                    '<section class="collection-section">',
                        '<div class="collection-head">',
                            '<div>',
                                '<strong>' + escapeHtml(title) + '</strong>',
                                '<span>' + escapeHtml(description) + '</span>',
                            '</div>',
                        '</div>',
                        '<div class="collection-toolbar">',
                            '<div class="collection-count">' + escapeHtml(items.length + ' item' + (items.length === 1 ? '' : 's')) + '</div>',
                            '<button class="mini-button" type="button" data-collection-action="add">Add route card</button>',
                        '</div>',
                        '<div class="collection-list">',
                            (items.map(function (item, index) {
                                var actions = Array.isArray(item.actions) ? item.actions : [];
                                var openAttribute = index === 0 ? ' open' : '';
                                return [
                                    '<details class="editor-item" data-item-index="' + index + '"' + openAttribute + '>',
                                        '<summary>',
                                            '<div>',
                                                '<strong>' + escapeHtml(item.title || ('Route card ' + (index + 1))) + '</strong>',
                                                '<span>' + escapeHtml(item.label || 'Set the location label and actions') + '</span>',
                                            '</div>',
                                            '<span>' + escapeHtml('Route ' + (index + 1)) + '</span>',
                                        '</summary>',
                                        '<div class="editor-item-body">',
                                            '<div class="editor-grid">',
                                                fieldMarkup({ key: 'label', label: 'Small label' }, item.label),
                                                fieldMarkup({ key: 'title', label: 'Title' }, item.title),
                                                fieldMarkup({ key: 'copy', label: 'Description', type: 'textarea', full: true }, item.copy),
                                                fieldMarkup({ key: 'actionOneLabel', label: 'Action 1 label' }, actions[0] && actions[0].label),
                                                fieldMarkup({ key: 'actionOneHref', label: 'Action 1 link' }, actions[0] && actions[0].href),
                                                fieldMarkup({ key: 'actionTwoLabel', label: 'Action 2 label' }, actions[1] && actions[1].label),
                                                fieldMarkup({ key: 'actionTwoHref', label: 'Action 2 link' }, actions[1] && actions[1].href),
                                                fieldMarkup({ key: 'actionThreeLabel', label: 'Action 3 label' }, actions[2] && actions[2].label),
                                                fieldMarkup({ key: 'actionThreeHref', label: 'Action 3 link' }, actions[2] && actions[2].href),
                                            '</div>',
                                            '<div class="item-actions">',
                                                '<button class="mini-button" type="button" data-collection-action="duplicate" data-item-index="' + index + '">Duplicate</button>',
                                                '<button class="mini-button" type="button" data-collection-action="move-up" data-item-index="' + index + '">Move up</button>',
                                                '<button class="mini-button" type="button" data-collection-action="move-down" data-item-index="' + index + '">Move down</button>',
                                                '<button class="mini-button mini-button--danger" type="button" data-collection-action="delete" data-item-index="' + index + '">Delete</button>',
                                            '</div>',
                                        '</div>',
                                    '</details>'
                                ].join('');
                            }).join('')) || '<p class="helper-text">No route cards yet. Add one to start.</p>',
                        '</div>',
                    '</section>'
                ].join('');
            }

            function getZoneCardCollectionValues(rootId) {
                return Array.from(document.querySelectorAll('#' + rootId + ' details[data-item-index]')).map(function (itemElement) {
                    function read(key) {
                        var field = itemElement.querySelector('[data-field="' + key + '"]');
                        return field ? field.value.trim() : '';
                    }

                    var actions = [
                        { label: read('actionOneLabel'), href: read('actionOneHref') },
                        { label: read('actionTwoLabel'), href: read('actionTwoHref') },
                        { label: read('actionThreeLabel'), href: read('actionThreeHref') }
                    ].filter(function (action) {
                        return action.label || action.href;
                    });

                    return {
                        label: read('label'),
                        title: read('title'),
                        copy: read('copy'),
                        actions: actions
                    };
                });
            }

            function reorderCollection(items, action, index, blankItem) {
                var nextItems = cloneData(items || []);

                if (action === 'add') {
                    nextItems.push(cloneData(blankItem));
                    return nextItems;
                }

                if (index < 0 || index >= nextItems.length) {
                    return nextItems;
                }

                if (action === 'duplicate') {
                    nextItems.splice(index + 1, 0, cloneData(nextItems[index]));
                    return nextItems;
                }

                if (action === 'delete') {
                    nextItems.splice(index, 1);
                    return nextItems;
                }

                if (action === 'move-up' && index > 0) {
                    var previous = nextItems[index - 1];
                    nextItems[index - 1] = nextItems[index];
                    nextItems[index] = previous;
                    return nextItems;
                }

                if (action === 'move-down' && index < nextItems.length - 1) {
                    var next = nextItems[index + 1];
                    nextItems[index + 1] = nextItems[index];
                    nextItems[index] = next;
                }

                return nextItems;
            }

            function openCollectionItem(rootId, itemIndex) {
                var item = document.querySelector('#' + rootId + ' details[data-item-index="' + itemIndex + '"]');
                if (item) {
                    item.open = true;
                }
            }

            function collectionOpenIndex(action, index, beforeLength, afterLength) {
                if (action === 'add') {
                    return Math.max(0, afterLength - 1);
                }

                if (action === 'duplicate') {
                    return Math.min(index + 1, afterLength - 1);
                }

                if (action === 'move-up') {
                    return Math.max(0, index - 1);
                }

                if (action === 'move-down') {
                    return Math.min(afterLength - 1, index + 1);
                }

                if (action === 'delete') {
                    return Math.min(index, afterLength - 1);
                }

                return Math.min(index, Math.max(0, beforeLength - 1));
            }

            function bindCollectionInteractions(rootId, onAction, statusId, dirtyMessage) {
                var root = document.getElementById(rootId);
                root.onclick = function (event) {
                    var button = event.target.closest('[data-collection-action]');
                    if (!button) {
                        return;
                    }

                    onAction(button.getAttribute('data-collection-action'), Number(button.getAttribute('data-item-index')));
                    setStatus(statusId, dirtyMessage);
                };
                root.oninput = function () {
                    setStatus(statusId, dirtyMessage);
                };
                root.onchange = function () {
                    setStatus(statusId, dirtyMessage);
                };
            }

            function renderServicesEditor(data) {
                renderFlatCollection('servicesLanes', {
                    title: 'Main service cards',
                    description: 'These are the big service cards at the top of the Services page.',
                    addLabel: 'service card',
                    itemLabel: 'Lane',
                    items: data.lanes || [],
                    fields: servicesLaneFields,
                    getTitle: function (item, index) { return item.navLabel || ('Service lane ' + (index + 1)); },
                    getMeta: function (item) { return item.cardTitle || 'Set the service title and link'; }
                });

                renderFlatCollection('servicesAdditionalRoutes', {
                    title: 'Additional service routes',
                    description: 'Smaller cards for event, business or similar support routes.',
                    addLabel: 'support route',
                    itemLabel: 'Route',
                    items: data.additionalRoutes || [],
                    fields: servicesRouteFields,
                    getTitle: function (item, index) { return item.title || ('Route ' + (index + 1)); },
                    getMeta: function (item) { return item.eyebrow || 'Set the small label and page link'; }
                });

                renderFlatCollection('servicesGuideRoutes', {
                    title: 'Location-led guide cards',
                    description: 'Smaller cards that link Services into airport, Palm, Marina or Abu Dhabi guide pages.',
                    addLabel: 'guide card',
                    itemLabel: 'Guide',
                    items: data.guideRoutes || [],
                    fields: servicesRouteFields,
                    getTitle: function (item, index) { return item.title || ('Guide card ' + (index + 1)); },
                    getMeta: function (item) { return item.eyebrow || 'Set the small label and page link'; }
                });
            }

            function getServicesValues() {
                return {
                    lanes: getFlatCollectionValues('servicesLanes', servicesLaneFields),
                    additionalRoutes: getFlatCollectionValues('servicesAdditionalRoutes', servicesRouteFields),
                    guideRoutes: getFlatCollectionValues('servicesGuideRoutes', servicesRouteFields)
                };
            }

            function renderLocationsEditor(data) {
                renderFlatCollection('locationsHeroZones', {
                    title: 'Priority hero locations',
                    description: 'These are the location cards near the top of the Locations page.',
                    addLabel: 'hero location',
                    itemLabel: 'Location',
                    items: data.heroZones || [],
                    fields: simpleCardFields,
                    getTitle: function (item, index) { return item.title || ('Hero location ' + (index + 1)); },
                    getMeta: function (item) { return item.label || 'Set the small label and page link'; }
                });

                renderFlatCollection('locationsGuideCards', {
                    title: 'Guide cards',
                    description: 'These smaller cards sit under the featured Dubai guide.',
                    addLabel: 'guide card',
                    itemLabel: 'Guide',
                    items: data.guideCards || [],
                    fields: simpleCardFields,
                    getTitle: function (item, index) { return item.title || ('Guide card ' + (index + 1)); },
                    getMeta: function (item) { return item.label || 'Set the small label and page link'; }
                });

                renderZoneCardCollection(
                    'locationsZoneCards',
                    data.zoneCards || [],
                    'Related route cards',
                    'These cards connect each location into delivery, airport or business routes.'
                );

                renderFlatCollection('locationsProcessSteps', {
                    title: 'Booking steps',
                    description: 'These steps explain the simple booking flow on the Locations page.',
                    addLabel: 'booking step',
                    itemLabel: 'Step',
                    items: data.processSteps || [],
                    fields: processStepFields,
                    getTitle: function (item, index) { return item.title || ('Step ' + (index + 1)); },
                    getMeta: function (item, index) { return 'Shown as step ' + String(index + 1).padStart(2, '0'); }
                });
            }

            function getLocationsValues() {
                return {
                    heroZones: getFlatCollectionValues('locationsHeroZones', simpleCardFields),
                    guideCards: getFlatCollectionValues('locationsGuideCards', simpleCardFields),
                    zoneCards: getZoneCardCollectionValues('locationsZoneCards'),
                    processSteps: getFlatCollectionValues('locationsProcessSteps', processStepFields)
                };
            }

            function mutateServicesCollection(collectionKey, action, index) {
                state.services = getServicesValues();
                var rootIds = {
                    lanes: 'servicesLanes',
                    additionalRoutes: 'servicesAdditionalRoutes',
                    guideRoutes: 'servicesGuideRoutes'
                };
                var blanks = {
                    lanes: {
                        navLabel: '',
                        navMeta: '',
                        href: './services.html',
                        imageSrc: './images/service-detail.png',
                        imageAlt: '',
                        cardKicker: '',
                        cardTitle: '',
                        cardCopy: '',
                        pointOne: '',
                        pointTwo: '',
                        pointThree: '',
                        buttonLabel: 'Explore service',
                        isActive: false
                    },
                    additionalRoutes: { eyebrow: '', title: '', copy: '', href: './services.html' },
                    guideRoutes: { eyebrow: '', title: '', copy: '', href: './services.html' }
                };

                var beforeLength = (state.services[collectionKey] || []).length;
                state.services[collectionKey] = reorderCollection(state.services[collectionKey], action, index, blanks[collectionKey]);
                var openIndex = collectionOpenIndex(action, index, beforeLength, state.services[collectionKey].length);
                renderServicesEditor(state.services);
                bindServicesEditor();
                openCollectionItem(rootIds[collectionKey], openIndex);
            }

            function mutateLocationsCollection(collectionKey, action, index) {
                state.locations = getLocationsValues();
                var rootIds = {
                    heroZones: 'locationsHeroZones',
                    guideCards: 'locationsGuideCards',
                    zoneCards: 'locationsZoneCards',
                    processSteps: 'locationsProcessSteps'
                };
                var blanks = {
                    heroZones: { label: '', title: '', copy: '', href: './locations.html' },
                    guideCards: { label: '', title: '', copy: '', href: './locations.html' },
                    zoneCards: {
                        label: '',
                        title: '',
                        copy: '',
                        actions: [{ label: '', href: '' }]
                    },
                    processSteps: { title: '', copy: '' }
                };

                var beforeLength = (state.locations[collectionKey] || []).length;
                state.locations[collectionKey] = reorderCollection(state.locations[collectionKey], action, index, blanks[collectionKey]);
                var openIndex = collectionOpenIndex(action, index, beforeLength, state.locations[collectionKey].length);
                renderLocationsEditor(state.locations);
                bindLocationsEditor();
                openCollectionItem(rootIds[collectionKey], openIndex);
            }

            function bindServicesEditor() {
                bindCollectionInteractions('servicesLanes', function (action, index) {
                    mutateServicesCollection('lanes', action, index);
                }, 'servicesStatus', 'Services changed locally but not saved yet.');
                bindCollectionInteractions('servicesAdditionalRoutes', function (action, index) {
                    mutateServicesCollection('additionalRoutes', action, index);
                }, 'servicesStatus', 'Services changed locally but not saved yet.');
                bindCollectionInteractions('servicesGuideRoutes', function (action, index) {
                    mutateServicesCollection('guideRoutes', action, index);
                }, 'servicesStatus', 'Services changed locally but not saved yet.');
            }

            function bindLocationsEditor() {
                bindCollectionInteractions('locationsHeroZones', function (action, index) {
                    mutateLocationsCollection('heroZones', action, index);
                }, 'locationsStatus', 'Locations changed locally but not saved yet.');
                bindCollectionInteractions('locationsGuideCards', function (action, index) {
                    mutateLocationsCollection('guideCards', action, index);
                }, 'locationsStatus', 'Locations changed locally but not saved yet.');
                bindCollectionInteractions('locationsZoneCards', function (action, index) {
                    mutateLocationsCollection('zoneCards', action, index);
                }, 'locationsStatus', 'Locations changed locally but not saved yet.');
                bindCollectionInteractions('locationsProcessSteps', function (action, index) {
                    mutateLocationsCollection('processSteps', action, index);
                }, 'locationsStatus', 'Locations changed locally but not saved yet.');
            }

            var headerUtilityFields = [
                {
                    key: 'kind',
                    label: 'Button type',
                    type: 'select',
                    options: [
                        { value: 'call', label: 'Call' },
                        { value: 'email', label: 'Email' },
                        { value: 'whatsapp', label: 'WhatsApp' },
                        { value: 'custom', label: 'Custom' }
                    ]
                },
                { key: 'label', label: 'Button label' },
                { key: 'href', label: 'Button link', full: true },
                { key: 'ariaLabel', label: 'Accessibility label', full: true },
                { key: 'visible', label: 'Visible', type: 'checkbox' }
            ];

            var quickButtonDefaults = {
                phoneDigits: '971586122568',
                email: 'prestigegoalmotion@gmail.com'
            };

            function extractQuickButtonPhoneDigits(value) {
                var digits = String(value || '').replace(/\\D/g, '');
                return digits || quickButtonDefaults.phoneDigits;
            }

            function extractQuickButtonEmail(value) {
                var match = String(value || '').match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\\.[A-Z]{2,}/i);
                return match ? match[0] : quickButtonDefaults.email;
            }

            function quickButtonPreset(kind, href) {
                if (kind === 'call') {
                    return {
                        label: 'Call',
                        href: 'tel:+' + extractQuickButtonPhoneDigits(href),
                        ariaLabel: 'Call Dynasty Prestige'
                    };
                }

                if (kind === 'email') {
                    return {
                        label: 'Email',
                        href: 'mailto:' + extractQuickButtonEmail(href),
                        ariaLabel: 'Email Dynasty Prestige'
                    };
                }

                if (kind === 'whatsapp') {
                    return {
                        label: 'WhatsApp',
                        href: 'https://wa.me/' + extractQuickButtonPhoneDigits(href),
                        ariaLabel: 'Open WhatsApp'
                    };
                }

                return {
                    label: '',
                    href: 'https://',
                    ariaLabel: ''
                };
            }

            function applyQuickButtonPreset(itemElement, nextKind) {
                var labelField = itemElement.querySelector('[data-field="label"]');
                var hrefField = itemElement.querySelector('[data-field="href"]');
                var ariaField = itemElement.querySelector('[data-field="ariaLabel"]');
                var preset = quickButtonPreset(nextKind, hrefField ? hrefField.value : '');

                if (labelField && nextKind !== 'custom') {
                    labelField.value = preset.label;
                }

                if (hrefField && nextKind !== 'custom') {
                    hrefField.value = preset.href;
                } else if (hrefField && !hrefField.value.trim()) {
                    hrefField.value = preset.href;
                }

                if (ariaField && nextKind !== 'custom') {
                    ariaField.value = preset.ariaLabel;
                }

                itemElement.setAttribute('data-current-kind', nextKind);

                var summaryTitle = itemElement.querySelector('summary strong');
                var summaryMeta = itemElement.querySelector('summary span');
                if (summaryTitle && labelField) {
                    summaryTitle.textContent = labelField.value || 'Button';
                }
                if (summaryMeta) {
                    summaryMeta.textContent = nextKind || 'Choose a button type';
                }
            }

            var headerPrimaryFields = [
                { key: 'label', label: 'Button label' },
                { key: 'href', label: 'Button link' },
                { key: 'visible', label: 'Visible', type: 'checkbox', full: true }
            ];

            var headerNavTypeField = {
                key: 'itemType',
                label: 'Navigation type',
                type: 'select',
                options: [
                    { value: 'link', label: 'Simple tab' },
                    { value: 'mega', label: 'Dropdown category' }
                ]
            };

            var headerPanelVariantField = {
                key: 'panelVariant',
                label: 'Dropdown style',
                type: 'select',
                options: [
                    { value: 'brands', label: 'Brands' },
                    { value: 'types', label: 'Types' }
                ]
            };

            var headerCardVariantField = {
                key: 'cardVariant',
                label: 'Card style',
                type: 'select',
                options: [
                    { value: 'brand', label: 'Brand card' },
                    { value: 'type', label: 'Type card' }
                ]
            };

            function renderHeaderEditor(data) {
                renderFlatCollection('headerUtilityLinks', {
                    title: 'Quick contact buttons',
                    description: 'These are the small top buttons. Choose Call, Email or WhatsApp and the editor keeps the label and link matched.',
                    addLabel: 'quick button',
                    itemLabel: 'Button',
                    items: data.utilityLinks || [],
                    fields: headerUtilityFields,
                    getTitle: function (item, index) { return item.label || ('Button ' + (index + 1)); },
                    getMeta: function (item) { return item.kind || 'Choose a button type'; }
                });

                renderHeaderNavItems(data.navItems || []);
                renderHeaderPrimaryButton(data.primaryButton || { label: '', href: '', visible: true });
            }

            function renderHeaderPrimaryButton(button) {
                var root = document.getElementById('headerPrimaryButton');
                root.innerHTML = [
                    '<section class="collection-section">',
                        '<div class="collection-head">',
                            '<div>',
                                '<strong>Main reserve button</strong>',
                                '<span>This is the highlighted button on the right side of the header.</span>',
                            '</div>',
                        '</div>',
                        '<div class="editor-grid">',
                            headerPrimaryFields.map(function (field) {
                                return fieldMarkup(field, button[field.key]);
                            }).join(''),
                        '</div>',
                    '</section>'
                ].join('');
            }

            function renderHeaderNavItems(items) {
                var root = document.getElementById('headerNavItems');
                root.innerHTML = [
                    '<section class="collection-section">',
                        '<div class="collection-head">',
                            '<div>',
                                '<strong>Main navigation</strong>',
                                '<span>Add or remove simple tabs and dropdown categories. Drag is not needed: use move up and move down.</span>',
                            '</div>',
                        '</div>',
                        '<div class="collection-toolbar">',
                            '<div class="collection-count">' + escapeHtml(items.length + ' item' + (items.length === 1 ? '' : 's')) + '</div>',
                            '<button class="mini-button" type="button" data-header-nav-action="add-item">Add navigation item</button>',
                        '</div>',
                        '<div class="collection-list">',
                            (items.map(function (item, index) {
                                var cards = Array.isArray(item.cards) ? item.cards : [];
                                var isMega = item.itemType === 'mega';
                                var openAttribute = index === 0 ? ' open' : '';
                                return [
                                    '<details class="editor-item" data-header-nav-item="' + index + '"' + openAttribute + '>',
                                        '<summary>',
                                            '<div>',
                                                '<strong>' + escapeHtml(item.label || ('Navigation item ' + (index + 1))) + '</strong>',
                                                '<span>' + escapeHtml((isMega ? 'Dropdown category' : 'Simple tab') + (item.href ? ' | ' + item.href : '')) + '</span>',
                                            '</div>',
                                            '<span>' + escapeHtml('Item ' + (index + 1)) + '</span>',
                                        '</summary>',
                                        '<div class="editor-item-body">',
                                            '<div class="editor-grid">',
                                                fieldMarkup(headerNavTypeField, item.itemType || 'link'),
                                                fieldMarkup({ key: 'label', label: 'Label' }, item.label),
                                                fieldMarkup({ key: 'href', label: 'Link', full: true }, item.href),
                                                fieldMarkup({ key: 'visible', label: 'Visible', type: 'checkbox' }, item.visible !== false),
                                                fieldMarkup(headerPanelVariantField, item.panelVariant || 'brands'),
                                                fieldMarkup(headerCardVariantField, item.cardVariant || 'brand'),
                                            '</div>',
                                            '<div class="item-actions">',
                                                '<button class="mini-button" type="button" data-header-nav-action="duplicate-item" data-item-index="' + index + '">Duplicate</button>',
                                                '<button class="mini-button" type="button" data-header-nav-action="move-item-up" data-item-index="' + index + '">Move up</button>',
                                                '<button class="mini-button" type="button" data-header-nav-action="move-item-down" data-item-index="' + index + '">Move down</button>',
                                                '<button class="mini-button mini-button--danger" type="button" data-header-nav-action="delete-item" data-item-index="' + index + '">Delete</button>',
                                            '</div>',
                                            (isMega ? [
                                                '<div class="collection-toolbar" style="margin-top:16px;">',
                                                    '<div class="collection-count">' + escapeHtml(cards.length + ' dropdown card' + (cards.length === 1 ? '' : 's')) + '</div>',
                                                    '<button class="mini-button" type="button" data-header-nav-action="add-card" data-item-index="' + index + '">Add dropdown card</button>',
                                                '</div>',
                                                '<div class="collection-list">',
                                                    (cards.map(function (card, cardIndex) {
                                                        return [
                                                            '<details class="editor-item" data-header-nav-card="' + cardIndex + '" open>',
                                                                '<summary>',
                                                                    '<div>',
                                                                        '<strong>' + escapeHtml(card.title || ('Card ' + (cardIndex + 1))) + '</strong>',
                                                                        '<span>' + escapeHtml(card.href || 'Set the card link and image') + '</span>',
                                                                    '</div>',
                                                                    '<span>' + escapeHtml('Card ' + (cardIndex + 1)) + '</span>',
                                                                '</summary>',
                                                                '<div class="editor-item-body">',
                                                                    '<div class="editor-grid">',
                                                                        fieldMarkup({ key: 'card-title', label: 'Title' }, card.title),
                                                                        fieldMarkup({ key: 'card-href', label: 'Link' }, card.href),
                                                                        fieldMarkup({ key: 'card-description', label: 'Description', type: 'textarea', full: true }, card.description),
                                                                        fieldMarkup({ key: 'card-imageSrc', label: 'Image path', full: true }, card.imageSrc),
                                                                        fieldMarkup({ key: 'card-imageAlt', label: 'Image alt text', full: true }, card.imageAlt),
                                                                        fieldMarkup({ key: 'card-visible', label: 'Visible', type: 'checkbox' }, card.visible !== false),
                                                                    '</div>',
                                                                    '<div class="item-actions">',
                                                                        '<button class="mini-button" type="button" data-header-nav-action="duplicate-card" data-item-index="' + index + '" data-card-index="' + cardIndex + '">Duplicate card</button>',
                                                                        '<button class="mini-button" type="button" data-header-nav-action="move-card-up" data-item-index="' + index + '" data-card-index="' + cardIndex + '">Move up</button>',
                                                                        '<button class="mini-button" type="button" data-header-nav-action="move-card-down" data-item-index="' + index + '" data-card-index="' + cardIndex + '">Move down</button>',
                                                                        '<button class="mini-button mini-button--danger" type="button" data-header-nav-action="delete-card" data-item-index="' + index + '" data-card-index="' + cardIndex + '">Delete card</button>',
                                                                    '</div>',
                                                                '</div>',
                                                            '</details>'
                                                        ].join('');
                                                    }).join('')) || '<p class="helper-text">This dropdown is empty. Add the first card.</p>',
                                                '</div>'
                                            ].join('') : '<p class="helper-text" style="margin-top:14px;">Simple tabs only need label, link and visibility.</p>'),
                                        '</div>',
                                    '</details>'
                                ].join('');
                            }).join('')) || '<p class="helper-text">No navigation items yet. Add one to start building the header.</p>',
                        '</div>',
                    '</section>'
                ].join('');
            }

            function getHeaderValues() {
                return {
                    utilityLinks: getFlatCollectionValues('headerUtilityLinks', headerUtilityFields),
                    navItems: Array.from(document.querySelectorAll('#headerNavItems [data-header-nav-item]')).map(function (itemElement) {
                        var itemIndex = Number(itemElement.getAttribute('data-header-nav-item'));
                        function read(fieldName) {
                            var field = itemElement.querySelector('[data-field="' + fieldName + '"]');
                            if (!field) {
                                return '';
                            }
                            if (field.type === 'checkbox') {
                                return Boolean(field.checked);
                            }
                            return field.value.trim();
                        }

                        var itemType = read('itemType') || 'link';
                        var cards = Array.from(itemElement.querySelectorAll('[data-header-nav-card]')).map(function (cardElement) {
                            function cardRead(name) {
                                var field = cardElement.querySelector('[data-field="' + name + '"]');
                                if (!field) {
                                    return '';
                                }
                                if (field.type === 'checkbox') {
                                    return Boolean(field.checked);
                                }
                                return field.value.trim();
                            }

                            return {
                                title: cardRead('card-title'),
                                href: cardRead('card-href'),
                                description: cardRead('card-description'),
                                imageSrc: cardRead('card-imageSrc'),
                                imageAlt: cardRead('card-imageAlt'),
                                visible: cardRead('card-visible')
                            };
                        });
                        var nextItem = {
                            itemType: itemType,
                            label: read('label'),
                            href: read('href'),
                            visible: read('visible'),
                            panelVariant: read('panelVariant') || 'brands',
                            cardVariant: read('cardVariant') || 'brand',
                            cards: cards
                        };

                        return nextItem;
                    }),
                    primaryButton: {
                        label: document.querySelector('#headerPrimaryButton [data-field="label"]').value.trim(),
                        href: document.querySelector('#headerPrimaryButton [data-field="href"]').value.trim(),
                        visible: Boolean(document.querySelector('#headerPrimaryButton [data-field="visible"]').checked)
                    }
                };
            }

            function blankHeaderDropdownCard() {
                return {
                    title: '',
                    href: '/new-page.html',
                    description: '',
                    imageSrc: '/images/brands/lamborghini-mark.png',
                    imageAlt: '',
                    visible: true
                };
            }

            function openHeaderNavItem(itemIndex) {
                var item = document.querySelector('#headerNavItems [data-header-nav-item="' + itemIndex + '"]');
                if (item) {
                    item.open = true;
                }
            }

            function applyHeaderNavTypeChange(itemElement, nextType) {
                if (!itemElement) {
                    return;
                }

                var itemIndex = Number(itemElement.getAttribute('data-header-nav-item'));
                var previousItem = state.header && state.header.navItems
                    ? cloneData(state.header.navItems[itemIndex] || {})
                    : {};

                state.header = getHeaderValues();

                if (!state.header.navItems[itemIndex]) {
                    return;
                }

                state.header.navItems[itemIndex].itemType = nextType;

                if (nextType === 'mega') {
                    var existingCards = state.header.navItems[itemIndex].cards.length
                        ? state.header.navItems[itemIndex].cards
                        : (Array.isArray(previousItem.cards) ? previousItem.cards : []);
                    state.header.navItems[itemIndex].cards = existingCards.length ? existingCards : [blankHeaderDropdownCard()];
                }

                renderHeaderEditor(state.header);
                bindHeaderEditor();
                openHeaderNavItem(itemIndex);
            }

            function mutateHeaderNav(action, itemIndex, cardIndex) {
                state.header = getHeaderValues();
                var openIndex = itemIndex;

                if (action === 'add-item') {
                    state.header.navItems.push({
                        itemType: 'link',
                        label: '',
                        href: '/new-page.html',
                        visible: true,
                        panelVariant: 'brands',
                        cardVariant: 'brand',
                        cards: []
                    });
                    openIndex = state.header.navItems.length - 1;
                } else if (action === 'duplicate-item' && itemIndex >= 0) {
                    state.header.navItems.splice(itemIndex + 1, 0, cloneData(state.header.navItems[itemIndex]));
                    openIndex = itemIndex + 1;
                } else if (action === 'delete-item' && itemIndex >= 0) {
                    state.header.navItems.splice(itemIndex, 1);
                    openIndex = Math.min(itemIndex, state.header.navItems.length - 1);
                } else if (action === 'move-item-up' && itemIndex > 0) {
                    var previousItem = state.header.navItems[itemIndex - 1];
                    state.header.navItems[itemIndex - 1] = state.header.navItems[itemIndex];
                    state.header.navItems[itemIndex] = previousItem;
                    openIndex = itemIndex - 1;
                } else if (action === 'move-item-down' && itemIndex >= 0 && itemIndex < state.header.navItems.length - 1) {
                    var nextItem = state.header.navItems[itemIndex + 1];
                    state.header.navItems[itemIndex + 1] = state.header.navItems[itemIndex];
                    state.header.navItems[itemIndex] = nextItem;
                    openIndex = itemIndex + 1;
                } else if (action === 'add-card' && itemIndex >= 0) {
                    state.header.navItems[itemIndex].itemType = 'mega';
                    state.header.navItems[itemIndex].cards = state.header.navItems[itemIndex].cards || [];
                    state.header.navItems[itemIndex].cards.push(blankHeaderDropdownCard());
                } else if (cardIndex >= 0 && itemIndex >= 0) {
                    var cards = state.header.navItems[itemIndex].cards || [];
                    if (action === 'duplicate-card') {
                        cards.splice(cardIndex + 1, 0, cloneData(cards[cardIndex]));
                    } else if (action === 'delete-card') {
                        cards.splice(cardIndex, 1);
                    } else if (action === 'move-card-up' && cardIndex > 0) {
                        var previousCard = cards[cardIndex - 1];
                        cards[cardIndex - 1] = cards[cardIndex];
                        cards[cardIndex] = previousCard;
                    } else if (action === 'move-card-down' && cardIndex < cards.length - 1) {
                        var nextCard = cards[cardIndex + 1];
                        cards[cardIndex + 1] = cards[cardIndex];
                        cards[cardIndex] = nextCard;
                    }
                }

                renderHeaderEditor(state.header);
                bindHeaderEditor();
                if (openIndex >= 0) {
                    openHeaderNavItem(openIndex);
                }
            }

            function bindHeaderEditor() {
                bindCollectionInteractions('headerUtilityLinks', function (action, index) {
                    state.header = getHeaderValues();
                    var beforeLength = state.header.utilityLinks.length;
                    state.header.utilityLinks = reorderCollection(state.header.utilityLinks, action, index, {
                        kind: 'custom',
                        label: '',
                        href: 'https://',
                        ariaLabel: '',
                        visible: true
                    });
                    var openIndex = collectionOpenIndex(action, index, beforeLength, state.header.utilityLinks.length);
                    renderHeaderEditor(state.header);
                    bindHeaderEditor();
                    openCollectionItem('headerUtilityLinks', openIndex);
                }, 'headerStatus', 'Header changed locally but not saved yet.');

                var utilityRoot = document.getElementById('headerUtilityLinks');
                Array.from(utilityRoot.querySelectorAll('[data-item-index]')).forEach(function (itemElement) {
                    var kindField = itemElement.querySelector('[data-field="kind"]');
                    itemElement.setAttribute('data-current-kind', kindField ? kindField.value : 'custom');
                });
                utilityRoot.onchange = function (event) {
                    var kindField = event.target.closest('[data-field="kind"]');
                    if (kindField) {
                        applyQuickButtonPreset(kindField.closest('[data-item-index]'), kindField.value);
                    }
                    setStatus('headerStatus', 'Header changed locally but not saved yet.');
                };

                var navRoot = document.getElementById('headerNavItems');
                navRoot.onclick = function (event) {
                    var button = event.target.closest('[data-header-nav-action]');
                    if (!button) {
                        return;
                    }

                    mutateHeaderNav(
                        button.getAttribute('data-header-nav-action'),
                        Number(button.getAttribute('data-item-index')),
                        Number(button.getAttribute('data-card-index'))
                    );
                    setStatus('headerStatus', 'Header changed locally but not saved yet.');
                };
                navRoot.oninput = function () {
                    setStatus('headerStatus', 'Header changed locally but not saved yet.');
                };
                navRoot.onchange = function (event) {
                    var typeField = event.target.closest('[data-field="itemType"]');
                    if (typeField) {
                        applyHeaderNavTypeChange(typeField.closest('[data-header-nav-item]'), typeField.value);
                    }
                    setStatus('headerStatus', 'Header changed locally but not saved yet.');
                };

                var primaryRoot = document.getElementById('headerPrimaryButton');
                primaryRoot.oninput = function () {
                    setStatus('headerStatus', 'Header changed locally but not saved yet.');
                };
                primaryRoot.onchange = function () {
                    setStatus('headerStatus', 'Header changed locally but not saved yet.');
                };
            }

            function getHomeValues() {
                var form = document.getElementById('homeForm');
                return {
                    eyebrow: form.eyebrow.value.trim(),
                    headline: form.headline.value.trim(),
                    lead: form.lead.value.trim(),
                    launcherHeading: form.launcherHeading.value.trim(),
                    launcherText: form.launcherText.value.trim(),
                    primaryCtaLabel: form.primaryCtaLabel.value.trim(),
                    primaryCtaHref: form.primaryCtaHref.value.trim(),
                    secondaryCtaLabel: form.secondaryCtaLabel.value.trim(),
                    secondaryCtaHref: form.secondaryCtaHref.value.trim()
                };
            }

            function renderHomeForm(home) {
                var form = document.getElementById('homeForm');
                form.eyebrow.value = home.eyebrow || '';
                form.headline.value = home.headline || '';
                form.lead.value = home.lead || '';
                form.launcherHeading.value = home.launcherHeading || '';
                form.launcherText.value = home.launcherText || '';
                form.primaryCtaLabel.value = home.primaryCtaLabel || '';
                form.primaryCtaHref.value = home.primaryCtaHref || '';
                form.secondaryCtaLabel.value = home.secondaryCtaLabel || '';
                form.secondaryCtaHref.value = home.secondaryCtaHref || '';
                updateHomePreview();
            }

            function updateHomePreview() {
                var home = getHomeValues();
                document.getElementById('previewEyebrow').textContent = home.eyebrow;
                document.getElementById('previewHeadline').textContent = home.headline;
                document.getElementById('previewLead').textContent = home.lead;
                document.getElementById('previewLauncherHeading').textContent = home.launcherHeading;
                document.getElementById('previewLauncherText').textContent = home.launcherText;
                var primary = document.getElementById('previewPrimaryCta');
                var secondary = document.getElementById('previewSecondaryCta');
                primary.textContent = home.primaryCtaLabel;
                primary.setAttribute('href', home.primaryCtaHref || './fleet.html');
                secondary.textContent = home.secondaryCtaLabel;
                secondary.setAttribute('href', home.secondaryCtaHref || './fleet.html');
            }

            function renderFleetEditor(cards) {
                var root = document.getElementById('fleetEditor');
                root.innerHTML = cards.map(function (card, index) {
                    var openAttribute = index === 0 ? ' open' : '';
                    return [
                        '<details class="fleet-item" data-card-editor data-card-id="' + escapeHtml(card.id) + '"' + openAttribute + '>',
                            '<summary>',
                                '<div>',
                                    '<strong>' + escapeHtml(card.copy.title) + '</strong>',
                                    '<span>' + escapeHtml(card.brand + ' | ' + card.pricePerDay + ' AED/day') + '</span>',
                                '</div>',
                                '<span>' + escapeHtml(card.utility.badge) + '</span>',
                            '</summary>',
                            '<div class="fleet-item-body">',
                                '<div class="field-grid">',
                                    '<div class="field">',
                                        '<label>Title</label>',
                                        '<input data-field="title" value="' + escapeHtml(card.copy.title) + '">',
                                    '</div>',
                                    '<div class="field">',
                                        '<label>Price per day</label>',
                                        '<input data-field="pricePerDay" type="number" min="1" step="1" value="' + escapeHtml(card.pricePerDay) + '">',
                                    '</div>',
                                    '<div class="field">',
                                        '<label>Badge</label>',
                                        '<input data-field="badge" value="' + escapeHtml(card.utility.badge) + '">',
                                    '</div>',
                                    '<div class="field">',
                                        '<label>Trust line</label>',
                                        '<input data-field="trust" value="' + escapeHtml(card.utility.trust) + '">',
                                    '</div>',
                                    '<div class="field field--full">',
                                        '<label>Description</label>',
                                        '<textarea data-field="description">' + escapeHtml(card.copy.description) + '</textarea>',
                                    '</div>',
                                    '<div class="field field--full">',
                                        '<label>Sales line</label>',
                                        '<textarea data-field="salesLine">' + escapeHtml(card.copy.salesLine) + '</textarea>',
                                    '</div>',
                                    '<div class="field">',
                                        '<label>Price note</label>',
                                        '<input data-field="priceNote" value="' + escapeHtml(card.booking.priceNote) + '">',
                                    '</div>',
                                    '<div class="field field--full">',
                                        '<label>WhatsApp text</label>',
                                        '<textarea data-field="whatsappText">' + escapeHtml(card.contact.whatsappText) + '</textarea>',
                                    '</div>',
                                '</div>',
                            '</div>',
                        '</details>'
                    ].join('');
                }).join('');

                root.querySelectorAll('input, textarea').forEach(function (field) {
                    field.addEventListener('input', updateFleetPreview);
                });

                updateFleetPreview();
            }

            function getFleetValues() {
                return Array.from(document.querySelectorAll('[data-card-editor]')).map(function (cardElement) {
                    function read(fieldName) {
                        var field = cardElement.querySelector('[data-field="' + fieldName + '"]');
                        return field ? field.value.trim() : '';
                    }

                    return {
                        id: cardElement.getAttribute('data-card-id'),
                        pricePerDay: read('pricePerDay'),
                        utility: {
                            badge: read('badge'),
                            trust: read('trust')
                        },
                        copy: {
                            title: read('title'),
                            description: read('description'),
                            salesLine: read('salesLine')
                        },
                        booking: {
                            priceNote: read('priceNote')
                        },
                        contact: {
                            whatsappText: read('whatsappText')
                        }
                    };
                });
            }

            function renderFleetPreview(cards) {
                var root = document.getElementById('fleetPreviewGrid');
                root.innerHTML = cards.map(function (card) {
                    var formattedPrice = Number(card.pricePerDay || 0).toLocaleString('en-US');
                    return [
                        '<article class="fleet-preview-card">',
                            '<div class="fleet-preview-top">',
                                '<span class="fleet-preview-badge">' + escapeHtml(card.utility.badge) + '</span>',
                                '<span class="fleet-preview-trust">' + escapeHtml(card.utility.trust) + '</span>',
                            '</div>',
                            '<h3>' + escapeHtml(card.copy.title) + '</h3>',
                            '<p class="fleet-preview-copy">' + escapeHtml(card.copy.description) + '</p>',
                            '<p class="fleet-preview-line">' + escapeHtml(card.copy.salesLine) + '</p>',
                            '<div class="fleet-preview-footer">',
                                '<div class="fleet-preview-price">',
                                    '<strong>' + escapeHtml(formattedPrice + ' AED') + '</strong>',
                                    '<span>' + escapeHtml(card.booking.priceNote) + '</span>',
                                '</div>',
                                '<span class="fleet-preview-trust">' + escapeHtml(card.id) + '</span>',
                            '</div>',
                        '</article>'
                    ].join('');
                }).join('');
            }

            function updateFleetPreview() {
                renderFleetPreview(getFleetValues());
            }

            function renderPageOptions(pages) {
                var select = document.getElementById('pageSelect');
                select.innerHTML = pages.map(function (page) {
                    return '<option value="' + escapeHtml(page.publicPath) + '">' +
                        escapeHtml(page.label + ' | ' + page.publicPath) +
                        '</option>';
                }).join('');
            }

            function renderAppearancePageOptions(pages) {
                var select = document.getElementById('appearancePageSelect');
                select.innerHTML = pages.map(function (page) {
                    return '<option value="' + escapeHtml(page.publicPath) + '">' +
                        escapeHtml(page.label + ' | ' + page.publicPath) +
                        '</option>';
                }).join('');
            }

            function renderFaviconOptions(options) {
                var list = document.getElementById('faviconOptions');
                var grid = document.getElementById('faviconOptionGrid');
                var selectedHref = document.getElementById('appearanceFaviconHref').value || '/favicon.ico';

                list.innerHTML = (options || []).map(function (option) {
                    return '<option value="' + escapeHtml(option.href) + '">' + escapeHtml(option.label) + '</option>';
                }).join('');

                grid.innerHTML = (options || []).map(function (option) {
                    var selectedClass = option.href === selectedHref ? ' is-selected' : '';
                    return [
                        '<button class="favicon-option' + selectedClass + '" type="button" data-favicon-option="' + escapeHtml(option.href) + '">',
                            '<span class="favicon-option__media">',
                                '<img src="' + escapeHtml(option.href) + '" alt="">',
                            '</span>',
                            '<strong>' + escapeHtml(option.label || option.href) + '</strong>',
                            '<span>' + escapeHtml(option.href) + '</span>',
                        '</button>'
                    ].join('');
                }).join('');
            }

            function getAppearanceValues() {
                return {
                    publicPath: document.getElementById('appearancePageSelect').value || '/',
                    settings: {
                        faviconHref: document.getElementById('appearanceFaviconHref').value.trim()
                    },
                    page: {
                        title: document.getElementById('appearanceTitle').value.trim(),
                        description: document.getElementById('appearanceDescription').value.trim()
                    }
                };
            }

            function updateAppearancePreview() {
                var faviconHref = document.getElementById('appearanceFaviconHref').value.trim() || '/favicon.ico';
                var title = document.getElementById('appearanceTitle').value.trim();
                var faviconName = faviconHref.split('/').filter(Boolean).pop() || faviconHref;
                document.getElementById('appearanceFaviconPreview').setAttribute('src', faviconHref);
                document.getElementById('appearanceFaviconLargePreview').setAttribute('src', faviconHref);
                document.getElementById('appearanceFaviconNamePreview').textContent = faviconName;
                document.getElementById('appearanceFaviconPathPreview').textContent = faviconHref;
                document.getElementById('appearanceTitlePreview').textContent = title || 'Browser tab title';
                document.querySelectorAll('[data-favicon-option]').forEach(function (button) {
                    button.classList.toggle('is-selected', button.getAttribute('data-favicon-option') === faviconHref);
                });
            }

            function renderAppearanceForm(appearance) {
                state.appearance = appearance;
                document.getElementById('appearancePageSelect').value = appearance.page.publicPath || '/';
                document.getElementById('appearanceTitle').value = appearance.page.title || '';
                document.getElementById('appearanceDescription').value = appearance.page.description || '';
                document.getElementById('appearanceFaviconHref').value = appearance.settings.faviconHref || '/favicon.ico';
                renderFaviconOptions(appearance.faviconOptions || []);
                updateAppearancePreview();
            }

            function renderAuditResults(audit) {
                var summary = audit.summary || { total: 0, bySeverity: {} };
                var metrics = [
                    { label: 'Pages', value: audit.pageCount || 0 },
                    { label: 'Findings', value: summary.total || 0 },
                    { label: 'High', value: summary.bySeverity.high || 0 },
                    { label: 'Medium', value: summary.bySeverity.medium || 0 }
                ];
                var grid = document.getElementById('auditSummaryGrid');
                var list = document.getElementById('auditFindingsList');

                grid.innerHTML = metrics.map(function (metric) {
                    return [
                        '<div class="audit-metric">',
                            '<span>' + escapeHtml(metric.label) + '</span>',
                            '<strong>' + escapeHtml(metric.value) + '</strong>',
                        '</div>'
                    ].join('');
                }).join('');

                if (!audit.findings || audit.findings.length === 0) {
                    list.innerHTML = '<p class="helper-text">No consistency issues found in the quick audit.</p>';
                    return;
                }

                list.innerHTML = audit.findings.slice(0, 18).map(function (finding) {
                    var severity = finding.severity || 'low';
                    return [
                        '<article class="audit-finding">',
                            '<strong>',
                                '<span>' + escapeHtml(finding.route || 'Unknown route') + '</span>',
                                '<span class="audit-severity audit-severity--' + escapeHtml(severity) + '">' + escapeHtml(severity) + '</span>',
                            '</strong>',
                            '<span>' + escapeHtml(finding.category || 'general') + '</span>',
                            '<p>' + escapeHtml(finding.message || '') + '</p>',
                        '</article>'
                    ].join('');
                }).join('');
            }

            function updatePageSourceMeta() {
                var source = document.getElementById('pageSource').value || '';
                var lineCount = source ? source.split(/\\r\\n|\\r|\\n/).length : 0;
                document.getElementById('pageSourceMeta').textContent =
                    'Characters: ' + source.length + ' | Lines: ' + lineCount;
            }

            function syncCurrentPagePreview(page) {
                var previewUrl = previewUrlForPath(page.publicPath);
                document.getElementById('selectedPagePath').textContent = page.publicPath;
                document.getElementById('selectedPageFile').textContent = page.filePath;
                document.getElementById('selectedPageLabel').textContent = page.label;
                document.getElementById('openPagePreviewLink').setAttribute('href', previewUrl);
                document.getElementById('pagePreviewFrame').setAttribute('src', previewUrl);
            }

            function renderCurrentPage(page) {
                state.currentPage = page;
                document.getElementById('pageSelect').value = page.publicPath;
                document.getElementById('pageSource').value = page.source || '';
                updatePageSourceMeta();
                syncCurrentPagePreview(page);
            }

            async function loadSelectedPage() {
                var selectedPath = document.getElementById('pageSelect').value || '/';
                setStatus('pageStatus', 'Loading full page source...');

                try {
                    var response = await api('/api/admin/content/page?path=' + encodeURIComponent(selectedPath));
                    var payload = await response.json().catch(function () { return {}; });
                    if (!response.ok) {
                        throw new Error(payload.error || 'Could not load that page source.');
                    }

                    renderCurrentPage(payload.page);
                    setStatus('pageStatus', 'Page source loaded.', 'success');
                } catch (error) {
                    setStatus('pageStatus', error.message || 'Could not load that page source.', 'error');
                }
            }

            async function saveSelectedPage() {
                var selectedPath = document.getElementById('pageSelect').value || '/';
                var source = document.getElementById('pageSource').value;
                setStatus('pageStatus', 'Saving full page source...');

                try {
                    var response = await api('/api/admin/content/page', {
                        method: 'PUT',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            path: selectedPath,
                            source: source
                        })
                    });
                    var payload = await response.json().catch(function () { return {}; });
                    if (!response.ok) {
                        throw new Error(payload.error || 'Could not save that page source.');
                    }

                    renderCurrentPage(payload.page);
                    setStatus('pageStatus', 'Full page source saved.', 'success');
                } catch (error) {
                    setStatus('pageStatus', error.message || 'Could not save that page source.', 'error');
                }
            }

            async function loadAppearancePage() {
                var selectedPath = document.getElementById('appearancePageSelect').value || '/';
                setStatus('appearanceStatus', 'Loading browser tab settings...');

                try {
                    var response = await api('/api/admin/content/appearance/page?path=' + encodeURIComponent(selectedPath));
                    var payload = await response.json().catch(function () { return {}; });
                    if (!response.ok) {
                        throw new Error(payload.error || 'Could not load the browser tab settings.');
                    }

                    renderAppearanceForm(payload.appearance);
                    setStatus('appearanceStatus', 'Browser tab settings loaded.', 'success');
                } catch (error) {
                    setStatus('appearanceStatus', error.message || 'Could not load the browser tab settings.', 'error');
                }
            }

            async function saveAppearance() {
                setStatus('appearanceStatus', 'Saving browser tab and favicon...');

                try {
                    var response = await api('/api/admin/content/appearance', {
                        method: 'PUT',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify(getAppearanceValues())
                    });
                    var payload = await response.json().catch(function () { return {}; });
                    if (!response.ok) {
                        throw new Error(payload.error || 'Could not save the browser tab settings.');
                    }

                    renderAppearanceForm(payload.appearance);
                    setStatus('appearanceStatus', 'Browser tab and favicon saved.', 'success');
                } catch (error) {
                    setStatus('appearanceStatus', error.message || 'Could not save the browser tab settings.', 'error');
                }
            }

            async function saveStyle() {
                setStatus('styleStatus', 'Saving visual style rules...');

                try {
                    var response = await api('/api/admin/content/style', {
                        method: 'PUT',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify(getStyleValues())
                    });
                    var payload = await response.json().catch(function () { return {}; });
                    if (!response.ok) {
                        throw new Error(payload.error || 'Could not save the style editor settings.');
                    }

                    state.style = payload.style;
                    renderStyleForm(state.style);
                    setStatus('styleStatus', 'Styles saved into generated CSS and linked across the site.', 'success');
                } catch (error) {
                    setStatus('styleStatus', error.message || 'Could not save the style editor settings.', 'error');
                }
            }

            async function runConsistencyAudit() {
                setStatus('auditStatus', 'Running consistency audit...');

                try {
                    var response = await api('/api/admin/content/audit');
                    var payload = await response.json().catch(function () { return {}; });
                    if (!response.ok) {
                        throw new Error(payload.error || 'Could not run the consistency audit.');
                    }

                    renderAuditResults(payload.audit);
                    setStatus('auditStatus', 'Audit complete.', 'success');
                } catch (error) {
                    setStatus('auditStatus', error.message || 'Could not run the consistency audit.', 'error');
                }
            }

            async function loadEditorState() {
                var response = await api('/api/admin/content');
                if (!response.ok) {
                    throw new Error('Could not load editor state');
                }

                var payload = await response.json();
                state.header = payload.header;
                state.appearance = payload.appearance;
                state.style = payload.style;
                state.home = payload.home;
                state.fleet = payload.fleet;
                state.services = payload.services;
                state.locations = payload.locations;
                state.pages = Array.isArray(payload.pages) ? payload.pages : [];

                renderHeaderEditor(state.header || { utilityLinks: [], navItems: [], primaryButton: { label: '', href: '', visible: true } });
                bindHeaderEditor();
                renderAppearancePageOptions(state.pages);
                renderAppearanceForm(state.appearance || {
                    settings: { faviconHref: '/favicon.ico' },
                    faviconOptions: [],
                    page: { publicPath: '/', title: '', description: '' }
                });
                renderStyleForm(state.style || styleDefaults);
                renderHomeForm(state.home);
                renderFleetEditor(state.fleet);
                renderServicesEditor(state.services || { lanes: [], additionalRoutes: [], guideRoutes: [] });
                bindServicesEditor();
                renderLocationsEditor(state.locations || { heroZones: [], guideCards: [], zoneCards: [], processSteps: [] });
                bindLocationsEditor();
                renderPageOptions(state.pages);
                setStatus('headerStatus', '');
                setStatus('appearanceStatus', '');
                setStatus('styleStatus', '');
                setStatus('homeStatus', '');
                setStatus('fleetStatus', '');
                setStatus('servicesStatus', '');
                setStatus('locationsStatus', '');
                setStatus('pageStatus', '');

                if (state.pages.length) {
                    document.getElementById('pageSelect').value = '/';
                    if (!state.pages.some(function (page) { return page.publicPath === '/'; })) {
                        document.getElementById('pageSelect').selectedIndex = 0;
                    }
                    await loadSelectedPage();
                }
            }

            async function saveHome(event) {
                event.preventDefault();
                setStatus('homeStatus', 'Saving home hero...');

                try {
                    var response = await api('/api/admin/content/home', {
                        method: 'PUT',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify(getHomeValues())
                    });
                    var payload = await response.json().catch(function () { return {}; });
                    if (!response.ok) {
                        throw new Error(payload.error || 'The home hero could not be saved.');
                    }

                    state.home = payload.home;
                    renderHomeForm(state.home);
                    setStatus('homeStatus', 'Home hero saved into site/index.html.', 'success');
                } catch (error) {
                    setStatus('homeStatus', error.message || 'The home hero could not be saved.', 'error');
                }
            }

            async function saveHeader() {
                setStatus('headerStatus', 'Saving global header...');

                try {
                    var response = await api('/api/admin/content/header', {
                        method: 'PUT',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify(getHeaderValues())
                    });
                    var payload = await response.json().catch(function () { return {}; });
                    if (!response.ok) {
                        throw new Error(payload.error || 'The global header could not be saved.');
                    }

                    state.header = payload.header;
                    renderHeaderEditor(state.header);
                    bindHeaderEditor();
                    setStatus('headerStatus', 'Global header saved across the site pages.', 'success');
                } catch (error) {
                    setStatus('headerStatus', error.message || 'The global header could not be saved.', 'error');
                }
            }

            async function saveFleet() {
                setStatus('fleetStatus', 'Saving fleet cards...');

                try {
                    var response = await api('/api/admin/content/fleet', {
                        method: 'PUT',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ cards: getFleetValues() })
                    });
                    var payload = await response.json().catch(function () { return {}; });
                    if (!response.ok) {
                        throw new Error(payload.error || 'The fleet cards could not be saved.');
                    }

                    state.fleet = payload.fleet;
                    renderFleetEditor(state.fleet);
                    setStatus('fleetStatus', 'Fleet cards saved into JSON and fleet.html regenerated.', 'success');
                } catch (error) {
                    setStatus('fleetStatus', error.message || 'The fleet cards could not be saved.', 'error');
                }
            }

            async function saveServices() {
                setStatus('servicesStatus', 'Saving services cards...');

                try {
                    var response = await api('/api/admin/content/services', {
                        method: 'PUT',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify(getServicesValues())
                    });
                    var payload = await response.json().catch(function () { return {}; });
                    if (!response.ok) {
                        throw new Error(payload.error || 'The services content could not be saved.');
                    }

                    state.services = payload.services;
                    renderServicesEditor(state.services);
                    bindServicesEditor();
                    setStatus('servicesStatus', 'Services cards saved and services.html regenerated.', 'success');
                } catch (error) {
                    setStatus('servicesStatus', error.message || 'The services content could not be saved.', 'error');
                }
            }

            async function saveLocations() {
                setStatus('locationsStatus', 'Saving locations cards...');

                try {
                    var response = await api('/api/admin/content/locations', {
                        method: 'PUT',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify(getLocationsValues())
                    });
                    var payload = await response.json().catch(function () { return {}; });
                    if (!response.ok) {
                        throw new Error(payload.error || 'The locations content could not be saved.');
                    }

                    state.locations = payload.locations;
                    renderLocationsEditor(state.locations);
                    bindLocationsEditor();
                    setStatus('locationsStatus', 'Locations cards saved and locations.html regenerated.', 'success');
                } catch (error) {
                    setStatus('locationsStatus', error.message || 'The locations content could not be saved.', 'error');
                }
            }

            function reloadPagePreview() {
                if (!state.currentPage) {
                    return;
                }

                var previewUrl = previewUrlForPath(state.currentPage.publicPath);
                document.getElementById('pagePreviewFrame').setAttribute('src', previewUrl + '?t=' + Date.now());
            }

            document.getElementById('saveHeaderButton').addEventListener('click', saveHeader);
            document.getElementById('loadAppearanceButton').addEventListener('click', loadAppearancePage);
            document.getElementById('saveAppearanceButton').addEventListener('click', saveAppearance);
            document.getElementById('saveStyleButton').addEventListener('click', saveStyle);
            document.getElementById('runConsistencyAuditButton').addEventListener('click', runConsistencyAudit);
            document.getElementById('homeForm').addEventListener('submit', saveHome);
            document.getElementById('saveFleetButton').addEventListener('click', saveFleet);
            document.getElementById('saveServicesButton').addEventListener('click', saveServices);
            document.getElementById('saveLocationsButton').addEventListener('click', saveLocations);
            document.getElementById('loadPageButton').addEventListener('click', loadSelectedPage);
            document.getElementById('savePageButton').addEventListener('click', saveSelectedPage);
            document.getElementById('reloadPagePreviewButton').addEventListener('click', reloadPagePreview);
            document.getElementById('reloadHomeButton').addEventListener('click', function () {
                if (state.home) {
                    renderHomeForm(state.home);
                    setStatus('homeStatus', 'Home hero reloaded from the latest saved state.');
                }
            });
            document.getElementById('reloadHeaderButton').addEventListener('click', function () {
                if (state.header) {
                    renderHeaderEditor(state.header);
                    bindHeaderEditor();
                    setStatus('headerStatus', 'Header editor reloaded from the latest saved state.');
                }
            });
            document.getElementById('reloadStyleButton').addEventListener('click', function () {
                if (state.style) {
                    renderStyleForm(state.style);
                    setStatus('styleStatus', 'Style editor reloaded from the latest saved state.');
                }
            });
            document.getElementById('reloadFleetButton').addEventListener('click', function () {
                if (state.fleet.length) {
                    renderFleetEditor(state.fleet);
                    setStatus('fleetStatus', 'Fleet cards reloaded from the latest saved state.');
                }
            });
            document.getElementById('reloadServicesButton').addEventListener('click', function () {
                if (state.services) {
                    renderServicesEditor(state.services);
                    bindServicesEditor();
                    setStatus('servicesStatus', 'Services cards reloaded from the latest saved state.');
                }
            });
            document.getElementById('reloadLocationsButton').addEventListener('click', function () {
                if (state.locations) {
                    renderLocationsEditor(state.locations);
                    bindLocationsEditor();
                    setStatus('locationsStatus', 'Locations cards reloaded from the latest saved state.');
                }
            });
            document.getElementById('syncHomePreviewButton').addEventListener('click', updateHomePreview);
            document.getElementById('syncFleetPreviewButton').addEventListener('click', updateFleetPreview);
            document.getElementById('appearancePageSelect').addEventListener('change', function () {
                setStatus('appearanceStatus', 'Selected page changed. Load it to edit the tab title.', '');
            });
            document.getElementById('appearanceTitle').addEventListener('input', function () {
                updateAppearancePreview();
                setStatus('appearanceStatus', 'Browser tab settings changed locally but not saved yet.', '');
            });
            document.getElementById('appearanceDescription').addEventListener('input', function () {
                setStatus('appearanceStatus', 'Browser tab settings changed locally but not saved yet.', '');
            });
            document.getElementById('appearanceFaviconHref').addEventListener('input', function () {
                updateAppearancePreview();
                setStatus('appearanceStatus', 'Favicon changed locally but not saved yet.', '');
            });
            document.getElementById('faviconOptionGrid').addEventListener('click', function (event) {
                var button = event.target.closest('[data-favicon-option]');
                if (!button) {
                    return;
                }

                document.getElementById('appearanceFaviconHref').value = button.getAttribute('data-favicon-option');
                updateAppearancePreview();
                setStatus('appearanceStatus', 'Favicon selected visually but not saved yet.', '');
            });
            document.getElementById('styleForm').addEventListener('input', function () {
                updateStylePreview();
                setStatus('styleStatus', 'Style settings changed locally but not saved yet.', '');
            });
            document.getElementById('styleForm').addEventListener('change', function () {
                updateStylePreview();
                setStatus('styleStatus', 'Style settings changed locally but not saved yet.', '');
            });
            document.getElementById('pageSelect').addEventListener('change', function () {
                var selectedPath = document.getElementById('pageSelect').value || '/';
                var selectedPage = state.pages.find(function (page) {
                    return page.publicPath === selectedPath;
                });

                if (selectedPage) {
                    syncCurrentPagePreview({
                        publicPath: selectedPage.publicPath,
                        filePath: selectedPage.filePath,
                        label: selectedPage.label,
                        source: document.getElementById('pageSource').value || ''
                    });
                }

                setStatus('pageStatus', 'Selected page changed. Load it to refresh the source.', '');
            });
            document.getElementById('pageSource').addEventListener('input', function () {
                updatePageSourceMeta();
                setStatus('pageStatus', 'Full page source changed locally but not saved yet.', '');
            });
            document.getElementById('logoutButton').addEventListener('click', async function () {
                await api('/api/admin/logout', { method: 'POST' }).catch(function () {});
                window.location.href = '/admin/login.html';
            });
            document.querySelectorAll('#homeForm input, #homeForm textarea').forEach(function (field) {
                field.addEventListener('input', updateHomePreview);
            });

            loadEditorState().catch(function (error) {
                setStatus('headerStatus', error.message || 'The editor could not be loaded.', 'error');
                setStatus('appearanceStatus', error.message || 'The editor could not be loaded.', 'error');
                setStatus('styleStatus', error.message || 'The editor could not be loaded.', 'error');
                setStatus('homeStatus', error.message || 'The editor could not be loaded.', 'error');
                setStatus('fleetStatus', error.message || 'The editor could not be loaded.', 'error');
                setStatus('servicesStatus', error.message || 'The editor could not be loaded.', 'error');
                setStatus('locationsStatus', error.message || 'The editor could not be loaded.', 'error');
                setStatus('pageStatus', error.message || 'The editor could not be loaded.', 'error');
            });
        })();
    </script>
</body>
</html>`;
}

module.exports = {
    renderAdminContentEditorPage
};
