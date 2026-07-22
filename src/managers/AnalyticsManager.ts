import { EventBus, EVENTS } from '../core/EventBus';
import { SaveManager } from './SaveManager';
import { ProgressionManager } from './ProgressionManager';
import { TimeProvider } from '../utils/TimeProvider';
import { PlatformManager } from '../platform/PlatformManager';
import { HealthStatus } from '../interfaces/IHealth';
import type { IHealthStats } from '../interfaces/IHealth';

export interface AnalyticsEvent {
    name: string;
    timestamp: number;
    sessionId: string;
    seed: string;
    gameVersion: string;
    buildVersion: string;
    economyVersion: number;
    configVersion?: number;
    configHash?: string;
    configSignature?: string;
    currentVariant?: string;
    platform: string;
    language: string;
    playerStage: number;
    highestBoxLevel: number;
    playtimeSec: number;
    payload?: any;
}

export class AnalyticsManager {
    private static instance: AnalyticsManager;
    private sessionId: string;
    private sessionStartTime: number;
    private droppedEventsCount: number = 0;
    private lastFlushDurationMs: number = 0;
    
    // Config
    private gameVersion = '1.0.8';
    private buildVersion = '4d812ca';
    private debugMode = true;
    
    private eventsQueue: AnalyticsEvent[] = [];
    private MAX_QUEUE_SIZE = 500;
    
    // Rolling Buffer for crash replay
    private sessionReplayBuffer: any[] = [];
    private MAX_REPLAY_BUFFER = 50;
    
    // Backoff state
    private flushTimerEvent?: Phaser.Time.TimerEvent;
    private retryCount = 0;
    private isFlushing = false;
    private baseFlushDelayMs = 5000;
    
    private constructor() {
        this.sessionId = this.generateSessionId();
        this.sessionStartTime = TimeProvider.now();
        
        // Crash Logger
        window.addEventListener('error', (e) => {
            this.handleCrash('error', e.message, e.filename, e.lineno);
        });
        window.addEventListener('unhandledrejection', (e) => {
            this.handleCrash('unhandledrejection', String(e.reason));
        });
        
        this.setupListeners();
        
        // Log session start
        this.logEvent('session_start');
        
        // Listen to window unload for session_end
        window.addEventListener('beforeunload', () => {
            const save = SaveManager.getInstance().load();
            const playtime = Math.floor((TimeProvider.now() - this.sessionStartTime) / 1000);
            
            // Compute Engagement Score
            const sessionCount = 1;
            const merges = save.stats.totalMerges;
            const shipments = save.stats.shipmentsCompleted;
            const ads = save.adsToday || 0;
            const prestiges = save.stats.prestigeCount;
            
            const engagementScore = (sessionCount * 10) + (merges * 0.1) + (shipments * 5) + (ads * 15) + (prestiges * 100);
            
            let playerCategory = 'Likely Churn';
            if (engagementScore > 1000) playerCategory = 'Power Player';
            else if (engagementScore > 300) playerCategory = 'Core Player';
            else if (engagementScore > 50) playerCategory = 'Engaged';
            
            this.logEvent('session_end', {
                playtime: playtime,
                highestStage: ProgressionManager.getInstance().getCurrentStage().id,
                highestBox: save.stats.highestBoxLevel,
                shipments: shipments,
                prestige: prestiges,
                adsWatched: ads,
                inventoryValue: save.resources.money,
                mergeEfficiency: merges / (playtime || 1),
                idleSeconds: 0, // Approximated
                fpsAverage: (window as any).__lastFps || 60,
                droppedEvents: this.droppedEventsCount,
                queueSize: this.eventsQueue.length,
                retryCount: this.retryCount,
                engagementScore: Math.floor(engagementScore),
                playerCategory: playerCategory
            });
            void this.flushQueue(true);
        });
        
        window.addEventListener('visibilitychange', () => {
            if (document.visibilityState === 'hidden') {
                void this.flushQueue(true);
            }
        });
    }

    public initialize(scene: Phaser.Scene): void {
        this.flushTimerEvent = scene.time.addEvent({
            delay: this.baseFlushDelayMs,
            callback: () => { void this.flushQueue(); },
            callbackScope: this,
            loop: false
        });
    }

    public static getInstance(): AnalyticsManager {
        if (!AnalyticsManager.instance) {
            AnalyticsManager.instance = new AnalyticsManager();
        }
        return AnalyticsManager.instance;
    }
    
    private handleCrash(type: string, message: string, filename?: string, lineno?: number): void {
        const save = SaveManager.getInstance().load();
        const state = {
            type,
            message,
            filename,
            lineno,
            stage: ProgressionManager.getInstance().getCurrentStage().id,
            highestBox: save.stats.highestBoxLevel,
            money: save.resources.money,
            blueprints: 0,
            sessionLengthSec: Math.floor((TimeProvider.now() - this.sessionStartTime) / 1000),
            fpsAverage: (window as any).__lastFps || 60,
            activeRewards: 0,
            platform: PlatformManager.getDevice().type,
            language: PlatformManager.getLocalization().getLang(),
            replayBuffer: this.sessionReplayBuffer
        };
        this.logEvent('crash_event', state);
        void this.flushQueue(true); // Attempt synchronous flush before death
    }

    private generateSessionId(): string {
        return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
    }

    private setupListeners(): void {
        EventBus.on(EVENTS.BOX_MERGE_SUCCESS, (data: any) => {
            this.logEvent('box_merged', { fromLevel: data.newLevel - 1, toLevel: data.newLevel });
            
            const save = SaveManager.getInstance().load();
            if (save.stats.totalMerges === 1) {
                this.logEvent('first_merge');
                this.logEvent('funnel_step', { step: 'first_merge' });
            }
        });

        EventBus.on(EVENTS.BOX_CREATED, (data: any) => {
            this.logEvent('box_purchased', { level: data.box.getLevel() });
        });

        EventBus.on(EVENTS.STAGE_ADVANCED, (data: any) => {
            this.logEvent('stage_advanced', { newStage: data.stage.id });
            if (data.stage.id === 3) {
                this.logEvent('funnel_step', { step: 'stage_3' });
            }
        });

        EventBus.on('SHIPMENT_GENERATED', (data: any) => {
            this.logEvent('shipment_generated', { targetTier: data.tier });
        });

        EventBus.on(EVENTS.SHIPMENT_COMPLETED, (data: any) => {
            this.logEvent('shipment_claim', { score: data.scoreVal });
            
            const save = SaveManager.getInstance().load();
            if (save.stats.shipmentsCompleted === 1) {
                this.logEvent('first_shipment');
                this.logEvent('funnel_step', { step: 'first_shipment' });
            }
        });

        EventBus.on(EVENTS.GOLDEN_TRUCK_ARRIVED, () => {
            this.logEvent('golden_truck_spawn');
        });

        EventBus.on(EVENTS.GOLDEN_TRUCK_DEPARTED, () => {
            // Technically just means it's gone. If they claimed it, REWARD_GRANTED logs it.
        });

        EventBus.on(EVENTS.REWARD_GRANTED, (data: any) => {
            this.logEvent('reward_granted', { source: data.source, bundle: data.bundle });
            
            if (data.source === 1) { // Golden Truck
                this.logEvent('golden_truck_claim');
            } else if (data.source === 2) { // Lucky Box
                this.logEvent('lucky_box_triggered');
            }
        });

        EventBus.on(EVENTS.GAME_PRESTIGED, (data: any) => {
            this.logEvent('prestige_executed', { blueprintsGained: data.blueprintsGained });
            const save = SaveManager.getInstance().load();
            if (save.stats.prestigeCount === 1) {
                this.logEvent('funnel_step', { step: 'first_prestige' });
            }
        });

        // Other triggers can be hooked as they are implemented or refactored.
    }

    private buildEvent(name: string, payload?: any): AnalyticsEvent {
        const save = SaveManager.getInstance().load();
        const stage = ProgressionManager.getInstance().getCurrentStage().id;
        const highestBox = save.stats.highestBoxLevel;
        const playtimeSec = Math.floor((TimeProvider.now() - this.sessionStartTime) / 1000);
        const seed = save.stats.totalMerges.toString();

        let configVersion = 0;
        let variant = 'A';
        let configHash = '';
        let configSignature = '';
        try {
            // @ts-ignore
            configVersion = window.__configVersion || 0;
            // @ts-ignore
            variant = window.__configVariant || 'A';
            // @ts-ignore
            configHash = window.__configHash || '';
            // @ts-ignore
            const rcm = require('./RemoteConfigManager').RemoteConfigManager;
            if (rcm && (rcm as any).instance) {
                configSignature = (rcm as any).getInstance().getSignature();
            }
        } catch(e) {}

        return {
            name,
            timestamp: TimeProvider.now(),
            sessionId: this.sessionId,
            seed: seed,
            gameVersion: this.gameVersion,
            economyVersion: save.economyVersion || 1,
            configVersion,
            configHash,
            configSignature,
            currentVariant: variant,
            buildVersion: this.buildVersion,
            platform: PlatformManager.getDevice().type, // Or actual platform name if available
            language: PlatformManager.getLocalization().getLang(),
            playerStage: stage,
            highestBoxLevel: highestBox,
            playtimeSec,
            payload
        };
    }

    public logEvent(name: string, payload?: any): void {
        const evt = this.buildEvent(name, payload);
        
        // Log to console in debug mode
        if (this.debugMode) {
            console.log(`[Analytics] Queued ${name}`, evt);
        }
        
        // Update Replay Buffer for important events
        const IMPORTANT_EVENTS = ['box_merged', 'shipment_claim', 'golden_truck_spawn', 'golden_truck_claim', 'prestige_executed', 'first_merge'];
        if (IMPORTANT_EVENTS.includes(name)) {
            this.sessionReplayBuffer.push({ t: evt.timestamp - this.sessionStartTime, n: name, p: payload });
            if (this.sessionReplayBuffer.length > this.MAX_REPLAY_BUFFER) {
                this.sessionReplayBuffer.shift();
            }
        }
        
        this.eventsQueue.push(evt);
        if (this.eventsQueue.length > this.MAX_QUEUE_SIZE) {
            this.eventsQueue.shift(); // drop oldest
            this.droppedEventsCount++;
        }
    }

    public async flushQueue(isSync: boolean = false): Promise<void> {
        if (this.eventsQueue.length === 0) {
            this.scheduleNextFlush();
            return;
        }

        if (this.isFlushing) return;
        this.isFlushing = true;
        
        const snapshot = [...this.eventsQueue];
        const t0 = TimeProvider.now();
        
        try {
            let success = true;
            for (const evt of snapshot) {
                const res = await PlatformManager.getAnalytics().logEvent(evt.name, evt);
                if (res === false) { success = false; break; }
            }
            
            this.lastFlushDurationMs = TimeProvider.now() - t0;
            
            if (success) {
                // Remove successfully sent events
                this.eventsQueue = this.eventsQueue.slice(snapshot.length);
                this.retryCount = 0;
            } else {
                throw new Error("Analytics SDK failed");
            }
        } catch (e) {
            console.warn(`[Analytics] Flush failed (retry ${this.retryCount}), will backoff`, e);
            this.retryCount++;
        }
        
        this.isFlushing = false;
        
        if (!isSync) {
            this.scheduleNextFlush();
        }
    }
    
    private scheduleNextFlush(): void {
        if (!this.flushTimerEvent) return;
        
        let delay = this.baseFlushDelayMs * Math.pow(2, this.retryCount);
        if (delay > 60000) delay = 60000;
        
        this.flushTimerEvent.reset({
            delay: delay,
            callback: () => { void this.flushQueue(); },
            callbackScope: this,
            loop: false
        });
    }

    public getHealthStats(): IHealthStats {
        let status: HealthStatus = HealthStatus.HEALTHY;
        const qSize = this.eventsQueue.length;
        if (qSize > 500) {
            status = HealthStatus.CRITICAL;
        } else if (qSize > 400) {
            status = HealthStatus.WARNING;
        }
        return {
            status,
            queueSize: qSize,
            lastFlushMs: this.lastFlushDurationMs,
            retryCount: this.retryCount,
            droppedEvents: this.droppedEventsCount
        };
    }
}
