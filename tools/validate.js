//var validator = require('tv4');
var ZSchema = require("z-schema");
var validator = new ZSchema();

var instance = require("../" + process.argv[2]);
var schema = require("../" + process.argv[3]);
 
console.log('synchronous result:', validator.validate(instance, schema));
console.log('errors:', validator.getLastErrors());
