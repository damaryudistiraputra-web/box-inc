import { EventBus, EVENTS } from '../core/EventBus';
import { ResourceManager } from './ResourceManager';
import { Modifiers } from './ModifierManager';

import { StatisticsManager } from './StatisticsManager';

export class ShopManager {
    private static instance: ShopManager;
    private baseCost: number = 10;
    private costMultiplier: number = 1.15;
    private isGridFull: boolean = false;

    private constructor() {
        this.setupListeners();
    }
    
    public static getInstance(): ShopManager {
        if (!ShopManager.instance) {
            ShopManager.instance = new ShopManager();
        }
        return ShopManager.instance;
    }

    private setupListeners(): void {
        EventBus.on(EVENTS.SHOP_BUY_REQUEST, this.onBuyRequest, this);
        EventBus.on(EVENTS.GRID_FULL, () => { this.isGridFull = true; }, this);
        EventBus.on(EVENTS.GRID_AVAILABLE, () => { this.isGridFull = false; }, this);
    }

    public getNextBoxCost(): bigint {
        const totalBought = StatisticsManager.getInstance().getStats().boxesBought || 0;
        const rawCost = this.baseCost * Math.pow(this.costMultiplier, totalBought);
        const discountedCost = rawCost * Modifiers.discountMultiplier;
        return BigInt(Math.floor(discountedCost));
    }

    private onBuyRequest(): void {
        const cost = this.getNextBoxCost();
        const resourceManager = ResourceManager.getInstance();

        if (this.isGridFull) {
            EventBus.emit(EVENTS.SHOP_BUY_FAILED, { reason: 'Grid is full' });
            return;
        }
        
        if (resourceManager.hasEnough('money', cost)) {
            EventBus.emit(EVENTS.RESOURCE_SPEND, { id: 'money', amount: cost });
            
            // Tell SpawnManager to spawn a box
            EventBus.emit(EVENTS.SHOP_BUY_SUCCESS, { 
                level: Modifiers.startingLevel 
            });
        } else {
            EventBus.emit(EVENTS.SHOP_BUY_FAILED, { reason: 'Insufficient funds' });
        }
    }
}
