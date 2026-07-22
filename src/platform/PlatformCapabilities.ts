import { PlatformManager } from './PlatformManager';

export class PlatformCapabilities {
    public static supportsAds(): boolean {
        // Safe check without crashing if PlatformManager isn't fully set up yet
        try {
            return PlatformManager.getAds().isRewardedReady() || PlatformManager.getAds().isInterstitialReady();
        } catch {
            return false;
        }
    }

    public static supportsCloudSave(): boolean {
        // Will be true on Yandex
        return false;
    }

    public static supportsLeaderboards(): boolean {
        return false;
    }

    public static supportsAchievements(): boolean {
        return false; // For platform-level achievements
    }

    public static supportsPayments(): boolean {
        return false;
    }
}
