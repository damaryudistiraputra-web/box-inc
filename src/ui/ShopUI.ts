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
    
    private buttonWidth: number = 576; // 80% of 720px
    private buttonHeight: number = 80; // Massive button

    constructor(scene: Phaser.Scene, x: number, y: number) {
        super(scene, x, y);

        this.buttonBg = scene.add.graphics();
        
        // Massive Green Pill
        this.buttonBg.fillStyle(0x10B981, 1);
        this.buttonBg.fillRoundedRect(-this.buttonWidth / 2, -this.buttonHeight / 2, this.buttonWidth, this.buttonHeight, 40);
        this.buttonBg.lineStyle(4, 0x34D399, 1);
        this.buttonBg.strokeRoundedRect(-this.buttonWidth / 2, -this.buttonHeight / 2, this.buttonWidth, this.buttonHeight, 40);

        this.buttonText = scene.add.text(0, -12, LocalizationManager.t('shop.buy').toUpperCase() + ' NEW BOX', {
            fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
            fontSize: '28px',
            fontStyle: 'bold',
            color: '#FFFFFF',
            shadow: { offsetX: 0, offsetY: 2, color: '#047857', blur: 0, fill: true }
        }).setOrigin(0.5);
        
        this.priceText = scene.add.text(0, 20, '$0', {
            fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
            fontSize: '20px',
            fontStyle: 'bold',
            color: '#D1FAE5'
        }).setOrigin(0.5);

        // Add a subtle glow effect behind the button
        const glow = scene.add.graphics();
        glow.fillStyle(0x10B981, 0.2);
        glow.fillRoundedRect(-this.buttonWidth / 2 - 10, -this.buttonHeight / 2 - 10, this.buttonWidth + 20, this.buttonHeight + 20, 50);

        this.add([glow, this.buttonBg, this.buttonText, this.priceText]);
        
        AnimationManager.addHoverBounce(scene, this);

        this.setSize(this.buttonWidth, this.buttonHeight);
        this.setInteractive();

        this.on('pointerdown', this.onPointerDown, this);
        this.on('pointerup', this.onPointerUp, this);
        this.on('pointerout', this.onPointerOut, this);
        
        // --- Shine Animation ---
        const shine = scene.add.graphics();
        shine.fillStyle(0xffffff, 0.3);
        // Slanted shine shape
        shine.beginPath();
        shine.moveTo(-30, -this.buttonHeight);
        shine.lineTo(30, -this.buttonHeight);
        shine.lineTo(0, this.buttonHeight);
        shine.lineTo(-60, this.buttonHeight);
        shine.closePath();
        shine.fillPath();
        
        // Add to container and mask it to button shape
        const shapeMask = scene.make.graphics({ x: this.x, y: this.y }, false);
        shapeMask.fillStyle(0xffffff);
        shapeMask.fillRoundedRect(-this.buttonWidth / 2, -this.buttonHeight / 2, this.buttonWidth, this.buttonHeight, 40);
        const mask = shapeMask.createGeometryMask();
        shine.setMask(mask);
        
        this.add(shine);
        
        // Shine tween every 4s
        shine.setX(-this.buttonWidth);
        scene.tweens.add({
            targets: shine,
            x: this.buttonWidth,
            duration: 500,
            ease: 'Power1',
            repeat: -1,
            repeatDelay: 4000
        });

        scene.add.existing(this);
        
        this.updatePrice();
        EventBus.on(EVENTS.SHOP_BUY_SUCCESS, this.updatePrice, this);
    }
    
    private updatePrice(): void {
        const cost = ShopManager.getInstance().getNextBoxCost();
        this.priceText.setText(`$${cost.toString()}`);
    }

    private onPointerDown(): void {
        EventBus.emit('PLAY_SOUND', 'ui_click');
        // Click Bounce (80ms)
        this.scene.tweens.add({
            targets: this,
            scaleX: 0.9,
            scaleY: 0.9,
            duration: 80,
            yoyo: true,
            ease: 'Sine.easeInOut'
        });
    }

    private onPointerOut(): void {
        this.scene.tweens.killTweensOf(this);
        this.scene.tweens.add({
            targets: this,
            scaleX: 1,
            scaleY: 1,
            duration: 80,
            ease: 'Sine.easeOut'
        });
    }

    private onPointerUp(): void {
        const now = this.scene.time.now;
        if (now - this.lastClickTime >= this.cooldownMs) {
            this.lastClickTime = now;
            EventBus.emit(EVENTS.SHOP_BUY_REQUEST);
        }
    }
}
