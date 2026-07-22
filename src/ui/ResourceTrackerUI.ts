import Phaser from 'phaser';
import { EventBus, EVENTS } from '../core/EventBus';

export class ResourceTrackerUI extends Phaser.GameObjects.Container {
    private resourceId: string;
    private balanceText: Phaser.GameObjects.Text;
    private labelText: Phaser.GameObjects.Text;

    constructor(scene: Phaser.Scene, x: number, y: number, resourceId: string, label: string) {
        super(scene, x, y);
        this.resourceId = resourceId;

        const bg = scene.add.graphics();
        bg.fillStyle(0x000000, 0.5);
        bg.fillRoundedRect(0, -10, 150, 40, 20);

        this.labelText = scene.add.text(15, 0, label, {
            fontFamily: 'Arial',
            fontSize: '16px',
            color: '#aaaaaa'
        });

        this.balanceText = scene.add.text(this.labelText.x + this.labelText.width + 5, 0, '0', {
            fontFamily: 'Arial',
            fontSize: '18px',
            fontStyle: 'bold',
            color: '#44ffa5'
        });

        this.add([bg, this.labelText, this.balanceText]);
        scene.add.existing(this);

        this.setupListeners();
    }

    private setupListeners(): void {
        EventBus.on(EVENTS.RESOURCE_CHANGED, this.onResourceChanged, this);
        
        // Cleanup on destroy
        this.on('destroy', () => {
            EventBus.off(EVENTS.RESOURCE_CHANGED, this.onResourceChanged, this);
        });
    }

    private onResourceChanged(payload: { id: string, amount: bigint, delta: bigint }): void {
        if (payload.id === this.resourceId) {
            this.balanceText.setText(payload.amount.toString());
            
            // Pop animation on text
            this.scene.tweens.add({
                targets: this.balanceText,
                scaleX: 1.2,
                scaleY: 1.2,
                yoyo: true,
                duration: 100
            });
        }
    }
}
