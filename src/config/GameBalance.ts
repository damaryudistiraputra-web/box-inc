export interface IGameBalance {
    CRITICAL_MERGE_CHANCE: number;
    LUCKY_PITY_THRESHOLD: number;
    LUCKY_BOX_CHANCE: number;
    MERGE_SCORE_BASE: number;
    SHIPMENT_SCORE_BASE: number;
    GOLDEN_TRUCK_FILL_RATE: number;
    GOLDEN_TRUCK_TIMEOUT_MS: number;
    MAX_COMBO: number;
    MAX_CRITICAL_LEVEL_GAP: number;
    BOX_PRICE_GROWTH: number;
    SHIPMENT_REWARD_MULTIPLIER: number;
    PRESTIGE_SCALING_BASE: number;
    PRESTIGE_SCALING_EXP: number;
    BLUEPRINT_INCOME_MULTIPLIER: number;
}

export const Presets: Record<string, IGameBalance> = {
    NORMAL: {
        CRITICAL_MERGE_CHANCE: 5,
        LUCKY_PITY_THRESHOLD: 20,
        LUCKY_BOX_CHANCE: 8,
        MERGE_SCORE_BASE: 3,
        SHIPMENT_SCORE_BASE: 1200,
        GOLDEN_TRUCK_FILL_RATE: 1.5,
        GOLDEN_TRUCK_TIMEOUT_MS: 120000,
        MAX_COMBO: 4,
        MAX_CRITICAL_LEVEL_GAP: 1,
        BOX_PRICE_GROWTH: 1.15,
        SHIPMENT_REWARD_MULTIPLIER: 1.5,
        PRESTIGE_SCALING_BASE: 1_000_000,
        PRESTIGE_SCALING_EXP: 0.45,
        BLUEPRINT_INCOME_MULTIPLIER: 0.05
    },
    EASY: {
        CRITICAL_MERGE_CHANCE: 10,
        LUCKY_PITY_THRESHOLD: 10,
        LUCKY_BOX_CHANCE: 15,
        MERGE_SCORE_BASE: 5,
        SHIPMENT_SCORE_BASE: 1500,
        GOLDEN_TRUCK_FILL_RATE: 2.0,
        GOLDEN_TRUCK_TIMEOUT_MS: 180000,
        MAX_COMBO: 5,
        MAX_CRITICAL_LEVEL_GAP: 1,
        BOX_PRICE_GROWTH: 1.10,
        SHIPMENT_REWARD_MULTIPLIER: 2.0,
        PRESTIGE_SCALING_BASE: 500_000,
        PRESTIGE_SCALING_EXP: 0.50,
        BLUEPRINT_INCOME_MULTIPLIER: 0.10
    },
    HARD: {
        CRITICAL_MERGE_CHANCE: 2,
        LUCKY_PITY_THRESHOLD: 30,
        LUCKY_BOX_CHANCE: 4,
        MERGE_SCORE_BASE: 2,
        SHIPMENT_SCORE_BASE: 800,
        GOLDEN_TRUCK_FILL_RATE: 1.0,
        GOLDEN_TRUCK_TIMEOUT_MS: 60000,
        MAX_COMBO: 3,
        MAX_CRITICAL_LEVEL_GAP: 2,
        BOX_PRICE_GROWTH: 1.25,
        SHIPMENT_REWARD_MULTIPLIER: 1.0,
        PRESTIGE_SCALING_BASE: 2_000_000,
        PRESTIGE_SCALING_EXP: 0.40,
        BLUEPRINT_INCOME_MULTIPLIER: 0.02
    },
    DEVELOPER: {
        CRITICAL_MERGE_CHANCE: 50,
        LUCKY_PITY_THRESHOLD: 2,
        LUCKY_BOX_CHANCE: 50,
        MERGE_SCORE_BASE: 100,
        SHIPMENT_SCORE_BASE: 5000,
        GOLDEN_TRUCK_FILL_RATE: 10.0,
        GOLDEN_TRUCK_TIMEOUT_MS: 300000,
        MAX_COMBO: 10,
        MAX_CRITICAL_LEVEL_GAP: 0,
        BOX_PRICE_GROWTH: 1.05,
        SHIPMENT_REWARD_MULTIPLIER: 10.0,
        PRESTIGE_SCALING_BASE: 10_000,
        PRESTIGE_SCALING_EXP: 0.80,
        BLUEPRINT_INCOME_MULTIPLIER: 1.0
    }
};

// Default to NORMAL
export const GameBalance: IGameBalance = { ...Presets.NORMAL };

export function applyPreset(presetName: keyof typeof Presets) {
    if (Presets[presetName]) {
        Object.assign(GameBalance, Presets[presetName]);
        console.log(`[GameBalance] Applied preset: ${presetName}`);
    } else {
        console.error(`[GameBalance] Unknown preset: ${presetName}`);
    }
}

export const AdsConfig = {
    rewardedEnabled: true,
    interstitialEnabled: false,
    shipmentDoubleReward: true,
    goldenTruckDoubleLoot: true,
    prestigeBonus: true,
    incomeBoostExtension: true
};

export const AdsBalance = {
    // Reward amounts
    shipmentDoubleRewardMultiplier: 2,
    goldenTruckDoubleRewardMultiplier: 2,
    prestigeBonus: 0.20, // 20%
    rewardMultiplier: 2,
    
    // Cooldowns
    incomeBoostMinutes: 5,
    rewardedCooldown: 60,
    dailyLimit: 20
};

export const PlatformConfig = {
    SDK_TIMEOUT_MS: 10000
};

export const FeatureFlags = {
    shipment: true,
    goldenTruck: true,
    criticalMerge: true,
    combo: true,
    prestige: true,
    ads: true,
    achievement: true,
    tutorial: true,
    dailyLogin: false,
    cloudSave: false
};
