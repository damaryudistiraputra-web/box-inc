/**
 * Box Inc. Economy Simulator (Monte Carlo)
 * Run: node scripts/simulator.js
 */



// Simulate BOX_CONFIG
const BOX_CONFIG = {
    1: { baseValue: 1, cost: 10 },
    2: { baseValue: 3, cost: 25 },
    3: { baseValue: 10, cost: 70 },
    4: { baseValue: 35, cost: 200 },
    5: { baseValue: 120, cost: 600 },
    6: { baseValue: 400, cost: 1800 },
    7: { baseValue: 1400, cost: 5500 },
    8: { baseValue: 5000, cost: 16000 },
    9: { baseValue: 18000, cost: 50000 },
    10: { baseValue: 65000, cost: 150000 }
};

// Target stages based on highest box level or score
// In our game, stages are tied to progression score (derived from boxes, merges, etc).
// Let's approximate:
// Stage 1: default
// Stage 2: Box Level 3 reached
// Stage 3: Box Level 5 reached
// Prestige: Box Level 10 reached

const STAGE_TARGETS = {
    "Stage 2": 3,
    "Stage 3": 5,
    "Prestige": 10
};

function runTimeSimulation(iterations) {
    let results = {
        "Stage 2": [],
        "Stage 3": [],
        "Prestige": []
    };
    
    for (let i = 0; i < iterations; i++) {
        let money = 0;
        let highestLevel = 1;
        let grid = []; // array of box levels
        let tick = 0;
        let activeTimes = { "Stage 2": -1, "Stage 3": -1, "Prestige": -1 };
        
        let seed = i * 12345;
        const rand = () => {
            seed = (seed * 9301 + 49297) % 233280;
            return seed / 233280;
        };

        // Run until Prestige (Box Lvl 10) or max ticks (e.g. 1 million seconds = ~277 hours)
        while (highestLevel < STAGE_TARGETS["Prestige"] && tick < 1000000) {
            tick++;
            
            // 1. Generate Income
            let tickIncome = 0;
            for (const lvl of grid) {
                let inc = BOX_CONFIG[lvl]?.baseValue || 0;
                if (rand() < 0.05) inc *= 2; // Critical
                tickIncome += inc;
            }
            money += tickIncome;
            
            // 1.5 Free Box Drop (every 10 seconds)
            if (tick % 10 === 0 && grid.length < 9) {
                grid.push(1);
            }
            
            // 2. Buy Box if space
            if (grid.length < 9) {
                const buyLevel = Math.max(1, highestLevel - 3);
                const cost = BOX_CONFIG[buyLevel]?.cost || 999999999;
                if (money >= cost) {
                    money -= cost;
                    grid.push(buyLevel);
                }
            }
            
            // 3. Merge
            grid.sort((a, b) => a - b);
            for (let g = 0; g < grid.length - 1; g++) {
                if (grid[g] === grid[g+1]) {
                    const newLevel = grid[g] + 1;
                    grid.splice(g, 2);
                    grid.push(newLevel);
                    if (newLevel > highestLevel) {
                        highestLevel = newLevel;
                        
                        // Check targets
                        for (const [stage, targetLvl] of Object.entries(STAGE_TARGETS)) {
                            if (highestLevel === targetLvl && activeTimes[stage] === -1) {
                                activeTimes[stage] = tick; // Time in seconds
                            }
                        }
                    }
                    break;
                }
            }
        }
        
        for (const stage of Object.keys(STAGE_TARGETS)) {
            if (activeTimes[stage] !== -1) {
                results[stage].push(activeTimes[stage]);
            }
        }
    }
    
    console.log('--- BOX INC ECONOMY DASHBOARD ---');
    console.log(`Simulated ${iterations} players (Active Playtime)\n`);
    
    console.log('Average Time:');
    
    for (const [stage, times] of Object.entries(results)) {
        if (times.length === 0) {
            console.log(`${stage}\n  Did not reach`);
            continue;
        }
        
        times.sort((a, b) => a - b);
        const medianSecs = times[Math.floor(times.length / 2)];
        const medianMins = (medianSecs / 60).toFixed(1);
        
        console.log(`${stage}\n  ${medianMins} min`);
    }
    
    console.log('\n---------------------------------');
    console.log('Note: Time reflects active pure-play seconds. Real-world days depend on session lengths.');
}

runTimeSimulation(100);
