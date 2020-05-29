const deepmerge = require("deepmerge");
const objectsFromHtml = require("objects-from-html");

class Spider {
  constructor(spiderSpecification, config = {}) {
    this.specification = spiderSpecification;
    this.config = deepmerge({}, config);
    this.currentPage = 0;
    this.html = "";
  }

  getNextUrl() {
    if (this.currentPage === 0) {
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
    for (let itemType of itemTypes) {
      return objectsFromHtml(html, itemType);
    }
    this.html = html;
  }
}

module.exports = {
  Spider,
};
