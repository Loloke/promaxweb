// --- VÁLTOZÓK ---
const fileUploadBefore = document.getElementById('file-upload-before');
const fileInfoBefore = document.getElementById('file-info-before');
const fileUploadAfter = document.getElementById('file-upload-after');
const fileInfoAfter = document.getElementById('file-info-after');
const processButton = document.getElementById('process-button');
const resultsContainer = document.getElementById('results-container');
const loader = document.getElementById('loader');
const resultsTable = document.getElementById('resultsTable');
const savePdfButton = document.getElementById('save-pdf-button');
const meresiHelyInput = document.getElementById('meresi-hely');
const megjegyzesInput = document.getElementById('megjegyzes');
const toggleTiltCheckbox = document.getElementById('toggle-tilt-checkbox');
let chartInstance = null;
let processedDataForPdf = [];
let comparisonDataForChart = [];

// --- ESEMÉNYKEZELŐK ---

fileUploadBefore.addEventListener('change', (event) => {
    const fileCount = event.target.files.length;
    fileInfoBefore.textContent = `${fileCount} fájl kiválasztva.`;
});

fileUploadAfter.addEventListener('change', (event) => {
    const fileCount = event.target.files.length;
    fileInfoAfter.textContent = `${fileCount} fájl kiválasztva.`;
});

processButton.addEventListener('click', async () => {
    const filesBefore = fileUploadBefore.files;
    const filesAfter = fileUploadAfter.files;

    if (filesBefore.length === 0 || filesAfter.length === 0) {
        alert('Kérjük, válasszon ki fájlokat mindkét kategóriában ("előtte" és "utána").');
        return;
    }

    resultsContainer.classList.add('hidden');
    loader.classList.remove('hidden');

    await processAndCompare(filesBefore, filesAfter);
});

toggleTiltCheckbox.addEventListener('change', () => {
    if (comparisonDataForChart.length > 0) {
        renderChart(comparisonDataForChart);
    }
});

// PDF generálás
savePdfButton.addEventListener('click', async () => {
    const { jsPDF } = window.jspdf;
    const graphSection = document.getElementById('graph-section');
    const button = document.getElementById('save-pdf-button');

    const meresiHelyRaw = meresiHelyInput.value.trim();
    const megjegyzesRaw = megjegyzesInput.value.trim();

    if (!meresiHelyRaw || !megjegyzesRaw) {
        alert("A 'Mérési hely' és a 'Megjegyzés' mezők kitöltése kötelező!");
        return;
    }

    if (processedDataForPdf.length === 0) {
        alert("Nincsenek adatok a PDF generálásához.");
        return;
    }

    button.disabled = true;

    try {
        const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
        const pdfWidth = pdf.internal.pageSize.getWidth();
        const margin = 10;
        const contentWidth = pdfWidth - margin * 2;
        let lastY = margin;

        const meresiHely = replaceHungarianChars(meresiHelyRaw);
        const megjegyzes = replaceHungarianChars(megjegyzesRaw);

        pdf.setFont('helvetica', 'bold');
        pdf.setFontSize(18);
        pdf.text(meresiHely, pdf.internal.pageSize.getWidth() / 2, lastY, { align: 'center' });
        lastY += 8;

        pdf.setFont('helvetica', 'normal');
        pdf.setFontSize(12);
        pdf.text(megjegyzes, pdf.internal.pageSize.getWidth() / 2, lastY, { align: 'center' });
        lastY += 10;

        const graphCanvas = await html2canvas(graphSection, { scale: 4, logging: false, useCORS: true });
        const graphImgData = graphCanvas.toDataURL('image/jpeg', 0.90);
        const graphRatio = graphCanvas.height / graphCanvas.width;
        const graphImgHeight = contentWidth * graphRatio;

        pdf.addImage(graphImgData, 'JPEG', margin, lastY, contentWidth, graphImgHeight, 'chart', 'SLOW');
        lastY += graphImgHeight + 10;

        let head = [['Csatorna', 'CH', 'Frekvencia (MHz)', 'Jelszint Előtte (dBuV)', 'Jelszint Utána (dBuV)', 'MER Előtte (dB)', 'MER Utána (dB)']];

        const body = processedDataForPdf.map(ch => {
            return [
                replaceHungarianChars(ch.name),
                replaceHungarianChars(ch.standardChannelName),
                ch.displayFrequency.toFixed(2),
                ch.avgLevelBefore !== null ? ch.avgLevelBefore.toFixed(2) : 'N/A',
                ch.avgLevelAfter !== null ? ch.avgLevelAfter.toFixed(2) : 'N/A',
                ch.avgMerBefore !== null ? ch.avgMerBefore.toFixed(2) : 'N/A',
                ch.avgMerAfter !== null ? ch.avgMerAfter.toFixed(2) : 'N/A'
            ];
        });

        pdf.autoTable({
            head: head.map(row => row.map(cell => replaceHungarianChars(cell))),
            body: body,
            startY: lastY,
            theme: 'grid',
            styles: { font: 'helvetica', fontStyle: 'normal', fontSize: 8 },
            headStyles: { font: 'helvetica', fontStyle: 'bold', fillColor: [22, 160, 133] },
            margin: { top: margin, right: margin, bottom: margin, left: margin },
            didDrawPage: (data) => {
                const pageCount = pdf.internal.getNumberOfPages();
                pdf.setFont('helvetica', 'normal');
                pdf.setFontSize(10);
                pdf.text(replaceHungarianChars(`Oldal ${data.pageNumber} / ${pageCount}`), data.settings.margin.left, pdf.internal.pageSize.height - 10);
            }
        });

        const today = new Date().toISOString().slice(0, 10);
        pdf.save(`meresi_jegyzek_osszehasonlitas_${today}.pdf`);

    } catch (error) {
        console.error("PDF generálási hiba:", error);
        alert("Hiba történt a PDF generálása során: " + error.message);
    } finally {
        button.disabled = false;
    }
});


// --- FŐ FUNKCIÓK ---

async function processAndCompare(filesBefore, filesAfter) {
    try {
        const dataBefore = await processFiles(filesBefore);
        const dataAfter = await processFiles(filesAfter);

        const comparisonData = generateComparisonData(dataBefore, dataAfter);
        processedDataForPdf = comparisonData.comparisonResult;
        comparisonDataForChart = comparisonData.comparisonResult;

        renderChart(comparisonData.comparisonResult);
        renderTable(comparisonData);
        resultsContainer.classList.remove('hidden');
    } catch (error) {
        console.error("Hiba a fájlok feldolgozása során:", error);
        alert("Hiba történt a fájlok feldolgozása közben. Kérjük, ellenőrizze a fájlokat.");
    } finally {
        loader.classList.add('hidden');
    }
}

async function processFiles(files) {
    const rawChannelData = [];
    const sortedFiles = Array.from(files).sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: 'base' }));
    const fileReadPromises = sortedFiles.map(file => readFileAsText(file));
    const fileContents = await Promise.all(fileReadPromises);
    const parser = new DOMParser();

    for (const content of fileContents) {
        const xmlDoc = parser.parseFromString(content, "text/xml");
        const { channels } = extractDataFromXml(xmlDoc);
        rawChannelData.push(...channels);
    }
    return processChannelData(rawChannelData);
}

function generateComparisonData(dataBefore, dataAfter) {
    const comparison = {};

    dataBefore.processedChannels.forEach(ch => {
        comparison[ch.name] = {
            ...ch,
            avgLevelBefore: ch.avgLevel,
            minLevelBefore: ch.minLevel,
            maxLevelBefore: ch.maxLevel,
            avgMerBefore: ch.avgMer,
            avgLevelAfter: null,
            minLevelAfter: null,
            maxLevelAfter: null,
            avgMerAfter: null,
        };
    });

    dataAfter.processedChannels.forEach(ch => {
        if (comparison[ch.name]) {
            comparison[ch.name].avgLevelAfter = ch.avgLevel;
            comparison[ch.name].minLevelAfter = ch.minLevel;
            comparison[ch.name].maxLevelAfter = ch.maxLevel;
            comparison[ch.name].avgMerAfter = ch.avgMer;
        } else {
            comparison[ch.name] = {
                ...ch,
                avgLevelBefore: null,
                minLevelBefore: null,
                maxLevelBefore: null,
                avgMerBefore: null,
                avgLevelAfter: ch.avgLevel,
                minLevelAfter: ch.minLevel,
                maxLevelAfter: ch.maxLevel,
                avgMerAfter: ch.avgMer,
            };
        }
    });

    const result = Object.values(comparison).map(ch => {
        const diff = (ch.avgLevelAfter !== null && ch.avgLevelBefore !== null)
            ? ch.avgLevelAfter - ch.avgLevelBefore
            : null;
        return { ...ch, levelDifference: diff };
    });

    result.sort((a, b) => a.frequency - b.frequency);
    return {
        comparisonResult: result,
        averagesBefore: dataBefore.averages,
        averagesAfter: dataAfter.averages
    };
}

// --- VIZUALIZÁCIÓS FUNKCIÓK ---

const errorBarPlugin = {
    id: 'errorBarPlugin',
    afterDraw(chart) {
        const { ctx, scales: { x, y } } = chart;
        ctx.save();
        ctx.lineWidth = 1.5;

        chart.data.datasets.forEach((dataset, i) => {
            if (dataset.type === 'line') return;

            const meta = chart.getDatasetMeta(i);
            if (meta.hidden) return;

            const customData = dataset.customData;
            if (!customData) return;

            ctx.strokeStyle = 'rgba(220, 38, 38, 0.7)';

            for (let j = 0; j < meta.data.length; j++) {
                const bar = meta.data[j];
                const dataPoint = customData[j];
                const xPos = bar.x;
                
                let yMin, yMax;
                if (i === 0) { // "Előtte" dataset
                    yMin = y.getPixelForValue(dataPoint.minLevelBefore);
                    yMax = y.getPixelForValue(dataPoint.maxLevelBefore);
                } else { // "Utána" dataset
                    yMin = y.getPixelForValue(dataPoint.minLevelAfter);
                    yMax = y.getPixelForValue(dataPoint.maxLevelAfter);
                }

                const whiskerWidth = bar.width * 0.3;
                ctx.beginPath();
                ctx.moveTo(xPos, yMin);
                ctx.lineTo(xPos, yMax);
                ctx.stroke();
                ctx.beginPath();
                ctx.moveTo(xPos - whiskerWidth / 2, yMax);
                ctx.lineTo(xPos + whiskerWidth / 2, yMax);
                ctx.stroke();
                ctx.beginPath();
                ctx.moveTo(xPos - whiskerWidth / 2, yMin);
                ctx.lineTo(xPos + whiskerWidth / 2, yMin);
                ctx.stroke();
            }
        });
        ctx.restore();
    }
};

function renderChart(comparisonData) {
    const ctx = document.getElementById('signalChart').getContext('2d');
    if (chartInstance) chartInstance.destroy();

    const labels = comparisonData.map(ch => ch.name);
    const beforeData = comparisonData.map(ch => ch.avgLevelBefore);
    const afterData = comparisonData.map(ch => ch.avgLevelAfter);

    const analogColorBefore = 'rgba(54, 162, 235, 0.5)';
    const analogColorAfter = 'rgba(54, 162, 235, 1)';
    const digitalColorBefore = 'rgba(75, 192, 192, 0.5)';
    const digitalColorAfter = 'rgba(75, 192, 192, 1)';

    const datasets = [
        {
            label: 'Jelszint Előtte (dBuV)',
            data: beforeData,
            customData: comparisonData,
            backgroundColor: comparisonData.map(ch => ch.type === 'ANALOG' ? analogColorBefore : digitalColorBefore),
            borderColor: comparisonData.map(ch => ch.type === 'ANALOG' ? analogColorAfter : digitalColorAfter),
            borderWidth: 1,
            order: 2
        },
        {
            label: 'Jelszint Utána (dBuV)',
            data: afterData,
            customData: comparisonData,
            backgroundColor: comparisonData.map(ch => ch.type === 'ANALOG' ? analogColorAfter : digitalColorAfter),
            borderColor: comparisonData.map(ch => ch.type === 'ANALOG' ? analogColorAfter : digitalColorAfter),
            borderWidth: 1,
            order: 2
        }
    ];

    if (toggleTiltCheckbox.checked && comparisonData.length > 1) {
        const firstLevelBefore = beforeData.find(d => d !== null);
        const lastLevelBefore = [...beforeData].reverse().find(d => d !== null);
        const tiltBefore = lastLevelBefore - firstLevelBefore;
        const lineDataBefore = new Array(comparisonData.length).fill(null);
        lineDataBefore[0] = firstLevelBefore;
        lineDataBefore[lineDataBefore.length - 1] = lastLevelBefore;

        datasets.push({
            type: 'line',
            label: `Tilt Előtte: ${tiltBefore.toFixed(1)} dBuV`,
            data: lineDataBefore,
            borderColor: 'rgba(255, 99, 132, 1)',
            borderWidth: 2.5,
            fill: false,
            tension: 0,
            pointRadius: 5,
            pointBackgroundColor: 'rgba(255, 99, 132, 1)',
            spanGaps: true,
            order: 1
        });

        const firstLevelAfter = afterData.find(d => d !== null);
        const lastLevelAfter = [...afterData].reverse().find(d => d !== null);
        const tiltAfter = lastLevelAfter - firstLevelAfter;
        const lineDataAfter = new Array(comparisonData.length).fill(null);
        lineDataAfter[0] = firstLevelAfter;
        lineDataAfter[lineDataAfter.length - 1] = lastLevelAfter;

        datasets.push({
            type: 'line',
            label: `Tilt Utána: ${tiltAfter.toFixed(1)} dBuV`,
            data: lineDataAfter,
            borderColor: 'rgba(54, 162, 235, 1)',
            borderWidth: 2.5,
            fill: false,
            tension: 0,
            pointRadius: 5,
            pointBackgroundColor: 'rgba(54, 162, 235, 1)',
            spanGaps: true,
            order: 1
        });
    }

    chartInstance = new Chart(ctx, {
        type: 'bar',
        plugins: [errorBarPlugin],
        data: {
            labels: labels,
            datasets: datasets
        },
        options: {
            responsive: true,
            maintainAspectRatio: true,
            scales: {
                y: {
                    title: {
                        display: true,
                        text: 'Jelszint (dBuV)'
                    },
                    beginAtZero: false,
                    grace: '10%'
                },
                x: {
                    title: {
                        display: true,
                        text: 'Csatorna (Frekvencia szerint rendezve)'
                    },
                    ticks: {
                        autoSkip: false
                    }
                }
            },
            plugins: {
                legend: {
                    display: true,
                    position: 'top',
                },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            const channelData = comparisonData[context.dataIndex];
                            const datasetLabel = context.dataset.label || '';
                            if (datasetLabel.startsWith('Tilt')) return datasetLabel;

                            const value = context.parsed.y;
                            let label = `${datasetLabel}: ${value.toFixed(2)} dBuV`;
                            if (datasetLabel.includes('Előtte')) {
                                if (channelData.avgMerBefore !== null) {
                                    label += ` (MER: ${channelData.avgMerBefore} dB)`;
                                }
                            } else if (datasetLabel.includes('Utána')) {
                                if (channelData.avgMerAfter !== null) {
                                    label += ` (MER: ${channelData.avgMerAfter} dB)`;
                                }
                            }
                            return label;
                        }
                    }
                }
            }
        }
    });
}

function renderTable(comparisonData) {
    const { comparisonResult, averagesBefore, averagesAfter } = comparisonData;

    let summaryHTML = `
        <div class="mb-4 text-center grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
                <h3 class="text-lg font-semibold text-gray-800">Átlagok "Előtte"</h3>
                <p>Analóg: <span class="font-bold text-blue-600">${averagesBefore.analog.toFixed(1)} dBuV</span></p>
                <p>Digitális: <span class="font-bold text-green-600">${averagesBefore.digital.toFixed(1)} dBuV</span></p>
            </div>
            <div>
                <h3 class="text-lg font-semibold text-gray-800">Átlagok "Utána"</h3>
                <p>Analóg: <span class="font-bold text-blue-600">${averagesAfter.analog.toFixed(1)} dBuV</span></p>
                <p>Digitális: <span class="font-bold text-green-600">${averagesAfter.digital.toFixed(1)} dBuV</span></p>
            </div>
        </div>
    `;

    let tableHTML = `
        ${summaryHTML}
        <table class="min-w-full divide-y divide-gray-200 bg-white shadow-md rounded-lg">
            <thead class="bg-gray-50">
                <tr>
                    <th scope="col" class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Csatorna</th>
                    <th scope="col" class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">CH</th>
                    <th scope="col" class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Frekvencia (MHz)</th>
                    <th scope="col" class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Jelszint Előtte (dBuV)</th>
                    <th scope="col" class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Jelszint Utána (dBuV)</th>
                    <th scope="col" class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">MER Előtte (dB)</th>
                    <th scope="col" class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">MER Utána (dB)</th>
                </tr>
            </thead>
            <tbody class="bg-white divide-y divide-gray-200">
    `;

    comparisonResult.forEach(ch => {
        tableHTML += `
            <tr>
                <td class="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">${ch.name}</td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-700">${ch.standardChannelName}</td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-700">${ch.displayFrequency.toFixed(2)}</td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-700">${ch.avgLevelBefore !== null ? ch.avgLevelBefore.toFixed(2) : 'N/A'}</td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-700">${ch.avgLevelAfter !== null ? ch.avgLevelAfter.toFixed(2) : 'N/A'}</td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-700">${ch.avgMerBefore !== null ? ch.avgMerBefore.toFixed(2) : 'N/A'}</td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-700">${ch.avgMerAfter !== null ? ch.avgMerAfter.toFixed(2) : 'N/A'}</td>
            </tr>
        `;
    });

    tableHTML += `</tbody></table>`;
    resultsTable.innerHTML = tableHTML;
}

// --- SEGÉDFUNKCIÓK ---
function readFileAsText(file) { return new Promise((resolve, reject) => { const reader = new FileReader(); reader.onload = () => resolve(reader.result); reader.onerror = () => reject(reader.error); reader.readAsText(file); }); }
function extractDataFromXml(xmlDoc) { const data = [], channelTimestamps = []; xmlDoc.querySelectorAll('CHANNEL').forEach(channel => { const dateStr = channel.getAttribute('date'), timeStr = channel.getAttribute('time'); if (dateStr && timeStr) { const parsedDate = new Date(`${dateStr}T${timeStr}Z`); if (!isNaN(parsedDate)) channelTimestamps.push(parsedDate); } if (channel.querySelector('STATUS')?.getAttribute('locked') !== 'LOCKED') return; const channelName = channel.getAttribute('name'); const frequency = parseFloat(channel.getAttribute('frequency')); const levelEl = channel.querySelector('MEASURES > LEVEL, MEASURES > POWER'); const level = levelEl ? parseFloat(levelEl.getAttribute('value')) : null; let type = 'ANALOG', mer = null; if (channel.querySelector('DVB-C')) { type = 'DVBC'; const merEl = channel.querySelector('MEASURES > MER'); if (merEl) mer = parseFloat(merEl.getAttribute('value')); } if (channelName && !isNaN(level) && !isNaN(frequency)) { data.push({ channel: channelName, level, frequency, type, mer }); } }); return { channels: data, channelTimestamps }; }
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
function formatDateTime(date) { if (!date) return 'N/A'; return date.toLocaleString('hu-HU', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit' }); }
function replaceHungarianChars(str) { if (typeof str !== 'string') return str; return str.replace(/ő/g, 'ö').replace(/ű/g, 'ü').replace(/Ő/g, 'Ö').replace(/Ű/g, 'Ü'); }