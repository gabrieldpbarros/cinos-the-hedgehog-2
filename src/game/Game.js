import { Level } from "./Level.js";
import { SceneView } from "./rendering/SceneView.js";

export class Game {
    constructor(canvas, input) {
        this.canvas = canvas;
        this.state = 'menu'; // menu | playing | paused | win | lose
        this.mainInput = input;
    }

    async startGame(options = { enableRandomEnemies: true, enableObstacles: true }) {
        this.level = new Level(this.mainInput, null, options);
        await this.level.buildLevel();

        this.scene = new SceneView(this.canvas);
        this.level.sonic.update(0);

        this.scene.drawChunks(this.level.terrain.chunks);
        this.scene.drawEntity(this.level.sonic);

        // Desenha os primeiros inimigos/obstáculos já gerados no início
        for (const entity of this.level.consumeSpawnedEntities()) {
            this.scene.drawEntity(entity);
        }

        this.syncScene();
        this.state = 'playing';
    }

    syncScene() {
        const position = this.level.sonic.logic.getPosition();
        const terrainY = this.level.terrain.getHeightAt(position.x) ?? position.y;
        this.scene.sync(position, terrainY);
        this.scene.render();
    }

    update(dt) {
        if (this.state !== 'playing') return;

        const newChunks = this.level.update(dt);
        this.scene.updateChunks(newChunks);

        // Adiciona na cena 3D os novos inimigos/obstáculos gerados
        for (const entity of this.level.consumeSpawnedEntities()) {
            this.scene.drawEntity(entity);
        }

        // Verifica colisões com todos os inimigos e obstáculos ativos
        const sonicLogic = this.level.sonic.logic;

        for (const item of [...this.level.dynamicEntities]) {
            const targetLogic = item.entity.logic;

            if (sonicLogic.checkCollision(targetLogic)) {
                if (targetLogic.type === 'enemy' && sonicLogic.isSpinning()) {
                    // Sonic derrota o inimigo ao pular/girar nele e dá um pequeno impulso para cima
                    sonicLogic.speed.y = Math.abs(sonicLogic.jumpSpeed) * 0.65;
                    this.level.removeEntity(item.entity);
                } else {
                    // Encostou em obstáculo (espinhos) ou em inimigo sem estar pulando/girando
                    this.state = 'lose';
                    break;
                }
            }
        }

        // Remove da cena 3D os inimigos derrotados ou que ficaram para trás
        for (const entity of this.level.consumeRemovedEntities()) {
            this.scene.removeEntity(entity);
        }

        this.syncScene();
    }

    getDistance() {
        if (!this.level?.sonic) return 0;
        return this.level.sonic.logic.getPosition().x - this.level.startPosX;
    }

    switchCamera() {
        this.scene?.switchCamera();
    }

    resizeWindow(width, height) {
        this.scene?.resize(width, height);
    }
}
