function initMainPage() {
    // --- VÁLTOZÓK ---
    const fileUpload = document.getElementById('file-upload');
    const fileInfo = document.getElementById('file-info');
    const resultsContainer = document.getElementById('results-container');
    const loader = document.getElementById('loader');
    const resultsTable = document.getElementById('resultsTable');
    const savePdfButton = document.getElementById('save-pdf-button');
    const meresiHelyInput = document.getElementById('meresi-hely');
    const megjegyzesInput = document.getElementById('megjegyzes');
    const toggleTiltCheckbox = document.getElementById('toggle-tilt-checkbox');
    const toggleMinMaxCheckbox = document.getElementById('toggle-minmax-checkbox');
    const toggleOutliersCheckbox = document.getElementById('toggle-outliers-checkbox');
    const toggleStandardScaleCheckbox = document.getElementById('toggle-standard-scale-checkbox');
    const scaleMinInput = document.getElementById('scale-min-input');
    const toggleNarrowScaleCheckbox = document.getElementById('toggle-narrow-scale-checkbox');
    const narrowScaleContainer = document.getElementById('narrow-scale-container');
    const toggleDigitalCompensationCheckbox = document.getElementById('toggle-digital-compensation-checkbox');
    const targetLevelInput = document.getElementById('target-level-input');
    const dropZone = document.getElementById('drop-zone');
    let chartInstance = null;
    let processedDataForPdf = [];
    let firstMeasurementTime = null;
    let lastMeasurementTime = null;
    let totalFileCount = 0;
    let rawChannelData = []; // Nyers, beolvasott adatok tárolására

    // --- ESEMÉNYKEZELŐK ---

    // Fájl feltöltés
    fileUpload.addEventListener('change', async (event) => {
        handleFiles(event.target.files);
    });

    // Drag and Drop eseménykezelők
    dropZone.addEventListener('dragover', (event) => {
        event.preventDefault();
        dropZone.classList.add('border-indigo-500', 'bg-indigo-50');
    });

    dropZone.addEventListener('dragleave', (event) => {
        event.preventDefault();
        dropZone.classList.remove('border-indigo-500', 'bg-indigo-50');
    });

    dropZone.addEventListener('drop', async (event) => {
        event.preventDefault();
        dropZone.classList.remove('border-indigo-500', 'bg-indigo-50');
        handleFiles(event.dataTransfer.files);
    });

    async function handleFiles(files) {
        totalFileCount = files.length;
        if (totalFileCount > 0) {
            fileInfo.textContent = `${totalFileCount} fájl kiválasztva. Feldolgozás...`;
            resultsContainer.classList.add('hidden');
            loader.classList.remove('hidden');
            // Reset UI
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
    }

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
            lastY += 8;

            pdf.setFontSize(10);
            const firstMeasurementText = `Elsö mérés: ${formatDateTime(firstMeasurementTime)}`;
            const lastMeasurementText = `Utolsó mérés: ${formatDateTime(lastMeasurementTime)}`;

            pdf.text(replaceHungarianChars(firstMeasurementText), margin, lastY);
            lastY += 6;
            pdf.text(replaceHungarianChars(lastMeasurementText), margin, lastY);
            lastY += 10;
            
            const totalAvgLevelSumPdf = processedDataForPdf.reduce((sum, ch) => sum + ch.avgLevel, 0);
            const overallAvgLevelPdf = processedDataForPdf.length > 0 ? totalAvgLevelSumPdf / processedDataForPdf.length : 0;
            
            const analogChannelsPdf = processedDataForPdf.filter(ch => ch.type === 'ANALOG');
            const digitalChannelsPdf = processedDataForPdf.filter(ch => ch.type === 'DVBC');
            const analogAvgPdf = analogChannelsPdf.length > 0 ? analogChannelsPdf.reduce((sum, ch) => sum + ch.avgLevel, 0) / analogChannelsPdf.length : 0;
            const digitalAvgPdf = digitalChannelsPdf.length > 0 ? digitalChannelsPdf.reduce((sum, ch) => sum + ch.avgLevel, 0) / digitalChannelsPdf.length : 0;

            const overallAvgText = `Teljes atlagos jelszint: ${overallAvgLevelPdf.toFixed(1)} dBuV`;
            const analogAvgText = `Analog atlag: ${analogAvgPdf.toFixed(1)} dBuV`;
            const digitalAvgText = `Digitalis atlag: ${digitalAvgPdf.toFixed(1)} dBuV`;

            pdf.setFont('helvetica', 'bold');
            pdf.setFontSize(12);
            pdf.text(replaceHungarianChars(overallAvgText), pdf.internal.pageSize.getWidth() / 2, lastY, { align: 'center' });
            lastY += 8;
            pdf.setFontSize(10);
            pdf.text(replaceHungarianChars(analogAvgText), pdf.internal.pageSize.getWidth() / 2, lastY, { align: 'center' });
            lastY += 6;
            pdf.text(replaceHungarianChars(digitalAvgText), pdf.internal.pageSize.getWidth() / 2, lastY, { align: 'center' });
            lastY += 10;

            const graphCanvas = await html2canvas(graphSection, { scale: 4, logging: false, useCORS: true });
            const graphImgData = graphCanvas.toDataURL('image/jpeg', 0.90);
            const graphRatio = graphCanvas.height / graphCanvas.width;
            const graphImgHeight = contentWidth * graphRatio;

            pdf.addImage(graphImgData, 'JPEG', margin, lastY, contentWidth, graphImgHeight, 'chart', 'SLOW');
            lastY += graphImgHeight + 10;
            
            const showDifferenceColumn = totalFileCount > 1;
            const showMeasurementsColumn = totalFileCount > 1;

            let head = [['Csatorna', 'CH', 'Frekvencia (MHz)', 'Átlag MER (dB)', 'Átlag Jelszint (dBuV)']];
            let columnOrder = ['name', 'standardChannelName', 'displayFrequency', 'avgMer', 'avgLevel'];

            if (showDifferenceColumn) {
                head[0].splice(4, 0, 'Min Jelszint (dBuV)');
                head[0].push('Max Jelszint (dBuV)');
                head[0].push('Különbség (dBuV)');
                columnOrder.splice(4, 0, 'minLevel');
                columnOrder.push('maxLevel');
                columnOrder.push('levelDifference');
            }
            head[0].push('Eltérés az átlagtól (dB)');
            columnOrder.push('deviationFromTotalAvg');

            if (showMeasurementsColumn) {
                head[0].push('Mérések');
                columnOrder.push('measurementsDisplay');
            }

            const body = processedDataForPdf.map(ch => {
                return columnOrder.map(key => {
                    let value = ch[key];
                    if (typeof value === 'number') {
                        if (key === 'deviationFromTotalAvg') {
                             return (value > 0 ? '+' : '') + value.toFixed(1);
                        }
                        return value.toFixed(2);
                    }
                    if (key === 'avgMer' && value === null) return 'N/A';
                    return replaceHungarianChars(value);
                });
            });
            
            pdf.autoTable({
                head: head.map(row => row.map(cell => replaceHungarianChars(cell))),
                body: body,
                startY: lastY,
                theme: 'grid',
                styles: { font: 'helvetica', fontStyle: 'normal', fontSize: 8 },
                headStyles: { font: 'helvetica', fontStyle: 'bold', fillColor: [22, 160, 133] },
                margin: { top: margin, right: margin, bottom: margin, left: margin },
                didParseCell: function (data) {
                    const rowData = processedDataForPdf[data.row.index];
                    if (!rowData) return;
                    
                    const key = columnOrder[data.column.index];

                    if (key === 'levelDifference' && showDifferenceColumn) {
                        const maxDifferencePdf = Math.max(...processedDataForPdf.map(ch => ch.levelDifference));
                         if (rowData.levelDifference === maxDifferencePdf) {
                            data.cell.styles.textColor = [220, 38, 38];
                            data.cell.styles.fontStyle = 'bold';
                        }
                    }
                    
                    if (key === 'avgMer' && rowData.type === 'DVBC' && rowData.avgMer < 40) {
                         data.cell.styles.textColor = [234, 88, 12];
                         data.cell.styles.fontStyle = 'bold';
                    }

                    if (key === 'deviationFromTotalAvg') {
                        if (rowData.deviationFromTotalAvg > 0) {
                            data.cell.styles.textColor = [22, 163, 74];
                        } else if (rowData.deviationFromTotalAvg < 0) {
                            data.cell.styles.textColor = [220, 38, 38];
                        }
                        data.cell.styles.fontStyle = 'bold';
                    }
                },
                didDrawPage: (data) => {
                    const pageCount = pdf.internal.getNumberOfPages();
                    pdf.setFont('helvetica', 'normal');
                    pdf.setFontSize(10);
                    pdf.text(replaceHungarianChars(`Oldal ${data.pageNumber} / ${pageCount}`), data.settings.margin.left, pdf.internal.pageSize.height - 10);
                }
            });

            const today = new Date().toISOString().slice(0, 10);
            pdf.save(`meresi_jegyzek_${today}.pdf`);

        } catch (error) {
            console.error("PDF generálási hiba:", error);
            alert("Hiba történt a PDF generálása során: " + error.message);
        } finally {
            button.disabled = false;
        }
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

        processedDataForPdf = channelsWithCompensation;
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
}

function initComparePage() {
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
    const dropZoneBefore = document.getElementById('drop-zone-before');
    const dropZoneAfter = document.getElementById('drop-zone-after');
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

    function setupDropZone(dropZone, fileInput, fileInfo) {
        dropZone.addEventListener('dragover', (event) => {
            event.preventDefault();
            dropZone.classList.add('border-indigo-500', 'bg-indigo-50');
        });

        dropZone.addEventListener('dragleave', (event) => {
            event.preventDefault();
            dropZone.classList.remove('border-indigo-500', 'bg-indigo-50');
        });

        dropZone.addEventListener('drop', (event) => {
            event.preventDefault();
            dropZone.classList.remove('border-indigo-500', 'bg-indigo-50');
            const files = event.dataTransfer.files;
            fileInput.files = files;
            fileInfo.textContent = `${files.length} fájl kiválasztva.`;
        });
    }

    setupDropZone(dropZoneBefore, fileUploadBefore, fileInfoBefore);
    setupDropZone(dropZoneAfter, fileUploadAfter, fileInfoAfter);

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
}
