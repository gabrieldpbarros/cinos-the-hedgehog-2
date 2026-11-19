import { PlayerController } from "./logic/controllers/PlayerController.js";
import { StaticController } from "./logic/controllers/StaticController.js";
import { Terrain } from "./logic/terrain/Terrain.js";
import { Sonic } from "./logic/entities/Sonic.js";
import { BuzzBomber } from "./logic/entities/BuzzBomber.js";
import { createSonicModel } from "./rendering/entities/SonicModel.js";
import { createBuzzBomberModel } from "./rendering/entities/BuzzBomberModel.js";
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

async function makeBuzzBomber() {
  const buzzBomberLogic = new BuzzBomber(
    5, 3, 0,
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

export class Level {
  constructor(mainInput, finishDistance = 1000) {
    this.mainInput = mainInput;
    this.finishDistance = finishDistance;
    this.finishX = null;
    this.ringsCollected = 0;
    this.ringBalance = 0;
    this.rings = [];
    this.ringLayouts = new Map();
    this.hitboxesVisible = false;
    this.scatterSequence = 0;
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
    for (const enemy of this.enemies) {
      enemy.controller = new StaticController(enemy);
      this.entities.push(enemy);
    }

    this.sonic.setOnGround(this.startPosY);
    for (const enemy of this.enemies) {
      enemy.setOnGround(this.terrain.getHeightAt(enemy.logic.getPosition().x) + 0.5);
    }

    // controllers
    this.player = new PlayerController(this.sonic, this.mainInput);
    this.ringTemplate = await loadRingTemplate();
    this.ringAudio = new RingAudio();
    this.syncRingChunks();
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

  resolveEnemyContact() {
    if (this.sonic.logic.invulnerabilityRemaining > 0) return { added: [], removed: [] };
    for (const enemy of this.enemies) {
      if (!this.sonic.logic.checkCollision(enemy.logic)) continue;
      if (this.ringBalance === 0) return { defeated: true, added: [], removed: [] };
      const previousBalance = this.ringBalance;
      this.ringBalance = 0;
      this.sonic.logic.takeHit(enemy.logic.getPosition().x);
      this.sonic.model.update(0, this.sonic.logic);
      return this.scatterRings(previousBalance);
    }
    return { added: [], removed: [] };
  }

  update(dt) {
    this.sonic.logic.setMinX(this.terrain.chunks[0].initialX);
    this.player.updateEntity(dt);
    for (const enemy of this.enemies) enemy.controller.updateEntity(dt);

    const chunks = this.terrain.update(this.sonic.logic.getPosition().x);
    const ringChanges = this.syncRingChunks();
    for (const ring of this.rings) ring.update(dt);
    const finished = this.rings.filter((ring) => ring.logic.finished);
    this.removeRings(finished);
    this.collectRings();
    const minX = this.terrain.chunks[0].initialX;
    const removed = [...ringChanges.removed, ...finished];
    this.enemies = this.enemies.filter((enemy) => {
      if (enemy.logic.getPosition().x >= minX) return true;
      removed.push(enemy);
      return false;
    });
    if (removed.length > 0) {
      const gone = new Set(removed);
      this.entities = this.entities.filter((entity) => !gone.has(entity));
    }
    const impact = this.resolveEnemyContact();
    return {
      chunks,
      removed: [...removed, ...impact.removed],
      added: [...ringChanges.added, ...impact.added],
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
