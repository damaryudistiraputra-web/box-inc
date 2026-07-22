import Phaser from 'phaser';
import { BoxEntity } from '../entities/BoxEntity';

export class BoxPool {
    private scene: Phaser.Scene;
    private pool: BoxEntity[] = [];

    constructor(scene: Phaser.Scene, initialSize: number = 20) {
        this.scene = scene;
        this.initializePool(initialSize);
    }

    private initializePool(size: number): void {
        for (let i = 0; i < size; i++) {
            const box = new BoxEntity(this.scene, 0, 0);
            box.despawn(); // Hide initially
            this.pool.push(box);
        }
    }

    public spawn(x: number, y: number, level: number): BoxEntity {
        let box = this.pool.find(b => !b.active);

        if (!box) {
            console.warn('BoxPool empty. Expanding pool.');
            box = new BoxEntity(this.scene, 0, 0);
            this.pool.push(box);
            // Note: In GameScene we should probably listen for a pool expansion event
            // to register new boxes to EconomyManager, but for now we spawn enough initially.
        }

        box.spawn(x, y, level);
        return box;
    }

    public despawn(box: BoxEntity): void {
        box.despawn();
    }

    public getAllBoxes(): BoxEntity[] {
        return this.pool;
    }
}
