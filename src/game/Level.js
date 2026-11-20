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
import { Ring, RING } from './logic/entities/Ring.js';
import { RingModel, loadRingTemplate } from './rendering/entities/RingModel.js';
import { RingAudio } from './rendering/RingAudio.js';

async function makeSonic(groundAt) {
  const sonicLogic = new Sonic(
    0, 0, 0,
    'player',
    true,
    groundAt,
  );
  const sonicModel = await createSonicModel();

  return new Entity(
    sonicLogic,
    sonicModel
  );
}

async function makeBuzzBomber(x = 5, y = 3) {
  const buzzBomberLogic = new BuzzBomber(
    x, y, 0,
    'enemy',
    false,
  );
  const buzzBomberModel = await createBuzzBomberModel();

  const buzzBomber = new Entity(
    buzzBomberLogic,
    buzzBomberModel
  );
  const { length, heigth, depth } = buzzBomber.logic.hitboxDim;
  buzzBomber.setHitbox(length * 0.8, heigth, depth);
  return buzzBomber;
}

function makeObstacle(x, groundY) {
  const obstacle = new Entity(
    new Obstacle(x, groundY, 0),
    createObstacleModel(),
  );
  const { length, heigth, depth } = obstacle.logic.hitboxDim;
  obstacle.setHitbox(length * 0.85, heigth * 0.85, depth * 0.85);
  obstacle.setOnGround(groundY);
  return obstacle;
}

export class Level {
  constructor(mainInput, finishDistance = 1000, options = {}) {
    this.mainInput = mainInput;
    this.finishDistance = finishDistance;
    this.finishX = null;
    this.ringsCollected = 0;
    this.ringBalance = 0;
    this.rings = [];
    this.ringLayouts = new Map();
    this.hitboxesVisible = false;
    this.scatterSequence = 0;

    this.random = options.random ?? Math.random;
    this.spawnHazards = options.spawnHazards ?? true;
    // Maior que a área visível da segunda câmera; evita hazards "nascendo" na tela.
    this.spawnAheadDistance = 140;
    this.minSpawnGap = 10;
    this.maxSpawnGap = 20;
    this.nextSpawnX = 14;
    this.spawnedEntities = [];
    this.spawnPromise = null;
    this.obstacles = [];
  }

  async buildLevel() {
    // terrain
    this.startPosX = 0;
    this.finishX = this.startPosX + this.finishDistance;
    this.terrain   = new Terrain(this.startPosX);
    this.startPosY = this.terrain.getHeightAt(this.startPosX);

    // entities
    this.entities   = [];
    this.sonic      = await makeSonic((x) => {
      const height = this.terrain.getHeightAt(x);
      if (height === null) return null;

      return { height, normal: this.terrain.getNormalVectorAt(x) };
    });
    this.buzzBomber = await makeBuzzBomber();

    this.entities.push(this.sonic);
    this.enemies = [this.buzzBomber];
    this.obstacles = [];
    this.spawnedEntities = [];
    this.sonic.setOnGround(this.startPosY);
    for (const enemy of this.enemies) {
      enemy.controller = new StaticController(enemy);
      enemy.setOnGround(this.terrain.getHeightAt(enemy.logic.getPosition().x) + 0.5);
      this.entities.push(enemy);
    }

    // controllers
    this.player = new PlayerController(this.sonic, this.mainInput);
    this.ringTemplate = await loadRingTemplate();
    this.ringAudio = new RingAudio();
    this.syncRingChunks();
    if (this.spawnHazards) {
      await this.spawnAhead(this.startPosX);
      // O jogo desenha todas as entidades ao iniciar; só as futuras viram "added".
      this.spawnedEntities = [];
    }
  }

  syncRingChunks() {
    const added = [];
    const activeChunks = new Set(this.terrain.chunks.map((chunk) => chunk.initialX));
    const removed = this.rings.filter((ring) =>
      !ring.logic.scattered && !activeChunks.has(ring.logic.chunkX));
    const gone = new Set(removed);
    this.rings = this.rings.filter((ring) => !gone.has(ring));
    this.entities = this.entities.filter((entity) => !gone.has(entity));
    for (const x of this.ringLayouts.keys()) {
      if (!activeChunks.has(x)) this.ringLayouts.delete(x);
    }
    for (const chunk of this.terrain.chunks) {
      if (this.ringLayouts.has(chunk.initialX)) continue;
      this.ringLayouts.set(chunk.initialX, new Set());
      // O primeiro trio (x=1, 2, 3) antecede o inimigo em x=5 em qualquer rampa.
      const offsets = [11, 12, 13, 22, 24, 26, 32, 34, 36];
      offsets.forEach((offset, index) => {
        const x = chunk.initialX + offset;
        if (x < this.startPosX || x >= this.finishX) return;
        const y = chunk.getHeightAtX(x) + (index >= 6 ? 2.8 : 0.7);
        const logic = new Ring(x, y, `${chunk.initialX}:${index}`, chunk.initialX);
        const ring = new Entity(logic, new RingModel(this.ringTemplate));
        ring.setHitbox(RING.hitbox, RING.hitbox, RING.depth);
        if (this.hitboxesVisible) ring.toggleHitboxVisual();
        this.rings.push(ring);
        this.entities.push(ring);
        added.push(ring);
      });
    }
    return { added, removed };
  }

  collectRings() {
    for (const ring of this.rings) {
      if (!ring.logic.active || ring.logic.hitboxActive === false ||
          !this.sonic.logic.checkCollision(ring.logic)) continue;
      ring.logic.collect();
      this.ringBalance = Math.min(999, this.ringBalance + 1);
      this.ringsCollected++;
      this.ringLayouts.get(ring.logic.chunkX)?.add(ring.logic.id);
      ring.model.update(0, ring.logic);
      this.ringAudio?.play();
    }
  }

  removeRings(rings) {
    const gone = new Set(rings);
    this.rings = this.rings.filter((ring) => !gone.has(ring));
    this.entities = this.entities.filter((entity) => !gone.has(entity));
  }

  scatterRings(balance) {
    const count = Math.min(balance, RING.scatterLimit);
    const scattered = this.rings.filter((ring) => ring.logic.scattered && ring.logic.active && !ring.logic.finished);
    const removed = scattered.slice(0, Math.max(0, scattered.length + count - RING.scatterLimit));
    this.removeRings(removed);
    const added = [];
    const { x, y } = this.sonic.logic.getPosition();
    for (let i = 0; i < count; i++) {
      const pair = Math.floor((i % 16) / 2);
      const angle = (101.25 + pair * 22.5) * Math.PI / 180;
      const magnitude = RING.scatterSpeed * (i < 16 ? 1 : 0.5);
      // O leque do GDD é refletido para o semiplano superior do nosso X/Y.
      const vx = (i % 2 === 0 ? -1 : 1) * Math.abs(Math.cos(angle)) * magnitude;
      const vy = Math.abs(Math.sin(angle)) * magnitude;
      const logic = new Ring(x, y, `scatter:${this.scatterSequence++}`, null);
      logic.scatter(vx, vy, this.terrain);
      const ring = new Entity(logic, new RingModel(this.ringTemplate));
      ring.setHitbox(RING.hitbox, RING.hitbox, RING.depth);
      if (this.hitboxesVisible) ring.toggleHitboxVisual();
      this.rings.push(ring);
      this.entities.push(ring);
      added.push(ring);
    }
    return { added, removed };
  }

  spawnAhead(playerX) {
    if (!this.spawnHazards || this.finishX === null) return Promise.resolve();
    if (this.spawnPromise) return this.spawnPromise;
    this.spawnPromise = this.fillAhead(playerX)
      .catch((error) => {
        // Uma falha de carregamento não pode interromper a corrida.
        console.error('Falha ao gerar inimigo ou obstáculo:', error);
      })
      .finally(() => {
        this.spawnPromise = null;
      });
    return this.spawnPromise;
  }

  async fillAhead(playerX) {
    const maxX = Math.min(playerX + this.spawnAheadDistance, this.finishX);
    while (this.nextSpawnX < maxX) {
      const x = this.nextSpawnX;
      const groundY = this.terrain.getHeightAt(x);
      if (groundY !== null) {
        const roll = this.random();
        if (roll < 0.45) {
          await this.spawnEnemy(x, groundY);
        } else if (roll < 0.85) {
          this.spawnObstacle(x, groundY);
        }
      }
      this.nextSpawnX += this.minSpawnGap +
        this.random() * (this.maxSpawnGap - this.minSpawnGap);
    }
  }

  async spawnEnemy(x, groundY) {
    const flyHeight = groundY + 0.8 + this.random() * 2.4;
    const enemy = await makeBuzzBomber(x, flyHeight);
    enemy.controller = new StaticController(enemy);
    enemy.setOnGround(flyHeight);
    this.enemies.push(enemy);
    this.entities.push(enemy);
    this.spawnedEntities.push(enemy);
  }

  spawnObstacle(x, groundY) {
    const obstacle = makeObstacle(x, groundY);
    obstacle.controller = new StaticController(obstacle);
    this.obstacles.push(obstacle);
    this.entities.push(obstacle);
    this.spawnedEntities.push(obstacle);
  }

  removeHazard(entity) {
    this.enemies = this.enemies.filter((enemy) => enemy !== entity);
    this.obstacles = this.obstacles.filter((obstacle) => obstacle !== entity);
    this.entities = this.entities.filter((item) => item !== entity);
  }

  resolveHazardContact() {
    if (this.sonic.logic.invulnerabilityRemaining > 0) return { added: [], removed: [] };
    for (const enemy of [...this.enemies]) {
      if (!this.sonic.logic.checkCollision(enemy.logic)) continue;
      if (this.sonic.logic.isSpinning()) {
        // Pular/girar sobre o inimigo o derrota e dá um pequeno impulso.
        this.sonic.logic.speed.y = Math.abs(this.sonic.logic.jumpSpeed) * 0.65;
        this.removeHazard(enemy);
        return { added: [], removed: [enemy] };
      }
      return this.damageOrLose(enemy);
    }
    for (const obstacle of [...this.obstacles]) {
      if (!this.sonic.logic.checkCollision(obstacle.logic)) continue;
      return this.damageOrLose(obstacle);
    }
    return { added: [], removed: [] };
  }

  damageOrLose(hazard) {
    if (this.ringBalance === 0) return { defeated: true, added: [], removed: [] };
    const previousBalance = this.ringBalance;
    this.ringBalance = 0;
    this.sonic.logic.takeHit(hazard.logic.getPosition().x);
    this.sonic.model.update(0, this.sonic.logic);
    return this.scatterRings(previousBalance);
  }

  update(dt) {
    // O limite esquerdo é o penhasco no início do primeiro chunk; o corpo do Sonic encosta nele.
    this.sonic.logic.setMinX(this.terrain.chunks[0].initialX + this.sonic.logic.hitboxDim.length / 2);
    this.player.updateEntity(dt);
    for (const enemy of this.enemies) enemy.controller.updateEntity(dt);
    for (const obstacle of this.obstacles) obstacle.controller.updateEntity(dt);

    const playerX = this.sonic.logic.getPosition().x;
    const chunks = this.terrain.update(playerX);
    this.spawnAhead(playerX);
    const ringChanges = this.syncRingChunks();
    for (const ring of this.rings) ring.update(dt);
    const finished = this.rings.filter((ring) => ring.logic.finished);
    this.removeRings(finished);
    this.collectRings();

    const minX = this.terrain.chunks[0].initialX;
    const removed = [...ringChanges.removed, ...finished];
    for (const enemy of [...this.enemies]) {
      if (enemy.logic.getPosition().x >= minX) continue;
      this.removeHazard(enemy);
      removed.push(enemy);
    }
    for (const obstacle of [...this.obstacles]) {
      if (obstacle.logic.getPosition().x >= minX) continue;
      this.removeHazard(obstacle);
      removed.push(obstacle);
    }

    const impact = this.resolveHazardContact();
    const added = [...ringChanges.added, ...impact.added];
    if (this.spawnedEntities.length > 0) {
      added.push(...this.spawnedEntities);
      this.spawnedEntities = [];
    }
    return {
      chunks,
      removed: [...removed, ...impact.removed],
      added,
      defeated: impact.defeated ?? false,
    };
  }

  toggleHitboxes() {
    this.hitboxesVisible = !this.hitboxesVisible;
    for (let entity of this.entities) {
      entity.toggleHitboxVisual();
    }
  }
}
