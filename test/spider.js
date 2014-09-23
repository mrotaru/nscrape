var Spider = require('../spider.js');
var expect = require('chai').expect

describe('Spider', function(){
    describe('.extract', function(){

        var spider;
        var html;

        beforeEach(function(){
            spider = new Spider();
            html = '<body><div class="article"><h1 class="title">Foo</h1></div></body>';
        });

        describe('when descriptor is string', function(){
            it('should interpret descriptor as selector and extract text', function(){
                var itemT ={
                    selector: '.article',
                    properties: {
                        title: '.title'
                    }
                };
                spider.addItemType(itemT);
                spider.parse(html).then(function(items){
                    expect(items).to.be.a('array');
                    expect(items).to.have.length(1);
                    expect(items[0]).to.deep.equal({title: 'Foo'});
                });
            });

            it('should throw when item property selector is not found', function(){
                var itemT ={
                    selector: '.article',
                    properties: {
                        title: '.no-such-thing'
                    }
                };
                spider.addItemType(itemT);
                expect(spider.parse.bind(spider,html)).to.throw(Error);
            });

            // mv to scrape test; not extractor
            xit('should throw when item element selector is not found', function(){
                var itemT ={
                    selector: '.no-such-item-element',
                    properties: {
                        title: '.title'
                    }
                };
                spider.addItemType(itemT);
                expect(spider.parse.bind(spider,html)).to.throw(Error);
            });
        }),

        describe('when descriptor is object', function(){

            it('should throw if descriptor does not have `selector` property', function(){
                var itemT ={
                    selector: '.article',
                    properties: {
                        title: {} // descriptor without `selector`
                    }
                };
                spider.addItemType(itemT);
                expect(spider.parse.bind(spider,html)).to.throw('Descriptor does not have a `selector` property');
            });

            it('should assume `text` if no `extract` property', function(){
                var itemT ={
                    selector: '.article',
                    properties: {
                        title: {
                            selector: '.title' // descriptor without `extract`
                        }
                    }
                };
                spider.addItemType(itemT);
                spider.parse(html).then(function(items){
                    expect(items).to.be.a('array');
                    expect(items).to.have.length(1);
                    expect(items[0]).to.deep.equal({title: 'Foo'});
                });
            });

            it('should be able to extract `href` attribute', function(){
                var itemT ={
                    selector: '.article',
                    properties: {
                        url: {
                            selector: '.my-url', // select an anchor...
                            extract: 'href',     // and extract href from it
                        }
                    }
                };
                spider.addItemType(itemT);
                html = '<body><div class="article"><a class="my-url" href="http://google.com">Google</a></div></body>';
                spider.parse(html).then(function(items){
                    expect(items).to.be.a('array');
                    expect(items).to.have.length(1);
                    expect(items[0]).to.deep.equal({url: 'http://google.com'});
                });
            });

            it('should not throw and extract when item property selector is not found and property is optional', function(){
                var itemT ={
                    selector: '.article',
                    properties: {
                        title: {
                            selector: '.no-such-thing',
                            optional: true
                        }

                    }
                };
                spider.addItemType(itemT);
                spider.parse(html).then(function(items){
                    expect(items).to.be.a('array');
                    expect(items).to.have.length(1);
                    expect(items[0]).to.deep.equal({title: null});
                });
            });

            xit('should try to extract as an attribute if `extract` is not known', function(){ });
        })
        describe('when item proerties are optional', function(){
            xit('should throw if property not marked as optional cannot be scraped', function(){ });
            xit('should set optional propertes not found to null', function(){ });
        })
    })
})
