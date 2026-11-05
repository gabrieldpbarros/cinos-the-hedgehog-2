export const chunkStrategies = {
  flat: {
    heightAt: (_X, baseY) => baseY,
    normalAt: (_X, _theta) => {}
  },
  rampUp: {
    heightAt: (X, baseY, theta) => (X * Math.tan(theta)) + baseY,
    normalAt: () => {}
  },
  rampDown: {
    heightAt: (X, baseY, theta) => baseY - X * Math.tan(theta),
    normalAt: (_X, _theta) => {}
  }
};
