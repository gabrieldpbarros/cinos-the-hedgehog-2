export const CONFIG = {
  levelDistance: 1000, // distância horizontal para concluir a fase (metros/unidades),
  gravity: -18,        // units/sec^2
  jumpVelocity: 12,    // units/sec
  maxDt: 0.05,
  launchAcceleration: 12, // units/sec^2 from rest
  runAcceleration: 2,      // units/sec^2 near the speed limit
  runSpeedLimit: 20,       // units/sec
  brakeTime: 4,        // seconds to stop from runSpeedLimit
  reverseBrakeScale: 0.5, // shorter stop when the input opposes the current velocity
  maxBrakeTime: 60,    // seconds
  airBrakeFactor: 0.5
};
