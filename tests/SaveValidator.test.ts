import { describe, it, expect } from 'vitest';
import { SaveValidator, MoneyRule, LevelRule } from '../src/utils/SaveValidator';
import type { IGameSave } from '../src/interfaces/IGameSave';

describe('SaveValidator', () => {
    
    it('should reject negative money', () => {
        const rule = new MoneyRule();
        
        const badSave = { resources: { money: "-100" } } as IGameSave;
        const goodSave = { resources: { money: "500" } } as IGameSave;
        
        expect(rule.validate(badSave)).toBe(false);
        expect(rule.validate(goodSave)).toBe(true);
    });

    it('should reject impossible levels', () => {
        const rule = new LevelRule();
        
        const badSave = { stats: { highestBoxLevel: 999 } } as IGameSave;
        const goodSave = { stats: { highestBoxLevel: 5 } } as IGameSave;
        
        expect(rule.validate(badSave)).toBe(false);
        expect(rule.validate(goodSave)).toBe(true);
    });

    it('SaveValidator should validate all rules', () => {
        const validator = new SaveValidator();
        
        const goodSave = {
            resources: { money: "0" },
            stats: { highestBoxLevel: 1 },
            grid: { boxes: [] }
        } as IGameSave;
        
        const result = validator.validate(goodSave);
        expect(result.valid).toBe(true);
    });
});
