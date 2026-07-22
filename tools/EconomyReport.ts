import * as fs from 'fs';
import * as path from 'path';

// This is a more advanced version of the previous simulator.js
// It tracks granular sources of income and tests economy guardrails.

const BOX_CONFIG: Record<number, { baseValue: bigint }> = {
    1: { baseValue: 1n },
    2: { baseValue: 3n },
    3: { baseValue: 10n },
    4: { baseValue: 35n },
    5: { baseValue: 120n },
    6: { baseValue: 400n },
    7: { baseValue: 1200n },
    8: { baseValue: 4000n }
};

class EconomySimulator {
    public money = 100n;
    public boxes: number[] = [];
    public gridSize = 9;
    public totalBought = 0;
    public baseCost = 10;

    // Analytics
    public incomeSources = {
        passive: 0n,
        shipment: 0n,
        goldenTruck: 0n,
        ads: 0n
    };
    public totalMerges = 0;
    public blueprints = 0;
    public prestigeTimeSec = -1;

    // Simulation params
    public criticalChance = 0.05;
    public criticalMultiplier = 2.0;

    getCost() {
        const raw = this.baseCost * Math.pow(1.15, this.totalBought);
        return BigInt(Math.floor(raw));
    }

    tick(second: number) {
        // Passive Income
        let tickIncome = 0n;
        for (const level of this.boxes) {
            let base = Number(BOX_CONFIG[level]?.baseValue || 0);
            if (Math.random() <= this.criticalChance) {
                base *= this.criticalMultiplier;
            }
            tickIncome += BigInt(Math.floor(base));
        }
        this.money += tickIncome;
        this.incomeSources.passive += tickIncome;

        // Events
        if (second > 0 && second % 120 === 0) { // Every 2 mins, Shipment
            const shipmentReward = BigInt(Math.floor(Number(this.getCost()) * 4.5));
            this.money += shipmentReward;
            this.incomeSources.shipment += shipmentReward;
        }

        if (second > 0 && second % 300 === 0) { // Every 5 mins, GT
            const gtReward = BigInt(Math.floor(Number(this.getCost()) * 4));
            this.money += gtReward;
            this.incomeSources.goldenTruck += gtReward;
        }
        
        if (second > 0 && second % 600 === 0) { // Every 10 mins, Ad
            const adReward = BigInt(Math.floor(Number(this.getCost()) * 8));
            this.money += adReward;
            this.incomeSources.ads += adReward;
        }
    }

    buyBox() {
        const cost = this.getCost();
        if (this.money >= cost && this.boxes.length < this.gridSize) {
            this.money -= cost;
            this.boxes.push(1);
            this.totalBought++;
            return true;
        }
        return false;
    }

    autoMerge() {
        let merged = false;
        do {
            merged = false;
            for (let i = 0; i < this.boxes.length; i++) {
                for (let j = i + 1; j < this.boxes.length; j++) {
                    if (this.boxes[i] === this.boxes[j] && this.boxes[i] < 8) {
                        this.boxes[i]++;
                        this.boxes.splice(j, 1);
                        this.totalMerges++;
                        merged = true;
                        
                        // Check prestige condition (e.g., getting a level 8 box)
                        if (this.boxes[i] === 8 && this.prestigeTimeSec === -1) {
                            this.blueprints += 10;
                        }
                        break;
                    }
                }
                if (merged) break;
            }
        } while (merged);
    }

    run(minutes: number) {
        const totalSeconds = minutes * 60;
        for (let s = 1; s <= totalSeconds; s++) {
            this.tick(s);
            while (this.buyBox()) {}
            this.autoMerge();

            if (this.prestigeTimeSec === -1 && this.blueprints > 0) {
                this.prestigeTimeSec = s;
                // Once prestiged, we stop tracking time to prestige for this run
            }
        }
    }
}

async function main() {
    console.log('[EconomyReport] Running 60 minute simulation...');
    const sim = new EconomySimulator();
    sim.run(60);

    const totalIncome = sim.incomeSources.passive + sim.incomeSources.shipment + sim.incomeSources.goldenTruck + sim.incomeSources.ads;
    const totalNum = Number(totalIncome);

    const report = {
        timestamp: Date.now(),
        date: new Date().toISOString(),
        metrics: {
            timeToPrestigeMinutes: sim.prestigeTimeSec > 0 ? (sim.prestigeTimeSec / 60) : -1,
            blueprintsPerHour: sim.blueprints,
            totalMerges: sim.totalMerges
        },
        incomeSourcesPct: {
            passive: Number((Number(sim.incomeSources.passive) / totalNum * 100).toFixed(1)),
            shipment: Number((Number(sim.incomeSources.shipment) / totalNum * 100).toFixed(1)),
            goldenTruck: Number((Number(sim.incomeSources.goldenTruck) / totalNum * 100).toFixed(1)),
            ads: Number((Number(sim.incomeSources.ads) / totalNum * 100).toFixed(1))
        }
    };

    // Guardrails Validation
    let failures: string[] = [];
    if (report.metrics.timeToPrestigeMinutes > 0 && report.metrics.timeToPrestigeMinutes < 30) {
        failures.push(`Prestige too fast: ${report.metrics.timeToPrestigeMinutes.toFixed(1)}m (Limit: >30m)`);
    }
    if (report.incomeSourcesPct.goldenTruck > 25) {
        failures.push(`Golden Truck share too high: ${report.incomeSourcesPct.goldenTruck}% (Limit: 25%)`);
    }
    if (report.incomeSourcesPct.ads > 40) {
        failures.push(`Ads share too high: ${report.incomeSourcesPct.ads}% (Limit: 40%)`);
    }
    if (report.metrics.blueprintsPerHour > 10) {
        failures.push(`Blueprint gain too high: ${report.metrics.blueprintsPerHour}/hr (Limit: 10)`);
    }

    report['guardrailsPassed'] = failures.length === 0;
    report['guardrailFailures'] = failures;

    // Save baseline snapshot
    const baselineDir = path.join(process.cwd(), 'baseline');
    if (!fs.existsSync(baselineDir)) {
        fs.mkdirSync(baselineDir, { recursive: true });
    }
    
    const today = new Date().toISOString().split('T')[0];
    const snapshotPath = path.join(baselineDir, `economy-${today}.json`);
    fs.writeFileSync(snapshotPath, JSON.stringify(report, null, 2));

    // Save current report
    const reportPath = path.join(process.cwd(), 'economy-report.json');
    let previousReport = null;
    if (fs.existsSync(reportPath)) {
        previousReport = JSON.parse(fs.readFileSync(reportPath, 'utf8'));
    }
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));

    // Automated Diff
    if (previousReport) {
        const diff = {
            prestigeTimeDiff: report.metrics.timeToPrestigeMinutes - previousReport.metrics.timeToPrestigeMinutes,
            gtShareDiff: report.incomeSourcesPct.goldenTruck - previousReport.incomeSourcesPct.goldenTruck
        };
        fs.writeFileSync(path.join(process.cwd(), 'comparison.json'), JSON.stringify(diff, null, 2));
        
        let md = `# Economy Diff\n\n`;
        md += `- **Time to Prestige**: ${previousReport.metrics.timeToPrestigeMinutes.toFixed(1)}m -> ${report.metrics.timeToPrestigeMinutes.toFixed(1)}m\n`;
        md += `- **Golden Truck Share**: ${previousReport.incomeSourcesPct.goldenTruck}% -> ${report.incomeSourcesPct.goldenTruck}%\n`;
        fs.writeFileSync(path.join(process.cwd(), 'comparison.md'), md);
    }

    console.log(JSON.stringify(report, null, 2));
    if (!report.guardrailsPassed) {
        console.error('❌ GUARDRAILS FAILED', failures);
        process.exit(1);
    } else {
        console.log('✅ GUARDRAILS PASSED');
    }
}

main().catch(console.error);
