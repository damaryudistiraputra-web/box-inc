import type { IPlatform, IAnalyticsProvider, IAdsProvider, IPlayerProvider, IStorageProvider, ILocalizationProvider, IDeviceInfo } from './interfaces';

class WebAnalytics implements IAnalyticsProvider {
    async logEvent(_name: string, payload?: any): Promise<boolean> {
        if (!navigator.onLine) return false;
        // Only send to local dev server in development mode
        if (import.meta.env.DEV) {
            try {
                await fetch('/log', {
                    method: 'POST',
                    body: JSON.stringify(payload),
                });
            } catch (e) {
                // Dev server not running, silent fallback
            }
        }
        return true;
    }
}

class WebAds implements IAdsProvider {
    async initialize(): Promise<void> {}
    async preload(): Promise<void> {}
    isRewardedReady(): boolean { return true; }
    showRewarded(onRewarded: () => void, onClosed: () => void, _onError: (err: any) => void): void {
        console.log('[WebAds] Mock Rewarded Ad');
        setTimeout(() => {
            onRewarded();
            onClosed();
        }, 500);
    }
    isInterstitialReady(): boolean { return true; }
    showInterstitial(onClosed: () => void, _onError: (err: any) => void): void {
        console.log('[WebAds] Mock Interstitial Ad');
        setTimeout(() => onClosed(), 500);
    }
}

class WebPlayer implements IPlayerProvider {
    isLoggedIn(): boolean { return false; }
    async login(): Promise<boolean> { return false; }
}

export class LocalStorageProvider implements IStorageProvider {
    getItem(key: string): string | null {
        return localStorage.getItem(key);
    }
    setItem(key: string, value: string): void {
        localStorage.setItem(key, value);
    }
    removeItem(key: string): void {
        localStorage.removeItem(key);
    }
    async loadCloud(): Promise<string | null> {
        return null;
    }
    async saveCloud(_data: string): Promise<boolean> {
        return false;
    }
}

class WebLocalization implements ILocalizationProvider {
    getLang(): 'en' | 'id' | 'ru' {
        const lang = navigator.language.slice(0, 2);
        if (lang === 'id' || lang === 'ru') return lang as any;
        return 'en';
    }
}

export class WebPlatform implements IPlatform {
    private analytics = new WebAnalytics();
    private ads = new WebAds();
    private player = new WebPlayer();
    private storage = new LocalStorageProvider();
    private localization = new WebLocalization();

    async initialize(): Promise<void> {
        console.log('[WebPlatform] Initialized');
    }
    ready(): void {
        console.log('[WebPlatform] Ready');
    }
    gameplayStart(): void {
        console.log('[WebPlatform] Gameplay Start');
    }
    gameplayStop(): void {
        console.log('[WebPlatform] Gameplay Stop');
    }

    getAnalytics(): IAnalyticsProvider { return this.analytics; }
    getAds(): IAdsProvider { return this.ads; }
    getPlayer(): IPlayerProvider { return this.player; }
    getStorage(): IStorageProvider { return this.storage; }
    getLocalization(): ILocalizationProvider { return this.localization; }
    
    getDevice(): IDeviceInfo {
        const isTouch = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
        const width = window.innerWidth;
        const type = width < 768 ? 'mobile' : (width < 1024 ? 'tablet' : 'desktop');
        
        return {
            type,
            touch: isTouch,
            pixelRatio: window.devicePixelRatio || 1,
            orientation: window.innerHeight > window.innerWidth ? 'portrait' : 'landscape'
        };
    }
}
