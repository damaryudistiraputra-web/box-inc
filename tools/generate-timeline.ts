import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function generateTimeline() {
    const rootDir = path.resolve(__dirname, '..');
    const baselineDir = path.join(rootDir, 'tools', 'baseline');
    const timelinePath = path.join(rootDir, 'tools', 'timeline.json');

    if (!fs.existsSync(baselineDir)) {
        console.warn('[Timeline] Baseline dir not found.');
        return;
    }

    const files = fs.readdirSync(baselineDir).filter(f => f.endsWith('.json'));
    files.sort(); // Sort chronologically since they are named YYYY-MM-DD

    const timeline = [];
    for (const f of files) {
        try {
            const data = JSON.parse(fs.readFileSync(path.join(baselineDir, f), 'utf8'));
            timeline.push({
                date: f.replace('economy-', '').replace('.json', ''),
                prestigeTime: data.metrics.timeToPrestigeMinutes,
                blueprints: data.metrics.blueprintsPerHour,
                adsShare: data.incomeSourcesPct.ads,
                gtShare: data.incomeSourcesPct.goldenTruck
            });
        } catch (e) {}
    }

    fs.writeFileSync(timelinePath, JSON.stringify(timeline, null, 2));
    console.log(`[Timeline] Generated with ${timeline.length} points.`);
}

generateTimeline();
