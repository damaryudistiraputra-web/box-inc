import { ProgressionManager } from './ProgressionManager';
import { STAGES } from '../config/StageConfig';

export class FeatureGate {
    /**
     * Checks if a feature is unlocked based on the current stage and all previous stages.
     * @param featureId The string ID of the feature (e.g. 'shipment', 'luckyBox')
     */
    public static isUnlocked(featureId: string): boolean {
        const pm = ProgressionManager.getInstance();
        const currentStageId = pm.getCurrentStage().id;
        
        // A feature is unlocked if ANY stage up to the current stage unlocks it
        for (const stage of STAGES) {
            if (stage.id <= currentStageId) {
                if (stage.unlocks.includes(featureId)) {
                    return true;
                }
            }
        }
        
        return false;
    }
}
