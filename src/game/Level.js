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
    this.rings = [];
    this.ringLayouts = new Map();
    this.hitboxesVisible = false;
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
    this.syncRingChunks();
  }

  syncRingChunks() {
    const added = [];
    const activeChunks = new Set(this.terrain.chunks.map((chunk) => chunk.initialX));
    const removed = this.rings.filter((ring) => !activeChunks.has(ring.logic.chunkX));
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

  update(dt) {
    this.sonic.logic.setMinX(this.terrain.chunks[0].initialX);
    this.player.updateEntity(dt);
    for (const enemy of this.enemies) enemy.controller.updateEntity(dt);

    const chunks = this.terrain.update(this.sonic.logic.getPosition().x);
    const ringChanges = this.syncRingChunks();
    for (const ring of this.rings) ring.update(dt);
    const minX = this.terrain.chunks[0].initialX;
    const removed = [...ringChanges.removed];
    this.enemies = this.enemies.filter((enemy) => {
      if (enemy.logic.getPosition().x >= minX) return true;
      removed.push(enemy);
      return false;
    });
    if (removed.length > 0) {
      const gone = new Set(removed);
      this.entities = this.entities.filter((entity) => !gone.has(entity));
    }
    return { chunks, removed, added: ringChanges.added };
  }

  toggleHitboxes() {
    this.hitboxesVisible = !this.hitboxesVisible;
    for (let entity of this.entities) {
      entity.toggleHitboxVisual();
    }
  }
}
