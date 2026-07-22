import { EventBus, EVENTS } from '../core/EventBus';
import { RewardTables } from '../config/RewardTables';
import { RewardManager } from './RewardManager';
import { MathUtils } from '../utils/MathUtils';
import { RewardSource } from '../interfaces/IReward';
import { EconomyManager } from './EconomyManager';
import { GameBalance } from '../config/GameBalance';

export class GoldenTruckManager {
    private static instance: GoldenTruckManager;
    private isEventActive: boolean = false;
    private timeoutTimer: any;

    private constructor() {
        EventBus.on(EVENTS.GOLDEN_TRUCK_SPAWNED, this.onTruckSpawned, this);
    }

    public static getInstance(): GoldenTruckManager {
        if (!GoldenTruckManager.instance) {
            GoldenTruckManager.instance = new GoldenTruckManager();
        }
        return GoldenTruckManager.instance;
    }

    private onTruckSpawned(): void {
        this.isEventActive = true;
        EventBus.emit(EVENTS.GOLDEN_TRUCK_ARRIVED);

        this.timeoutTimer = setTimeout(() => {
            if (this.isEventActive) {
                this.dismissTruck();
            }
        }, GameBalance.GOLDEN_TRUCK_TIMEOUT_MS);
    }

    public dismissTruck(): void {
        this.isEventActive = false;
        if (this.timeoutTimer) clearTimeout(this.timeoutTimer);
        EventBus.emit(EVENTS.GOLDEN_TRUCK_DEPARTED);
    }

    public rollReward(): any {
        if (!this.isEventActive) return null;

        this.isEventActive = false;
        if (this.timeoutTimer) clearTimeout(this.timeoutTimer);

        const currentIps = EconomyManager.getInstance().getIncomePerSecond();
        return RewardTables.roll(RewardTables.GOLDEN_TRUCK_LOOT, { ips: currentIps });
    }

    public executeGrant(bundle: any, delayMs: number = 0): void {
        setTimeout(() => {
            RewardManager.getInstance().grant({
                id: MathUtils.generateUUID(),
                source: RewardSource.GOLDEN_TRUCK,
                bundle,
                timestamp: Date.now()
            });
            EventBus.emit(EVENTS.GOLDEN_TRUCK_DEPARTED);
        }, delayMs);
    }
}
