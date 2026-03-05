// ==UserScript==
// @name         LLBlaze.Pro Steam Profile & Tournament Links
// @namespace    https://llblaze.pro/
// @version      1.0.0
// @description  Adds LLBlaze.Pro buttons to Steam profile pages, Challonge and start.gg tournament pages.
// @author       aTastyT0ast
// @icon         https://llblaze.pro/favicon.ico
// @updateURL    https://raw.githubusercontent.com/aTastyT0ast/llbpro/main/userscript/llbproviewer.user.js
// @downloadURL  https://raw.githubusercontent.com/aTastyT0ast/llbpro/main/userscript/llbproviewer.user.js
// @match        https://steamcommunity.com/profiles/*/
// @match        https://steamcommunity.com/profiles/*
// @match        https://steamcommunity.com/id/*/
// @match        https://steamcommunity.com/id/*
// @match        https://challonge.com/*/
// @match        https://challonge.com/*
// @match        https://*.challonge.com/*/
// @match        https://*.challonge.com/*
// @match        https://challonge.com/*/participants
// @match        https://challonge.com/*/participants/
// @match        https://*.challonge.com/*/participants
// @match        https://*.challonge.com/*/participants/
// @match        https://www.start.gg/tournament/*/event/*/
// @match        https://www.start.gg/tournament/*/event/*
// @match        https://start.gg/tournament/*/event/*/
// @match        https://start.gg/tournament/*/event/*
// @grant        GM_xmlhttpRequest
// @grant        GM.xmlHttpRequest
// @connect      api.llblaze.pro
// @connect      llblaze.pro
// @run-at       document-idle
// ==/UserScript==

(function () {
    'use strict';

    // ── Helpers ───────────────────────────────────────────────────────────────

    function gmRequest(options) {
        const fn = typeof GM !== 'undefined' && GM.xmlHttpRequest
            ? GM.xmlHttpRequest.bind(GM)
            : GM_xmlhttpRequest;
        fn(options);
    }


    // ── Cache (localStorage, 1 hour TTL) ──────────────────────────────────────

    const CACHE_PREFIX = 'llblaze_cache_';
    const CACHE_TTL_MS = 60 * 60 * 1000; // 1 hour

    function cacheGet(key) {
        try {
            const raw = localStorage.getItem(CACHE_PREFIX + key);
            if (!raw) return null;
            const entry = JSON.parse(raw);
            if (Date.now() > entry.expires) {
                localStorage.removeItem(CACHE_PREFIX + key);
                return null;
            }
            return entry.value;
        } catch (e) {
            return null;
        }
    }

    function cacheSet(key, value) {
        try {
            const entry = { value, expires: Date.now() + CACHE_TTL_MS };
            localStorage.setItem(CACHE_PREFIX + key, JSON.stringify(entry));
        } catch (e) {
            // localStorage might be full or unavailable — silently ignore
        }
    }

    function gmRequestCached(cacheKey, url, onSuccess, onError) {
        const cached = cacheGet(cacheKey);
        if (cached !== null) {
            onSuccess(cached);
            return;
        }
        gmRequest({
            method: 'GET',
            url,
            onload(response) {
                if (response.status >= 200 && response.status < 300) {
                    try {
                        const data = JSON.parse(response.responseText);
                        cacheSet(cacheKey, data);
                        onSuccess(data);
                    } catch (e) {
                        console.warn('[LLBlaze.Pro] Failed to parse API response:', e);
                    }
                }
            },
            onerror(err) {
                if (onError) onError(err);
            },
        });
    }

    // ── Font Loader ───────────────────────────────────────────────────────────

    function injectFontFromBase64(base64) {
        if (document.getElementById('llblaze-font')) return;
        const fontStyle = document.createElement('style');
        fontStyle.id = 'llblaze-font';
        fontStyle.textContent = `
            @font-face {
                font-family: 'BN-Elements';
                src: url('data:font/truetype;base64,${base64}') format('truetype');
                font-weight: normal;
                font-style: normal;
            }
        `;
        document.head.appendChild(fontStyle);
    }

    function fetchAndInjectFont() {
        if (document.getElementById('llblaze-font')) return;

        // Font is large — cache the base64 string in localStorage (no TTL: font never changes)
        const FONT_CACHE_KEY = 'llblaze_font_b64';
        try {
            const cached = localStorage.getItem(FONT_CACHE_KEY);
            if (cached) {
                injectFontFromBase64(cached);
                return;
            }
        } catch (e) { /* ignore */ }

        gmRequest({
            method: 'GET',
            url: 'https://llblaze.pro/assets/Elements-7OsVesJ0.ttf',
            responseType: 'arraybuffer',
            onload(response) {
                if (response.status >= 200 && response.status < 300) {
                    const bytes = new Uint8Array(response.response);
                    let binary = '';
                    for (let i = 0; i < bytes.byteLength; i++) {
                        binary += String.fromCharCode(bytes[i]);
                    }
                    const base64 = btoa(binary);
                    try { localStorage.setItem(FONT_CACHE_KEY, base64); } catch (e) { /* ignore */ }
                    injectFontFromBase64(base64);
                }
            },
            onerror(err) {
                console.warn('[LLBlaze.Pro] Font fetch failed:', err);
            },
        });
    }

    // ── Shared Button CSS ─────────────────────────────────────────────────────

    function injectButtonStyles() {
        if (document.getElementById('llblaze-styles')) return;
        const style = document.createElement('style');
        style.id = 'llblaze-styles';
        style.textContent = `
            button.blaze {
                position: fixed;
                bottom: 32px;
                right: 40px;
                z-index: 99999;
                border: none;
                padding: 0.6em 1.2em;
                font-size: 1em;
                line-height: 1;
                height: 48px;
                background-color: black;
                color: white;
                margin: 0;
                border-radius: 0;
                font-family: 'BN-Elements', sans-serif;
                transform: skewX(-10deg);
                border-bottom: white 4px solid;
                border-right: white 8px solid;
                filter: drop-shadow(4px 0px 0px black) drop-shadow(4px 0px 0px white) drop-shadow(4px 0px 0px black);
                -webkit-filter: drop-shadow(4px 0px 0px black) drop-shadow(4px 0px 0px white) drop-shadow(4px 0px 0px black);
                transition: transform 0.1s ease;
                white-space: nowrap;
                cursor: pointer;
            }

            button.blaze:hover {
                background-color: white;
                color: black;
                border-bottom: #1efff7 4px solid;
                border-right: #1efff7 8px solid;
                filter: drop-shadow(4px 0px 0px white) drop-shadow(4px 0px 0px #1efff7) drop-shadow(4px 0px 0px white);
                -webkit-filter: drop-shadow(4px 0px 0px white) drop-shadow(4px 0px 0px #1efff7) drop-shadow(4px 0px 0px white);
                transition: transform 0.1s ease;
                transform: skewX(-10deg) translateX(10px);
            }

            button.ll1 {
                position: fixed;
                bottom: 92px;
                right: 40px;
                z-index: 99999;
                padding: 0.6em 1.2em;
                font-size: 1em;
                line-height: 1;
                height: 48px;
                background: linear-gradient(90deg, #141414 11%, #0a0a0a 11%, #0a0a0a 34%, #141414 34%, #141414 38%, #0a0a0a 38%, #0a0a0a 48%, #141414 48%);
                color: #af190b;
                margin: 16px;
                border-radius: 0;
                text-transform: uppercase;
                font-family: 'GRATIS', sans-serif;
                transform: skewX(45deg);
                border: #545454 2px solid;
                filter: drop-shadow(0px 6px 0px black);
                -webkit-filter: drop-shadow(0px 6px 0px black);
                transition: transform 0.1s ease;
                white-space: nowrap;
                cursor: pointer;
            }

            button.ll1:hover {
                color: white;
                transition: transform 0.1s ease;
                transform: skewX(45deg) translateX(10px);
            }

            button.ll1.solo {
                bottom: 32px;
            }

            button.blaze.bottom-left {
                right: unset;
                left: 40px;
            }

            button.ll1.bottom-left {
                right: unset;
                left: 40px;
            }

            button.blaze p {
                transform: skewX(10deg);
                margin: 0;
            }

            button.ll1 p {
                transform: skewX(-45deg);
                margin: 0;
            }
        `;
        document.head.appendChild(style);
    }

    function createBlazeButton(id, label, url, bottomLeft = false) {
        if (document.getElementById(id)) return null;
        fetchAndInjectFont();
        injectButtonStyles();

        const btn = document.createElement('button');
        btn.id = id;
        btn.className = bottomLeft ? 'blaze bottom-left' : 'blaze';
        const blazeP = document.createElement('p');
        blazeP.textContent = label;
        btn.appendChild(blazeP);
        btn.addEventListener('click', () => {
            window.open(url, '_blank', 'noopener,noreferrer');
        });
        return btn;
    }

    function createL1Button(id, label, url, solo = false, bottomLeft = false) {
        if (document.getElementById(id)) return null;
        fetchAndInjectFont();
        injectButtonStyles();

        const btn = document.createElement('button');
        btn.id = id;
        let cls = solo ? 'll1 solo' : 'll1';
        if (bottomLeft) cls += ' bottom-left';
        btn.className = cls;
        const l1P = document.createElement('p');
        l1P.textContent = label;
        btn.appendChild(l1P);
        btn.addEventListener('click', () => {
            window.open(url, '_blank', 'noopener,noreferrer');
        });
        return btn;
    }

    function insertButton(btn) {
        if (!btn) return;
        document.body.appendChild(btn);
    }

    // =========================================================================
    // STEAM
    // =========================================================================

    function isRootSteamProfilePage() {
        const path = window.location.pathname.replace(/\/$/, '');
        return /^\/(profiles\/\d+|id\/[^/]+)$/.test(path);
    }

    function getSteamId() {
        const url = window.location.href;

        const numericMatch = url.match(/\/profiles\/(\d{17})/);
        if (numericMatch) return numericMatch[1];

        const dataAttr = document.querySelector('[data-steamid]');
        if (dataAttr) return dataAttr.getAttribute('data-steamid');

        const scriptMatch = document.documentElement.innerHTML.match(/"steamid"\s*:\s*"(\d{17})"/);
        if (scriptMatch) return scriptMatch[1];

        return null;
    }

    function initSteam() {
        if (!isRootSteamProfilePage()) return;

        const steamId = getSteamId();
        if (!steamId) {
            console.warn('[LLBlaze.Pro] Could not determine Steam ID on this page.');
            return;
        }

        gmRequestCached(
            `steam_${steamId}`,
            `https://api.llblaze.pro/players?steam_id=${steamId}`,
            (data) => {
                if (!data) return;

                const hasBlaze = !!data.blazePlayerId;
                const hasL1 = !!data.l1PlayerId;

                if (hasBlaze) {
                    const btn = createBlazeButton(
                        'llblaze-btn',
                        'View on LLBlaze.Pro',
                        `https://llblaze.pro/llb/players/${data.surrogateId}`
                    );
                    insertButton(btn);
                }

                if (hasL1) {
                    // If there's no blaze button below, render L1 at the bottom (solo)
                    const btn = createL1Button(
                        'llblaze-l1-btn',
                        'View on LLBlaze.Pro',
                        `https://llblaze.pro/ll/players/${data.surrogateId}`,
                        !hasBlaze
                    );
                    insertButton(btn);
                }
            },
            (err) => console.warn('[LLBlaze.Pro] Steam API request failed:', err)
        );
    }

    // =========================================================================
    // CHALLONGE
    // =========================================================================

    function isRootChallongePage() {
        const path = window.location.pathname.replace(/\/$/, '');
        return /^\/[^/]+$/.test(path);
    }

    function isChallongeParticipantsPage() {
        const path = window.location.pathname.replace(/\/$/, '');
        return /^\/[^/]+\/participants$/.test(path);
    }

    function getChallongeTournamentId() {
        const html = document.documentElement.innerHTML;

        const jsonMatch = html.match(/"tournament_id"\s*:\s*(\d+)/);
        if (jsonMatch) return jsonMatch[1];

        const dataAttr = document.querySelector('[data-tournament-id]');
        if (dataAttr) return dataAttr.getAttribute('data-tournament-id');

        const challongeObj = html.match(/Challonge\.tournament\s*=\s*\{[^}]*?"id"\s*:\s*(\d+)/);
        if (challongeObj) return challongeObj[1];

        const meta = document.querySelector(
            'meta[name="tournament-id"], meta[property="tournament:id"]'
        );
        if (meta) return meta.getAttribute('content');

        for (const script of document.querySelectorAll('script:not([src])')) {
            const m = script.textContent.match(/"id"\s*:\s*(\d{5,})/);
            if (m) return m[1];
        }

        // Fallback: parse data-params attribute on the "Create template from this tournament" link
        const templateLink = document.querySelector('a[data-params*="tournament_id"]');
        if (templateLink) {
            try {
                const params = JSON.parse(templateLink.getAttribute('data-params'));
                if (params.tournament_id) return String(params.tournament_id);
            } catch (e) { /* ignore */ }
        }

        return null;
    }

    function getChallongeGameId() {
        const gameLink = document.querySelector('a[href*="filters%5Bgame_id%5D="], a[href*="filters[game_id]="]');
        if (gameLink) {
            const m = gameLink.href.match(/game_id%5D=(\d+)|game_id]=(\d+)/);
            if (m) return m[1] || m[2];
        }
        return null;
    }

    function initChallonge() {
        if (!isRootChallongePage()) return;

        const tourneyId = getChallongeTournamentId();
        if (!tourneyId) {
            console.warn('[LLBlaze.Pro] Could not determine Challonge tournament ID on this page.');
            return;
        }

        const gameId = getChallongeGameId();

        let section;
        if (gameId === '8024') {
            section = 'll';
        } else if (gameId === '146471') {
            section = 'llb';
        } else {
            return;
        }

        const url = `https://llblaze.pro/${section}/tournaments/challonge/${tourneyId}`;
        const btn = section === 'll'
            ? createL1Button('llblaze-challonge-btn', 'View on LLBlaze.Pro', url, true)
            : createBlazeButton('llblaze-challonge-btn', 'View on LLBlaze.Pro', url);

        insertButton(btn);
    }

    function initChallongeSeeding() {
        if (!isChallongeParticipantsPage()) return;

        const gameId = getChallongeGameId();

        let section;
        if (gameId === '8024') {
            section = 'll';
        } else if (gameId === '146471') {
            section = 'llb';
        } else {
            return;
        }

        const tourneyName = window.location.pathname.replace(/\/$/, '').split('/').slice(-2, -1)[0];
        const url = `https://llblaze.pro/${section}/seeding?name=${encodeURIComponent(tourneyName)}`;
        const btn = section === 'll'
            ? createL1Button('llblaze-seeding-btn', 'Open Seeding Helper', url, true, true)
            : createBlazeButton('llblaze-seeding-btn', 'Open Seeding Helper', url, true);

        insertButton(btn);
    }

    // =========================================================================
    // START.GG
    // =========================================================================

    function getStartGgEventId() {
        // start.gg embeds relay store keys like "Event:1453053" in the page HTML.
        // We scan all inline <script> tags for this pattern.
        const pattern = /["']Event:(\d+)["']/;

        for (const script of document.querySelectorAll('script:not([src])')) {
            const m = script.textContent.match(pattern);
            if (m) return m[1];
        }

        // Fallback: scan the full HTML (catches data attributes, comments, etc.)
        const htmlMatch = document.documentElement.innerHTML.match(pattern);
        if (htmlMatch) return htmlMatch[1];

        return null;
    }

    function isStartGgEventPage() {
        const path = window.location.pathname.replace(/\/$/, '');
        // Must be exactly /tournament/<slug>/event/<slug> — nothing further
        return /^\/tournament\/[^/]+\/event\/[^/]+$/.test(path);
    }

    function getStartGgGameId() {
        const pattern = /["']Videogame:(\d+)["']/;

        for (const script of document.querySelectorAll('script:not([src])')) {
            const m = script.textContent.match(pattern);
            if (m) return m[1];
        }

        const htmlMatch = document.documentElement.innerHTML.match(pattern);
        if (htmlMatch) return htmlMatch[1];

        return null;
    }

    function initStartGg() {
        if (!isStartGgEventPage()) return;

        // start.gg is a React SPA — the relay data may not be in the DOM immediately.
        // Retry a few times with a short delay to let the page hydrate.
        let attempts = 0;
        const maxAttempts = 10;
        const interval = 500; // ms

        function tryExtract() {
            const eventId = getStartGgEventId();
            const gameId = getStartGgGameId();

            if (eventId && gameId) {
                let section;
                if (gameId === '2868') {
                    section = 'llb';
                } else if (gameId === '1335') {
                    section = 'll';
                } else {
                    return; // Unsupported game — no button
                }

                const url = `https://llblaze.pro/${section}/tournaments/gg/${eventId}`;
                const btn = section === 'll'
                    ? createL1Button('llblaze-startgg-btn', 'View on LLBlaze.Pro', url, true)
                    : createBlazeButton('llblaze-startgg-btn', 'View on LLBlaze.Pro', url);
                insertButton(btn);
                return;
            }

            attempts++;
            if (attempts < maxAttempts) {
                setTimeout(tryExtract, interval);
            } else {
                console.warn('[LLBlaze.Pro] Could not determine start.gg event ID on this page.');
            }
        }

        tryExtract();
    }

    // =========================================================================
    // ROUTER
    // =========================================================================

    function init() {
        const host = window.location.hostname;

        if (host === 'steamcommunity.com') {
            initSteam();
        } else if (host === 'challonge.com' || host.endsWith('.challonge.com')) {
            initChallonge();
            initChallongeSeeding();
        } else if (host === 'start.gg' || host === 'www.start.gg') {
            initStartGg();
        }
    }

    if (document.readyState === 'complete') {
        init();
    } else {
        window.addEventListener('load', init);
    }
})();