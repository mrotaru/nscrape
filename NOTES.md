# nscraper

Extract structured data from websites using "spiders".

A spider is a plain json file, mapping attributes to CSS selectors:

```
{
    "name": "reddit",
    "baseUrl": "http://www.reddit.com/r/javascript",
    "itemTypes": [{
        "name": "link",
        "container": ".linklisting",
        "selector": ".thing",
        "properties": {
            "title": "a.title",
            "votes": ".score:not(.dislikes):not(.likes)"
        }
    }]
}
```

## Usage

### From the CLI
```
# load and run `nsc-reddit`, show scraped items in the command line and
# enable the web interface
nscraper --spiders reddit --web 
```

### Programatic
```
runner = Object.create(Runner)
runner.init({
  spiders: ['reddit'],
  pipes: ['console-log'],
  wait: 2000
}).start()
```

### Scraping project
```
$ mkidr my-spiders
$ cd my-spiders && npm init -y
$ npm install --save nscraper
$ touch index.js
$ cat index.js
let myDb = require('some-database')

runner = Object.create(Runner)
runner.init({
  spiders: ['reddit'],
  pipes: ['console-log', {
    name: 'my-db',
    process: (item) => myDb.store(item)
  }],
  wait: 2000
}).start()
```

## Architecture

### Spider
Given HTML, it will extract items from it (emitted via events)

### Pipeline
Processes scraped items - can do stuff like print it on console, or store it in a
database. Multiple 'pipes' can be included in the pipeline; each will be
executed in order, with the result passed on to the following pipes.

### Runner
Ties things together; given spider names, it will load them. It will ask the
spider for an URL, fetch it and feed the HTML to the sipder. It will also listen
for the spider's `item` event, and run each item through the pipeline.

### CLI
Command line interface

### TODO
- additional info - for ex, for a redit item, enable retrieval of additional
  data available by opening the item's page
- extend spider - override selectors, options for phantom, validators, etc
