var TL = window.TL || {};

TL.score = (function () {

    function check(label, good, pts) {
        return { label: label, good: good, pts: good ? pts : 0, max: pts };
    }

    function categoryScore(checks) {
        var pts = 0, max = 0;
        checks.forEach(function (c) { pts += c.pts; max += c.max; });
        var pct = max > 0 ? (pts / max) * 100 : 0;
        return { checks: checks, pts: pts, max: max, pct: pct };
    }

    function grade(pct) {
        if (pct >= 85) return 'A+';
        if (pct >= 70) return 'A';
        if (pct >= 55) return 'B';
        if (pct >= 40) return 'C';
        if (pct >= 25) return 'D';
        return 'F';
    }

    function calculate(d) {
        var vpnStr = d.network && d.network.vpn || '';
        var vpnOn = vpnStr.indexOf('VPN') !== -1 || vpnStr.indexOf('datacenter') !== -1 || vpnStr.indexOf('proxy') !== -1;

        var hasIpTz = d.network && !!d.network.ipTimezone && d.network.ipTimezone !== 'Unknown';
        var tzMatch = hasIpTz && TL.sameTimezone(d.network.ipTimezone, d.network.systemTimezone);

        var network = categoryScore([
            check('VPN or proxy in use', vpnOn, 3),
            check('VPN masks true region from timezone leak', vpnOn ? (hasIpTz ? !tzMatch : true) : !hasIpTz || tzMatch, 1),
            check('Connection is encrypted (HTTPS)', window.location.protocol === 'https:' || window.location.hostname === 'localhost', 1)
        ]);

        var canvasOk = d.canvas && (
            d.canvas.indexOf('Protected') !== -1 ||
            d.canvas.indexOf('Blocked')   !== -1 ||
            d.canvas.indexOf('noise')     !== -1 ||
            d.canvas.indexOf('prevented') !== -1
        );
        var audioOk = d.audio && (
            d.audio.indexOf('Protected') !== -1 ||
            d.audio.indexOf('Blocked')   !== -1 ||
            d.audio.indexOf('blocked')   !== -1 ||
            d.audio.indexOf('zeroed')    !== -1 ||
            d.audio.indexOf('Restricted')!== -1
        );
        var gpuMasked = d.gpu && (d.gpu.masked === true || (d.gpu.vendor && d.gpu.vendor.indexOf('locked') !== -1));
        var mediaOk = d.devices && (
            d.devices.indexOf('Blocked') !== -1 ||
            d.devices.indexOf('Restricted') !== -1
        );
        var fontsBlocked = d.fonts && d.fonts.indexOf('Detection blocked') !== -1;
        var webglFpMasked = !d.webglFP || d.webglFP === 'Unavailable' || gpuMasked;
        var webgpuMasked = !d.webgpu ||
            d.webgpu.indexOf('Not supported') !== -1 ||
            d.webgpu.indexOf('Blocked') !== -1 ||
            d.webgpu.indexOf('no adapter') !== -1;

        var fingerprint = categoryScore([
            check('Canvas fingerprint blocked or noised', canvasOk, 2.5),
            check('Audio fingerprint blocked or noised', audioOk, 2),
            check('GPU renderer masked', gpuMasked, 2),
            check('WebGL fingerprint surface reduced', webglFpMasked, 1),
            check('WebGPU adapter details hidden', webgpuMasked, 1),
            check('Media device enumeration blocked', mediaOk, 1.5),
            check('Font probing blocked', fontsBlocked, 2)
        ]);

        var chromium = TL.isChromiumFamily();
        var cpuMasked = d.sys && d.sys.cpu === 'Not exposed' && chromium;
        var ramMasked = d.sys && d.sys.ram && d.sys.ram.indexOf('Not exposed') === 0 && chromium;
        var hintsHidden = d.sys && !d.sys.hints && chromium;
        var battShielded = d.battery && (
            d.battery.indexOf('fake') !== -1 ||
            d.battery.indexOf('spoof') !== -1 ||
            d.battery.indexOf('Spoofed') !== -1 ||
            d.battery.indexOf('Possibly spoofed') !== -1 ||
            d.battery.indexOf('Returning fake') !== -1 ||
            d.battery.indexOf('Rejected') !== -1 ||
            d.battery.indexOf('Not exposed') === 0
        );
        var timerRounded = d.sys && d.sys.timerRes && d.sys.timerRes.indexOf('rounded') !== -1;

        var hardware = categoryScore([
            check('CPU core count hidden', cpuMasked, 2),
            check('Device RAM hidden', ramMasked, 2),
            check('Client Hints not exposed', hintsHidden, 1.5),
            check('Battery API shielded', battShielded, 1.5),
            check('High-resolution timer clamped', timerRounded, 1),
            check('No Tor or automation signals raised', !d.sys || !d.sys.tor, 2)
        ]);

        var adBlocked = d.adblock && (d.adblock.indexOf('Yes') !== -1);
        var dntSupported = d.priv && d.priv.dnt && d.priv.dnt.indexOf('Not supported') === -1;
        var dnt = d.priv && d.priv.dnt === 'Sent';
        var gpc = d.priv && d.priv.gpc === 'Active';
        var cookiesOff = d.priv && d.priv.cookies === 'Rejected';
        var storageBlocked = d.priv && d.priv.storage === 'Blocked';
        var rtcBlocked = d.priv && d.priv.webrtc === 'Blocked';
        var geoBlocked = d.geoPermission === 'Blocked';
        var privacyChecks = [
            check('Ad and tracker requests blocked', adBlocked, 2.5),
            check('Global Privacy Control active', gpc, 1.5),
            check('Cookies rejected', cookiesOff, 1),
            check('Local storage blocked', storageBlocked, 1),
            check('WebRTC leak shield active', rtcBlocked, 1.5),
            check('Geolocation permission blocked', geoBlocked, 1),
            check('No fingerprintable extensions detected in the page', !d.extensions || d.extensions.length === 0, 1)
        ];
        if (dntSupported) privacyChecks.splice(1, 0, check('Do Not Track sent', dnt, 0.5));
        var privacy = categoryScore(privacyChecks);

        var categories = [
            { key: 'network',     label: 'Network',     icon: 'network',     data: network },
            { key: 'fingerprint', label: 'Fingerprint',  icon: 'fingerprint', data: fingerprint },
            { key: 'hardware',    label: 'Hardware',     icon: 'hardware',    data: hardware },
            { key: 'privacy',     label: 'Privacy',      icon: 'privacy',     data: privacy }
        ];

        var totalPts = network.pts + fingerprint.pts + hardware.pts + privacy.pts;
        var totalMax = network.max + fingerprint.max + hardware.max + privacy.max;
        var overallPct = totalMax > 0 ? (totalPts / totalMax) * 100 : 0;
        var overallScore = Math.round((overallPct / 100) * 10 * 10) / 10;
        var overallGrade = grade(overallPct);

        var verdictMap = {
            'A+': 'Excellent. You are close to invisible to standard trackers.',
            'A':  'Strong. Your browser is well hardened against fingerprinting.',
            'B':  'Moderate. Some signals are shielded, others are wide open.',
            'C':  'Weak. Trackers can build a fairly complete profile of you.',
            'D':  'Poor. Most fingerprinting signals are exposed as they are.',
            'F':  'Critical. Almost nothing is being hidden from trackers.'
        };

        return {
            score: overallScore,
            max: 10,
            grade: overallGrade,
            verdict: verdictMap[overallGrade],
            categories: categories
        };
    }

    function maxPossible() {
        var networkMax = 3 + 1 + 1;
        var fingerprintMax = 2.5 + 2 + 2 + 1 + 1 + 1.5 + 2;
        var hardwareMax = 2 + 2 + 1.5 + 1.5 + 1 + 2;

        var priv = TL.privacy.get();
        var dntSupported = priv && priv.dnt && priv.dnt.indexOf('Not supported') === -1;
        var privacyMax = 2.5 + 1.5 + 1 + 1 + 1.5 + 1 + 1 + (dntSupported ? 0.5 : 0);

        return networkMax + fingerprintMax + hardwareMax + privacyMax;
    }

    return { calculate: calculate, maxPossible: maxPossible };
})();

window.TL = TL;
