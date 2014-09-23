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
            })
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
            xit('should be able to extract `href` attribute', function(){ });
            xit('should try to extract as an attribute if `extract` is not known', function(){ });
        })
        describe('when item proerties are optional', function(){
            xit('should throw if property not marked as optional cannot be scraped', function(){ });
            xit('should set optional propertes not found to null', function(){ });
        })
    })
})
