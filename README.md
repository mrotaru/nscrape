# Scraping with Node

Scrape structured data based on JSON-defined "spiders". Can use with the CLI, or the built-in web interface. Plugins are available for storage in
databases, such as AWS DynamoDB.

```sh
$ npm install -g nscrape
$ npm install -g my-spider
$ nscrape --spiders my-spider
# scraped items listed on the command line
$ nscrape --web --spiders my-spider
# open browser to see scraped images in the web interface
```

Spider example:

```js
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
```

Spiders should be globally installed `npm` packages. When developing a
spider, one can use [`npm link`](https://docs.npmjs.com/cli/link) to avoid
having to re-install it with each change.

## Plugins
- [`dynamo-db`](https://github.com/mrotaru/nsc-dynamodb) - store scraped
items in [AWS DynamoDB](https://aws.amazon.com/dynamodb/)