export interface IIncomeSource {
    /**
     * Unique identifier for the income source.
     */
    getId(): string;
    
    /**
     * Gets the amount of resources generated per second.
     * Must return a Record of resource types and their values.
     */
    getIncomePerSecond(): Record<string, bigint>;
    
    /**
     * Checks if this source is currently active and should produce income.
     */
    isActiveSource(): boolean;
}
