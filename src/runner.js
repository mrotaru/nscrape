let merge = require('merge')

let Spider = require('./spider.js')
let Pipeline = require('./pipeline.js')

let Runner = {
  init,
  start,
  pause,
  fetchWithHttp,
  fetchWithPhantom
}

function init (config) {
  this.config = merge({}, config)
  this.pipeline = Object.create(Pipeline).init()
  for (let pipeName in config.pipes) {
    this.pipeline.loadPipe(pipeName)
  }
  for (let spiderName in config.spiders) {
    let spider = Object.create(Spider)
    spider.load(spiderName).init()
    spider.on('item-scraped', function (item, itemTypeName) {
      this.pipeline.process(item, itemTypeName)
    })
    this.spiders.push(spider)
  }
}

function start () {
  for(let spider in self.spiders) {
    if (spider.hasNextUrl()) {
      if (this.config.wait) {
        let runner = this
        info('waiting...' + program.wait)
        return Promise.delay(this.config.wait).then(function () {
          return runner.fetch()
        })
      } else {
        return runner.fetch()
      }
    }
  }
}

function pause () {
}

function fetch (spider) {
}

function fetchWithHttp (url, spider) {
  let self = this

  let requestOptions = {
    jar: self.spider.hasOwnProperty('cookies') && self.spider.cookies === true
      ? true
      : false,
    proxy: typeof proxy != 'undefined'
      ? proxy
      : null
    uri: url
  }

  return request.getAsync(requestOptions).spread(function (resp, body) {
    if (resp.statusCode == 200) {
      info('got data back from ', requestOptions.uri)
      spider.process(body)
    } else {
      error('request ' + request_options.uri + ' failed - code is: ' + resp.statusCode)
    }
  }).catch(function (err) {
    error('request ' + request_options.uri + ' failed: ')
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
