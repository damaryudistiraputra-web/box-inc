import { EventBus, EVENTS } from '../core/EventBus';
import { SaveManager } from './SaveManager';
import { RewardManager } from './RewardManager';
import { RewardSource } from '../interfaces/IReward';
import { AnalyticsManager } from './AnalyticsManager';
import { EconomyManager } from './EconomyManager';
import { MathUtils } from '../utils/MathUtils';

export interface AchievementDef {
    id: string;
    description: string;
    type: 'merges' | 'shipments' | 'goldentrucks' | 'prestige';
    threshold: number;
    reward: any;
}

export class AchievementManager {
    private static instance: AchievementManager;
    private achievements: AchievementDef[] = [];

    private constructor() {
        this.defineAchievements();
        this.setupListeners();
    }

    public static getInstance(): AchievementManager {
        if (!AchievementManager.instance) {
            AchievementManager.instance = new AchievementManager();
        }
        return AchievementManager.instance;
    }

    private defineAchievements(): void {
        this.achievements = [
            // Early
            { id: 'merge_10', description: 'Merge 10 boxes', type: 'merges', threshold: 10, reward: { score: 100, metadata: { title: 'ACHIEVEMENT!', rarity: 'common' } } },
            { id: 'shipment_5', description: 'Complete 5 Shipments', type: 'shipments', threshold: 5, reward: { score: 200, metadata: { title: 'ACHIEVEMENT!', rarity: 'common' } } },
            { id: 'truck_1', description: 'Claim 1 Golden Truck', type: 'goldentrucks', threshold: 1, reward: { score: 300, metadata: { title: 'ACHIEVEMENT!', rarity: 'common' } } },

            // Mid
            { id: 'merge_100', description: 'Merge 100 boxes', type: 'merges', threshold: 100, reward: { incomeBoost: { multiplier: 2, durationSec: 60 }, metadata: { title: 'ACHIEVEMENT!', rarity: 'uncommon' } } },
            { id: 'shipment_50', description: 'Complete 50 Shipments', type: 'shipments', threshold: 50, reward: { triggerLuckyBox: true, metadata: { title: 'ACHIEVEMENT!', rarity: 'uncommon' } } },
            { id: 'truck_10', description: 'Claim 10 Golden Trucks', type: 'goldentrucks', threshold: 10, reward: { triggerLuckyBox: true, metadata: { title: 'ACHIEVEMENT!', rarity: 'uncommon' } } },

            // Late
            { id: 'merge_1000', description: 'Merge 1000 boxes', type: 'merges', threshold: 1000, reward: { blueprint: 1, metadata: { title: 'ACHIEVEMENT!', rarity: 'legendary' } } },
            { id: 'shipment_100', description: 'Complete 100 Shipments', type: 'shipments', threshold: 100, reward: { blueprint: 2, metadata: { title: 'ACHIEVEMENT!', rarity: 'legendary' } } },
            { id: 'truck_50', description: 'Claim 50 Golden Trucks', type: 'goldentrucks', threshold: 50, reward: { blueprint: 2, metadata: { title: 'ACHIEVEMENT!', rarity: 'legendary' } } },
            { id: 'prestige_1', description: 'Prestige 1 Time', type: 'prestige', threshold: 1, reward: { blueprint: 3, metadata: { title: 'ACHIEVEMENT!', rarity: 'legendary' } } },
        ];
    }

    private setupListeners(): void {
        EventBus.on(EVENTS.BOX_MERGE_SUCCESS, () => this.checkType('merges'));
        EventBus.on(EVENTS.SHIPMENT_COMPLETED, () => this.checkType('shipments'));
        EventBus.on(EVENTS.GAME_PRESTIGED, () => this.checkType('prestige'));
        
        EventBus.on(EVENTS.REWARD_GRANTED, (data: any) => {
            if (data.source === RewardSource.GOLDEN_TRUCK) {
                // Technically we need to track this in save data to check it
                const save = SaveManager.getInstance().load();
                save.stats = save.stats || {};
                save.stats.trucksClaimed = (save.stats.trucksClaimed || 0) + 1;
                SaveManager.getInstance().markDirty();
                
                this.checkType('goldentrucks');
            }
        });
    }

    private checkType(type: 'merges' | 'shipments' | 'goldentrucks' | 'prestige'): void {
        const save = SaveManager.getInstance().load();
        let currentAmount = 0;

        if (type === 'merges') currentAmount = save.stats.totalMerges;
        else if (type === 'shipments') currentAmount = save.stats.shipmentsCompleted;
        else if (type === 'goldentrucks') currentAmount = save.stats.trucksClaimed || 0;
        else if (type === 'prestige') currentAmount = save.stats.prestigeCount;

        const unlocked = save.achievements || [];

        for (const def of this.achievements) {
            if (def.type === type && currentAmount >= def.threshold && !unlocked.includes(def.id)) {
                this.grantAchievement(def);
            }
        }
    }

    private grantAchievement(def: AchievementDef): void {
        const save = SaveManager.getInstance().load();
        save.achievements = save.achievements || [];
        save.achievements.push(def.id);
        SaveManager.getInstance().markDirty();

        AnalyticsManager.getInstance().logEvent('achievement_unlocked', { id: def.id });

        // If reward is money, scale it by current economy for Early achievements
        if (def.reward.money) {
            const currentIps = EconomyManager.getInstance().getIncomePerSecond();
            def.reward.money = Number(currentIps * 60n); // 60 seconds worth
        }

        RewardManager.getInstance().grant({
            id: MathUtils.generateUUID(),
            source: RewardSource.SYSTEM,
            bundle: def.reward,
            timestamp: Date.now()
        });
    }
}
