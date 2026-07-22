export class ModifierManager {
    public incomeMultiplier: number = 1.0;
    public discountMultiplier: number = 1.0;
    public startingLevel: number = 1;
    public criticalChance: number = 0.05; // 5% chance
    public criticalMultiplier: number = 2.0;
}

// Singleton for easy access across entities without tight coupling dependencies
export const Modifiers = new ModifierManager();
