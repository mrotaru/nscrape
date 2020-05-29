"use strict";

const LogLevels = {
  FATAL: 0,
  ERROR: 1,
  WARNING: 2,
  INFO: 3,
  DEBUG: 4,
}

class Logger {
  constructor(topic, level) {
    this.topic = topic;
    this.includeTimestamp = true;
    this.level = level;
  }

  fatal(...args) {
    this.log(console.error, ...args);
  }

  error(...args) {
    if (this.level >= LogLevels.ERROR) {
      this.log(console.error, ...args);
    }
  }

  warning(...args) {
    if (this.level >= LogLevels.WARNING) {
      this.log(console.warn, ...args);
    }
  }

  info(...args) {
    if (this.level >= LogLevels.INFO) {
      this.log(console.info, ...args);
    }
  }

  debug(...args) {
    if (this.level >= LogLevels.DEBUG) {
      this.log(console.debug, ...args);
    }
  }

  timestamp() {
    return new Date().toISOString();
  }

  log (logFunction, ...args) {
    let prefix = `[${this.topic}]`;
    if (this.includeTimestamp) {
      prefix += ` [${this.timestamp()}]`;
    }
    logFunction(prefix, ...args)
  }
}

Logger.logObject = obj => {
  console.dir(obj, { depth: null });
};

module.exports = {
  Logger,
  LogLevels,
}
