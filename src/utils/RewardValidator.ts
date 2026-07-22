import type { RewardBundle } from '../interfaces/IReward';

export interface IRewardValidationResult {
    valid: boolean;
    error?: string;
}

export class RewardValidator {
    public static validate(bundle: RewardBundle): IRewardValidationResult {
        if (bundle.money !== undefined && bundle.money < 0) {
            return { valid: false, error: 'Money reward cannot be negative' };
        }
        
        if (bundle.blueprint !== undefined && bundle.blueprint < 0) {
            return { valid: false, error: 'Blueprint reward cannot be negative' };
        }

        if (bundle.score !== undefined && bundle.score < 0) {
            return { valid: false, error: 'Score reward cannot be negative' };
        }

        if (bundle.incomeBoost) {
            if (bundle.incomeBoost.multiplier <= 1) {
                return { valid: false, error: 'Income boost multiplier must be > 1' };
            }
            if (bundle.incomeBoost.durationSec <= 0) {
                return { valid: false, error: 'Income boost duration must be > 0' };
            }
        }

        if (bundle.spawnBox) {
            if (bundle.spawnBox.level < 1) {
                return { valid: false, error: 'Spawn box level must be >= 1' };
            }
        }

        return { valid: true };
    }
}
