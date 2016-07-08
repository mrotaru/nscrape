There are about a dozen similar packages on `npm`. What sets this one apart ?

- comes with a nice CLI featuring auto-completion (see examples)
- comes with a web interface, where you can see the fetched data from all the
  loaded spiders
- goes out of it's way to make it easy to create, debug and run spiders
- well defined spider schema (using JSON-schema draft 4)
- lazy REST server
- easy to extend with plugins for storage
- easy to create new spiders (they're just JSON files)
- works with dynamic (JavaScript) websites - just set 'phantom' to true in the
  sipder's json file. So the website will be loaded in `phantom`
- unit tests
- maintained

## Architecture

### Spider
Given HTML, it will extract items from it (emitted via events)

### Runner
Given spider names, it will load them. It will ask the spider for an URL, fetch
it and feed the HTML to the sipder. It will also listen for the spider's `item`
event, and run each item through the pipeline.

### Pipeline
processes items - can do stuff like print it on console, or store it in a
database. Can also be used for custom validation logic, to reject items

## Usage
From the CLI:
```
# on the cli, defaults: pipelines: console, start()
nscraper --spiders reddit --web 
```

Programatic:
```
runner = Object.create(Runner)
runner.init({
  spiders: ['reddit'],
  pipes: ['console-log'],
  wait: 2000
}).start()
```
