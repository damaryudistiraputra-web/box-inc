import Phaser from 'phaser';
import { EventBus, EVENTS } from '../core/EventBus';
import { AnimationManager } from '../managers/AnimationManager';
import { LocalizationManager } from '../managers/LocalizationManager';

export class ShopUI extends Phaser.GameObjects.Container {
    private buttonBg: Phaser.GameObjects.Graphics;
    private buttonText: Phaser.GameObjects.Text;
    private lastClickTime: number = 0;
    private cooldownMs: number = 250;
    
    constructor(scene: Phaser.Scene, x: number, y: number) {
        super(scene, x, y);

        this.buttonBg = scene.add.graphics();
        this.buttonBg.fillStyle(0x4CAF50, 1);
        this.buttonBg.fillRoundedRect(-75, -25, 150, 50, 8);

        this.buttonText = scene.add.text(0, 0, LocalizationManager.t('shop.buy'), {
            fontFamily: 'Arial',
            fontSize: '18px',
            fontStyle: 'bold',
            color: '#ffffff'
        }).setOrigin(0.5);

        this.add([this.buttonBg, this.buttonText]);
        
        AnimationManager.addHoverBounce(scene, this);

        this.setSize(150, 50);
        this.setInteractive();

        this.on('pointerdown', this.onPointerDown, this);
        this.on('pointerup', this.onPointerUp, this);
        this.on('pointerout', this.onPointerOut, this);

        scene.add.existing(this);
    }

    private onPointerDown(): void {
        // AnimationManager handles visual scale
    }

    private onPointerOut(): void {
        // AnimationManager handles visual scale
    }

    private onPointerUp(): void {
        const now = this.scene.time.now;
        if (now - this.lastClickTime >= this.cooldownMs) {
            this.lastClickTime = now;
            EventBus.emit(EVENTS.SHOP_BUY_REQUEST);
        }
    }
}
