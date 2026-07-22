import './style.css';
declare const Chart: any;

const app = document.getElementById('app')!;

async function loadData() {
    try {
        const [ecoRes, compRes, timelineRes, analyticsRes] = await Promise.all([
            fetch('/economy-report.json').catch(() => null),
            fetch('/comparison.json').catch(() => null),
            fetch('/timeline.json').catch(() => null),
            fetch('/analytics.jsonl').catch(() => null)
        ]);

        const ecoData = ecoRes && ecoRes.ok ? await ecoRes.json() : getMockEconomyData();
        const compData = compRes && compRes.ok ? await compRes.json() : getMockComparisonData();
        const timelineData = timelineRes && timelineRes.ok ? await timelineRes.json() : getMockTimelineData();
        
        let crashStats = getMockCrashData();
        if (analyticsRes && analyticsRes.ok) {
            const text = await analyticsRes.text();
            crashStats = parseAnalyticsForCrashes(text);
        }

        renderDashboard(ecoData, compData, timelineData, crashStats);
    } catch (e) {
        console.error("Failed to load data, rendering mock...", e);
        renderDashboard(getMockEconomyData(), getMockComparisonData(), getMockTimelineData(), getMockCrashData());
    }
}

function parseAnalyticsForCrashes(jsonl: string) {
    const lines = jsonl.split('\n').filter(l => l.trim().length > 0);
    const counts: Record<string, number> = {
        'Fatal': 0, 'Recoverable': 0, 'Platform': 0, 'Ads': 0, 'Save': 0, 'Economy': 0, 'Unknown': 0
    };
    let totalCrashes = 0;

    for (const line of lines) {
        try {
            const evt = JSON.parse(line);
            if (evt.name === 'crash_event') {
                totalCrashes++;
                const msg = (evt.payload?.message || evt.payload?.reason || '').toLowerCase();
                if (msg.includes('save') || msg.includes('migration')) counts['Save']++;
                else if (msg.includes('ad') || msg.includes('reward')) counts['Ads']++;
                else if (msg.includes('ysdk') || msg.includes('platform')) counts['Platform']++;
                else if (msg.includes('money') || msg.includes('NaN')) counts['Economy']++;
                else if (evt.payload?.type === 'unhandledrejection') counts['Recoverable']++;
                else if (evt.payload?.type === 'error') counts['Fatal']++;
                else counts['Unknown']++;
            }
        } catch(e) {}
    }
    
    if (totalCrashes === 0) return { labels: ['No Crashes'], data: [100] };

    const labels = [];
    const data = [];
    for (const [k, v] of Object.entries(counts)) {
        if (v > 0) {
            labels.push(k);
            data.push(Math.round((v / totalCrashes) * 100));
        }
    }
    return { labels, data };
}

function renderDashboard(eco: any, comp: any, timeline: any, crashStats: any) {
    app.innerHTML = `
        <div class="card">
            <h2>Economy Health Status</h2>
            <div class="metric" style="color: ${eco.guardrailsPassed ? 'var(--accent)' : 'var(--danger)'}">
                ${eco.guardrailsPassed ? 'PASS' : 'FAIL'}
            </div>
            ${eco.guardrailFailures?.length ? `<p style="color: var(--danger)">${eco.guardrailFailures.join('<br>')}</p>` : ''}
        </div>
        
        <div class="card">
            <h2>Time to Prestige</h2>
            <div class="metric">${eco.metrics.timeToPrestigeMinutes.toFixed(1)} mins</div>
            <p style="color: ${comp.prestigeTimeDiff < 0 ? 'var(--accent)' : 'var(--danger)'}">
                ${comp.prestigeTimeDiff > 0 ? '+' : ''}${comp.prestigeTimeDiff.toFixed(1)} mins vs previous
            </p>
        </div>

        <div class="card" style="grid-column: span 2;">
            <h2>Top Crash Types (Severity)</h2>
            <div class="chart-container">
                <canvas id="crashChart"></canvas>
            </div>
        </div>

        <div class="card" style="grid-column: span 2;">
            <h2>Economy Timeline</h2>
            <div class="chart-container">
                <canvas id="timelineChart"></canvas>
            </div>
        </div>

        <div class="card" style="grid-column: span 2;">
            <h2>Income Sources Breakdown</h2>
            <div class="chart-container">
                <canvas id="incomeChart"></canvas>
            </div>
        </div>
        
        <div class="card" style="grid-column: span 2;">
            <h2>Player Retention Prediction (Funnel)</h2>
            <div class="chart-container">
                <canvas id="funnelChart"></canvas>
            </div>
        </div>
    `;

    // Render Charts
    setTimeout(() => {
        // 1. Crash Chart
        new Chart((document.getElementById('crashChart') as HTMLCanvasElement).getContext('2d'), {
            type: 'doughnut',
            data: {
                labels: crashStats.labels,
                datasets: [{
                    data: crashStats.data,
                    backgroundColor: ['#ef4444', '#f59e0b', '#3b82f6', '#8b5cf6', '#10b981', '#ec4899', '#64748b']
                }]
            },
            options: { responsive: true, maintainAspectRatio: false }
        });

        // 2. Timeline Chart
        new Chart((document.getElementById('timelineChart') as HTMLCanvasElement).getContext('2d'), {
            type: 'line',
            data: {
                labels: timeline.map((t: any) => t.date),
                datasets: [
                    { label: 'Time to Prestige (m)', data: timeline.map((t: any) => t.prestigeTime), borderColor: '#3b82f6', tension: 0.2 },
                    { label: 'Golden Truck %', data: timeline.map((t: any) => t.gtShare), borderColor: '#f59e0b', tension: 0.2 }
                ]
            },
            options: { responsive: true, maintainAspectRatio: false }
        });

        // 3. Income Chart
        new Chart((document.getElementById('incomeChart') as HTMLCanvasElement).getContext('2d'), {
            type: 'bar',
            data: {
                labels: ['Passive', 'Shipment', 'Golden Truck', 'Ads'],
                datasets: [{
                    label: '% Share of Economy',
                    data: [eco.incomeSourcesPct.passive, eco.incomeSourcesPct.shipment, eco.incomeSourcesPct.goldenTruck, eco.incomeSourcesPct.ads],
                    backgroundColor: ['#3b82f6', '#10b981', '#f59e0b', '#8b5cf6']
                }]
            },
            options: { responsive: true, maintainAspectRatio: false }
        });

        // 4. Funnel Chart
        new Chart((document.getElementById('funnelChart') as HTMLCanvasElement).getContext('2d'), {
            type: 'line',
            data: {
                labels: ['Install', 'First Merge', 'Stage 3', 'First Shipment', 'Prestige', 'Day 2 Return'],
                datasets: [{
                    label: 'Player Conversion %',
                    data: [100, 95, 70, 50, 15, 12],
                    borderColor: '#ec4899',
                    backgroundColor: 'rgba(236, 72, 153, 0.2)',
                    fill: true,
                    tension: 0.4
                }]
            },
            options: { responsive: true, maintainAspectRatio: false }
        });
    }, 100);
}

// Mocks
function getMockEconomyData() {
    return { guardrailsPassed: true, guardrailFailures: [], metrics: { timeToPrestigeMinutes: 45.2 }, incomeSourcesPct: { passive: 40.5, shipment: 30.0, goldenTruck: 15.5, ads: 14.0 } };
}
function getMockComparisonData() {
    return { prestigeTimeDiff: -12.5, gtShareDiff: -2.0 };
}
function getMockTimelineData() {
    return [
        { date: 'W1', prestigeTime: 40, gtShare: 10 },
        { date: 'W2', prestigeTime: 38, gtShare: 15 },
        { date: 'W3', prestigeTime: 32, gtShare: 22 },
        { date: 'W4', prestigeTime: 30, gtShare: 24 }
    ];
}
function getMockCrashData() {
    return { labels: ['Ads', 'Save', 'Economy', 'Platform', 'Fatal'], data: [52, 18, 13, 9, 8] };
}

loadData();
