var TL = window.TL || {};

TL.locationSection = (function () {

    var LEAFLET_CSS = 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.css';
    var LEAFLET_JS  = 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.js';
    var leafletPromise = null;

    function loadLeaflet() {
        if (window.L) return Promise.resolve(window.L);
        if (leafletPromise) return leafletPromise;

        leafletPromise = new Promise(function (resolve, reject) {
            if (!document.querySelector('link[data-leaflet]')) {
                var link = document.createElement('link');
                link.rel = 'stylesheet';
                link.href = LEAFLET_CSS;
                link.setAttribute('data-leaflet', '1');
                document.head.appendChild(link);
            }
            var script = document.createElement('script');
            script.src = LEAFLET_JS;
            script.onload = function () { resolve(window.L); };
            script.onerror = function () { reject(new Error('Leaflet failed to load')); };
            document.body.appendChild(script);
        });
        return leafletPromise;
    }

    function fmtCoord(v) {
        return typeof v === 'number' ? v.toFixed(4) + '\u00b0' : 'Unknown';
    }

    var DESC =
        'This data is derived entirely from your public IP address\u2019 routing and registration records, ' +
        'not GPS, so it only ever narrows you down to a rough operational radius, never an exact address. ' +
        'Any site you visit, even a malicious one, can pull this same rough area and your service provider ' +
        'the instant you load a page, with no permission prompt and nothing you can block from JavaScript alone.';

    function skeletonStat(label) {
        return '<div class="geo-stat is-loading">' +
            '<span class="geo-stat-label">' + label + '</span>' +
            '<span class="geo-stat-value geo-skel"></span>' +
        '</div>';
    }

    function start(section) {
        section.innerHTML = '';
        section.style.display = 'block';

        var wrap = document.createElement('div');
        wrap.className = 'geo-card';
        wrap.innerHTML =
            '<div class="score-heading">' +
                '<div class="score-heading-eyebrow">Live</div>' +
                '<h2 class="score-heading-title">Resolving your location on Earth</h2>' +
            '</div>' +
            '<p class="score-desc">' + DESC + '</p>' +
            '<div class="geo-body">' +
                '<div class="geo-map-wrap">' +
                    '<div class="geo-map geo-map-loading">' +
                        '<div class="geo-map-pulse"></div>' +
                        '<span class="geo-map-loading-text">Contacting IP geolocation resolvers...</span>' +
                    '</div>' +
                '</div>' +
                '<div class="geo-stats">' +
                    skeletonStat('Area name') +
                    '<div class="geo-stat-pair">' +
                        skeletonStat('Latitude') +
                        skeletonStat('Longitude') +
                    '</div>' +
                    skeletonStat('Operational radius') +
                    skeletonStat('Service provider') +
                '</div>' +
            '</div>';

        section.appendChild(wrap);
        return { section: section, card: wrap };
    }

    function tileUrlFor(isLight) {
        return isLight
            ? 'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png'
            : 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png';
    }

    var activeThemeHandler = null;

    function paintMap(net) {
        loadLeaflet().then(function (L) {
            var mapEl = document.getElementById('geo-map');
            if (!mapEl || !L) return;

            var themeBtn = document.getElementById('theme-btn');
            if (themeBtn && activeThemeHandler) {
                themeBtn.removeEventListener('click', activeThemeHandler);
                activeThemeHandler = null;
            }

            var isLight = document.body.classList.contains('light-mode');
            var map = L.map('geo-map', {
                zoomControl: true,
                attributionControl: true,
                scrollWheelZoom: false
            }).setView([net.lat, net.lon], 9);

            var tiles = L.tileLayer(tileUrlFor(isLight), {
                maxZoom: 18,
                attribution: '&copy; OpenStreetMap contributors &copy; CARTO'
            }).addTo(map);

            if (themeBtn) {
                activeThemeHandler = function () {
                    if (!document.body.contains(mapEl)) {
                        themeBtn.removeEventListener('click', activeThemeHandler);
                        activeThemeHandler = null;
                        return;
                    }
                    var nowLight = document.body.classList.contains('light-mode');
                    tiles.setUrl(tileUrlFor(nowLight));
                };
                themeBtn.addEventListener('click', activeThemeHandler);
            }

            var radiusM = (net.radiusKm || 40) * 1000;

            L.circle([net.lat, net.lon], {
                radius: radiusM,
                color: '#3ddc84',
                fillColor: '#3ddc84',
                fillOpacity: 0.14,
                weight: 1.5
            }).addTo(map);

            L.circleMarker([net.lat, net.lon], {
                radius: 6,
                color: '#e85b47',
                fillColor: '#e85b47',
                fillOpacity: 0.9,
                weight: 2
            }).addTo(map).bindPopup('Approximate area, not your real address');

            setTimeout(function () { map.invalidateSize(); }, 60);
        }).catch(function () {
            var mapEl = document.getElementById('geo-map');
            if (mapEl) mapEl.outerHTML = '<div class="geo-map geo-map-empty">Map failed to load, check your connection</div>';
        });
    }

    function destroyActiveThemeHandler() {
        var themeBtn = document.getElementById('theme-btn');
        if (themeBtn && activeThemeHandler) {
            themeBtn.removeEventListener('click', activeThemeHandler);
        }
        activeThemeHandler = null;
    }

    function reveal(state, data) {
        var net = data.network || {};
        var card = state.card;

        var heading = card.querySelector('.score-heading-eyebrow');
        var title   = card.querySelector('.score-heading-title');
        if (heading) heading.textContent = 'Result';
        if (title)   title.textContent   = 'Your location on Earth';

        var hasCoords = typeof net.lat === 'number' && typeof net.lon === 'number';
        var areaName = TL.escapeHTML([net.city, net.region, net.country].filter(Boolean).join(', ') || 'Unknown area');
        var orgName = TL.escapeHTML(net.org || 'Unknown');
        var radius = net.radiusKm || 40;

        var carrierNote = net.isMobileCarrier
            ? '<p class="geo-note">' +
                'Your ISP, ' + (orgName || 'this provider') + ', looks like a mobile or cellular carrier. ' +
                'Carriers route traffic through a small number of regional hubs, so the marker below often lands ' +
                'on that hub city rather than the town you are actually in, sometimes well outside the shaded circle. ' +
                'The radius has been widened to reflect that extra uncertainty.' +
              '</p>'
            : '';

        var existingNote = card.querySelector('.geo-note');
        if (existingNote) existingNote.remove();
        var descEl = card.querySelector('.score-desc');
        if (descEl && carrierNote) descEl.insertAdjacentHTML('afterend', carrierNote);

        var mapWrap = card.querySelector('.geo-map-wrap');
        mapWrap.innerHTML = hasCoords
            ? '<div id="geo-map" class="geo-map"></div>'
            : '<div class="geo-map geo-map-empty">Map unavailable, your IP location could not be resolved</div>';

        var statsWrap = card.querySelector('.geo-stats');
        statsWrap.innerHTML =
            '<div class="geo-stat"><span class="geo-stat-label">Area name</span><span class="geo-stat-value">' + areaName + '</span></div>' +
            '<div class="geo-stat-pair">' +
                '<div class="geo-stat"><span class="geo-stat-label">Latitude</span><span class="geo-stat-value">' + fmtCoord(net.lat) + '</span></div>' +
                '<div class="geo-stat"><span class="geo-stat-label">Longitude</span><span class="geo-stat-value">' + fmtCoord(net.lon) + '</span></div>' +
            '</div>' +
            '<div class="geo-stat"><span class="geo-stat-label">Operational radius</span><span class="geo-stat-value">~' + radius + ' km' + (net.isMobileCarrier ? ' (mobile network, widened)' : '') + '</span></div>' +
            '<div class="geo-stat"><span class="geo-stat-label">Service provider</span><span class="geo-stat-value">' + orgName + '</span></div>';

        if (hasCoords) paintMap(net);
    }

    function render(section, data) {
        var state = start(section);
        reveal(state, data);
    }

    return { start: start, reveal: reveal, render: render, destroyActiveThemeHandler: destroyActiveThemeHandler };
})();

window.TL = TL;
