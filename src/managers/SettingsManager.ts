import { EventBus } from '../core/EventBus';

export type ThemeType = 'classic' | 'dark' | 'high-contrast';

export interface ISettings {
    sfxVolume: number;
    musicVolume: number;
    screenShake: boolean;
    haptics: boolean;
    reducedMotion: boolean;
    theme: ThemeType;
}

export const SETTINGS_EVENTS = {
    SETTINGS_CHANGED: 'SETTINGS_CHANGED'
} as const;

export class SettingsManager {
    private static SETTINGS_KEY = 'boxinc_settings';
    private static instance: SettingsManager;
    private settings: ISettings;

    private constructor() {
        this.settings = this.load();
        this.applyTheme(this.settings.theme);
    }

    public static getInstance(): SettingsManager {
        if (!SettingsManager.instance) {
            SettingsManager.instance = new SettingsManager();
        }
        return SettingsManager.instance;
    }

    private load(): ISettings {
        const defaultSettings: ISettings = {
            sfxVolume: 1.0,
            musicVolume: 1.0,
            screenShake: true,
            haptics: true,
            reducedMotion: false,
            theme: 'classic'
        };

        const data = localStorage.getItem(SettingsManager.SETTINGS_KEY);
        if (!data) return defaultSettings;

        try {
            const parsed = JSON.parse(data);
            return { ...defaultSettings, ...parsed };
        } catch (e) {
            return defaultSettings;
        }
    }

    public save(): void {
        localStorage.setItem(SettingsManager.SETTINGS_KEY, JSON.stringify(this.settings));
        EventBus.emit(SETTINGS_EVENTS.SETTINGS_CHANGED, this.settings);
    }

    public getSettings(): ISettings {
        return { ...this.settings };
    }

    public updateSettings(partial: Partial<ISettings>): void {
        const oldTheme = this.settings.theme;
        this.settings = { ...this.settings, ...partial };
        
        if (oldTheme !== this.settings.theme) {
            this.applyTheme(this.settings.theme);
        }
        
        this.save();
    }

    private applyTheme(theme: ThemeType): void {
        // Remove old theme classes
        document.body.classList.remove('theme-classic', 'theme-dark', 'theme-high-contrast');
        // Add new theme class
        document.body.classList.add(`theme-${theme}`);
    }
}
