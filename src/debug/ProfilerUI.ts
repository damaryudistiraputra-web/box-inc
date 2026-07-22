import Phaser from 'phaser';

export class ProfilerUI extends Phaser.GameObjects.Container {
    private textGroup: Phaser.GameObjects.Text;
    private sceneRef: Phaser.Scene;

    constructor(scene: Phaser.Scene, x: number, y: number) {
        super(scene, x, y);
        this.sceneRef = scene;

        const bg = scene.add.graphics();
        bg.fillStyle(0x000000, 0.7);
        bg.fillRect(0, 0, 250, 200);

        this.textGroup = scene.add.text(10, 10, '', {
            fontFamily: 'monospace',
            fontSize: '12px',
            color: '#00ff00'
        });

        this.add([bg, this.textGroup]);
        this.setDepth(9999);
        scene.add.existing(this);

        scene.events.on('update', this.updateStats, this);
        scene.events.once('shutdown', this.destroy, this);
    }

    private updateStats() {
        const loop = this.sceneRef.game.loop;
        
        // Approximate breakdowns for a simple browser game
        const totalMs = loop.delta;
        
        // Granular display breakdown
        let sprites = 0, ui = 0, particles = 0;
        this.sceneRef.children.list.forEach(child => {
            if (child instanceof Phaser.GameObjects.Sprite || child instanceof Phaser.GameObjects.Image) sprites++;
            else if (child instanceof Phaser.GameObjects.Text || child instanceof Phaser.GameObjects.Container) ui++;
            else if (child instanceof Phaser.GameObjects.Particles.ParticleEmitter) particles++;
        });

        const displayList = this.sceneRef.children.list.length;
        const tweens = this.sceneRef.tweens.getTweens().length;
        // @ts-ignore
        const timers = this.sceneRef.time._active?.length || 0;
        const textures = Object.keys(this.sceneRef.textures.list).length;
        
        // Color coding
        if (totalMs < 16) {
            this.textGroup.setColor('#00ff00');
        } else if (totalMs < 25) {
            this.textGroup.setColor('#ffff00');
        } else {
            this.textGroup.setColor('#ff0000');
        }
        
        const stats = [
            '--- FRAME BUDGET ---',
            `FPS:      ${Math.round(loop.actualFps)}`,
            `Delta:    ${totalMs.toFixed(1)} ms`,
            '',
            '--- MEMORY BUDGET ---',
            `Total Obj:  ${displayList}`,
            `├─ Sprites: ${sprites}`,
            `├─ UI:      ${ui}`,
            `└─ Partcl:  ${particles}`,
            `Tweens:     ${tweens}`,
            `Timers:     ${timers}`,
            `Textures:   ${textures}`
        ];

        this.textGroup.setText(stats.join('\n'));
    }

    destroy(fromScene?: boolean) {
        this.sceneRef.events.off('update', this.updateStats, this);
        super.destroy(fromScene);
    }
}
