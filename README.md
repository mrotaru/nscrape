# Scraping with Node

Extract structured data from websites using "spiders".

A spider is a json file. The structure is as such:

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

Spiders to load are selected with the `--spider` option. For example:

    node scrape.js  --spider reddit

In this case, `nsc` will `require("reddit")` and validate the result against
the [spider schema](schemas/spider-v1.json). So, `reddit` can be a standard
module, or just a plain JSON file. If it's JSON:

    node scrape.js  --spider ./reddit.json
