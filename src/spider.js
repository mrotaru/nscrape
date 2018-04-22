'use strict'

let EventEmitter = require('events').EventEmitter
let Promise = require('bluebird')
let merge = require('deep-extend')
let path = require('path')
let childProcess = require('child_process')

let beautify = require('js-beautify').html

let debug = require('debug')
let log = debug('spider')
let error = debug('spider:error')
error.log = console.error.bind(console)

let beautifyOptions = {
  preserve_newlines: false,
  indent_size: 2,
  wrap_line_length: 80
}

let Spider = {
  init,
  load,
  process,
  getNextUrl,
  extract,
  pause: () => { this.state.paused = true },
  isPaused: () => { return this.state.paused },
  addItemType: (itemType) => this.itemTypes.push(itemType),
  hasNextUrl: () => this.hasOwnProperty('nextUrlDescriptor') || this.hasOwnProperty('nextUrl'),
  emitter: new EventEmitter()
}

function init (config) {
  this.config = merge({
    insecure: false,
    emitErrored: false,
    pushErrored: false
  }, config)

//  console.log('spider-config', this.config);

  this.itemTypes = []

  this.state = {
    ready: false,
    error: null,
    paused: false
  }

  this.stats = {
    scrapedPages: 0
  }

  this.items = {}
  this._html = null
  this.$ = null
  this.currentPage = null
  return this
}

function load (fileName) {
  log('loading JSON spider ', fileName)
  try {
    let globalPackagesPath = childProcess.execSync('npm root -g').toString().trim()
    let file = require(path.join(globalPackagesPath, fileName))
    for (let prop in file) {
      this[prop] = file[prop]
    }
    _validate(this)
  } catch (err) {
    error(`failed to load spider: ${fileName}\n${err}`)
    this.state.error = err
  }
  return this
}

function _validate (spider) {
  log('validating JSON spider:', spider.name)
  let ZSchema = require('z-schema')
  let schemaValidator = new ZSchema()
  let schema = require('../schemas/spider-v1.json')
  let valid = schemaValidator.validate(spider, schema)
  if (!valid) {
    this.state.error = schemaValidator.getLastErrors()
  }
}

/**
 * For every item type, try to extract it from the provided `html`. All
 * extracted items will be added to the internal hash, as well as emitted as an * event.
 *
 * @param {String} html
 */
function process (html) {
  // load the html
  if (!html || !html.length) {
    return null
  }
  log('processing %d bytes', html.length)

  if (this.config['html-debug-file']) {
    require('fs').writeFileSync(this.config['html-debug-file'], html)
  }

  let $ = this.$ = require('cheerio').load(html, {
    normalizeWhitespace: false,
    xmlMode: false,
    decodeEntities: true
  })

  for (let itemType of this.itemTypes) {
    let itemsScraped = 0
    let itemsErrored = 0

    // get the container
    let containerSelector = itemType.container || 'body'
    let container = $(containerSelector)
    log(`extracting ${itemType.name} items from ${containerSelector}`)
    if (!container.length) {
      let bhtml = beautify(this.$.html(), beautifyOptions)
      throw new ExtractorError('Container not found: ' + containerSelector, bhtml)
    }

    let itemsDom = container.find(itemType.selector)

    // use $.filter to exclude items matching the `exclude` selector
    let excluded = 0
    if (itemType.exclude) {
      itemsDom = $(itemsDom).filter(function (index) {
        if ($(this).is(itemType.exclude)) {
          log('excluding: ' + $(this).text().replace(/\s+/g, ' '))
          ++excluded
          return false
        }
        return true
      })
    }

    // from each remaining node, build the item
    let spider = this
    itemsDom.each(function (i, el) {
      let item = {}
      if (itemType.template) {
        item.template = itemType.template
      }

      // iterate over the properties the item should have, and try
      // to extract each of them from the DOM element
      for (let prop in itemType.properties) {

        // functions
        let isFunc = itemType.properties[prop].hasOwnProperty('sfunction')
        if (!isFunc && typeof itemType.properties[prop] === 'object' && !itemType.properties[prop].selector) {
          throw new Error('Descriptor does not have a `selector` property')
        }

        // if we can't extract, set the property value to null, and
        // add the __errors property
        try {
          item[prop] = spider.extract(itemType.properties[prop], el)
        } catch (e) {
          log('failed to extract: ', e)
          item[prop] = null
          if (!item.hasOwnProperty('__errors')) {
            item.__errors = {}
          }
          item.__errors[prop] = e
        }
      }

      // add items that have not errored (all properties were extracted
      // successfully) and emit an event. Depending on configuration, errored
      // items can also be emitted and/or added to the `items` array
      let errored = item.hasOwnProperty('__errors')
      if (!errored || (errored && spider.pushErrored)) {
        if (!spider.items.hasOwnProperty(itemType.name)) {
          spider.items[itemType.name] = []
        }
        spider.items[itemType.name].push(item)
      }
      if (!errored || (errored && spider.emitErrored)) {
        spider.emitter.emit('item-scraped', item, itemType.name)
      }
      if (errored) {
        itemsErrored++
      } else {
        itemsScraped++
      }
    })

    if (!itemsScraped) {
      log('no items were scraped.')
    }
    return Promise.resolve(spider.items)
  }
}

// Get the url to the next page
function getNextUrl () {
  log('getting nextUrl')
  if (this.nextUrl) return this.nextUrl()
  if (this.currentPage === null) {
    this.currentPage = 1
    log('setting currentPate to 1')
    return this.baseUrl
  } else {
    log('currentPage: %s', this.currentPage)
    this.currentPage = this.currentPage + 1
    if (this.hasOwnProperty('nextUrlDescriptor')) {
      var ret = this.extract(this.nextUrlDescriptor)
      log('nextUrl: ', ret)
      return ret
    } else {
      return null
    }
  }
}

/**
 * Extract a property described by `descriptor` from the `ctx`
 *
 * @param {Object | String} descriptor
 * @param {Object | String} ctx
 */
function extract (descriptor, _ctx) {
  let ctx = _ctx || 'body'
  let selector = ''
  if (typeof (descriptor) === 'string') {
    selector = descriptor
  } else if (descriptor.hasOwnProperty('sfunction')) {
    if (!this.insecure) {
      throw new Error('Cannot run functions while insecure is false')
    }
    // parse function and run in the context of `ctx`
    var f = new Function(`var $ = arguments[0]; ${descriptor.sfunction}`) // eslint-disable-line no-new-func
    return f.apply(ctx, [this.$])
  } else if (!descriptor.selector) {
    throw new Error('Descriptor does not have a `selector` property')
  } else {
    selector = descriptor.selector
  }

  let el = this.$(ctx).find(selector)
  if (!el.length) {
    if (typeof (descriptor) === 'object' && descriptor.optional) {
      log('optional property element not found: %s setting to null', ret)
      return null
    } else {
      var bhtml = beautify(this.$(ctx).html(), beautifyOptions)
      throw new ExtractorError('Cannot find: ' + selector, bhtml)
    }
  }

  let ret = null
  let what = ''
  if (typeof (descriptor) === 'string') {
    what = 'text'
  } else {
    what = 'extract' in descriptor
      ? descriptor.extract
      : 'text'
  }

  switch (what) {
    case 'href':
      ret = el.attr('href')
      break
    case 'text':
      ret = el.text()
      break
    default:
      ret = null
  }

  // sanitizers
  if (this.sanitizers) {
    let validator = require('validator')
    if (typeof this.sanitizers === 'object' && Array.isArray(this.sanitizers)) {
      for (let sanitizer of this.sanitizers) {
        if (typeof validator[sanitizer] === 'function') {
          ret = validator[sanitizer](ret)
        } else {
          error('Cannot find sanitizer: ', sanitizer)
        }
      }
    }
  }

  return ret
}

// rel: http://stackoverflow.com/a/17891099/447661
// rel: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Error#Example.3A_Custom_Error_Types
function ExtractorError (message, html) {
  this.name = 'ExtractorError'
  this.message = message + '\n' + html.substring(0, 800)
  if (html.length > 800) {
    var fs = require('fs')
    fs.writeFileSync('debug.html', html)
  }
}
ExtractorError.prototype = Object.create(Error.prototype)
ExtractorError.prototype.constructor = ExtractorError

module.exports = Spider
