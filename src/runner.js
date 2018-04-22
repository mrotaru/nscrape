'use strict'

let merge = require('deep-extend')
let Promise = require('bluebird')
let util = require('util')
let request = Promise.promisify(require('request'))
Promise.promisifyAll(request)

let Spider = require('./spider.js')
let Pipeline = require('./pipeline.js')

// setup logging
let debug = require('debug')
let info = debug('runner:info')
let error = msg => console.error(msg)

error.log = console.error.bind(console)

let Runner = {
  init,
  start,
  pause,
  fetch
}

function init (config) {
  this.config = merge({}, require('./default-config.json'), config)
  this.spiders = []
  this.pipeline = Object.create(Pipeline).init()
  for (let pipeName of config.pipes) {
    this.pipeline.loadPipe(pipeName)
  }
  if (!config.spiders || !config.spiders.length) {
    error('No spiders loaded; exiting...')
    process.exit(1)
  }
  for (let spiderName of config.spiders) {
    let spider = Object.create(Spider).init(config)
    spider.load(spiderName)
    let runner = this // bind ?
    spider.emitter.on('item-scraped', function (item, itemTypeName) {
      runner.pipeline.process(item, itemTypeName)
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
      error(`Spider errored: ${util.inspect(spider)}`)
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
  return spider.phantom
    ? fetchWithPhantom(url, spider)
    : fetchWithHttp(url, spider)
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
  return phantom.create(function (phantom) {
    if (!phantom) {
      error('phantom create failed')
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
            error('page could not be opened')
          }
        })
      })
    }
  })
}

module.exports = Runner
