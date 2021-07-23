const random = (min, max) => Math.floor(Math.random() * (max - min)) + min;
export const randomChoice = (x) => x[random(0, x.length)];