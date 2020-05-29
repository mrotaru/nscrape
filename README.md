# nscrape

Extract structured data from HTML.

## Using the CLI (Non-Interactive)
- `$ npm install -g nscrape`
- write a spider (see below) for a particular website
- `$ nscrape --spider my-spider.json --wait 3000 --nr-of-pages 1`
- scraped items will be printed on stdout as JSON

## Using gRPC (WIP)
- TODO: include a `persist-protobuf` server implementation for interactive use
- mv to different project ?

## Spider
```
$ tee ./spider-reddit.json <<EOF
{
    "name": "reddit-js",
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
EOF
```