import { EventBus, EVENTS } from '../core/EventBus';
import { TimeProvider } from '../utils/TimeProvider';
import type { IGameSave } from '../interfaces/IGameSave';

export class DailyRewardManager {
    private static instance: DailyRewardManager;
    private dailyData!: IGameSave['daily'];
    
    // 24 hours in milliseconds
    private static DAY_MS = 24 * 60 * 60 * 1000;
    // Streak broken if not claimed in 48 hours
    private static STREAK_BREAK_MS = 48 * 60 * 60 * 1000;

    private constructor() {}

    public static getInstance(): DailyRewardManager {
        if (!DailyRewardManager.instance) {
            DailyRewardManager.instance = new DailyRewardManager();
        }
        return DailyRewardManager.instance;
    }

    public init(dailyData: IGameSave['daily']): void {
        this.dailyData = dailyData;
        this.setupListeners();
        this.checkRewardStatus();
    }

    private setupListeners(): void {
        EventBus.on(EVENTS.REQUEST_SAVE_DATA, this.sendSaveData, this);
    }

    private checkRewardStatus(): void {
        const now = TimeProvider.now();
        const lastClaim = this.dailyData.lastClaimTime;
        
        if (lastClaim === 0) {
            // First time ever
            EventBus.emit('DAILY_REWARD_AVAILABLE', { streak: 1 });
            return;
        }
        
        const timeSinceClaim = now - lastClaim;
        
        if (timeSinceClaim >= DailyRewardManager.DAY_MS) {
            if (timeSinceClaim > DailyRewardManager.STREAK_BREAK_MS) {
                // Streak broken
                this.dailyData.streak = 0;
            }
            
            // Available to claim!
            EventBus.emit('DAILY_REWARD_AVAILABLE', { streak: this.dailyData.streak + 1 });
        }
    }

    public claimReward(): void {
        const now = TimeProvider.now();
        const timeSinceClaim = now - this.dailyData.lastClaimTime;
        
        if (this.dailyData.lastClaimTime === 0 || timeSinceClaim >= DailyRewardManager.DAY_MS) {
            if (timeSinceClaim > DailyRewardManager.STREAK_BREAK_MS && this.dailyData.lastClaimTime !== 0) {
                this.dailyData.streak = 1;
            } else {
                this.dailyData.streak++;
            }
            
            this.dailyData.lastClaimTime = now;
            
            // Give reward based on streak
            // e.g. base = $500, multiplier = streak (max 7)
            const effectiveStreak = Math.min(this.dailyData.streak, 7);
            const rewardAmount = BigInt(500 * effectiveStreak);
            
            EventBus.emit(EVENTS.RESOURCE_ADD, { id: 'money', amount: rewardAmount });
            console.log(`[DailyReward] Claimed day ${this.dailyData.streak}. Earned $${rewardAmount}`);
        }
    }

    private sendSaveData(): void {
        EventBus.emit(EVENTS.GAME_STATE_UPDATED, { daily: this.dailyData });
    }
}
