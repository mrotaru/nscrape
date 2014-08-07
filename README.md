# Scraping with Node

This program runs spiders, which should be Node modules placed in `./spiders`
and exporting a class with at least a `parse` method which takes one argument,
`html`. Spiders should emit the 'item' event when an item is parsed, passing
the item as a parameter to the callback.

The scraper will fetch the pages, extract the html (with phantomjs, if the
spider has `phantom` property set to `true`) and pass it on to the spider's
`parse` method.
