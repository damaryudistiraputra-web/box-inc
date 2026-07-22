export interface RemoteConfigPayload {
    version: number;
    economy: Record<string, number>;
    ads: Record<string, any>;
    features: Record<string, boolean>;
    experiments: any[];
}

export class ConfigSchema {
    public static validate(config: any): boolean {
        try {
            if (!config || typeof config.version !== 'number') {
                console.error('[ConfigSchema] Missing or invalid version');
                return false;
            }

            if (config.economy) {
                const ec = config.economy;
                if (ec.criticalMergeChance !== undefined && (ec.criticalMergeChance < 0 || ec.criticalMergeChance > 0.5)) return false;
                if (ec.goldenTruckFillRate !== undefined && (ec.goldenTruckFillRate < 0.1 || ec.goldenTruckFillRate > 5.0)) return false;
                if (ec.shipmentRewardMultiplier !== undefined && (ec.shipmentRewardMultiplier < 0.1 || ec.shipmentRewardMultiplier > 10.0)) return false;
                if (ec.prestigeBonus !== undefined && (ec.prestigeBonus < 0 || ec.prestigeBonus > 10.0)) return false;
            }

            if (config.ads) {
                const ac = config.ads;
                if (ac.rewardedCooldown !== undefined && (ac.rewardedCooldown < 0 || ac.rewardedCooldown > 86400)) return false;
                if (ac.dailyLimit !== undefined && (ac.dailyLimit < 0 || ac.dailyLimit > 100)) return false;
            }

            // Optional Experiments array validation
            if (config.experiments && Array.isArray(config.experiments)) {
                for (const exp of config.experiments) {
                    if (typeof exp.id !== 'string') return false;
                    if (typeof exp.enabled !== 'boolean') return false;
                    if (typeof exp.priority !== 'number') return false;
                    if (typeof exp.allocation !== 'number' || exp.allocation < 0 || exp.allocation > 100) return false;
                    // target is optional array of strings
                    if (exp.target && !Array.isArray(exp.target)) return false;
                    if (!exp.overrides || typeof exp.overrides !== 'object') return false;
                }
            }

            return true;
        } catch (e) {
            console.error('[ConfigSchema] Validation exception', e);
            return false;
        }
    }
}
