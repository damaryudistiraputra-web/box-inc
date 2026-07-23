import Phaser from 'phaser';
import { EventBus, EVENTS } from '../core/EventBus';
import { ProgressionManager } from '../managers/ProgressionManager';
import type { StageInfo } from '../config/StageConfig';

export class ProgressBarUI {
    private scene: Phaser.Scene;
    private container: Phaser.GameObjects.Container;
    private bgBar: Phaser.GameObjects.Graphics;
    private fillBar: Phaser.GameObjects.Graphics;
    private stageText: Phaser.GameObjects.Text;
    private scoreText: Phaser.GameObjects.Text;

    private width: number = 640; // Spans across the 720px screen
    private height: number = 24;

    constructor(scene: Phaser.Scene, x: number, y: number) {
        this.scene = scene;

        this.bgBar = this.scene.add.graphics();
        this.fillBar = this.scene.add.graphics();
        
        // Factory Title is centered above the bar
        this.stageText = this.scene.add.text(this.width / 2, -20, '', { 
            fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
            fontSize: '22px', 
            color: '#F8FAFC',
            fontStyle: 'bold',
            shadow: { offsetX: 0, offsetY: 2, color: '#000000', blur: 4, fill: true }
        }).setOrigin(0.5);

        // Score is centered inside the bar
        this.scoreText = this.scene.add.text(this.width / 2, this.height / 2, '', { 
            fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
            fontSize: '14px',
            fontStyle: 'bold', 
            color: '#FFFFFF',
            shadow: { offsetX: 0, offsetY: 1, color: '#000000', blur: 2, fill: true }
        }).setOrigin(0.5).setDepth(10);

        this.container = this.scene.add.container(x, y, [this.bgBar, this.fillBar, this.stageText, this.scoreText]);

        this.drawBar(0);

        EventBus.on(EVENTS.PROGRESSION_SCORE_UPDATED, this.updateProgress, this);
        EventBus.on(EVENTS.STAGE_ADVANCED, this.onStageAdvanced, this);

        // Initial render
        const pm = ProgressionManager.getInstance();
        this.updateProgress(pm.getScore());
        
        this.scene.events.once('shutdown', this.destroy, this);
    }
    
    private destroy() {
        EventBus.off(EVENTS.PROGRESSION_SCORE_UPDATED, this.updateProgress, this);
        EventBus.off(EVENTS.STAGE_ADVANCED, this.onStageAdvanced, this);
    }

    private drawBar(percent: number) {
        this.bgBar.clear();
        // Dark translucent background
        this.bgBar.fillStyle(0x0F172A, 0.8);
        this.bgBar.fillRoundedRect(0, 0, this.width, this.height, 12);
        // Subtle border
        this.bgBar.lineStyle(2, 0x1E293B, 1);
        this.bgBar.strokeRoundedRect(0, 0, this.width, this.height, 12);

        const targetWidth = Math.min(this.width * percent, this.width);
        
        if (!this.fillBar.getData('currentWidth')) {
            this.fillBar.setData('currentWidth', 0);
        }

        this.scene.tweens.add({
            targets: this.fillBar,
            currentWidth: targetWidth,
            duration: 300,
            ease: 'Cubic.easeOut',
            onUpdate: (tween) => {
                const w = tween.getValue() as number;
                this.fillBar.clear();
                if (w > 0) {
                    // Vibrant blue gradient for progress
                    this.fillBar.fillGradientStyle(0x3B82F6, 0x2563EB, 0x3B82F6, 0x2563EB, 1);
                    this.fillBar.fillRoundedRect(0, 0, w, this.height, 12);
                }
            }
        });
    }

    private updateProgress(score: number) {
        const pm = ProgressionManager.getInstance();
        const currentStage = pm.getCurrentStage();
        const nextStage = pm.getNextStage();

        this.stageText.setText(`🏭 ${currentStage.name}`);

        if (nextStage) {
            const currentThreshold = currentStage.threshold;
            const nextThreshold = nextStage.threshold;
            const progress = score - currentThreshold;
            const required = nextThreshold - currentThreshold;
            const percent = progress / required;
            
            this.drawBar(percent);
            const percentText = Math.floor(percent * 100);
            this.scoreText.setText(`${score} / ${nextThreshold} (${percentText}%)`);
        } else {
            this.drawBar(1);
            this.scoreText.setText(`MAX LEVEL (${score})`);
        }
    }

    private onStageAdvanced(data: { stage: StageInfo, previousStageId: number }) {
        this.stageText.setText(`🏭 ${data.stage.name}`);
        
        // Satisfying pop animation when stage advances
        this.scene.tweens.add({
            targets: this.container,
            scaleX: 1.05,
            scaleY: 1.05,
            duration: 250,
            yoyo: true,
            ease: 'Back.easeOut'
        });
    }
}
