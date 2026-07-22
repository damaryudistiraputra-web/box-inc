import { EventBus, EVENTS } from '../core/EventBus';

export class ResourceManager {
    private static instance: ResourceManager;
    private balances: Map<string, bigint> = new Map();

    private constructor() {
        this.setupListeners();
        this.balances.set('money', 0n);
    }

    public static getInstance(): ResourceManager {
        if (!ResourceManager.instance) {
            ResourceManager.instance = new ResourceManager();
        }
        return ResourceManager.instance;
    }

    public init(initialMoney: bigint = 0n): void {
        this.balances.set('money', initialMoney);
    }

    private setupListeners(): void {
        EventBus.on(EVENTS.RESOURCE_ADD, this.onResourceAdd, this);
        EventBus.on(EVENTS.RESOURCE_SPEND, this.onResourceSpend, this);
    }

    public getBalance(resourceId: string): bigint {
        return this.balances.get(resourceId) || 0n;
    }

    private onResourceAdd(payload: { id: string, amount: bigint }): void {
        if (payload.amount <= 0n) return;
        
        const current = this.getBalance(payload.id);
        const next = current + payload.amount;
        
        this.balances.set(payload.id, next);
        
        EventBus.emit(EVENTS.RESOURCE_CHANGED, { 
            id: payload.id, 
            amount: next, 
            delta: payload.amount 
        });
    }

    private onResourceSpend(payload: { id: string, amount: bigint }): void {
        if (payload.amount <= 0n) return;

        const current = this.getBalance(payload.id);
        
        if (current >= payload.amount) {
            const next = current - payload.amount;
            this.balances.set(payload.id, next);
            
            EventBus.emit(EVENTS.RESOURCE_CHANGED, { 
                id: payload.id, 
                amount: next, 
                delta: -payload.amount 
            });
        } else {
            console.warn(`Insufficient ${payload.id} to spend. Required: ${payload.amount}, Has: ${current}`);
        }
    }

    public hasEnough(resourceId: string, amount: bigint): boolean {
        return this.getBalance(resourceId) >= amount;
    }
}
