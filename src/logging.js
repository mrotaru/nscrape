error.log = console.error.bind(console);
const logObject = obj => {
  console.dir(obj, { depth: null });
};

const logger = context => {
  return level => {
    return {
      debug: msg => log()
      error: console.error.bind(console),
    }
  }
};

module.exports = {
  logObject,
  logger,
};
