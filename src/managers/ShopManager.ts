import { EventBus, EVENTS } from '../core/EventBus';
import { ResourceManager } from './ResourceManager';
import { Modifiers } from './ModifierManager';

export class ShopManager {
    private baseCost: number = 10;
    private costMultiplier: number = 1.15;
    private totalBought: number = 0;
    private isGridFull: boolean = false;

    constructor() {
        this.setupListeners();
    }

    private setupListeners(): void {
        EventBus.on(EVENTS.SHOP_BUY_REQUEST, this.onBuyRequest, this);
        EventBus.on(EVENTS.GRID_FULL, () => { this.isGridFull = true; }, this);
        EventBus.on(EVENTS.GRID_AVAILABLE, () => { this.isGridFull = false; }, this);
    }

    public getNextBoxCost(): bigint {
        const rawCost = this.baseCost * Math.pow(this.costMultiplier, this.totalBought);
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
            
            this.totalBought++;
            
            // Tell SpawnManager to spawn a box
            EventBus.emit(EVENTS.SHOP_BUY_SUCCESS, { 
                level: Modifiers.startingLevel 
            });
        } else {
            EventBus.emit(EVENTS.SHOP_BUY_FAILED, { reason: 'Insufficient funds' });
        }
    }
}
