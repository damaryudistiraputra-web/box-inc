import { Presets, IGameBalance } from '../src/config/GameBalance';

// Provide a mock progression config based on our stage config
const STAGES = [
    { id: 1, name: 'Garage', scoreThreshold: 0 },
    { id: 2, name: 'Warehouse', scoreThreshold: 5000 },
    { id: 3, name: 'Factory', scoreThreshold: 25000 },
    { id: 4, name: 'Distribution Center', scoreThreshold: 100000 },
    { id: 5, name: 'Global Network', scoreThreshold: 500000 },
    { id: 6, name: 'Space Logistics', scoreThreshold: 2000000 },
];

function getStageByScore(score: number): number {
    let currentStage = 1;
    for (const stage of STAGES) {
        if (score >= stage.scoreThreshold) {
            currentStage = stage.id;
        }
    }
    return currentStage;
}

const PROFILES = {
    casual: { sessionMins: 5, sessionsPerDay: 2 },
    normal: { sessionMins: 20, sessionsPerDay: 3 },
    hardcore: { sessionMins: 120, sessionsPerDay: 10 }
};

interface SimResult {
    money: number;
    lifetimeMoney: number;
    highestLevel: number;
    prestigeCount: number;
    blueprints: number;
    score: number;
    stage: number;
    luckyBoxes: number;
    goldenTrucks: number;
    shipments: number;
    combos: number;
    stageDurations: number[]; // Time in ticks to reach each stage
}

function runSimulationV2(presetName: keyof typeof Presets, profileName: keyof typeof PROFILES, days: number, iterations: number = 1000) {
    const balance = Presets[presetName];
    const profile = PROFILES[profileName];
    const totalActiveMins = profile.sessionMins * profile.sessionsPerDay * days;
    const totalActiveSecs = totalActiveMins * 60;
    
    let results: SimResult[] = [];
    
    for (let i = 0; i < iterations; i++) {
        let res: SimResult = {
            money: 0, lifetimeMoney: 0, highestLevel: 1, prestigeCount: 0, blueprints: 0,
            score: 0, stage: 1, luckyBoxes: 0, goldenTrucks: 0, shipments: 0, combos: 0,
            stageDurations: [0, 0, 0, 0, 0, 0, 0]
        };
        
        let grid: number[] = [1];
        let tick = 0;
        
        let seed = i * 99991;
        const rand = () => { seed = (seed * 9301 + 49297) % 233280; return seed / 233280; };
        
        let shipmentTimer = 0;
        let goldenTruckTimer = 0;
        let luckyPity = 0;
        
        const tickRate = 1;
        for (tick = 0; tick < totalActiveSecs; tick += tickRate) {
            // Income
            let tickIncome = 0;
            for (const lvl of grid) {
                tickIncome += Math.pow(2, lvl - 1); // 1, 2, 4, 8...
            }
            // Blueprint bonus
            tickIncome *= (1 + (res.blueprints * balance.BLUEPRINT_INCOME_MULTIPLIER));
            
            res.money += tickIncome;
            res.lifetimeMoney += tickIncome;
            
            // Buy box
            if (grid.length < 15) {
                const targetLvl = Math.max(1, res.highestLevel - 3);
                const cost = 10 * Math.pow(balance.BOX_PRICE_GROWTH, targetLvl);
                if (res.money >= cost) {
                    res.money -= cost;
                    luckyPity++;
                    if (rand() * 100 < balance.LUCKY_BOX_CHANCE || luckyPity >= balance.LUCKY_PITY_THRESHOLD) {
                        luckyPity = 0;
                        res.luckyBoxes++;
                        grid.push(Math.max(1, res.highestLevel - 1));
                    } else {
                        grid.push(targetLvl);
                    }
                }
            }
            
            // Merge
            grid.sort((a, b) => a - b);
            let combo = 0;
            for (let g = 0; g < grid.length - 1; g++) {
                if (grid[g] === grid[g+1]) {
                    const newLvl = grid[g] + 1;
                    grid.splice(g, 2);
                    grid.push(newLvl);
                    if (newLvl > res.highestLevel) {
                        res.highestLevel = newLvl;
                        res.score += balance.MERGE_SCORE_BASE * 500; // highest level bonus
                    }
                    res.score += balance.MERGE_SCORE_BASE;
                    combo++;
                    g = -1; // restart check for combo
                }
            }
            if (combo > 1) res.combos++;
            
            // Events
            shipmentTimer++;
            if (shipmentTimer > 60) {
                shipmentTimer = 0;
                res.shipments++;
                res.score += balance.SHIPMENT_SCORE_BASE;
                res.money += tickIncome * 30; // 30s of income
                res.lifetimeMoney += tickIncome * 30;
            }
            
            goldenTruckTimer++;
            if (goldenTruckTimer > 180) { // Every 3 mins active
                goldenTruckTimer = 0;
                res.goldenTrucks++;
                res.money += tickIncome * 120;
                res.lifetimeMoney += tickIncome * 120;
            }
            
            // Stage check
            const newStage = getStageByScore(res.score);
            if (newStage > res.stage) {
                for (let s = res.stage + 1; s <= newStage; s++) {
                    res.stageDurations[s] = tick;
                }
                res.stage = newStage;
            }
            
            // Prestige Check
            if (res.stage >= 6) {
                const blueprints = Math.floor(Math.pow(res.lifetimeMoney / balance.PRESTIGE_SCALING_BASE, balance.PRESTIGE_SCALING_EXP));
                if (blueprints >= 1 && (blueprints > res.blueprints * 0.1)) {
                    // Prestige!
                    res.blueprints += blueprints;
                    res.prestigeCount++;
                    res.money = 0;
                    res.score = 0;
                    res.highestLevel = 1;
                    grid = [];
                    res.stage = 1;
                }
            }
        }
        
        results.push(res);
    }
    
    // Sort for median / 95th
    const med = (arr: number[]) => {
        arr.sort((a, b) => a - b);
        return arr[Math.floor(arr.length / 2)];
    };
    const p95 = (arr: number[]) => {
        arr.sort((a, b) => a - b);
        return arr[Math.floor(arr.length * 0.95)];
    };
    
    console.log(`\n=== PRESET: ${presetName} | PROFILE: ${profileName.toUpperCase()} | DAYS: ${days} ===`);
    console.log(`Players: ${iterations}`);
    console.log(`Avg Prestige: ${med(results.map(r => r.prestigeCount))} (p95: ${p95(results.map(r => r.prestigeCount))})`);
    console.log(`Avg Blueprints: ${med(results.map(r => r.blueprints))} (p95: ${p95(results.map(r => r.blueprints))})`);
    console.log(`Avg Stage: ${med(results.map(r => r.stage))} (p95: ${p95(results.map(r => r.stage))})`);
    console.log(`Avg Highest Lvl: ${med(results.map(r => r.highestLevel))} (p95: ${p95(results.map(r => r.highestLevel))})`);
    console.log(`Avg Lifetime $: $${med(results.map(r => r.lifetimeMoney)).toExponential(2)} (p95: $${p95(results.map(r => r.lifetimeMoney)).toExponential(2)})`);
    console.log(`Avg Lucky Boxes: ${med(results.map(r => r.luckyBoxes))}`);
    console.log(`Avg Golden Trucks: ${med(results.map(r => r.goldenTrucks))}`);
    console.log(`Avg Shipments: ${med(results.map(r => r.shipments))}`);
    console.log(`Avg Combos: ${med(results.map(r => r.combos))}`);
    
    console.log(`Stage Durations (Median mins):`);
    for (let s = 2; s <= 6; s++) {
        const durT = med(results.filter(r => r.stageDurations[s] > 0).map(r => r.stageDurations[s]));
        if (durT) console.log(`  Stage ${s}: ${(durT / 60).toFixed(1)} mins`);
    }
}

console.log('--- BOX INC MONTE CARLO V2 ---');
runSimulationV2('NORMAL', 'casual', 7, 100);
runSimulationV2('NORMAL', 'normal', 7, 100);
runSimulationV2('NORMAL', 'hardcore', 7, 100);

runSimulationV2('DEVELOPER', 'normal', 7, 10);
