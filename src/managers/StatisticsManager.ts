import { EventBus, EVENTS } from '../core/EventBus';
import type { IGameSave } from '../interfaces/IGameSave';

export class StatisticsManager {
    private static instance: StatisticsManager;
    private stats!: IGameSave['stats'];

    private constructor() {}

    public static getInstance(): StatisticsManager {
        if (!StatisticsManager.instance) {
            StatisticsManager.instance = new StatisticsManager();
        }
        return StatisticsManager.instance;
    }

    public init(initialStats: IGameSave['stats']): void {
        this.stats = initialStats;
        this.setupListeners();
    }

    private setupListeners(): void {
        EventBus.on(EVENTS.BOX_LEVEL_UP, this.onMerge, this);
        EventBus.on(EVENTS.SHOP_BUY_SUCCESS, this.onBuy, this);
        EventBus.on(EVENTS.RESOURCE_ADD, this.onResourceAdd, this);
        
        // Also listen to REQUEST_SAVE_DATA to sync back to GameScene if we want
        // Actually, SaveManager gets partial data from GameScene.
        // It's cleaner if StatisticsManager just intercepts REQUEST_SAVE_DATA directly
        // and sends its own GAME_STATE_UPDATED.
        EventBus.on(EVENTS.REQUEST_SAVE_DATA, this.sendSaveData, this);
    }

    private onMerge(payload: { level: number }): void {
        this.stats.totalMerges++;
        if (payload.level > this.stats.highestBoxLevel) {
            this.stats.highestBoxLevel = payload.level;
        }
        this.notifyUpdate();
    }

    private onBuy(): void {
        this.stats.boxesBought++;
        this.notifyUpdate();
    }

    private onResourceAdd(payload: { id: string, amount: bigint }): void {
        if (payload.id === 'money') {
            const currentTotal = BigInt(this.stats.totalMoneyEarned);
            this.stats.totalMoneyEarned = (currentTotal + payload.amount).toString();
            this.notifyUpdate();
        }
    }

    private notifyUpdate(): void {
        EventBus.emit('STAT_UPDATED', this.stats);
    }
    
    private sendSaveData(): void {
        EventBus.emit(EVENTS.GAME_STATE_UPDATED, { stats: this.stats });
    }

    public getStats(): IGameSave['stats'] {
        return this.stats;
    }
}
