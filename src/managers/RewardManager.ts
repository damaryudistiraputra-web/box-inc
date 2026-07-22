import { EventBus, EVENTS } from '../core/EventBus';
import type { RewardRequest, RewardLedgerEntry, RewardBundle } from '../interfaces/IReward';
import { RewardSource, RewardState } from '../interfaces/IReward';
import { RewardValidator } from '../utils/RewardValidator';
import { SaveManager } from './SaveManager';
import { generateStringChecksum } from '../utils/SaveValidator';
import { TimeProvider } from '../utils/TimeProvider';
import { AnalyticsManager } from './AnalyticsManager';
import { EconomyManager } from './EconomyManager';
import { HealthStatus } from '../interfaces/IHealth';
import type { IHealthStats } from '../interfaces/IHealth';

export class RewardManager {
    private static instance: RewardManager;

    private constructor() {
        // Private constructor for singleton
    }

    public static getInstance(): RewardManager {
        if (!RewardManager.instance) {
            RewardManager.instance = new RewardManager();
        }
        return RewardManager.instance;
    }

    public grant(request: RewardRequest, originPosition?: {x: number, y: number}): void {
        const save = SaveManager.getInstance().load();
        save.rewardLedger = save.rewardLedger || [];

        // 1. Check duplicate
        if (save.rewardLedger.some(r => r.id === request.id)) {
            AnalyticsManager.getInstance().logEvent('reward_duplicate_blocked', { id: request.id });
            console.warn(`[RewardManager] Duplicate reward rejected: ${request.id}`);
            return;
        }

        // 2. Validate
        const validation = RewardValidator.validate(request.bundle);
        if (!validation.valid) {
            const sourceName = Object.keys(RewardSource).find(key => (RewardSource as any)[key] === request.source) || 'UNKNOWN';
            console.error(`[RewardManager] Invalid reward bundle from source ${sourceName}:`, validation.error, request.bundle);
            return;
        }

        // 3. Begin Transaction (Add to ledger as PENDING)
        const pendingReward: RewardLedgerEntry = {
            id: request.id,
            source: request.source,
            createdAt: request.timestamp,
            state: RewardState.Pending,
            checksum: "",
            schemaVersion: 1,
            bundle: request.bundle
        };

        const checksumStr = `${pendingReward.id}_${pendingReward.source}_${pendingReward.createdAt}_${JSON.stringify(pendingReward.bundle)}`;
        pendingReward.checksum = generateStringChecksum(checksumStr);

        save.rewardLedger.push(pendingReward);
        
        // Force save PENDING state so we can recover if logic crashes
        SaveManager.getInstance().forceSave();

        // 4. Apply Logic
        this.applyRewardLogic(request.bundle);

        // 5. Update State to SAVED
        pendingReward.state = RewardState.Saved;

        // 6. Save (Atomicity)
        SaveManager.getInstance().forceSave();

        // 7. Commit (Emit VFX / Analytics)
        EventBus.emit(EVENTS.REWARD_GRANTED, { bundle: request.bundle, source: request.source, originPosition });
        
        pendingReward.state = RewardState.Completed;
        pendingReward.completedAt = TimeProvider.now();
        SaveManager.getInstance().markDirty();
        
        // Cleanup old ledger entries if too many
        if (save.rewardLedger.length > 50) {
            save.rewardLedger = save.rewardLedger.slice(-50);
        }
    }

    private applyRewardLogic(bundle: RewardBundle): void {
        const save = SaveManager.getInstance().load();
        if (bundle.money !== undefined) {
            const amount = BigInt(Math.floor(bundle.money));
            EventBus.emit(EVENTS.RESOURCE_ADD, { id: 'money', amount });
        }

        if (bundle.blueprint !== undefined) {
            const amount = BigInt(Math.floor(bundle.blueprint));
            EventBus.emit(EVENTS.RESOURCE_ADD, { id: 'blueprint', amount });
        }

        if (bundle.score !== undefined) {
            save.stats.mergeScore = (save.stats.mergeScore || 0) + bundle.score;
        }

        if (bundle.incomeBoost) {
            console.log(`[RewardManager] Boost applied: ${bundle.incomeBoost.multiplier}x for ${bundle.incomeBoost.durationSec}s`);
            EconomyManager.getInstance().applyBoost(bundle.incomeBoost.multiplier, bundle.incomeBoost.durationSec);
        }
    }

    public resumePendingRewards(): void {
        const save = SaveManager.getInstance().load();
        if (!save.rewardLedger) return;

        let dirty = false;
        for (const entry of save.rewardLedger) {
            if (entry.state === RewardState.Pending) {
                console.log(`[RewardManager] Resuming PENDING reward ${entry.id}`);
                this.applyRewardLogic(entry.bundle);
                entry.state = RewardState.Completed;
                entry.completedAt = TimeProvider.now();
                dirty = true;
            } else if (entry.state === RewardState.Saved) {
                console.log(`[RewardManager] Resuming SAVED reward ${entry.id}`);
                entry.state = RewardState.Completed;
                entry.completedAt = TimeProvider.now();
                dirty = true;
            }
        }
        
        if (dirty) {
            SaveManager.getInstance().forceSave();
        }
    }

    public getHealthStats(): IHealthStats {
        const save = SaveManager.getInstance().load();
        const ledger = save.rewardLedger || [];
        let status: HealthStatus = HealthStatus.HEALTHY;
        const pendingCount = ledger.filter(l => l.state === RewardState.Pending).length;
        if (pendingCount > 10) status = HealthStatus.CRITICAL;
        else if (pendingCount > 5) status = HealthStatus.WARNING;
        
        return {
            status,
            ledgerSize: ledger.length,
            pendingCount
        };
    }
}
