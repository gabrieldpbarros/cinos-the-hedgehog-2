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
  jumpSpeed: 17.5,
  spawnDepth: 4, // distância abaixo do tabuleiro onde o peixe começa o salto
};

// Pontuação estilo arcade: anéis valem pontos, derrotas em cadeia dobram o
// valor e o tempo de conclusão concede um bônus único.
export const SCORE = {
  ring: 10,
  enemyBase: 100,
  enemyChainWindow: 2, // segundos para manter a cadeia de inimigos
  timeBonusTiers: [
    { upTo: 50, points: 5000 },
    { upTo: 65, points: 3500 },
    { upTo: 80, points: 2500 },
    { upTo: 100, points: 1500 },
    { upTo: 120, points: 800 },
  ],
  gradeThresholds: [
    { min: 8500, grade: 'A' },
    { min: 6500, grade: 'B' },
    { min: 4800, grade: 'C' },
    { min: 3000, grade: 'D' },
    { min: 1500, grade: 'E' },
    { min: 0, grade: 'F' },
  ],
};
