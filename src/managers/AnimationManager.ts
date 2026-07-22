import Phaser from 'phaser';
import { EventBus, EVENTS } from '../core/EventBus';
import { BoxEntity } from '../entities/BoxEntity';

export class AnimationManager {
    private scene: Phaser.Scene;

    constructor(scene: Phaser.Scene) {
        this.scene = scene;
        this.setupListeners();
    }

    private setupListeners(): void {
        EventBus.on(EVENTS.BOX_CREATED, this.onBoxCreated, this);
        EventBus.on(EVENTS.BOX_LEVEL_UP, this.onBoxMerge, this);
        EventBus.on(EVENTS.BOX_PICKED, this.onBoxPicked, this);
        EventBus.on(EVENTS.BOX_DROPPED, this.onBoxDropped, this);
    }

    private onBoxCreated(payload: { box: BoxEntity }): void {
        this.playSpawn(payload.box);
        this.playIdle(payload.box);
    }

    private onBoxMerge(payload: { box: BoxEntity }): void {
        this.playMergeSquashStretch(payload.box);
    }

    private onBoxPicked(payload: { box: BoxEntity }): void {
        // Stop idle and scale up slightly
        this.scene.tweens.killTweensOf(payload.box);
        this.scene.tweens.add({
            targets: payload.box,
            scaleX: 1.1,
            scaleY: 1.1,
            duration: 150,
            ease: 'Back.out'
        });
    }

    private onBoxDropped(payload: { box: BoxEntity }): void {
        // Return to normal and resume idle
        this.scene.tweens.killTweensOf(payload.box);
        this.scene.tweens.add({
            targets: payload.box,
            scaleX: 1.0,
            scaleY: 1.0,
            duration: 150,
            ease: 'Back.out',
            onComplete: () => {
                this.playIdle(payload.box);
            }
        });
    }

    private playSpawn(box: BoxEntity): void {
        box.setScale(0);
        this.scene.tweens.add({
            targets: box,
            scaleX: 1,
            scaleY: 1,
            duration: 400,
            ease: 'Elastic.out'
        });
    }

    private playIdle(box: BoxEntity): void {
        // Subtle breathing effect
        this.scene.tweens.add({
            targets: box,
            scaleY: 0.95,
            scaleX: 1.02,
            duration: 1200 + Phaser.Math.RND.frac() * 400, // slightly random offset so they don't sync
            yoyo: true,
            repeat: -1,
            ease: 'Sine.inOut'
        });
    }

    private playMergeSquashStretch(box: BoxEntity): void {
        this.scene.tweens.killTweensOf(box);
        
        box.setScale(1);
        
        // Squash down then stretch up then normal
        this.scene.tweens.chain({
            targets: box,
            tweens: [
                { scaleX: 1.2, scaleY: 0.8, duration: 100, ease: 'Quad.out' }, // Squash
                { scaleX: 0.8, scaleY: 1.2, duration: 150, ease: 'Quad.inOut' }, // Stretch
                { scaleX: 1.0, scaleY: 1.0, duration: 200, ease: 'Elastic.out' } // Bounce back
            ],
            onComplete: () => {
                this.playIdle(box);
            }
        });
    }

    // Generic UI Button Tweens
    public static addHoverBounce(scene: Phaser.Scene, button: Phaser.GameObjects.Container | Phaser.GameObjects.Sprite): void {
        button.on('pointerover', () => {
            scene.tweens.killTweensOf(button);
            scene.tweens.add({
                targets: button,
                scaleX: 1.05,
                scaleY: 1.05,
                duration: 200,
                ease: 'Back.out'
            });
        });

        button.on('pointerout', () => {
            scene.tweens.killTweensOf(button);
            scene.tweens.add({
                targets: button,
                scaleX: 1.0,
                scaleY: 1.0,
                duration: 200,
                ease: 'Back.out'
            });
        });

        button.on('pointerdown', () => {
            scene.tweens.killTweensOf(button);
            scene.tweens.add({
                targets: button,
                scaleX: 0.95,
                scaleY: 0.95,
                duration: 100,
                ease: 'Quad.out'
            });
        });

        button.on('pointerup', () => {
            scene.tweens.killTweensOf(button);
            scene.tweens.add({
                targets: button,
                scaleX: 1.05,
                scaleY: 1.05,
                duration: 150,
                ease: 'Back.out'
            });
        });
    }
}
