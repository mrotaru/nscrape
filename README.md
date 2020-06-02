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
    "paged": true,
    "baseUrl": "https://www.reddit.com/r/javascript",
    "itemTypes": [{
        "name": "NewsItem",
        "selector": ".Post",
        "properties": {
            "title": "h3",
            "votes": {
              "xpath": "child::*[1]"
            }
        }
    }]
}
EOF
```