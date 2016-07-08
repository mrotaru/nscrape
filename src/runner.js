'use strict'

let merge = require('merge')
let Promise = require('bluebird')
let request = Promise.promisify(require('request'))
Promise.promisifyAll(request)

let Spider = require('./spider.js')
let Pipeline = require('./pipeline.js')

// setup logging
var debug = require('debug')
var error = debug('main:error')
var info = debug('main:info')
error.log = console.error.bind(console)

let Runner = {
  init,
  start,
  pause,
  fetch
}

function init (config) {
  this.config = merge({}, config)
  this.spiders = []
  this.pipeline = Object.create(Pipeline).init()
  for (let pipeName of config.pipes) {
    this.pipeline.loadPipe(pipeName)
  }
  for (let spiderName of config.spiders) {
    let spider = Object.create(Spider).init(config)
    spider.load(spiderName)
    spider.emitter.on('item-scraped', function (item, itemTypeName) {
      this.pipeline.process(item, itemTypeName)
    })
    this.spiders.push(spider)
  }
  return this
}

function start () {
  for (let spider of this.spiders) {
    if (!spider.state.error) {
      let f = (spider) => {
        return fetch(spider).then((html) => {
          spider.process(html)
          if (spider.hasNextUrl() && !spider.isPaused()) {
            f(spider)
          }
        })
      }

      f(spider)
    } else {
      error(`Spider errored: ${spider}`)
    }
  }
}

function pause () {
  for (let spider of this.spiders) {
    spider.pause()
  }
}

function fetch (spider) {
  let url = spider.getNextUrl()
  if (spider.config.wait) {
    info(`waiting ${spider.config.wait} ms...`)
    return Promise.delay(spider.config.wait).then(function () {
      return _fetch(url, spider)
    })
  } else {
    return _fetch(url, spider)
  }
}

function _fetch (url, spider) {
  if (spider.phantom) {
    fetchWithPhantom(url, spider)
  } else {
    fetchWithHttp(url, spider)
  }
}

function fetchWithHttp (url, spider) {
  let requestOptions = {
    jar: spider.hasOwnProperty('cookies') && spider.cookies === true,
    proxy: typeof proxy !== 'undefined'
      ? this.config.proxy
      : null,
    uri: url
  }

  return request.getAsync(requestOptions).spread(function (resp, body) {
    if (resp.statusCode === 200) {
      info(`got data back from ${requestOptions.uri}`)
      spider.process(body)
    } else {
      error(`request ${requestOptions.uri} failed - code is: ${resp.statusCode}`)
    }
  }).catch(function (err) {
    error('request ' + requestOptions.uri + ' failed: ')
    error(err)
  })
}

function fetchWithPhantom (url) {
  let self = this
  let phantom = require('phantom')
  phantom.create(function (phantom) {
    if (!phantom) {
      console.log('phantom create failed')
    } else {
      phantom.createPage(function (page) {
        page.open(url, function (status) {
          if (status === 'success') {
            page.evaluate(function () {
              return document
            }, function (result) {
              var html = result.all[0].innerHTML
              phantom.exit()
              self.spider.parse(html)
            })
          } else {
            console.log('error: page could not be opened')
          }
        })
      })
    }
  })
}

module.exports = Runner
