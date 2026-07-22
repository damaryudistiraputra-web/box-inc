import type { IPlatform, IAnalyticsProvider, IAdsProvider, IPlayerProvider, IStorageProvider, ILocalizationProvider, IDeviceInfo } from './interfaces';
import { WebPlatform } from './WebPlatform';
import { YandexPlatform } from './YandexPlatform';

export class PlatformManager {
    private static instance: PlatformManager;
    private platform!: IPlatform;

    private constructor() {
        // Simple platform detection
        const urlParams = new URLSearchParams(window.location.search);
        // Sometimes yandex adds params, or we can check window.ysdk
        if (typeof (window as any).ysdk !== 'undefined' || urlParams.has('yandex')) {
            this.platform = new YandexPlatform();
        } else {
            this.platform = new WebPlatform();
        }
    }

    public static getInstance(): PlatformManager {
        if (!PlatformManager.instance) {
            PlatformManager.instance = new PlatformManager();
        }
        return PlatformManager.instance;
    }

    // Pass-through façade methods
    public static async initialize(): Promise<void> {
        try {
            await this.getInstance().platform.initialize();
        } catch (e) {
            console.error('[PlatformManager] Primary platform failed, falling back to WebPlatform', e);
            if (!(this.getInstance().platform instanceof WebPlatform)) {
                this.getInstance().platform = new WebPlatform();
                await this.getInstance().platform.initialize();
                
                // Track fallback if analytics is working locally
                this.getAnalytics().logEvent('platform_fallback', { reason: String(e) });
            }
        }
    }

    public static ready(): void {
        this.getInstance().platform.ready();
    }

    public static gameplayStart(): void {
        this.getInstance().platform.gameplayStart();
    }

    public static gameplayStop(): void {
        this.getInstance().platform.gameplayStop();
    }

    public static getAnalytics(): IAnalyticsProvider {
        return this.getInstance().platform.getAnalytics();
    }

    public static getAds(): IAdsProvider {
        return this.getInstance().platform.getAds();
    }

    public static getPlayer(): IPlayerProvider {
        return this.getInstance().platform.getPlayer();
    }

    public static getStorage(): IStorageProvider {
        return this.getInstance().platform.getStorage();
    }

    public static getLocalization(): ILocalizationProvider {
        return this.getInstance().platform.getLocalization();
    }

    public static getDevice(): IDeviceInfo {
        return this.getInstance().platform.getDevice();
    }
    
    // Test hook for forcing platform override
    public static forcePlatform(platform: IPlatform): void {
        this.getInstance().platform = platform;
    }
}
