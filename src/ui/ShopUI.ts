import Phaser from 'phaser';
import { EventBus, EVENTS } from '../core/EventBus';
import { AnimationManager } from '../managers/AnimationManager';
import { LocalizationManager } from '../managers/LocalizationManager';

import { ShopManager } from '../managers/ShopManager';

export class ShopUI extends Phaser.GameObjects.Container {
    private buttonBg: Phaser.GameObjects.Graphics;
    private buttonText: Phaser.GameObjects.Text;
    private priceText: Phaser.GameObjects.Text;
    private lastClickTime: number = 0;
    private cooldownMs: number = 250;
    
    constructor(scene: Phaser.Scene, x: number, y: number) {
        super(scene, x, y);

        this.buttonBg = scene.add.graphics();
        this.buttonBg.fillStyle(0x33aa44, 1);
        this.buttonBg.fillRoundedRect(-85, -30, 170, 60, 30); // Pill shape
        this.buttonBg.lineStyle(3, 0x66ff88, 1);
        this.buttonBg.strokeRoundedRect(-85, -30, 170, 60, 30);

        this.buttonText = scene.add.text(0, -10, LocalizationManager.t('shop.buy').toUpperCase(), {
            fontFamily: 'Arial',
            fontSize: '20px',
            fontStyle: 'bold',
            color: '#ffffff'
        }).setOrigin(0.5);
        
        this.priceText = scene.add.text(0, 12, '$0', {
            fontFamily: 'Arial',
            fontSize: '16px',
            fontStyle: 'bold',
            color: '#cfffdf'
        }).setOrigin(0.5);

        this.add([this.buttonBg, this.buttonText, this.priceText]);
        
        AnimationManager.addHoverBounce(scene, this);

        this.setSize(170, 60);
        this.setInteractive();

        this.on('pointerdown', this.onPointerDown, this);
        this.on('pointerup', this.onPointerUp, this);
        this.on('pointerout', this.onPointerOut, this);

        scene.add.existing(this);
        
        this.updatePrice();
        EventBus.on(EVENTS.SHOP_BUY_SUCCESS, this.updatePrice, this);
    }
    
    private updatePrice(): void {
        const cost = ShopManager.getInstance().getNextBoxCost();
        this.priceText.setText(`$${cost.toString()}`);
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
