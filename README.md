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

This file should be `require`able - so, 

```
node scrape.js --spider reddit
```

This will run the reddit spider. By default, items from the front page will
be scraped, and then one more page. `--wait` will introduce a delay between
http requests, by default 2 seconds.
