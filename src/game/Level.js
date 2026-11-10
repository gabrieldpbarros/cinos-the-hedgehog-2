import { PlayerController } from "./logic/controllers/PlayerController.js";
import { StaticController } from "./logic/controllers/StaticController.js";
import { Terrain } from "./logic/terrain/Terrain.js";
import { Sonic } from "./logic/entities/Sonic.js";
import { BuzzBomber } from "./logic/entities/BuzzBomber.js";
import { createSonicModel } from "./rendering/entities/SonicModel.js";
import { createBuzzBomberModel } from "./rendering/entities/BuzzBomberModel.js";
import { Entity } from "./entities/Entity.js";

async function makeSonic() {
  const sonicLogic = new Sonic(
    0, 0, 0,
    'player',
    true,
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

  return new Entity(
    buzzBomberLogic,
    buzzBomberModel
  );
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
    this.sonic      = await makeSonic();
    this.buzzBomber = await makeBuzzBomber();

    // controllers
    this.player = new PlayerController(this.sonic, this.mainInput);
    this.enemy1 = new StaticController(this.buzzBomber);
  }
}
