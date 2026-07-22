// BOX INC - Economy Balance Simulator
// Simulates a player buying, merging, and earning money over 60 minutes.

const BOX_CONFIG = {
    1: { baseValue: 1n },
    2: { baseValue: 3n },
    3: { baseValue: 10n },
    4: { baseValue: 35n },
    5: { baseValue: 120n },
};

class Simulator {
    constructor() {
        this.money = 100n;
        this.boxes = []; // array of box levels
        this.gridSize = 9; // 3x3
        this.totalBought = 0;
        
        // Modifiers
        this.incomeMultiplier = 1.0;
        this.discountMultiplier = 1.0;
        this.criticalChance = 0.05;
        this.criticalMultiplier = 2.0;
        
        this.baseCost = 10;
        
        // Logs
        this.history = [];
    }
    
    getCost() {
        const raw = this.baseCost * Math.pow(1.15, this.totalBought);
        return BigInt(Math.floor(raw * this.discountMultiplier));
    }
    
    tick() {
        let tickIncome = 0n;
        for (const level of this.boxes) {
            let base = Number(BOX_CONFIG[level].baseValue) * this.incomeMultiplier;
            if (Math.random() <= this.criticalChance) {
                base *= this.criticalMultiplier;
            }
            tickIncome += BigInt(Math.floor(base));
        }
        this.money += tickIncome;
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
        // Find two boxes of same level
        let merged = false;
        do {
            merged = false;
            for (let i = 0; i < this.boxes.length; i++) {
                for (let j = i + 1; j < this.boxes.length; j++) {
                    if (this.boxes[i] === this.boxes[j] && this.boxes[i] < 5) {
                        // Merge!
                        this.boxes[i]++; // level up
                        this.boxes.splice(j, 1); // remove source
                        merged = true;
                        break;
                    }
                }
                if (merged) break;
            }
        } while (merged); // keep merging until no more merges possible
    }
    
    run(minutes) {
        console.log(`--- Starting Simulation for ${minutes} minutes ---`);
        const totalSeconds = minutes * 60;
        
        for (let s = 1; s <= totalSeconds; s++) {
            this.tick();
            
            // Bot Logic: Buy as many boxes as possible
            while (this.buyBox()) {
                // Buy successful
            }
            
            // Bot Logic: Merge if grid is full or has pairs
            this.autoMerge();
            
            // Log every 5 minutes
            if (s % 300 === 0) {
                const min = s / 60;
                console.log(`[Minute ${min.toString().padStart(2, '0')}] Money: $${this.money} | Boxes: ${this.boxes.sort().join(',')}`);
            }
        }
        
        console.log('--- Simulation Complete ---');
        console.log(`Total Money: $${this.money}`);
        console.log(`Total Boxes Bought: ${this.totalBought}`);
        console.log(`Final Grid: ${this.boxes.sort().join(',')}`);
        console.log(`Next Box Cost: $${this.getCost()}`);
    }
}

const sim = new Simulator();
sim.run(60);
