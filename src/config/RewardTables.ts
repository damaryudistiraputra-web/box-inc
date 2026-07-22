import type { RewardBundle } from '../interfaces/IReward';
import { MathUtils } from '../utils/MathUtils';

export interface LootItem {
    id: string; 
    chance: number; // percentage 0-100
    bundleGenerator: (context?: any) => RewardBundle;
}

export class RewardTables {
    
    public static readonly GOLDEN_TRUCK_LOOT: LootItem[] = [
        { 
            id: 'money', 
            chance: 45,
            bundleGenerator: (ctx) => ({ 
                money: Number(ctx.ips * 120n),
                metadata: { rarity: 'common' }
            })
        },
        { 
            id: 'income_boost', 
            chance: 25,
            bundleGenerator: () => ({ 
                incomeBoost: { multiplier: 2, durationSec: 30 },
                metadata: { rarity: 'uncommon', title: 'INCOME BOOST' }
            })
        },
        { 
            id: 'lucky_box', 
            chance: 15,
            bundleGenerator: () => ({ 
                triggerLuckyBox: true,
                metadata: { rarity: 'rare', title: 'LUCKY BOX!' }
            })
        },
        { 
            id: 'shipment_score', 
            chance: 10,
            bundleGenerator: () => ({ 
                score: 500,
                metadata: { rarity: 'epic', title: '+500 SCORE!' }
            })
        },
        { 
            id: 'jackpot', 
            chance: 5,
            bundleGenerator: (ctx) => ({ 
                money: Number(ctx.ips * 1200n),
                metadata: { rarity: 'legendary', title: 'JACKPOT!' }
            })
        }
    ];

    public static readonly LUCKY_BOX_CHANCE = 8; // 8% base chance when buying a box
    public static readonly CRITICAL_MERGE_CHANCE = 5; // 5% chance to skip a level on merge

    /**
     * Rolls on a loot table and returns the selected item ID.
     */
    public static roll(table: LootItem[], context?: any): RewardBundle {
        const totalWeight = table.reduce((sum, item) => sum + item.chance, 0);
        let rand = MathUtils.randomInt(0, totalWeight - 1);

        for (const item of table) {
            if (rand < item.chance) {
                return item.bundleGenerator(context);
            }
            rand -= item.chance;
        }

        return table[0].bundleGenerator(context);
    }
}
