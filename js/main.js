// --- KÖZÖS SEGÉDFUNKCIÓK ---

function readFileAsText(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.onerror = () => reject(reader.error);
        reader.readAsText(file);
    });
}

function extractDataFromXml(xmlDoc) {
    const data = [], channelTimestamps = [];
    xmlDoc.querySelectorAll('CHANNEL').forEach(channel => {
        const dateStr = channel.getAttribute('date'), timeStr = channel.getAttribute('time');
        if (dateStr && timeStr) {
            const parsedDate = new Date(`${dateStr}T${timeStr}Z`);
            if (!isNaN(parsedDate)) channelTimestamps.push(parsedDate);
        }
        if (channel.querySelector('STATUS')?.getAttribute('locked') !== 'LOCKED') return;
        const channelName = channel.getAttribute('name');
        const frequency = parseFloat(channel.getAttribute('frequency'));
        const levelEl = channel.querySelector('MEASURES > LEVEL, MEASURES > POWER');
        const level = levelEl ? parseFloat(levelEl.getAttribute('value')) : null;
        let type = 'ANALOG', mer = null;
        if (channel.querySelector('DVB-C')) {
            type = 'DVBC';
            const merEl = channel.querySelector('MEASURES > MER');
            if (merEl) mer = parseFloat(merEl.getAttribute('value'));
        }
        if (channelName && !isNaN(level) && !isNaN(frequency)) {
            data.push({ channel: channelName, level, frequency, type, mer });
        }
    });
    return { channels: data, channelTimestamps };
}

function getStandardChannelName(freqMHz) {
    const channels = [
        { name: 'E2', start: 44.75, end: 51.75 }, { name: 'E3', start: 51.75, end: 58.75 },
        { name: 'E4', start: 58.75, end: 65.75 }, { name: 'S2', start: 108.75, end: 115.75 },
        { name: 'S3', start: 115.75, end: 122.75 }, { name: 'S4', start: 122.75, end: 129.75 },
        { name: 'S5', start: 129.75, end: 136.75 }, { name: 'S6', start: 136.75, end: 143.75 },
        { name: 'S7', start: 143.75, end: 150.75 }, { name: 'S8', start: 150.75, end: 157.75 },
        { name: 'S9', start: 157.75, end: 164.75 }, { name: 'S10', start: 164.75, end: 171.75 },
        { name: 'E5', start: 171.75, end: 178.75 }, { name: 'E6', start: 178.75, end: 185.75 },
        { name: 'E7', start: 185.75, end: 192.75 }, { name: 'E8', start: 192.75, end: 199.75 },
        { name: 'E9', start: 199.75, end: 206.75 }, { name: 'E10', start: 206.75, end: 213.75 },
        { name: 'E11', start: 213.75, end: 220.75 }, { name: 'E12', start: 220.75, end: 227.75 },
        { name: 'S11', start: 227.75, end: 234.75 }, { name: 'S12', start: 234.75, end: 241.75 },
        { name: 'S13', start: 241.75, end: 248.75 }, { name: 'S14', start: 248.75, end: 255.75 },
        { name: 'S15', start: 255.75, end: 262.75 }, { name: 'S16', start: 262.75, end: 269.75 },
        { name: 'S17', start: 269.75, end: 276.75 }, { name: 'S18', start: 276.75, end: 283.75 },
        { name: 'S19', start: 283.75, end: 290.75 }, { name: 'S20', start: 290.75, end: 297.75 },
        { name: 'S21', start: 298.75, end: 306.75 }, { name: 'S22', start: 306.75, end: 314.75 },
        { name: 'S23', start: 314.75, end: 322.75 }, { name: 'S24', start: 322.75, end: 330.75 },
        { name: 'S25', start: 330.75, end: 338.75 }, { name: 'S26', start: 338.75, end: 346.75 },
        { name: 'S27', start: 346.75, end: 354.75 }, { name: 'S28', start: 354.75, end: 362.75 },
        { name: 'S29', start: 362.75, end: 370.75 }, { name: 'S30', start: 370.75, end: 378.75 },
        { name: 'S31', start: 378.75, end: 386.75 }, { name: 'S32', start: 386.75, end: 394.75 },
        { name: 'S33', start: 394.75, end: 402.75 }, { name: 'S34', start: 402.75, end: 410.75 },
        { name: 'S35', start: 410.75, end: 418.75 }, { name: 'S36', start: 418.75, end: 426.75 },
        { name: 'S37', start: 426.75, end: 434.75 }, { name: 'S38', start: 434.75, end: 442.75 },
        { name: 'S39', start: 442.75, end: 450.75 }, { name: 'S40', start: 450.75, end: 458.75 },
        { name: 'S41', start: 458.75, end: 466.75 }, { name: 'E21', start: 466.75, end: 474.75 },
        { name: 'E22', start: 474.75, end: 482.75 }, { name: 'E23', start: 482.75, end: 490.75 },
        { name: 'E24', start: 490.75, end: 498.75 }, { name: 'E25', start: 498.75, end: 506.75 },
        { name: 'E26', start: 506.75, end: 514.75 }, { name: 'E27', start: 514.75, end: 522.75 },
        { name: 'E28', start: 522.75, end: 530.75 }, { name: 'E29', start: 530.75, end: 538.75 },
        { name: 'E30', start: 538.75, end: 546.75 }, { name: 'E31', start: 546.75, end: 554.75 },
        { name: 'E32', start: 554.75, end: 562.75 }, { name: 'E33', start: 562.75, end: 570.75 },
        { name: 'E34', start: 570.75, end: 578.75 }, { name: 'E35', start: 578.75, end: 586.75 },
        { name: 'E36', start: 586.75, end: 594.75 }, { name: 'E37', start: 594.75, end: 602.75 },
        { name: 'E38', start: 602.75, end: 610.75 }, { name: 'E39', start: 610.75, end: 618.75 },
        { name: 'E40', start: 618.75, end: 626.75 }, { name: 'E41', start: 626.75, end: 634.75 },
        { name: 'E42', start: 634.75, end: 642.75 }, { name: 'E43', start: 642.75, end: 650.75 },
        { name: 'E44', start: 650.75, end: 658.75 }, { name: 'E45', start: 658.75, end: 666.75 },
        { name: 'E46', start: 666.75, end: 674.75 }, { name: 'E47', start: 674.75, end: 682.75 },
        { name: 'E48', start: 682.75, end: 690.75 }, { name: 'E49', start: 690.75, end: 698.75 },
        { name: 'E50', start: 698.75, end: 706.75 }, { name: 'E51', start: 706.75, end: 714.75 },
        { name: 'E52', start: 714.75, end: 722.75 }, { name: 'E53', start: 722.75, end: 730.75 },
        { name: 'E54', start: 730.75, end: 738.75 }, { name: 'E55', start: 738.75, end: 746.75 },
        { name: 'E56', start: 746.75, end: 754.75 }, { name: 'E57', start: 754.75, end: 762.75 },
        { name: 'E58', start: 762.75, end: 770.75 }, { name: 'E59', start: 770.75, end: 778.75 },
        { name: 'E60', start: 778.75, end: 786.75 }, { name: 'E61', start: 786.75, end: 794.75 },
        { name: 'E62', start: 794.75, end: 802.75 }, { name: 'E63', start: 802.75, end: 810.75 },
        { name: 'E64', start: 810.75, end: 818.75 }, { name: 'E65', start: 818.75, end: 826.75 },
        { name: 'E66', start: 826.75, end: 834.75 }, { name: 'E67', start: 834.75, end: 842.75 },
        { name: 'E68', start: 842.75, end: 850.75 }, { name: 'E69', start: 850.75, end: 858.75 }
    ];
    return channels.find(ch => freqMHz >= ch.start && freqMHz < ch.end);
}

function formatDateTime(date) {
    if (!date) return 'N/A';
    return date.toLocaleString('hu-HU', {
        year: 'numeric', month: '2-digit', day: '2-digit',
        hour: '2-digit', minute: '2-digit', second: '2-digit'
    });
}

function replaceHungarianChars(str) {
    if (typeof str !== 'string') return str;
    return str.replace(/ő/g, 'ö').replace(/ű/g, 'ü').replace(/Ő/g, 'Ö').replace(/Ű/g, 'Ü');
}

function processChannelData(allData, fileCount = 0, removeOutliers = false) {
    const channelStats = {};
    allData.forEach(({ channel, level, frequency, type, mer }) => {
        if (!channelStats[channel]) {
            channelStats[channel] = { levels: [], mers: [], frequency: frequency, type: type };
        }
        channelStats[channel].levels.push(level);
        if (type === 'DVBC' && mer !== null && !isNaN(mer)) {
            channelStats[channel].mers.push(mer);
        }
    });

    let processedChannels = Object.keys(channelStats).map(channelName => {
        const stats = channelStats[channelName];
        let levelsToProcess = [...stats.levels];
        const originalCount = levelsToProcess.length;

        if (fileCount >= 7 && levelsToProcess.length > 4) {
            levelsToProcess.sort((a, b) => a - b).splice(0, 2);
            levelsToProcess.splice(-2, 2);
        } else if (fileCount >= 4 && levelsToProcess.length > 2) {
            levelsToProcess.sort((a, b) => a - b).shift();
            levelsToProcess.pop();
        }

        const usedCount = levelsToProcess.length;
        const sourceLevels = usedCount > 0 ? levelsToProcess : stats.levels;
        const sumLevel = sourceLevels.reduce((a, b) => a + b, 0);
        const avgLevel = sourceLevels.length > 0 ? sumLevel / sourceLevels.length : 0;
        const minLevel = sourceLevels.length > 0 ? Math.min(...sourceLevels) : 0;
        const maxLevel = sourceLevels.length > 0 ? Math.max(...sourceLevels) : 0;

        const sumMer = stats.mers.reduce((a, b) => a + b, 0);
        const avgMer = stats.mers.length > 0 ? parseFloat((sumMer / stats.mers.length).toFixed(2)) : null;
        const displayFrequency = stats.type === 'ANALOG' ? (stats.frequency - (stats.frequency < 298 ? 7 : 8) / 2 + 1.25) : stats.frequency;
        const standardChannelName = getStandardChannelName(displayFrequency)?.name || 'N/A';

        return {
            name: channelName,
            avgLevel: parseFloat(avgLevel.toFixed(2)),
            minLevel: minLevel,
            maxLevel: maxLevel,
            levelDifference: parseFloat((maxLevel - minLevel).toFixed(2)),
            count: originalCount,
            measurementsDisplay: `${usedCount}/${originalCount}`,
            frequency: stats.frequency,
            displayFrequency: displayFrequency,
            standardChannelName: standardChannelName,
            type: stats.type,
            avgMer: avgMer
        };
    });

    if (removeOutliers && processedChannels.length > 0) {
        const originalAvgSum = processedChannels.reduce((sum, ch) => sum + ch.avgLevel, 0);
        const originalOverallAvg = originalAvgSum / processedChannels.length;
        processedChannels = processedChannels.filter(ch => Math.abs(ch.avgLevel - originalOverallAvg) < 30);
    }
    
    processedChannels.sort((a, b) => a.frequency - b.frequency);

    const analogChannels = processedChannels.filter(ch => ch.type === 'ANALOG');
    const digitalChannels = processedChannels.filter(ch => ch.type === 'DVBC');

    const analogAvg = analogChannels.length > 0 ? analogChannels.reduce((sum, ch) => sum + ch.avgLevel, 0) / analogChannels.length : 0;
    const digitalAvg = digitalChannels.length > 0 ? digitalChannels.reduce((sum, ch) => sum + ch.avgLevel, 0) / digitalChannels.length : 0;
    
    const finalAvgSum = processedChannels.reduce((sum, ch) => sum + ch.avgLevel, 0);
    const finalOverallAvg = finalAvgSum / processedChannels.length;
    processedChannels.forEach(ch => ch.deviationFromTotalAvg = ch.avgLevel - finalOverallAvg);


    return {
        processedChannels,
        averages: {
            analog: analogAvg,
            digital: digitalAvg
        }
    };
}

// --- ROUTER ---
const routes = {
    '/': { templateId: 'page-main', init: () => initMainPage() },
    '/compare': { templateId: 'page-compare', init: () => initComparePage() },
    '/help': { templateId: 'page-help', init: null },
};

const router = async () => {
    // A hash-ból nyerjük ki az útvonalat, eltávolítva a # karaktert.
    const path = window.location.hash.substring(1) || '/';
    const view = routes[path] || routes['/']; // Alapértelmezett útvonal

    const template = document.getElementById(view.templateId);
    const routerOutlet = document.getElementById('router-outlet');

    if (template && routerOutlet) {
        routerOutlet.innerHTML = ''; // Töröljük a régi tartalmat
        const clone = template.content.cloneNode(true);
        routerOutlet.appendChild(clone);

        // Aktív link stílusának beállítása
        document.querySelectorAll('.nav-link').forEach(link => {
            if (link.getAttribute('data-path') === path) {
                link.classList.add('text-gray-900', 'bg-gray-100');
                link.classList.remove('text-gray-500');
            } else {
                link.classList.add('text-gray-500');
                link.classList.remove('text-gray-900', 'bg-gray-100');
            }
        });

        // Oldal-specifikus JS inicializálása
        if (view.init) {
            view.init();
        }
    } else {
        console.error(`Template or router outlet not found for path: ${path}`);
    }
};

// Figyeljük a hash változását (pl. linkre kattintás, előre/vissza gombok)
window.addEventListener('hashchange', router);

// Az oldal betöltődésekor is futtassuk le a routert
document.addEventListener('DOMContentLoaded', () => {
    // Ha nincs hash, állítsuk be a gyökeret, hogy elinduljon a router
    if (!window.location.hash) {
        window.location.hash = '#/';
    } else {
        router();
    }
});