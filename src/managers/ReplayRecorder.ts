import Phaser from 'phaser';
import { EventBus, EVENTS } from '../core/EventBus';
import { TimeProvider } from '../utils/TimeProvider';

interface ReplayEvent {
    timestamp: number;
    eventType: string;
    data: any;
    rngSeed?: number; // Optional seed if we log it during deterministic phases
}

export class ReplayRecorder {
    private static instance: ReplayRecorder;
    private events: ReplayEvent[] = [];
    private sessionStartTime: number;

    private constructor() {
        this.sessionStartTime = TimeProvider.now();
        // Initialize deterministic seed for this session
        Phaser.Math.RND.sow([this.sessionStartTime.toString()]);
        
        this.setupListeners();
    }

    public static getInstance(): ReplayRecorder {
        if (!ReplayRecorder.instance) {
            ReplayRecorder.instance = new ReplayRecorder();
        }
        return ReplayRecorder.instance;
    }

    private setupListeners(): void {
        EventBus.on(EVENTS.BOX_PICKED, (payload: any) => this.record(EVENTS.BOX_PICKED, payload));
        EventBus.on(EVENTS.BOX_DROPPED, (payload: any) => this.record(EVENTS.BOX_DROPPED, payload));
        EventBus.on(EVENTS.SHOP_BUY_REQUEST, (payload: any) => this.record(EVENTS.SHOP_BUY_REQUEST, payload));
        // We can add random seed logic here when we implement a deterministic RNG
        // Example: EventBus.on('RNG_SEED_SET', (seed: number) => this.record('RNG_SEED_SET', { seed }));
    }

    private record(eventType: string, data: any): void {
        this.events.push({
            timestamp: TimeProvider.now() - this.sessionStartTime,
            eventType,
            data,
            rngSeed: Number(Phaser.Math.RND.state())
        });
    }

    public dumpReplay(): void {
        console.log('--- REPLAY DUMP ---');
        console.log(JSON.stringify(this.events, null, 2));
    }
}
