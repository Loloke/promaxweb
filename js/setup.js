// --- VÁLTOZÓK ---
const fileUpload = document.getElementById('file-upload');
const fileInfo = document.getElementById('file-info');
const resultsContainer = document.getElementById('results-container');
const loader = document.getElementById('loader');
const resultsTable = document.getElementById('resultsTable');

const toggleTiltCheckbox = document.getElementById('toggle-tilt-checkbox');
const toggleMinMaxCheckbox = document.getElementById('toggle-minmax-checkbox');
const toggleOutliersCheckbox = document.getElementById('toggle-outliers-checkbox');
const toggleStandardScaleCheckbox = document.getElementById('toggle-standard-scale-checkbox');
const scaleMinInput = document.getElementById('scale-min-input');
const toggleNarrowScaleCheckbox = document.getElementById('toggle-narrow-scale-checkbox');
const narrowScaleContainer = document.getElementById('narrow-scale-container');
const toggleDigitalCompensationCheckbox = document.getElementById('toggle-digital-compensation-checkbox');
const targetLevelInput = document.getElementById('target-level-input');
let chartInstance = null;
let firstMeasurementTime = null;
let lastMeasurementTime = null;
let totalFileCount = 0;
let rawChannelData = []; // Nyers, beolvasott adatok tárolására

// --- ESEMÉNYKEZELŐK ---

// Fájl feltöltés
fileUpload.addEventListener('change', async (event) => {
    const files = event.target.files;
    totalFileCount = files.length;
    if (totalFileCount > 0) {
        fileInfo.textContent = `${totalFileCount} fájl kiválasztva. Feldolgozás...`;
        resultsContainer.classList.add('hidden');
        loader.classList.remove('hidden');
        toggleTiltCheckbox.checked = false;
        toggleMinMaxCheckbox.checked = false;
        toggleOutliersCheckbox.checked = false;
        toggleStandardScaleCheckbox.checked = false;
        scaleMinInput.disabled = true;
        toggleNarrowScaleCheckbox.checked = false;
        narrowScaleContainer.classList.add('hidden');
        toggleDigitalCompensationCheckbox.checked = false;
        await processFiles(files);
    } else {
        fileInfo.textContent = 'Nincsenek fájlok kiválasztva.';
    }
});

// Checkbox-ok változása
toggleTiltCheckbox.addEventListener('change', () => { if (rawChannelData.length > 0) analyzeAndRender(); });
toggleMinMaxCheckbox.addEventListener('change', () => { if (rawChannelData.length > 0) analyzeAndRender(); });
toggleOutliersCheckbox.addEventListener('change', () => { if (rawChannelData.length > 0) analyzeAndRender(); });
scaleMinInput.addEventListener('input', () => { if (rawChannelData.length > 0 && toggleStandardScaleCheckbox.checked) analyzeAndRender(); });
toggleNarrowScaleCheckbox.addEventListener('change', () => { if (rawChannelData.length > 0) analyzeAndRender(); });
toggleDigitalCompensationCheckbox.addEventListener('change', () => { if (rawChannelData.length > 0) analyzeAndRender(); });
targetLevelInput.addEventListener('input', () => { if (rawChannelData.length > 0) analyzeAndRender(); });

toggleStandardScaleCheckbox.addEventListener('change', () => {
    scaleMinInput.disabled = !toggleStandardScaleCheckbox.checked;
    if (toggleStandardScaleCheckbox.checked) {
        narrowScaleContainer.classList.remove('hidden');
    } else {
        narrowScaleContainer.classList.add('hidden');
        toggleNarrowScaleCheckbox.checked = false;
    }
    if (rawChannelData.length > 0) analyzeAndRender();
});



// --- FŐ FUNKCIÓK ---

async function processFiles(files) {
    rawChannelData = [];
    const sortedFiles = Array.from(files).sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: 'base' }));
    const fileReadPromises = sortedFiles.map(file => readFileAsText(file));

    try {
        const fileContents = await Promise.all(fileReadPromises);
        const parser = new DOMParser();

        for (let i = 0; i < fileContents.length; i++) {
            const content = fileContents[i];
            const xmlDoc = parser.parseFromString(content, "text/xml");
            const { channels, channelTimestamps } = extractDataFromXml(xmlDoc);
            rawChannelData.push(...channels);
            if (channelTimestamps.length > 0) {
                if (i === 0) firstMeasurementTime = channelTimestamps[0];
                if (i === fileContents.length - 1) lastMeasurementTime = channelTimestamps[channelTimestamps.length - 1];
            }
        }
        analyzeAndRender();
    } catch (error) {
        console.error("Hiba a fájlok feldolgozása során:", error);
        fileInfo.textContent = "Hiba történt a fájlok feldolgozása közben. Kérjük, ellenőrizze a fájlokat.";
    } finally {
        loader.classList.add('hidden');
    }
}

function analyzeAndRender() {
    const { processedChannels, averages } = processChannelData(rawChannelData, totalFileCount, toggleOutliersCheckbox.checked);
    const targetLevel = parseFloat(targetLevelInput.value);

    const channelsWithCompensation = processedChannels.map(ch => ({
        ...ch,
        compensation: targetLevel - ch.avgLevel
    }));

    renderChart(channelsWithCompensation);
    renderTable(channelsWithCompensation, totalFileCount, averages.analog, averages.digital);
    resultsContainer.classList.remove('hidden');
}

// --- VIZUALIZÁCIÓS FUNKCIÓK ---

function renderChart(processedData) {
    const ctx = document.getElementById('signalChart').getContext('2d');
    const tiltLegendContainer = document.getElementById('tilt-legend-container');
    const tiltLegendElement = document.getElementById('tilt-legend');
    const showTilt = toggleTiltCheckbox.checked;
    const showMinMax = toggleMinMaxCheckbox.checked;
    const showStandardScale = toggleStandardScaleCheckbox.checked;
    const isNarrowScale = toggleNarrowScaleCheckbox.checked;
    const scaleMin = parseFloat(scaleMinInput.value);
    const compensateDigital = toggleDigitalCompensationCheckbox.checked;

    if (chartInstance) chartInstance.destroy();
    
    const analogColor = 'rgba(79, 70, 229, 0.8)';
    const dvbcColor = 'rgba(34, 197, 94, 0.8)';
    
    const chartData = processedData.map(ch => {
        if (compensateDigital && ch.type === 'DVBC') {
            return {
                ...ch,
                avgLevel: ch.avgLevel + 3,
                minLevel: ch.minLevel + 3,
                maxLevel: ch.maxLevel + 3,
            };
        }
        return ch;
    });

    const datasets = [{ label: 'Átlagos jelszint (dBuV)', data: chartData.map(ch => ch.avgLevel), customData: chartData, backgroundColor: processedData.map(ch => ch.type === 'DVBC' ? dvbcColor : analogColor), borderColor: processedData.map(ch => ch.type === 'DVBC' ? 'rgb(22, 163, 74)' : 'rgb(67, 56, 202)'), borderWidth: 1, order: 2 }];

    if (showTilt && processedData.length > 1) {
        const firstLevel = chartData[0].avgLevel;
        const lastLevel = chartData[chartData.length - 1].avgLevel;
        const tilt = lastLevel - firstLevel;
        const lineData = new Array(chartData.length).fill(null);
        lineData[0] = firstLevel;
        lineData[lineData.length - 1] = lastLevel;
        tiltLegendContainer.style.display = 'flex';
        tiltLegendElement.textContent = `Tilt: ${tilt.toFixed(1)} dBuV`; 
        datasets.push({ type: 'line', label: 'Összekötő egyenes', data: lineData, borderColor: 'rgba(220, 38, 38, 0.9)', borderWidth: 2.5, fill: false, tension: 0, pointRadius: 5, pointBackgroundColor: 'rgba(220, 38, 38, 1)', spanGaps: true, order: 1 });
    } else {
         tiltLegendContainer.style.display = 'none';
    }

    if (showMinMax && chartData.length > 1) {
        const avgLevels = chartData.map(ch => ch.avgLevel);
        const minAvgLevel = Math.min(...avgLevels);
        const maxAvgLevel = Math.max(...avgLevels);

        datasets.push({
            type: 'line',
            label: 'Min Átlag',
            data: new Array(chartData.length).fill(minAvgLevel),
            borderColor: 'rgba(0, 0, 0, 1)',
            borderWidth: 2,
            fill: false,
            pointRadius: 0,
            borderDash: [5, 5],
            order: 0
        });

        datasets.push({
            type: 'line',
            label: 'Max Átlag',
            data: new Array(chartData.length).fill(maxAvgLevel),
            borderColor: 'rgba(0, 0, 0, 1)',
            borderWidth: 2,
            fill: false,
            pointRadius: 0,
            borderDash: [5, 5],
            order: 0
        });
        
        const minMaxLegendContainer = document.getElementById('minmax-legend-container');
        minMaxLegendContainer.style.display = 'flex';
        document.getElementById('min-legend').textContent = `Min: ${minAvgLevel.toFixed(1)} dBuV`;
        document.getElementById('max-legend').textContent = `Max: ${maxAvgLevel.toFixed(1)} dBuV`;
    } else {
        const minMaxLegendContainer = document.getElementById('minmax-legend-container');
        if (minMaxLegendContainer) {
            minMaxLegendContainer.style.display = 'none';
        }
    }
    
    const y_scale_options = { 
        title: { 
            display: true, 
            text: 'Jelszint (dBuV)', 
            font: { size: 14 } 
        } 
    };

    if (showStandardScale && !isNaN(scaleMin)) {
        const scaleRange = isNarrowScale ? 3 : 6;
        y_scale_options.min = scaleMin;
        y_scale_options.max = scaleMin + scaleRange;
    } else {
         y_scale_options.grace = '10%'; 
         y_scale_options.beginAtZero = false;
    }

    chartInstance = new Chart(ctx, {
        type: 'bar',
        data: { labels: processedData.map(ch => ch.name), datasets: datasets },
        plugins: [errorBarPlugin, ChartDataLabels],
        options: {
            responsive: true, maintainAspectRatio: true,
            scales: {
                y: y_scale_options,
                x: { title: { display: true, text: 'Csatorna (Frekvencia szerint rendezve)', font: { size: 14 } } }
            },
            plugins: {
                legend: { display: false },
                datalabels: { display: (context) => context.datasetIndex === 0, rotation: -90, anchor: 'end', align: 'top', offset: 20, color: '#374151', font: { weight: 'bold', size: 13 }, formatter: (value) => value.toFixed(1) },
                tooltip: {
                    filter: (tooltipItem) => tooltipItem.datasetIndex === 0,
                    callbacks: {
                        label: function(context) {
                            const channelData = processedData[context.dataIndex];
                            let lines = [`Átlag: ${channelData.avgLevel} dBuV`];
                            if (channelData.type === 'DVBC' && channelData.avgMer !== null) lines.push(`Átlag MER: ${channelData.avgMer} dB`);
                            if (totalFileCount > 1) lines.push(`Min: ${channelData.minLevel} dBuV`, `Max: ${channelData.maxLevel} dBuV`, `Különbség: ${channelData.levelDifference.toFixed(2)} dBuV`);
                            return lines;
                        }
                    }
                }
            }
        }
    });
}

function renderTable(processedData, fileCount, analogAvg, digitalAvg) {
    const showDifferenceColumn = fileCount > 1;
    const showMeasurementsColumn = fileCount > 1;
    const maxDifference = showDifferenceColumn && processedData.length > 0 ? Math.max(...processedData.map(ch => ch.levelDifference)) : 0;
    const totalAvgLevelSum = processedData.reduce((sum, ch) => sum + ch.avgLevel, 0);
    const overallAvgLevel = processedData.length > 0 ? totalAvgLevelSum / processedData.length : 0;

    let tableHTML = `
        <div class="mb-4 text-center">
            <h3 class="text-lg font-semibold text-gray-800">Teljes átlagos jelszint: <span class="text-indigo-600">${overallAvgLevel.toFixed(1)} dBuV</span></h3>
            <div class="flex justify-center space-x-4 mt-2">
                <h4 class="text-md font-semibold text-gray-700">Analóg átlag: <span class="text-blue-600">${analogAvg.toFixed(1)} dBuV</span></h4>
                <h4 class="text-md font-semibold text-gray-700">Digitális átlag: <span class="text-green-600">${digitalAvg.toFixed(1)} dBuV</span></h4>
            </div>
        </div>
        <table class="min-w-full divide-y divide-gray-200 bg-white shadow-md rounded-lg">
            <thead class="bg-gray-50">
                <tr>
                    <th scope="col" class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Csatorna</th>
                    <th scope="col" class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">CH</th>
                    <th scope="col" class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Frekvencia (MHz)</th>
                    <th scope="col" class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Átlag MER (dB)</th>
                    ${showDifferenceColumn ? '<th scope="col" class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Min Jelszint (dBuV)</th>' : ''}
                    <th scope="col" class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Átlag Jelszint (dBuV)</th>
                    ${showDifferenceColumn ? '<th scope="col" class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Max Jelszint (dBuV)</th>' : ''}
                    ${showDifferenceColumn ? '<th scope="col" class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Különbség (dBuV)</th>' : ''}
                    <th scope="col" class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Eltérés az átlagtól (dB)</th>
                    <th scope="col" class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Kompenzáció (dB)</th>
                    ${showMeasurementsColumn ? '<th scope="col" class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Mérések</th>' : ''}
                </tr>
            </thead>
            <tbody class="bg-white divide-y divide-gray-200">
    `;

    processedData.forEach(ch => {
        let merContent = '<span class="text-gray-400">N/A</span>';
        let merClass = 'text-gray-700';
        if (ch.type === 'DVBC' && ch.avgMer !== null) {
            merContent = ch.avgMer.toFixed(2);
            if (ch.avgMer < 40) merClass = 'text-orange-500 font-bold';
        }
        const differenceClass = showDifferenceColumn && ch.levelDifference === maxDifference ? 'text-red-600 font-bold' : 'text-gray-700';
        const deviation = ch.deviationFromTotalAvg;
        const deviationText = (deviation > 0 ? '+' : '') + deviation.toFixed(1);
        const deviationClass = deviation > 0 ? 'text-green-600' : 'text-red-600';
        const compensation = ch.compensation;
        const compensationText = (compensation > 0 ? '+' : '') + compensation.toFixed(1);
        const compensationClass = compensation > 0 ? 'text-green-600' : 'text-red-600';


        tableHTML += `<tr><td class="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">${ch.name}</td><td class="px-6 py-4 whitespace-nowrap text-sm text-gray-700">${ch.standardChannelName}</td><td class="px-6 py-4 whitespace-nowrap text-sm text-gray-700">${ch.displayFrequency.toFixed(2)}</td><td class="px-6 py-4 whitespace-nowrap text-sm ${merClass}">${merContent}</td>${showDifferenceColumn ? `<td class="px-6 py-4 whitespace-nowrap text-sm text-gray-700">${ch.minLevel.toFixed(2)}</td>` : ''}<td class="px-6 py-4 whitespace-nowrap text-sm font-semibold text-gray-800">${ch.avgLevel.toFixed(2)}</td>${showDifferenceColumn ? `<td class="px-6 py-4 whitespace-nowrap text-sm text-gray-700">${ch.maxLevel.toFixed(2)}</td>` : ''}${showDifferenceColumn ? `<td class="px-6 py-4 whitespace-nowrap text-sm ${differenceClass}">${ch.levelDifference.toFixed(2)}</td>` : ''}<td class="px-6 py-4 whitespace-nowrap text-sm font-semibold ${deviationClass}">${deviationText}</td><td class="px-6 py-4 whitespace-nowrap text-sm font-semibold ${compensationClass}">${compensationText}</td>${showMeasurementsColumn ? `<td class="px-6 py-4 whitespace-nowrap text-sm text-gray-700">${ch.measurementsDisplay}</td>` : ''}</tr>`;
    });

    tableHTML += `</tbody></table>`;
    resultsTable.innerHTML = tableHTML;
}

const errorBarPlugin = { id: 'errorBarPlugin', afterDraw(chart) { if (totalFileCount <= 1) return; const { ctx, scales: { x, y } } = chart; ctx.save(); ctx.lineWidth = 1.5; ctx.strokeStyle = 'rgba(220, 38, 38, 0.7)'; chart.data.datasets.forEach((dataset, i) => { if (dataset.type === 'line') return; const customData = dataset.customData; if (!customData) return; for (let j = 0; j < chart.getDatasetMeta(i).data.length; j++) { const bar = chart.getDatasetMeta(i).data[j]; const dataPoint = customData[j]; const xPos = bar.x; const yMin = y.getPixelForValue(dataPoint.minLevel); const yMax = y.getPixelForValue(dataPoint.maxLevel); const whiskerWidth = bar.width * 0.3; ctx.beginPath(); ctx.moveTo(xPos, yMin); ctx.lineTo(xPos, yMax); ctx.stroke(); ctx.beginPath(); ctx.moveTo(xPos - whiskerWidth / 2, yMax); ctx.lineTo(xPos + whiskerWidth / 2, yMax); ctx.stroke(); ctx.beginPath(); ctx.moveTo(xPos - whiskerWidth / 2, yMin); ctx.lineTo(xPos + whiskerWidth / 2, yMin); ctx.stroke(); } }); ctx.restore(); } };
