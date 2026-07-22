import { describe, it, expect } from 'vitest';
import { MergeValidator } from '../src/managers/MergeValidator';
import type { BoxEntity } from '../src/entities/BoxEntity';
import { BOX_CONFIG } from '../src/config/BoxConfig';

describe('MergeValidator', () => {
    
    it('should reject same box instance', () => {
        const box1 = { getLevel: () => 1 } as BoxEntity;
        
        const result = MergeValidator.canMerge(box1, box1);
        expect(result).toBe(false);
    });

    it('should reject different levels', () => {
        const box1 = { getLevel: () => 1 } as BoxEntity;
        const box2 = { getLevel: () => 2 } as BoxEntity;
        
        const result = MergeValidator.canMerge(box1, box2);
        expect(result).toBe(false);
    });

    it('should reject max level', () => {
        const max = Object.keys(BOX_CONFIG).length;
        const box1 = { getLevel: () => max } as BoxEntity;
        const box2 = { getLevel: () => max } as BoxEntity;
        
        const result = MergeValidator.canMerge(box1, box2);
        expect(result).toBe(false);
    });

    it('should approve valid merge', () => {
        const box1 = { getLevel: () => 1 } as BoxEntity;
        const box2 = { getLevel: () => 1 } as BoxEntity;
        
        const result = MergeValidator.canMerge(box1, box2);
        expect(result).toBe(true);
    });
});
