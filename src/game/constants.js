export const CONFIG = {
  levelDistance: 1000, // distância horizontal para concluir a fase (metros/unidades),
  gravity: -18,        // unidades/s^2
  jumpVelocity: 12,    // unidades/s
  maxDt: 0.05,
  launchAcceleration: 12, // unidades/s^2 a partir do repouso
  runAcceleration: 2,      // unidades/s^2 perto do limite de velocidade
  runSpeedLimit: 20,       // unidades/s
  brakeTime: 4,        // segundos para parar a partir do limite
  reverseBrakeScale: 0.5, // parada mais curta quando a entrada se opoe a velocidade
  maxBrakeTime: 60,    // segundos
  airBrakeFactor: 0.5
};

// Nível da água em relação ao terreno. Usado pelo fundo e pelos pilares da ponte.
export const WATER_Y = -12;

// Ajustes do peixe saltador, reunidos aqui para facilitar a calibração.
export const FISH = {
  // O salto começa logo abaixo da água e precisa passar pelo tabuleiro.
  jumpSpeed: 25,
  spawnDepth: -WATER_Y + 0.5,
};
