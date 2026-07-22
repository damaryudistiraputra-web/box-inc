import { EventBus, EVENTS } from '../core/EventBus';
import { SaveManager } from './SaveManager';
import { RewardManager } from './RewardManager';
import { RewardSource } from '../interfaces/IReward';
import { GameBalance } from '../config/GameBalance';
import { ProgressionManager } from './ProgressionManager';
import { PlatformManager } from '../platform/PlatformManager';
import { MathUtils } from '../utils/MathUtils';

export class PrestigeManager {
    private static instance: PrestigeManager;

    private constructor() {}

    public static getInstance(): PrestigeManager {
        if (!PrestigeManager.instance) {
            PrestigeManager.instance = new PrestigeManager();
        }
        return PrestigeManager.instance;
    }

    public calculateBlueprints(): number {
        const save = SaveManager.getInstance().load();
        const lifetimeMoney = BigInt(save.stats.totalMoneyEarned || "0");
        
        // Formula: floor((LifetimeMoney / BASE) ^ EXP)
        // Since Math.pow requires numbers, we need to carefully convert BigInt.
        // For extremely large numbers, precision might drop but for power calculation it's usually acceptable.
        
        const lifetimeNum = Number(lifetimeMoney);
        if (lifetimeNum < GameBalance.PRESTIGE_SCALING_BASE) return 0;

        const baseVal = lifetimeNum / GameBalance.PRESTIGE_SCALING_BASE;
        const blueprints = Math.floor(Math.pow(baseVal, GameBalance.PRESTIGE_SCALING_EXP));
        
        return blueprints;
    }

    public canPrestige(): boolean {
        // Unlock at Stage 6 (Space Logistics) and requires at least 1 Blueprint
        const currentStageId = ProgressionManager.getInstance().getCurrentStage().id;
        if (currentStageId < 6) return false;

        return this.calculateBlueprints() >= 1;
    }

    public executePrestige(): void {
        if (!this.canPrestige()) return;

        const blueprintsGained = this.calculateBlueprints();

        // Grant the blueprint reward
        RewardManager.getInstance().grant({
            id: MathUtils.generateUUID(),
            source: RewardSource.PRESTIGE,
            bundle: { blueprint: blueprintsGained },
            timestamp: Date.now()
        });

        // Reset the save state for a new run
        SaveManager.getInstance().resetForPrestige();

        // Tell Yandex we stopped playing briefly
        PlatformManager.gameplayStop();

        // Emit event so the GameScene can reload the grid and UI
        EventBus.emit(EVENTS.GAME_PRESTIGED, { blueprintsGained });
    }
}
