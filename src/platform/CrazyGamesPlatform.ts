/**
 * CrazyGamesPlatform.ts
 * Integration with CrazyGames SDK v3 (https://docs.crazygames.com/sdk/html5/)
 * SDK is loaded via <script> tag in index.html, available as window.CrazyGames.SDK
 */

import type {
    IPlatform,
    IAnalyticsProvider,
    IAdsProvider,
    IPlayerProvider,
    IStorageProvider,
    ILocalizationProvider,
    IDeviceInfo,
} from './interfaces';
import { LocalStorageProvider } from './WebPlatform';

// Type stubs for the CrazyGames SDK global
declare global {
    interface Window {
        CrazyGames?: {
            SDK: {
                init(): Promise<void>;
                game: {
                    gameplayStart(): void;
                    gameplayStop(): void;
                    happytime(): void;
                    sdkGameLoadingStart(): void;
                    sdkGameLoadingStop(): void;
                };
                ad: {
                    requestAd(
                        type: 'midgame' | 'rewarded',
                        callbacks: {
                            adStarted?: () => void;
                            adFinished?: () => void;
                            adError?: (error: any) => void;
                        }
                    ): void;
                    hasAdblock(): Promise<boolean>;
                };
                user: {
                    isUserAccountAvailable: boolean;
                    getUser(): Promise<{ username: string; profilePicture: string } | null>;
                    showAuthPrompt(): Promise<{ username: string } | null>;
                };
            };
        };
    }
}

// ─── Analytics ────────────────────────────────────────────────────────────────

class CrazyGamesAnalytics implements IAnalyticsProvider {
    async logEvent(name: string, payload?: any): Promise<boolean> {
        // CrazyGames SDK v3 has no custom analytics endpoint — log locally only
        if (import.meta.env.DEV) {
            console.log(`[CrazyGames Analytics] ${name}`, payload);
        }
        return true;
    }
}

// ─── Ads ──────────────────────────────────────────────────────────────────────

class CrazyGamesAds implements IAdsProvider {
    private sdk = window.CrazyGames!.SDK;
    private rewardedReady = true;  // CrazyGames handles readiness internally

    async initialize(): Promise<void> {}
    async preload(): Promise<void> {}

    isRewardedReady(): boolean { return this.rewardedReady; }

    showRewarded(
        onRewarded: () => void,
        onClosed: () => void,
        onError: (err: any) => void
    ): void {
        this.sdk.game.gameplayStop();

        this.sdk.ad.requestAd('rewarded', {
            adStarted: () => {
                console.log('[CrazyGames] Rewarded ad started');
            },
            adFinished: () => {
                this.sdk.game.gameplayStart();
                onRewarded();
                onClosed();
            },
            adError: (err: any) => {
                console.warn('[CrazyGames] Rewarded ad error:', err);
                this.sdk.game.gameplayStart();
                onError(err);
            },
        });
    }

    isInterstitialReady(): boolean { return true; }

    showInterstitial(onClosed: () => void, onError: (err: any) => void): void {
        this.sdk.game.gameplayStop();

        this.sdk.ad.requestAd('midgame', {
            adStarted: () => {
                console.log('[CrazyGames] Midgame ad started');
            },
            adFinished: () => {
                this.sdk.game.gameplayStart();
                onClosed();
            },
            adError: (err: any) => {
                console.warn('[CrazyGames] Midgame ad error:', err);
                this.sdk.game.gameplayStart();
                onError(err);
            },
        });
    }
}

// ─── Player ───────────────────────────────────────────────────────────────────

class CrazyGamesPlayer implements IPlayerProvider {
    private sdk = window.CrazyGames!.SDK;
    private loggedIn = false;

    isLoggedIn(): boolean { return this.loggedIn; }

    async login(): Promise<boolean> {
        try {
            const user = await this.sdk.user.showAuthPrompt();
            this.loggedIn = !!user;
            return this.loggedIn;
        } catch {
            return false;
        }
    }
}

// ─── Localization ─────────────────────────────────────────────────────────────

class CrazyGamesLocalization implements ILocalizationProvider {
    getLang(): 'en' | 'id' | 'ru' {
        const lang = navigator.language.slice(0, 2);
        if (lang === 'id' || lang === 'ru') return lang as any;
        return 'en';
    }
}

// ─── Platform ─────────────────────────────────────────────────────────────────

export class CrazyGamesPlatform implements IPlatform {
    private analytics = new CrazyGamesAnalytics();
    private ads!: CrazyGamesAds;
    private player!: CrazyGamesPlayer;
    private storage = new LocalStorageProvider();
    private localization = new CrazyGamesLocalization();

    async initialize(): Promise<void> {
        if (!window.CrazyGames?.SDK) {
            throw new Error('CrazyGames SDK not available');
        }

        const sdk = window.CrazyGames.SDK;
        sdk.game.sdkGameLoadingStart();

        // Timeout guard: if not on CrazyGames portal, sdk.init() may hang
        const initWithTimeout = Promise.race([
            sdk.init(),
            new Promise<void>((_, reject) =>
                setTimeout(() => reject(new Error('[CrazyGamesPlatform] sdk.init() timed out — not on CrazyGames portal')), 3000)
            )
        ]);

        await initWithTimeout;

        this.ads = new CrazyGamesAds();
        this.player = new CrazyGamesPlayer();

        sdk.game.sdkGameLoadingStop();
        console.log('[CrazyGamesPlatform] Initialized');
    }

    ready(): void {
        window.CrazyGames?.SDK.game.sdkGameLoadingStop();
    }

    gameplayStart(): void {
        window.CrazyGames?.SDK.game.gameplayStart();
    }

    gameplayStop(): void {
        window.CrazyGames?.SDK.game.gameplayStop();
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
            orientation: window.innerHeight > window.innerWidth ? 'portrait' : 'landscape',
        };
    }
}
