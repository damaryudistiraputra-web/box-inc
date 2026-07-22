import { AnalyticsManager } from './AnalyticsManager';
import { TimeProvider } from '../utils/TimeProvider';



export class HeatmapManager {
    private static instance: HeatmapManager;
    private histogram: Map<string, number> = new Map();
    private interactionCount: number = 0;
    private lastFlushTime: number = TimeProvider.now();
    
    private static readonly BATCH_SIZE = 50; 
    private static readonly FLUSH_INTERVAL_MS = 30000;
    
    private constructor() {
        // flush on unload
        window.addEventListener('beforeunload', () => {
            this.flush();
        });
    }

    public static getInstance(): HeatmapManager {
        if (!HeatmapManager.instance) {
            HeatmapManager.instance = new HeatmapManager();
        }
        return HeatmapManager.instance;
    }

    public trackInteraction(action: string, gridX: number, gridY: number): void {
        const key = `${action}:${gridX},${gridY}`;
        this.histogram.set(key, (this.histogram.get(key) || 0) + 1);
        this.interactionCount++;

        const now = TimeProvider.now();
        if (this.interactionCount >= HeatmapManager.BATCH_SIZE || (now - this.lastFlushTime) >= HeatmapManager.FLUSH_INTERVAL_MS) {
            this.flush();
        }
    }

    private flush(): void {
        if (this.histogram.size === 0) {
            this.lastFlushTime = TimeProvider.now();
            return;
        }

        // Convert histogram map to JSON string
        const payloadObj: Record<string, number> = {};
        this.histogram.forEach((count, key) => {
            payloadObj[key] = count;
        });

        try {
            // @ts-ignore
            AnalyticsManager.getInstance().logEvent('heatmap_batch', payloadObj);
        } catch(e) {}
        
        this.histogram.clear();
        this.interactionCount = 0;
        this.lastFlushTime = TimeProvider.now();
    }
}
