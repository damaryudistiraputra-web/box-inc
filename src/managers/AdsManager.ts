import { PlatformManager } from '../platform/PlatformManager';
import { AnalyticsManager } from './AnalyticsManager';
import { RewardManager } from './RewardManager';
import { RewardSource } from '../interfaces/IReward';
import type { RewardBundle } from '../interfaces/IReward';
import { SaveManager } from './SaveManager';
import { AdsBalance } from '../config/GameBalance';
import { MathUtils } from '../utils/MathUtils';
import { TimeProvider } from '../utils/TimeProvider';

export const AdState = {
    IDLE: "IDLE",
    LOADING: "LOADING",
    READY: "READY",
    SHOWING: "SHOWING",
    REWARDED: "REWARDED",
    CLOSED: "CLOSED"
} as const;

export type AdState = typeof AdState[keyof typeof AdState];

export class AdsManager {
    private static instance: AdsManager;
    private currentState: AdState = AdState.IDLE;
    private lastRewardedTime: number = 0;
    
    public isAdAvailable(): boolean {
        return this.currentState === AdState.IDLE && PlatformManager.getAds().isRewardedReady();
    }

    private constructor() {
        // Private constructor for singleton
    }

    public static getInstance(): AdsManager {
        if (!AdsManager.instance) {
            AdsManager.instance = new AdsManager();
        }
        return AdsManager.instance;
    }

    public getState(): AdState {
        return this.currentState;
    }

    public showRewarded(
        source: RewardSource, 
        bundle: RewardBundle, 
        onSuccess?: () => void, 
        onFailure?: (reason: string) => void
    ): void {
        if (this.currentState !== AdState.IDLE) {
            console.warn(`[AdsManager] Cannot show ad, current state is ${this.currentState}`);
            onFailure?.("Ad is currently busy");
            return;
        }

        if (!this.checkLimits()) {
            AnalyticsManager.getInstance().logEvent('reward_cooldown_blocked', { source });
            onFailure?.("Ad limit reached or in cooldown");
            return;
        }

        this.currentState = AdState.LOADING;
        AnalyticsManager.getInstance().logEvent('rewarded_requested', { source });

        const provider = PlatformManager.getAds();
        if (!provider.isRewardedReady()) {
            this.currentState = AdState.IDLE;
            AnalyticsManager.getInstance().logEvent('rewarded_failed', { reason: 'not_ready' });
            onFailure?.("Ad not available");
            return;
        }

        const rewardId = MathUtils.generateUUID();
        let isRewarded = false;

        this.currentState = AdState.SHOWING;
        AnalyticsManager.getInstance().logEvent('rewarded_loaded', { source });
        
        PlatformManager.gameplayStop(); // Pause gameplay

        provider.showRewarded(
            () => {
                // onRewarded Callback
                this.currentState = AdState.REWARDED;
                isRewarded = true;
                
                AnalyticsManager.getInstance().logEvent('rewarded_completed', { source, id: rewardId });
                AnalyticsManager.getInstance().logEvent('rewarded_reward_granted', { source, id: rewardId });
                
                RewardManager.getInstance().grant({
                    id: rewardId,
                    source,
                    bundle,
                    timestamp: TimeProvider.now()
                });

                this.updateLimitsAfterSuccess();
                onSuccess?.();
            },
            () => {
                // onClose Callback
                this.currentState = AdState.CLOSED;
                AnalyticsManager.getInstance().logEvent('rewarded_closed', { source, rewarded: isRewarded });
                
                PlatformManager.gameplayStart(); // Resume gameplay
                
                // Return to IDLE shortly after
                setTimeout(() => {
                    this.currentState = AdState.IDLE;
                }, 1000);
            },
            (err) => {
                // onError Callback
                this.currentState = AdState.IDLE;
                AnalyticsManager.getInstance().logEvent('rewarded_failed', { error: err });
                PlatformManager.gameplayStart(); // Resume gameplay
                onFailure?.("Ad encountered an error");
            }
        );
    }

    private checkLimits(): boolean {
        const now = TimeProvider.now();
        const save = SaveManager.getInstance().load();

        // 1. Check Cooldown
        const timeSinceLastAd = (now - this.lastRewardedTime) / 1000;
        if (timeSinceLastAd < AdsBalance.rewardedCooldown) {
            console.log(`[AdsManager] Blocked by cooldown. Wait ${AdsBalance.rewardedCooldown - timeSinceLastAd}s`);
            return false;
        }

        // 2. Check Daily Limit
        this.resetDailyIfNeeded(save, now);
        
        if ((save.adsToday || 0) >= AdsBalance.dailyLimit) {
            console.log(`[AdsManager] Blocked by daily limit.`);
            return false;
        }

        return true;
    }

    private resetDailyIfNeeded(save: any, now: number): void {
        const lastReset = new Date(save.lastAdResetDate || 0);
        const today = new Date(now);

        if (lastReset.getUTCFullYear() !== today.getUTCFullYear() || 
            lastReset.getUTCMonth() !== today.getUTCMonth() || 
            lastReset.getUTCDate() !== today.getUTCDate()) {
            
            save.adsToday = 0;
            save.lastAdResetDate = now;
            SaveManager.getInstance().markDirty();
        }
    }

    private updateLimitsAfterSuccess(): void {
        const now = TimeProvider.now();
        this.lastRewardedTime = now;
        
        const save = SaveManager.getInstance().load();
        this.resetDailyIfNeeded(save, now);
        save.adsToday = (save.adsToday || 0) + 1;
        
        SaveManager.getInstance().markDirty();
    }
}
