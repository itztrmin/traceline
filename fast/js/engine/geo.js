var TL = window.TL || {};

TL.geo = (function () {

    var empty = { ip: 'Unknown', city: 'Unknown', region: '', country: 'Unknown', org: 'Unknown', timezone: '', lat: null, lon: null };

    var resolvers = [
        async function () {
            var r = await TL.fetch('https://ipapi.co/json/', 4000);
            var j = await r.json();
            if (j.error) throw new Error('rate limited');
            return {
                ip: j.ip, city: j.city, region: j.region, country: j.country_name,
                org: j.org, timezone: j.timezone,
                lat: typeof j.latitude === 'number' ? j.latitude : null,
                lon: typeof j.longitude === 'number' ? j.longitude : null
            };
        },
        async function () {
            var r = await TL.fetch('https://ipinfo.io/json', 4000);
            var j = await r.json();
            var lat = null, lon = null;
            if (j.loc && j.loc.indexOf(',') !== -1) {
                var parts = j.loc.split(',');
                lat = parseFloat(parts[0]); lon = parseFloat(parts[1]);
            }
            return {
                ip: j.ip, city: j.city, region: j.region, country: j.country,
                org: j.org, timezone: j.timezone,
                lat: isNaN(lat) ? null : lat, lon: isNaN(lon) ? null : lon
            };
        },
        async function () {
            var r = await TL.fetch('https://ipwho.is/', 5000);
            var j = await r.json();
            if (!j.success) throw new Error('failed');
            return {
                ip:       j.ip,
                city:     j.city,
                region:   j.region,
                country:  j.country,
                org:      (j.connection && j.connection.isp) || 'Unknown',
                timezone: (j.timezone  && j.timezone.id)    || '',
                lat:      typeof j.latitude === 'number' ? j.latitude : null,
                lon:      typeof j.longitude === 'number' ? j.longitude : null
            };
        },
        async function () {
            var r = await TL.fetch('https://api.seeip.org/geoip', 5000);
            var j = await r.json();
            return {
                ip: j.ip, city: j.city, region: j.region || '', country: j.country,
                org: j.organization || 'Unknown', timezone: j.timezone || '',
                lat: typeof j.latitude === 'number' ? j.latitude : null,
                lon: typeof j.longitude === 'number' ? j.longitude : null
            };
        },
        async function () {
            var r = await TL.fetch('https://api.ipify.org?format=json', 4000);
            var j = await r.json();
            return Object.assign({}, empty, { ip: j.ip, org: 'Geo data blocked by privacy shield or ad blocker' });
        }
    ];

    async function lookup() {
        return new Promise(function (resolve) {
            var pending = resolvers.length;
            var settled = false;
            var errors  = [];

            function succeed(val) {
                if (settled) return;
                settled = true;
                resolve(val);
            }

            function fail(err) {
                errors.push(err);
                pending--;
                if (pending === 0 && !settled) {
                    settled = true;
                    resolve(Object.assign({}, empty, { ip: 'All resolvers blocked' }));
                }
            }

            resolvers.forEach(function (resolver) {
                resolver().then(succeed, fail);
            });
        });
    }

    var DC = [
        'vpn','proxy','datacenter','data center','aws','amazon',
        'digitalocean','linode','vultr','ovh','m247','cloudflare',
        'hetzner','serverius','leaseweb','choopa','psychz',
        'quadranet','nexeon','sharktech','zenlayer','akamai',
        'fastly','cogent','hurricane electric','he.net',
        'tor exit','mullvad','nordvpn','expressvpn','protonvpn',
        'private internet','surfshark','ipvanish','cyberghost'
    ];

    function matchesKeyword(haystack, keyword) {
        if (/[a-z]/.test(keyword[0]) && /[a-z0-9]/.test(keyword[keyword.length - 1]) && keyword.indexOf(' ') === -1) {
            return new RegExp('\\b' + keyword.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '\\b').test(haystack);
        }
        return haystack.indexOf(keyword) !== -1;
    }

    function detectVPN(data, sysTZ) {
        var isp = (data.org || '').toLowerCase();
        var suspicious = DC.some(function (k) { return matchesKeyword(isp, k); });
        var hasIpTz = !!data.timezone && data.timezone !== 'Unknown';
        var tzMismatch = hasIpTz && !!sysTZ && !TL.sameTimezone(data.timezone, sysTZ);
        if (suspicious && tzMismatch) return 'High risk datacenter ISP and timezone mismatch';
        if (suspicious)  return 'Likely VPN or datacenter IP detected';
        if (tzMismatch)  return 'Timezone mismatch system: ' + sysTZ + ', IP: ' + data.timezone;
        return 'Not detected';
    }

    var MOBILE_CARRIERS = [
        'grameenphone','robi','banglalink','airtel','jio','vodafone','vi india',
        'idea cellular','airtel bharti','t-mobile','verizon wireless','at&t mobility',
        'sprint','mtn','vodacom','safaricom','telenor','orange mobile','o2',
        'ee limited','three uk','du telecom','etisalat','stc mobile','ptcl mobile',
        'mobilink','zong','ufone','telkomsel','xl axiata','indosat','smart communications',
        'globe telecom','china mobile','china unicom','china telecom','claro',
        'movistar','telcel','tim mobile','wind tre','vodafone idea'
    ];

    function isMobileCarrier(org) {
        var o = (org || '').toLowerCase();
        return MOBILE_CARRIERS.some(function (k) { return o.indexOf(k) !== -1; }) ||
            /\bmobile\b|\bcellular\b|\bwireless\b|\btelecom\b/.test(o);
    }

    function approxRadiusKm(hasCity, org) {
        var base;
        if (isMobileCarrier(org)) base = hasCity ? 60 : 100;
        else base = hasCity ? 40 : 75;
        return Math.min(base, 100);
    }

    return { lookup: lookup, detectVPN: detectVPN, approxRadiusKm: approxRadiusKm, isMobileCarrier: isMobileCarrier };
})();

window.TL = TL;
