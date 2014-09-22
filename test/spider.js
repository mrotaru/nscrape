var Spider = require('../spider.js');
var expect = require('chai').expect

describe('Spider', function(){
    describe('.extract', function(){
        describe('when descriptor is string', function(){
            it('should interpret descriptor as selector and extract text', function(){
                var spider = new Spider();
                spider.addItemType({
                    selector: '.article',
                    properties: {
                        title: '.title'
                    }
                });
                spider.parse('<body><div class="article"><h1 class="title">Foo</h1></div></body>').then(function(items){
                    expect(items).to.be.a('array');
                    expect(items).to.have.length(1);
                    expect(items[0]).to.deep.equal({title: 'Foo'});
                });
            })
        }),
        describe('when descriptor is object', function(){
            xit('should throw if descriptor does not have `selector` property', function(){ });
            xit('should assume `text` if no `extract` property', function(){ });
            xit('should be able to extract `href` attribute', function(){ });
            xit('should try to extract as an attribute if `extract` is not known', function(){ });
        })
    })
})
