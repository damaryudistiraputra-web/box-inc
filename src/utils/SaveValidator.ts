import type { IGameSave } from '../interfaces/IGameSave';
import { BOX_CONFIG } from '../config/BoxConfig';

export interface ISaveWrapper {
    checksum: string;
    payload: IGameSave;
}

export function generateStringChecksum(str: string): string {
    let hash = 5381;
    for (let i = 0; i < str.length; i++) {
        hash = ((hash << 5) + hash) + str.charCodeAt(i); /* hash * 33 + c */
    }
    // Return unsigned 32-bit hex string
    return (hash >>> 0).toString(16);
}

export function generateChecksum(save: IGameSave): string {
    return generateStringChecksum(JSON.stringify(save));
}

export interface IValidationRule {
    validate(save: IGameSave): boolean;
    getErrorMessage(): string;
}

export class MoneyRule implements IValidationRule {
    public validate(save: IGameSave): boolean {
        return typeof save.resources?.money === 'string' && !save.resources.money.startsWith('-');
    }
    public getErrorMessage(): string {
        return "Money cannot be negative or invalid type.";
    }
}

export class LevelRule implements IValidationRule {
    public validate(save: IGameSave): boolean {
        const maxLevel = Object.keys(BOX_CONFIG).length;
        const highest = save.stats?.highestBoxLevel || 1;
        return highest >= 1 && highest <= maxLevel + 20; // buffer
    }
    public getErrorMessage(): string {
        return "Highest level box exceeds logical maximum bounds.";
    }
}

export class GridRule implements IValidationRule {
    public validate(save: IGameSave): boolean {
        if (!save.grid?.boxes) return false;
        
        // 3x3 grid means col and row should be between 0 and 2 (or slightly larger if grid expands later)
        const validCoords = save.grid.boxes.every(b => b.col >= 0 && b.col < 10 && b.row >= 0 && b.row < 10);
        return validCoords;
    }
    public getErrorMessage(): string {
        return "Grid contains invalid box coordinates.";
    }
}

export class SaveValidator {
    private rules: IValidationRule[] = [];

    constructor() {
        this.addRule(new MoneyRule());
        this.addRule(new LevelRule());
        this.addRule(new GridRule());
    }

    public addRule(rule: IValidationRule): void {
        this.rules.push(rule);
    }

    public validate(save: IGameSave): { valid: boolean, error?: string } {
        for (const rule of this.rules) {
            if (!rule.validate(save)) {
                return { valid: false, error: rule.getErrorMessage() };
            }
        }
        return { valid: true };
    }
}
