import { EventBus } from '../core/EventBus';
import { SaveManager } from './SaveManager';
import { GameBalance, AdsConfig, AdsBalance, FeatureFlags } from '../config/GameBalance';
import { PlatformManager } from '../platform/PlatformManager';
import { ConfigSchema } from '../config/ConfigSchema';
import { FeatureRegistry } from '../config/FeatureRegistry';
import { generateStringChecksum } from '../utils/SaveValidator';

export interface RemoteConfigPayload {
    version: number;
    economy: {
        criticalMergeChance: number;
        goldenTruckFillRate: number;
        shipmentRewardMultiplier: number;
        prestigeBonus: number;
    };
    features: {
        shipment: boolean;
        goldenTruck: boolean;
        criticalMerge: boolean;
        combo: boolean;
        prestige: boolean;
        ads: boolean;
        achievement: boolean;
        tutorial: boolean;
        dailyLogin: boolean;
        cloudSave: boolean;
    };
    ads: {
        rewardedEnabled: boolean;
        shipmentDoubleReward: boolean;
        goldenTruckDoubleLoot: boolean;
        rewardedCooldown: number;
        dailyLimit: number;
    };
    abTesting: {
        variantStrategy: string;
    };
    experiments?: ExperimentConfig[];
}

export interface ExperimentConfig {
    id: string;
    enabled: boolean;
    priority: number;
    allocation: number; // 0-100
    target?: string[];
    overrides: any;
}

export class RemoteConfigManager {
    private static instance: RemoteConfigManager;
    private currentConfigVersion: number = 0;
    private activeVariant: 'A' | 'B' | 'C' = 'A';
    private activeExperiments: string[] = [];
    private currentConfigHash: string = '';
    private currentConfigSignature: string = '';
    private lastFetchTime: number = 0;
    // @ts-ignore
    private fetchTimer: any;
    
    private constructor() {
        // Will initialize later to allow SaveManager to load first
    }

    public static getInstance(): RemoteConfigManager {
        if (!RemoteConfigManager.instance) {
            RemoteConfigManager.instance = new RemoteConfigManager();
        }
        return RemoteConfigManager.instance;
    }

    public async initialize(): Promise<void> {
        this.determineVariant();
        
        await this.fetchConfig();
        
        // Poll every 5 minutes
        this.fetchTimer = setInterval(() => {
            void this.fetchConfig();
        }, 5 * 60 * 1000);
    }

    private determineVariant(): void {
        const save = SaveManager.getInstance().load();
        const deviceId = save.deviceId;
        
        if (!deviceId) {
            this.activeVariant = 'A';
            return;
        }
        
        const mod = this.getHashMod(deviceId);
        
        if (mod < 33) {
            this.activeVariant = 'A';
        } else if (mod < 66) {
            this.activeVariant = 'B';
        } else {
            this.activeVariant = 'C';
        }
    }

    private getHashMod(str: string): number {
        let hash = 0;
        for (let i = 0; i < str.length; i++) {
            hash = (hash << 5) - hash + str.charCodeAt(i);
            hash |= 0; 
        }
        return Math.abs(hash) % 100; // 0-99
    }

    public getVariant(): 'A' | 'B' | 'C' {
        return this.activeVariant;
    }
    
    public getActiveExperiments(): string[] {
        return this.activeExperiments;
    }
    
    public getConfigVersion(): number {
        return this.currentConfigVersion;
    }

    public async fetchConfig(): Promise<void> {
        try {
            // Timestamp prevents caching
            const res = await fetch(`/config.json?v=${Date.now()}`);
            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            
            const raw = await res.json() as RemoteConfigPayload;
            
            if (this.validateConfig(raw)) {
                this.applyConfig(raw);
            } else {
                console.warn('[RemoteConfig] Validation failed, keeping existing config.');
            }
        } catch (e) {
            console.warn('[RemoteConfig] Failed to fetch remote config, using local fallbacks.', e);
        }
    }

    private validateConfig(config: RemoteConfigPayload): boolean {
        return ConfigSchema.validate(config);
    }

    private applyConfig(config: RemoteConfigPayload): void {
        this.currentConfigVersion = config.version;
        this.currentConfigHash = generateStringChecksum(JSON.stringify(config));
        this.currentConfigSignature = (config as any).signature || 'unsigned';
        this.lastFetchTime = Date.now();

        // Process standard config
        this.applyPayload(config);
        
        // Process Experiments
        this.activeExperiments = [];
        if (config.experiments && Array.isArray(config.experiments)) {
            const deviceId = SaveManager.getInstance().load().deviceId || 'unknown';
            const mod = this.getHashMod(deviceId);
            const currentPlatform = PlatformManager.getDevice().type;
            
            // Sort by priority ascending so highest priority overwrites lower
            const validExps = config.experiments
                .filter(exp => exp.enabled)
                .filter(exp => !exp.target || exp.target.length === 0 || exp.target.includes(currentPlatform))
                .sort((a, b) => a.priority - b.priority);
                
            let currentOffset = 0;
            
            for (const exp of validExps) {
                // Check allocation bucket
                const bucketStart = currentOffset;
                const bucketEnd = currentOffset + exp.allocation;
                currentOffset += exp.allocation;
                
                if (mod >= bucketStart && mod < bucketEnd) {
                    this.activeExperiments.push(exp.id);
                    if (exp.overrides) {
                        this.applyPayload(exp.overrides);
                    }
                }
            }
        }
        
        // @ts-ignore
        window.__configVersion = config.version;
        // @ts-ignore
        window.__configVariant = this.activeVariant;
        // @ts-ignore
        window.__configHash = this.currentConfigHash;
        
        console.log(`[RemoteConfig] Applied v${config.version} (Hash: ${this.currentConfigHash.substring(0,8)}). Exps: [${this.activeExperiments.join(',')}]`);
        EventBus.emit('CONFIG_UPDATED');
    }

    private applyPayload(payload: any): void {
        if (payload.economy) {
            if (payload.economy.criticalMergeChance !== undefined) FeatureRegistry.Economy.criticalChance = payload.economy.criticalMergeChance;
            if (payload.economy.goldenTruckFillRate !== undefined) FeatureRegistry.Economy.goldenTruckFillRate = payload.economy.goldenTruckFillRate;
            if (payload.economy.shipmentRewardMultiplier !== undefined) FeatureRegistry.Economy.shipmentRewardMultiplier = payload.economy.shipmentRewardMultiplier;
            if (payload.economy.prestigeBonus !== undefined) FeatureRegistry.Economy.prestigeBonus = payload.economy.prestigeBonus;
            
            // Legacy mapping for compatibility
            if (payload.economy.criticalMergeChance !== undefined) GameBalance.CRITICAL_MERGE_CHANCE = payload.economy.criticalMergeChance * 100;
            if (payload.economy.goldenTruckFillRate !== undefined) GameBalance.GOLDEN_TRUCK_FILL_RATE = payload.economy.goldenTruckFillRate;
            if (payload.economy.shipmentRewardMultiplier !== undefined) AdsBalance.shipmentDoubleRewardMultiplier = payload.economy.shipmentRewardMultiplier;
            if (payload.economy.prestigeBonus !== undefined) AdsBalance.prestigeBonus = payload.economy.prestigeBonus;
        }
        
        if (payload.features) {
            Object.assign(FeatureRegistry.Gameplay, payload.features);
            Object.assign(FeatureFlags, payload.features); // Legacy
        }
        
        if (payload.ads) {
            Object.assign(FeatureRegistry.Ads, payload.ads);
            if (payload.ads.rewardedEnabled !== undefined) AdsConfig.rewardedEnabled = payload.ads.rewardedEnabled;
            if (payload.ads.shipmentDoubleReward !== undefined) AdsConfig.shipmentDoubleReward = payload.ads.shipmentDoubleReward;
            if (payload.ads.goldenTruckDoubleLoot !== undefined) AdsConfig.goldenTruckDoubleLoot = payload.ads.goldenTruckDoubleLoot;
            if (payload.ads.rewardedCooldown !== undefined) AdsBalance.rewardedCooldown = payload.ads.rewardedCooldown;
            if (payload.ads.dailyLimit !== undefined) AdsBalance.dailyLimit = payload.ads.dailyLimit;
        }
    }

    public getConfigHash(): string { return this.currentConfigHash; }
    public getSignature(): string { return this.currentConfigSignature; }
    public getLastFetchTime(): number { return this.lastFetchTime; }
}
