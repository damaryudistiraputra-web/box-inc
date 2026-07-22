import type { RewardLedgerEntry } from './IReward';

export interface IGameSave {
    version: number; // deprecated, use below
    saveVersion: number;
    deviceId: string;
    gameVersion: string;
    economyVersion: number;
    contentVersion: number;
    lastSaveTime: number;
    resources: {
        money: string; // BigInt stored as string
    };
    grid: {
        boxes: Array<{ col: number, row: number, level: number }>;
    };
    modifiers: {
        incomeMultiplier: number;
        discountMultiplier: number;
        startingLevel: number;
        criticalChance: number;
        boostEndTimeMs?: number;
        activeBoostMultiplier?: number;
    };
    stats: {
        totalMerges: number;
        totalMoneyEarned: string; // BigInt stored as string
        boxesBought: number;
        highestBoxLevel: number;
        shipmentsCompleted: number;
        mergeScore: number;
        mergeMeter: number; // 0 to 100
        luckyPityCounter: number;
        prestigeCount: number;
        trucksClaimed: number;
    };
    daily: {
        lastClaimTime: number;
        streak: number;
    };
    activeShipment?: {
        requirements: Array<{ level: number, count: number }>;
        rewardCash: string;
        tier: string;
    };
    achievements: string[]; // array of unlocked achievement IDs
    rewardLedger?: RewardLedgerEntry[];
    adsToday?: number;
    lastAdResetDate?: number;
}
