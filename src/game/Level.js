import { PlayerController } from "./logic/controllers/PlayerController.js";
import { StaticController } from "./logic/controllers/StaticController.js";
import { Terrain } from "./logic/terrain/Terrain.js";
import { Sonic } from "./logic/entities/Sonic.js";
import { BuzzBomber } from "./logic/entities/BuzzBomber.js";
import { createSonicModel } from "./rendering/entities/SonicModel.js";
import { createBuzzBomberModel } from "./rendering/entities/BuzzBomberModel.js";
import { Entity } from "./entities/Entity.js";

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
  constructor(mainInput, finishX = null) { // a definir criterio de vitoria
    this.mainInput = mainInput;
    this.finishX = finishX;
  }

  async buildLevel() {
    // terrain
    this.startPosX = 0;
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
    this.entities.push(this.buzzBomber);

    this.sonic.setOnGround(this.startPosY);
    this.buzzBomber.setOnGround(
      this.terrain.getHeightAt(this.buzzBomber.logic.getPosition().x) + 0.5
    );

    // controllers
    this.player = new PlayerController(this.sonic, this.mainInput);
    this.enemy1 = new StaticController(this.buzzBomber);
  }

  update(dt) {
    this.sonic.logic.setMinX(this.terrain.chunks[0].initialX);
    this.player.updateEntity(dt);
    this.enemy1.updateEntity(dt);

    const sonicLogic = this.sonic.logic;
    return this.terrain.update(sonicLogic.getPosition().x);
  }

  toggleHitboxes() {
    for (let entity of this.entities) {
      entity.toggleHitboxVisual();
    }
  }
}
