import { PlayerController } from "./logic/controllers/PlayerController.js";
import { StaticController } from "./logic/controllers/StaticController.js";
import { Terrain } from "./logic/terrain/Terrain.js";
import { Sonic } from "./logic/entities/Sonic.js";
import { BuzzBomber } from "./logic/entities/BuzzBomber.js";
import { Obstacle } from "./logic/entities/Obstacle.js";
import { createSonicModel } from "./rendering/entities/SonicModel.js";
import { createBuzzBomberModel } from "./rendering/entities/BuzzBomberModel.js";
import { createObstacleModel } from "./rendering/entities/ObstacleModel.js";
import { Entity } from "./entities/Entity.js";

async function makeSonic(groundAt) {
    const sonicLogic = new Sonic(0, 0, 0, 'player', true, groundAt);
    const sonicModel = await createSonicModel();
    return new Entity(sonicLogic, sonicModel);
}

async function makeBuzzBomber(x, y) {
    const buzzBomberLogic = new BuzzBomber(x, y, 0, 'enemy', false);
    const buzzBomberModel = await createBuzzBomberModel();

    const buzzBomber = new Entity(buzzBomberLogic, buzzBomberModel);
    const { length, heigth, depth } = buzzBomber.logic.hitboxDim;
    buzzBomber.setHitbox(length * 0.8, heigth, depth);
    return buzzBomber;
}

function makeObstacle(x, groundY) {
    const obstacleLogic = new Obstacle(x, groundY, 0);
    const obstacleModel = createObstacleModel();

    const obstacle = new Entity(obstacleLogic, obstacleModel);
    const { length, heigth, depth } = obstacle.logic.hitboxDim;
    obstacle.setHitbox(length * 0.85, heigth * 0.85, depth * 0.85);
    obstacle.setOnGround(groundY);
    return obstacle;
}

export class Level {
    constructor(mainInput, finishX = null, options = {}) {
        this.mainInput = mainInput;
        this.finishX = finishX;

        this.enableRandomEnemies = options.enableRandomEnemies ?? true;
        this.enableObstacles = options.enableObstacles ?? true;

        this.nextSpawnX = 14;
        this.minSpawnGap = 10;
        this.maxSpawnGap = 20;
        this.spawnAheadDistance = 45;
        this.despawnBehindDistance = 25;

        this.spawnedEntities = [];
        this.removedEntities = [];
    }

    async buildLevel() {
        this.startPosX = 0;
        this.terrain = new Terrain(this.startPosX);
        this.startPosY = this.terrain.getHeightAt(this.startPosX);

        this.entities = [];
        this.dynamicEntities = [];

        this.sonic = await makeSonic((x) => {
            const height = this.terrain.getHeightAt(x);
            if (height === null) return null;
            return { height, normal: this.terrain.getNormalVectorAt(x) };
        });

        this.entities.push(this.sonic);
        this.sonic.setOnGround(this.startPosY);

        this.player = new PlayerController(this.sonic, this.mainInput);

        await this.spawnAhead(this.startPosX);
    }

    async spawnAhead(playerX) {
        if (!this.enableRandomEnemies && !this.enableObstacles) return;

        const maxSpawnX = playerX + this.spawnAheadDistance;

        while (maxSpawnX > this.nextSpawnX) {
            const groundY = this.terrain.getHeightAt(this.nextSpawnX);

            if (groundY !== null) {
                const roll = Math.random();

                if (this.enableRandomEnemies && this.enableObstacles) {
                    if (0.45 > roll) {
                        await this.spawnRandomEnemy(this.nextSpawnX, groundY);
                    } else if (0.85 > roll) {
                        this.spawnObstacle(this.nextSpawnX, groundY);
                    }
                } else if (this.enableRandomEnemies && 0.7 > roll) {
                    await this.spawnRandomEnemy(this.nextSpawnX, groundY);
                } else if (this.enableObstacles && 0.7 > roll) {
                    this.spawnObstacle(this.nextSpawnX, groundY);
                }
            }

            const gap = this.minSpawnGap + Math.random() * (this.maxSpawnGap - this.minSpawnGap);
            this.nextSpawnX += gap;
        }
    }

    async spawnRandomEnemy(x, groundY) {
        const flyHeight = groundY + 0.8 + Math.random() * 2.4;
        const enemy = await makeBuzzBomber(x, flyHeight);
        enemy.setOnGround(flyHeight);
        enemy.update(0);

        const controller = new StaticController(enemy);
        this.entities.push(enemy);
        this.dynamicEntities.push({ entity: enemy, controller });
        this.spawnedEntities.push(enemy);
    }

    spawnObstacle(x, groundY) {
        const obstacle = makeObstacle(x, groundY);
        obstacle.update(0);

        const controller = new StaticController(obstacle);
        this.entities.push(obstacle);
        this.dynamicEntities.push({ entity: obstacle, controller });
        this.spawnedEntities.push(obstacle);
    }

    removeEntity(entity) {
        this.entities = this.entities.filter((e) => e !== entity);
        this.dynamicEntities = this.dynamicEntities.filter((item) => item.entity !== entity);
        this.removedEntities.push(entity);
    }

    consumeSpawnedEntities() {
        const list = [...this.spawnedEntities];
        this.spawnedEntities = [];
        return list;
    }

    consumeRemovedEntities() {
        const list = [...this.removedEntities];
        this.removedEntities = [];
        return list;
    }

    update(dt) {
        this.sonic.logic.setMinX(this.terrain.chunks[0].initialX);
        this.player.updateEntity(dt);

        const playerX = this.sonic.logic.getPosition().x;
        const minKeepX = playerX - this.despawnBehindDistance;

        for (const item of this.dynamicEntities) {
            item.controller.updateEntity(dt);

            if (minKeepX > item.entity.logic.getPosition().x) {
                this.removeEntity(item.entity);
            }
        }

        this.spawnAhead(playerX);

        return this.terrain.update(playerX);
    }

    toggleHitboxes() {
        for (let entity of this.entities) {
            entity.toggleHitboxVisual();
        }
    }
}
