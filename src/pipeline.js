let Promise = require('bluebird')
let EventEmitter = require('events').EventEmitter
let _ = require('lodash')

let Pipeline = {
  addPipe: addPipe,
  process: process,
  emitter: new EventEmitter(),
  init: () => { this.pipes = [] }
}

let log = require('debug')('item')

let predefinedPipes = [{
  name: 'console',
  process: (item) => {
    if (item.template) {
      log(_.template(item.template, item))
    } else {
      log(item.title)
    }
    return Promise.resolve(item)
  }
}]

/**
 * Add a pipe
 *
 * @param {String|Object|Function} name
 * @return {Promise<item>}
 */
function addPipe (name, fn) {
  let findFn = (pipe) => pipe.name === name
  if (!this.pipes.find(findFn)) {
    let predefined = predefinedPipes.find(findFn)
    if (predefined) {
      this.pipes.push(predefined)
    } else {
      if (fn && typeof fn === 'function') {
        this.pipes.push({
          name,
          process: fn
        })
      } else if (typeof fn === 'object') {
        this.pipes.push(name)
      }
    }
    this.pipes.push()
  } else {
    log(`Trying to load a pipe twice: ${name}`)
  }
}

function process (item) {
  return Promise(this.pipes)
    .reduce((value, pipe) => pipe.process(value))
}

module.exports = Pipeline
