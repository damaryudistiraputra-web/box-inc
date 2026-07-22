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
    private bg: Phaser.GameObjects.Rectangle;

    constructor(scene: Phaser.Scene, x: number, y: number) {
        this.scene = scene;
        this.container = this.scene.add.container(x, y).setDepth(1500);

        this.bg = this.scene.add.rectangle(0, 0, 150, 40, 0x00AA00, 1)
            .setInteractive({ useHandCursor: true })
            .setOrigin(0.5);

        this.text = this.scene.add.text(0, 0, 'Boost: Off\n(Watch Ad)', {
            font: 'bold 12px Arial',
            color: '#FFFFFF',
            align: 'center'
        }).setOrigin(0.5);

        this.container.add([this.bg, this.text]);

        this.bg.on('pointerdown', () => this.onClick());

        this.scene.time.addEvent({
            delay: 1000,
            loop: true,
            callback: () => this.updateUI()
        });
        
        EventBus.on('BOOST_UPDATED', this.updateUI, this);
        this.updateUI();
        
        this.scene.events.once('shutdown', this.destroy, this);
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
            this.text.setText(`Boost ${state.multiplier}x: ${timeStr}\n(+ Extend)`);
            this.bg.setFillStyle(0xAA6600);
        } else {
            this.text.setText(`Boost: Off\n(+${AdsBalance.incomeBoostMinutes}m Ad)`);
            this.bg.setFillStyle(0x00AA00);
        }
    }

    private onClick(): void {
        if (!AdsConfig.incomeBoostExtension || !AdsManager.getInstance().isAdAvailable()) return;

        AnalyticsManager.getInstance().logEvent('reward_offer_clicked', { source: RewardSource.SYSTEM });
        
        const bundle = {
            incomeBoost: {
                multiplier: 2,
                durationSec: AdsBalance.incomeBoostMinutes * 60
            }
        };

        AdsManager.getInstance().showRewarded(
            RewardSource.SYSTEM,
            bundle,
            () => {
                // RewardManager already handles applying the boost.
                this.updateUI();
            },
            (err) => {
                console.warn('[IncomeBoostUI] Ad failed', err);
            }
        );
    }
}
