import { BoxEntity } from '../entities/BoxEntity';
import { BOX_CONFIG } from '../config/BoxConfig';

export class MergeValidator {
    public static canMerge(sourceBox: BoxEntity, targetBox: BoxEntity | null): boolean {
        // Edge case: Target is empty
        if (!targetBox) return false;
        
        // Edge case: Same instance
        if (sourceBox === targetBox) return false;
        
        // Edge case: Levels do not match
        if (sourceBox.getLevel() !== targetBox.getLevel()) return false;
        
        // Edge case: Max level reached
        const nextLevel = sourceBox.getLevel() + 1;
        if (!BOX_CONFIG[nextLevel]) return false;
        
        return true;
    }
}
