export interface IAnalyticsProvider {
    logEvent(name: string, payload?: any): Promise<boolean>;
}

export interface IAdsProvider {
    initialize(): Promise<void>;
    preload(): Promise<void>;
    isRewardedReady(): boolean;
    showRewarded(onRewarded: () => void, onClosed: () => void, onError: (err: any) => void): void;
    isInterstitialReady(): boolean;
    showInterstitial(onClosed: () => void, onError: (err: any) => void): void;
}

export interface IPlayerProvider {
    isLoggedIn(): boolean;
    login(): Promise<boolean>;
}

export interface IStorageProvider {
    getItem(key: string): string | null;
    setItem(key: string, value: string): void;
    removeItem(key: string): void;
    // For cloud saves
    loadCloud(): Promise<string | null>;
    saveCloud(data: string): Promise<boolean>;
}

export interface ILocalizationProvider {
    getLang(): 'en' | 'id' | 'ru';
}

export interface IDeviceInfo {
    type: 'mobile' | 'tablet' | 'desktop';
    touch: boolean;
    pixelRatio: number;
    orientation: 'landscape' | 'portrait';
}

export interface IPlatform {
    initialize(): Promise<void>;
    ready(): void;
    gameplayStart(): void;
    gameplayStop(): void;

    getAnalytics(): IAnalyticsProvider;
    getAds(): IAdsProvider;
    getPlayer(): IPlayerProvider;
    getStorage(): IStorageProvider;
    getLocalization(): ILocalizationProvider;
    getDevice(): IDeviceInfo;
}
