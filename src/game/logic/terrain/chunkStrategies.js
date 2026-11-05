export const chunkStrategies = {
  flat: { 
    heightAt: (X, baseY) => baseY,
    normalAt: (X, theta) => {}
  },
  rampUp: { 
    heightAt: (X, baseY, theta) => (X * Math.tan(theta)) + baseY,
    normalAt: () => {}
  },
  rampDown: {
    heightAt: (X, baseY, theta) => baseY - X * Math.tan(theta),
    normalAt: (X, theta) => {}
  }
};
