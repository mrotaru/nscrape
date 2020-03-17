# nscrape-daemon

WIP: Basic scraping daemon - takes user-defined spiders as input, which describe how to extract the data. Each spider can define multiple item types, and each scraped item will be emitted via websockets. Starts scraping as soon as at least one client connects to the websockets endpoint.

## Design

The daemon loads spiders; spiders specify how requests are to be made
- runner
  - loads and runs spiders
  - schedules fetch - fetches HTML via `fetch` or `puppeteer`
- spider - extracts structured data from HTML

Usage:

```sh
$ npm install -g nscrape

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

$ nscrape --spiders ./spider-reddit
```
