import Phaser from 'phaser';

export class HelpUI {
    private scene: Phaser.Scene;
    private modal: Phaser.GameObjects.Container;
    
    private btnContainer: Phaser.GameObjects.Container;
    
    constructor(scene: Phaser.Scene, x: number, y: number) {
        this.scene = scene;
        
        // Help Button (?)
        const btnBg = this.scene.add.circle(0, 0, 16, 0x334455).setInteractive({ useHandCursor: true }).setStrokeStyle(2, 0x6688aa);
        const btnText = this.scene.add.text(0, 0, '?', { font: 'bold 18px Arial', color: '#ffffff' }).setOrigin(0.5);
        this.btnContainer = this.scene.add.container(x, y, [btnBg, btnText]);
        
        btnBg.on('pointerdown', () => this.openHelp());
        btnBg.on('pointerover', () => btnBg.setFillStyle(0x445566));
        btnBg.on('pointerout', () => btnBg.setFillStyle(0x334455));

        this.modal = this.createModal();
    }
    
    public setDepth(depth: number) {
        this.btnContainer.setDepth(depth);
    }
    
    private createModal(): Phaser.GameObjects.Container {
        const cx = this.scene.cameras.main.centerX;
        const cy = this.scene.cameras.main.centerY;
        const width = 320;
        const height = 400;
        
        const modalContainer = this.scene.add.container(cx, cy);
        modalContainer.setDepth(5000);
        modalContainer.setVisible(false);
        
        // Darken background overlay
        const overlay = this.scene.add.rectangle(0, 0, 2000, 2000, 0x000000, 0.7).setInteractive();
        
        // Modal bg
        const bg = this.scene.add.graphics();
        bg.fillStyle(0x1a2a3a, 1);
        bg.fillRoundedRect(-width/2, -height/2, width, height, 16);
        bg.lineStyle(2, 0x44aaff, 1);
        bg.strokeRoundedRect(-width/2, -height/2, width, height, 16);
        
        // Title
        const title = this.scene.add.text(0, -height/2 + 30, 'HOW TO PLAY', {
            font: 'bold 24px Arial',
            color: '#44aaff'
        }).setOrigin(0.5);
        
        // Instructions
        const instructions = [
            "📦 BUY: Tap the green BUY button at the\nbottom to get new boxes.",
            "🔄 MERGE: Drag two boxes of the SAME\nlevel together to upgrade them.",
            "🚚 SHIPMENT: Complete the required\nbox orders to earn Cash ($).",
            "⚡ BOOST: Watch an Ad to double your\nincome speed for 5 minutes!",
            "⭐ PRESTIGE: When you reach max level,\nreset your progress for permanent buffs."
        ];
        
        let currentY = -height/2 + 80;
        const texts: Phaser.GameObjects.Text[] = [];
        instructions.forEach(text => {
            const t = this.scene.add.text(-width/2 + 20, currentY, text, {
                font: '14px Arial',
                color: '#dddddd',
                wordWrap: { width: width - 40 },
                lineSpacing: 5
            }).setOrigin(0, 0);
            texts.push(t);
            currentY += t.height + 20;
        });
        
        // Close Button
        const closeBtnBg = this.scene.add.graphics();
        closeBtnBg.fillStyle(0xaa3333, 1);
        closeBtnBg.fillRoundedRect(-50, height/2 - 50, 100, 35, 8);
        
        const closeZone = this.scene.add.zone(0, height/2 - 32.5, 100, 35).setInteractive({ useHandCursor: true });
        const closeText = this.scene.add.text(0, height/2 - 32.5, 'CLOSE', { font: 'bold 16px Arial', color: '#ffffff' }).setOrigin(0.5);
        
        closeZone.on('pointerdown', () => this.closeHelp());
        overlay.on('pointerdown', () => this.closeHelp());
        
        modalContainer.add([overlay, bg, title, ...texts, closeBtnBg, closeText, closeZone]);
        
        return modalContainer;
    }
    
    private openHelp(): void {
        this.modal.setVisible(true);
        this.modal.setScale(0.8);
        this.modal.setAlpha(0);
        
        this.scene.tweens.add({
            targets: this.modal,
            scaleX: 1,
            scaleY: 1,
            alpha: 1,
            duration: 200,
            ease: 'Back.easeOut'
        });
    }
    
    private closeHelp(): void {
        this.scene.tweens.add({
            targets: this.modal,
            scaleX: 0.8,
            scaleY: 0.8,
            alpha: 0,
            duration: 150,
            ease: 'Power2',
            onComplete: () => {
                this.modal.setVisible(false);
            }
        });
    }
}
