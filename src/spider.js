const deepmerge = require("deepmerge");
const crypto = require('crypto');
const objectsFromHtml = require("objects-from-html");

const { Logger, LogLevels } = require("./logger");

class Spider {
  constructor(spiderSpecification, config = {}) {
    this.specification = spiderSpecification;
    this.headless = spiderSpecification["infinite-scrolling"] || spiderSpecification["use-headless-browser"];
    this.config = deepmerge({}, config);
    this.iteration = 0;
    this.html = "";
    this._lastHash = "";
    this._logger = new Logger("spider", config.logLevel || LogLevels.ERROR);
  }

  getNextUrl() {
    if (this.headless || this.iteration === 0) {
      return this.specification.baseUrl;
    } else {
      const { nextUrlDescriptor } = this.specification;
      if (nextUrlDescriptor) {
        return objectsFromHtml(this.html, nextUrlDescriptor);
      } else {
        throw new Error("Requested new url, but 'nextUrlDescriptor' not provided.")
      }
    }
  }

  extract(html) {
    const { itemTypes } = this.specification;
    let returnedItems = [];
    for (let itemType of itemTypes) {
      const allItems = objectsFromHtml(html, itemType);
      if (this.iteration > 0 && this.headless) {
        // FIXME - very inefficient
        for(let i = 0; i < allItems.length; i++) {
          let item = allItems[i];
          let hash = this._hashItem(item);
          if (hash === this._lastHash) {
            this._logger.info(`returning items starting with ${i} (hash: ${this._lastHash})`);
            returnedItems = allItems.slice(i + 1);
            break;
          }
        }
      } else {
        returnedItems = allItems;
      }
    }
    this.html = html;
    this._lastHash = this._hashItem(returnedItems[returnedItems.length -1]);
    this.iteration++;
    return returnedItems;
  }

  _hashItem(item) {
    return crypto.createHash('md5').update(JSON.stringify(item)).digest('hex');
  }
}

module.exports = {
  Spider,
};
