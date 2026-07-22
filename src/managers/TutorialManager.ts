import Phaser from 'phaser';
import { EventBus, EVENTS } from '../core/EventBus';
import { SaveManager } from './SaveManager';
import { AnalyticsManager } from './AnalyticsManager';

export class TutorialManager {
    private scene: Phaser.Scene;
    private overlayContainer: Phaser.GameObjects.Container;
    private instructionText: Phaser.GameObjects.Text;


    constructor(scene: Phaser.Scene) {
        this.scene = scene;
        this.overlayContainer = this.scene.add.container(0, 0);
        this.overlayContainer.setDepth(4000);
        
        const width = this.scene.cameras.main.width;
        
        // Semi-transparent background at top
        const bg = this.scene.add.rectangle(width/2, 80, width - 40, 60, 0x000000, 0.8).setStrokeStyle(2, 0x00FFFF);
        
        this.instructionText = this.scene.add.text(width/2, 80, '', {
            font: 'bold 24px Arial',
            color: '#FFFFFF',
            align: 'center'
        }).setOrigin(0.5);

        this.overlayContainer.add([bg, this.instructionText]);
        this.overlayContainer.setVisible(false);

        this.checkAndStartTutorial();
    }

    private checkAndStartTutorial(): void {
        const save = SaveManager.getInstance().load();
        
        // If they have never merged a box, start step 1
        if (save.stats.totalMerges === 0) {
            this.startStep1();
        } else if (save.stats.boxesBought === 0) {
            this.startStep2();
        } else if (save.stats.shipmentsCompleted === 0) {
            this.startStep3();
        }
    }

    private showInstruction(text: string): void {
        this.instructionText.setText(text);
        this.overlayContainer.setVisible(true);
        
        // Little bounce animation
        this.scene.tweens.add({
            targets: this.overlayContainer,
            y: { from: -50, to: 0 },
            duration: 500,
            ease: 'Bounce.easeOut'
        });
    }

    private hideInstruction(onComplete?: () => void): void {
        this.scene.tweens.add({
            targets: this.overlayContainer,
            y: -100,
            duration: 300,
            ease: 'Power2',
            onComplete: () => {
                this.overlayContainer.setVisible(false);
                if (onComplete) onComplete();
            }
        });
    }

    // --- Steps ---

    private startStep1(): void {
        this.showInstruction("Drag two boxes of the same level together!");
        EventBus.once(EVENTS.BOX_MERGE_SUCCESS, () => {
            this.hideInstruction(() => this.startStep2());
        });
    }

    private startStep2(): void {
        this.showInstruction("Great! Now tap the SHOP button to buy a new box.");
        EventBus.once(EVENTS.BOX_CREATED, () => {
            this.hideInstruction(() => this.startStep3());
        });
    }

    private startStep3(): void {
        this.showInstruction("Your grid produces income. Complete a SHIPMENT!");
        EventBus.once(EVENTS.SHIPMENT_COMPLETED, () => {
            this.hideInstruction(() => this.completeTutorial());
        });
    }

    private completeTutorial(): void {
        this.showInstruction("Tutorial Complete! Have fun!");
        
        AnalyticsManager.getInstance().logEvent('tutorial_completed');
        
        this.scene.time.delayedCall(2000, () => {
            this.hideInstruction();
        });
    }
}
