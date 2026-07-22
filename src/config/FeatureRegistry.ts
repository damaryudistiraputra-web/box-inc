export const FeatureRegistry = {
    Gameplay: {
        shipment: true,
        combo: true,
        goldenTruck: true,
        prestige: true,
        criticalMerge: true
    },
    Economy: {
        criticalChance: 0.05,
        shipmentRewardMultiplier: 1.5,
        goldenTruckFillRate: 1.5,
        prestigeBonus: 0.20,
        rewardMultiplier: 2
    },
    Ads: {
        rewardedEnabled: true,
        interstitialEnabled: false,
        shipmentDoubleReward: true,
        goldenTruckDoubleLoot: true,
        prestigeBonus: true,
        incomeBoostExtension: true,
        incomeBoostMinutes: 5,
        rewardedCooldown: 60,
        dailyLimit: 20
    },
    Platform: {
        sdkTimeout: 10000
    },
    Experimental: {
        cloudSave: false,
        inbox: false,
        dailyLogin: false
    },
    Debug: {
        profiler: false,
        diagnostics: false
    }
};

export class FeatureRegistryManager {
    public static isEnabled(path: string): boolean {
        const parts = path.split('.');
        let current: any = FeatureRegistry;
        for (const p of parts) {
            if (current[p] === undefined) return false;
            current = current[p];
        }
        return !!current;
    }

    public static getNumber(path: string, fallback: number = 0): number {
        const parts = path.split('.');
        let current: any = FeatureRegistry;
        for (const p of parts) {
            if (current[p] === undefined) return fallback;
            current = current[p];
        }
        return typeof current === 'number' ? current : fallback;
    }
}
