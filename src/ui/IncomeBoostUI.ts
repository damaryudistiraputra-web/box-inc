import Phaser from 'phaser';
import { EconomyManager } from '../managers/EconomyManager';
import { EventBus } from '../core/EventBus';
import { AdsConfig, AdsBalance } from '../config/GameBalance';
import { AdsManager } from '../managers/AdsManager';
import { AnalyticsManager } from '../managers/AnalyticsManager';
import { RewardSource } from '../interfaces/IReward';

export class IncomeBoostUI {
    private scene: Phaser.Scene;
    private container: Phaser.GameObjects.Container;
    private text: Phaser.GameObjects.Text;
    private bg: Phaser.GameObjects.Graphics;

    constructor(scene: Phaser.Scene, x: number, y: number) {
        this.scene = scene;
        this.container = this.scene.add.container(x, y).setDepth(1500);

        this.bg = this.scene.add.graphics();
        // Setup initial shape
        this.drawBg(0x1E293B, 0x334155);

        this.text = this.scene.add.text(0, 0, 'Boost: Off\n(+Watch Ad)', {
            fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
            fontSize: '14px',
            fontStyle: 'bold',
            color: '#FFFFFF',
            align: 'center',
            shadow: { offsetX: 0, offsetY: 1, color: '#000000', blur: 2, fill: true }
        }).setOrigin(0.5, 0.5);

        this.container = this.scene.add.container(x, y, [this.bg, this.text]);
        this.container.setDepth(1500);
        this.container.setSize(160, 48);
        this.container.setInteractive({ useHandCursor: true });
        this.container.on('pointerdown', () => this.onClick());

        this.scene.time.addEvent({
            delay: 1000,
            loop: true,
            callback: () => this.updateUI()
        });
        
        EventBus.on('BOOST_UPDATED', this.updateUI, this);
        this.updateUI();
        
        this.scene.events.once('shutdown', this.destroy, this);
    }

    private drawBg(fillColor: number, strokeColor: number, isGlowing: boolean = false) {
        this.bg.clear();
        this.bg.fillStyle(fillColor, 1);
        this.bg.fillRoundedRect(-80, -24, 160, 48, 24);
        
        this.bg.lineStyle(isGlowing ? 3 : 2, strokeColor, 1);
        this.bg.strokeRoundedRect(-80, -24, 160, 48, 24);
    }
    
    private destroy() {
        EventBus.off('BOOST_UPDATED', this.updateUI, this);
    }

    private updateUI(): void {
        const state = EconomyManager.getInstance().getBoostState();
        
        if (!AdsConfig.incomeBoostExtension) {
            this.container.setVisible(false);
            return;
        }

        if (state.active) {
            const min = Math.floor(state.remainingMs / 60000);
            const sec = Math.floor((state.remainingMs % 60000) / 1000);
            const timeStr = `${min}:${sec.toString().padStart(2, '0')}`;
            this.text.setText(`⚡ ${state.multiplier}x Boost\n${timeStr}`);
            this.drawBg(0xF59E0B, 0xD97706, true);
        } else {
            this.text.setText(`⚡ Boost Off\n(+${AdsBalance.incomeBoostMinutes}m Ad)`);
            this.drawBg(0x1E293B, 0x334155, false);
        }
    }

    private onClick(): void {
        if (!AdsConfig.incomeBoostExtension) return;

        EventBus.emit('PLAY_SOUND', 'ui_click');

        if (!AdsManager.getInstance().isAdAvailable()) {
            EventBus.emit('PLAY_SOUND', 'ui_error');
            this.scene.tweens.add({
                targets: this.container,
                x: { from: this.container.x - 5, to: this.container.x + 5 },
                duration: 50,
                yoyo: true,
                repeat: 3
            });
            return;
        }

        AnalyticsManager.getInstance().logEvent('reward_offer_clicked', { source: RewardSource.SYSTEM });
        
        const bundle = {
            incomeBoost: {
                multiplier: 2,
                durationSec: AdsBalance.incomeBoostMinutes * 60
            }
        };

        this.scene.tweens.add({
            targets: this.container,
            scaleX: 0.95,
            scaleY: 0.95,
            duration: 80,
            yoyo: true,
            ease: 'Sine.easeInOut'
        });

        AdsManager.getInstance().showRewarded(
            RewardSource.SYSTEM,
            bundle,
            () => {
                this.updateUI();
            },
            (err) => {
                console.warn('[IncomeBoostUI] Ad failed', err);
            }
        );
    }
}
