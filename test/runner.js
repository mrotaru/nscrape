'use strict'

let Runner = require('./../src/runner.js')

let runner = Object.create(Runner)
runner.init({
  spiders: ['reddit'],
  pipes: ['console-log'],
  wait: 2000,
  'html-debug-file': 'out.html'
}).start()

