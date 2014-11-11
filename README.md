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
