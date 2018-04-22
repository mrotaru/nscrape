'use strict'

let Promise = require('bluebird')
let EventEmitter = require('events').EventEmitter
let _ = require('lodash')
_.templateSettings.interpolate = /{{([\s\S]+?)}}/g;

let log = require('debug')('item')

let Pipeline = {
  init: function () { this.pipes = []; return this },
  loadPipe,
  process,
  emitter: new EventEmitter()
}

let predefinedPipes = [{
  name: 'console-log',
  process: (item) => {
    if (item.template) {
      log(_.template(item.template, item))
    } else {
      console.log(`${item.title}`)
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
function loadPipe (name, fn) {
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
      } else if (typeof name === 'object') {
        this.pipes.push(name)
      } else if (typeof name === 'string') {
        try {
          let pipe = require(name)
          this.pipes.push(pipe)
        } catch (err) {
          log(`Failed to load pipe: ${name}`)
        }
      }
    }
  } else {
    log(`Trying to load a pipe twice: ${name}`)
  }
}

function process (item) {
  return Promise
    .reduce(this.pipes, (value, pipe) => pipe.process(value), item)
}

module.exports = Pipeline
