process.env.DEBUG='*';
var fs = require('fs');
var program = require('commander');
var path = require('path');
var _ = require('lodash');

var readline = require('readline');
var rl = readline.createInterface(process.stdin, process.stdout);

var questions = [
    {id: 'name', text: 'Spider name: ', type: 'string'},
    {id: 'baseUrl', text: 'Base URL: ', type: 'string'},
    {id: 'nextUrlDescriptorSelector', text: 'Next URL selector: ', type: 'string'},
    {id: 'itemTypeName', text: 'Item type name: ', type: 'string'},
    {id: 'itemTypeContainerSelector', text: 'Items container selector: ', type: 'string'},
    {id: 'itemTypeSelector', text: 'Item container selector: ', type: 'string'},
];

var compiledTemplate = null;

_.templateSettings.evaluate=/\{\{(.+?)\}\}/g;
_.templateSettings.interpolate=/\{\{=(.+?)\}\}/g;
_.templateSettings.escape=/\{\{-(.+?)\}\}/g;

try {
    template = fs.readFileSync('tools/spider.template');
    compiledTemplate = _.template(template);
} catch(err) {
    console.log(err);
    process.exit(1);
}

// ask questions
var answers = {};
var qi=0;
function ask(){
    var q = questions[qi];
}

function processLine(line){
    var pq = questions[qi-1];
    var q = questions[qi];
    if(q){
        answers[pq.id] = line;
        ++qi;
        rl.setPrompt(q.text);
        rl.prompt();
    } else {
        answers[pq.id] = line;
        rl.removeListener('line', processLine);
        var outName = answers.name + '-spider.json';
        try {
            fs.writeFileSync(outName,compiledTemplate(answers));
            console.log('writing: ' + outName);
            process.exit(0);
        } catch(e){
            console.log('Error',e);
            process.exit(1);
        }
    }
}

rl.on('line', processLine);
rl.on('close', function(line) {
    console.log('close');
});

rl.setPrompt(questions[0].text);
rl.prompt();
++qi;
