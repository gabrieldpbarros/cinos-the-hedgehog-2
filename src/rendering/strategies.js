export const chunkStrategies = {
  flat: { heightAt: () => 0 },
  rampUp: { heightAt: (x, length) => 2 * x / length },
};
