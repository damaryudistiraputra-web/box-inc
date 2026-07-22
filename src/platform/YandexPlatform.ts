import type { IPlatform, IAnalyticsProvider, IAdsProvider, IPlayerProvider, IStorageProvider, ILocalizationProvider, IDeviceInfo } from './interfaces';
import { LocalStorageProvider } from './WebPlatform';
import { PlatformConfig } from '../config/GameBalance';

declare const window: any;

class YandexAnalytics implements IAnalyticsProvider {
    async logEvent(name: string, payload?: any): Promise<boolean> {
        if (!navigator.onLine) return false;
        
        if (window.ysdk && window.ysdk.features && window.ysdk.features.GameplayAPI) {
            if (typeof window.ym !== 'undefined' && window.ymCounterId) {
                window.ym(window.ymCounterId, 'reachGoal', name, payload);
            }
        }
        return true;
    }
}

class YandexAds implements IAdsProvider {
    async initialize(): Promise<void> {}
    async preload(): Promise<void> {}
    isRewardedReady(): boolean {
        return !!(window.ysdk && window.ysdk.adv);
    }
    showRewarded(onRewarded: () => void, onClosed: () => void, onError: (err: any) => void): void {
        if (!this.isRewardedReady()) return onError(new Error("Ad not ready"));
        window.ysdk.adv.showRewardedVideo({
            callbacks: {
                onOpen: () => {},
                onRewarded: () => { onRewarded(); },
                onClose: () => { onClosed(); }, 
                onError: (e: any) => { console.error('Video error', e); onError(e); }
            }
        });
    }
    isInterstitialReady(): boolean {
        return !!(window.ysdk && window.ysdk.adv);
    }
    showInterstitial(onClosed: () => void, onError: (err: any) => void): void {
        if (!this.isInterstitialReady()) return onError(new Error("Ad not ready"));
        window.ysdk.adv.showFullscreenAdv({
            callbacks: {
                onClose: (_wasShown: boolean) => { onClosed(); },
                onError: (e: any) => { console.error('Ad error', e); onError(e); }
            }
        });
    }
}

class YandexPlayer implements IPlayerProvider {
    private playerObj: any = null;
    isLoggedIn(): boolean {
        return !!this.playerObj;
    }
    async login(): Promise<boolean> {
        if (!window.ysdk) return false;
        try {
            this.playerObj = await window.ysdk.getPlayer({ scopes: false });
            return true;
        } catch (e) {
            console.error('Yandex player login error', e);
            return false;
        }
    }
    public getPlayerObj(): any {
        return this.playerObj;
    }
}

class YandexStorageProvider extends LocalStorageProvider {
    private yPlayer: YandexPlayer;
    constructor(player: YandexPlayer) {
        super();
        this.yPlayer = player;
    }
    async loadCloud(): Promise<string | null> {
        if (!this.yPlayer.isLoggedIn()) return null;
        try {
            const data = await this.yPlayer.getPlayerObj().getData(['boxinc_save']);
            if (data && data.boxinc_save) {
                return data.boxinc_save;
            }
        } catch (e) {
            console.error('Cloud load failed', e);
        }
        return null;
    }
    async saveCloud(data: string): Promise<boolean> {
        if (!this.yPlayer.isLoggedIn()) return false;
        try {
            await this.yPlayer.getPlayerObj().setData({ boxinc_save: data }, true);
            return true;
        } catch (e) {
            console.error('Cloud save failed', e);
            return false;
        }
    }
}

class YandexLocalization implements ILocalizationProvider {
    getLang(): 'en' | 'id' | 'ru' {
        if (window.ysdk && window.ysdk.environment) {
            const lang = window.ysdk.environment.i18n.lang;
            if (lang === 'id' || lang === 'ru') return lang as any;
        }
        return 'en';
    }
}

export class YandexPlatform implements IPlatform {
    private analytics = new YandexAnalytics();
    private ads = new YandexAds();
    private player = new YandexPlayer();
    private storage = new YandexStorageProvider(this.player);
    private localization = new YandexLocalization();

    private initialized = false;

    private async loadYandexSDK(): Promise<void> {
        return new Promise((resolve, reject) => {
            if (typeof window.YaGames !== 'undefined' || typeof window.ysdk !== 'undefined') {
                resolve();
                return;
            }
            console.log('[YandexPlatform] Injecting Yandex SDK script...');
            const script = document.createElement('script');
            script.src = 'https://yandex.ru/games/sdk/v2';
            script.onload = () => resolve();
            script.onerror = () => reject(new Error('Failed to load Yandex SDK script'));
            document.head.appendChild(script);
        });
    }

    async initialize(): Promise<void> {
        if (this.initialized) return;

        try {
            await this.loadYandexSDK();
        } catch (e) {
            throw new Error('Could not load Yandex SDK');
        }

        if (typeof window.YaGames !== 'undefined') {
            return new Promise((resolve, reject) => {
                const timeout = setTimeout(() => {
                    reject(new Error('Yandex SDK initialization timed out'));
                }, PlatformConfig.SDK_TIMEOUT_MS);

                window.YaGames.init().then((ysdk: any) => {
                    clearTimeout(timeout);
                    window.ysdk = ysdk;
                    this.initialized = true;
                    console.log('[YandexPlatform] Initialized');
                    resolve();
                }).catch((e: any) => {
                    clearTimeout(timeout);
                    console.error('[YandexPlatform] Init failed', e);
                    reject(e);
                });
            });
        } else {
            console.warn('[YandexPlatform] YaGames not found in global, but ysdk might be mock injected');
            if (window.ysdk) {
                this.initialized = true;
                return Promise.resolve();
            }
            throw new Error('No Yandex SDK available to initialize');
        }
    }
    
    ready(): void {
        if (this.initialized && window.ysdk.features.LoadingAPI) {
            window.ysdk.features.LoadingAPI.ready();
        }
    }
    
    gameplayStart(): void {
        if (this.initialized && window.ysdk.features.GameplayAPI) {
            window.ysdk.features.GameplayAPI.start();
        }
    }
    
    gameplayStop(): void {
        if (this.initialized && window.ysdk.features.GameplayAPI) {
            window.ysdk.features.GameplayAPI.stop();
        }
    }

    getAnalytics(): IAnalyticsProvider { return this.analytics; }
    getAds(): IAdsProvider { return this.ads; }
    getPlayer(): IPlayerProvider { return this.player; }
    getStorage(): IStorageProvider { return this.storage; }
    getLocalization(): ILocalizationProvider { return this.localization; }
    
    getDevice(): IDeviceInfo {
        let type: 'mobile' | 'tablet' | 'desktop' = 'desktop';
        if (window.ysdk && window.ysdk.deviceInfo) {
            const yType = window.ysdk.deviceInfo.type;
            if (yType === 'mobile' || yType === 'tablet') type = yType;
        } else {
            // fallback
            const width = window.innerWidth;
            type = width < 768 ? 'mobile' : (width < 1024 ? 'tablet' : 'desktop');
        }

        return {
            type,
            touch: 'ontouchstart' in window || navigator.maxTouchPoints > 0,
            pixelRatio: window.devicePixelRatio || 1,
            orientation: window.innerHeight > window.innerWidth ? 'portrait' : 'landscape'
        };
    }
}
