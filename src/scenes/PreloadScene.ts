import Phaser from 'phaser';
export class PreloadScene extends Phaser.Scene {
    constructor() {
        super({ key: 'PreloadScene' });
    }

    preload() {
        console.log('PreloadScene: loading assets');
        
        const width = this.cameras.main.width;
        const height = this.cameras.main.height;
        
        const loadingText = this.make.text({
            x: width / 2,
            y: height / 2 - 50,
            text: 'Loading...',
            style: {
                font: '20px monospace',
                color: '#ffffff'
            }
        });
        loadingText.setOrigin(0.5, 0.5);

        // Simulated delay for loading screen
        this.time.delayedCall(500, () => {
            this.scene.start('GameBootstrap');
        });
    }

    create() {
        // Nothing here, handled by delayedCall or loader complete event
    }
}
