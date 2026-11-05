export const CONFIG = {
  forwardSpeed: 7,     // units/sec (base)
  maxSpeed: 15,        // ceiling for speed buildup
  acceleration: 2,     // units/sec^2 speed buildup (slower)
  friction: 7,         // units/sec^2 deceleration when stopping
  braking: 12,         // units/sec^2 deceleration when reversing direction
  gravity: -18,        // units/sec^2
  jumpVelocity: 10,    // units/sec (a bit higher)
  groundOffset: 0.5,   // player half-height on ground
  maxDt: 0.05,
};
