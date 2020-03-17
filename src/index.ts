const util = require("util");
const axios = require("axios");
const WebSocket = require("WebSocket");

interface IScrapeConfig {
  active: boolean,
}

enum Downloaders = {
  Headless, // using Axios
  Browser, // using Puppeteer
}

class NScrape {
  private config: IScrapeConfig;
  private spiders: [Spider];

  constructor(config: IScrapeConfig, spiders: [Spider]) {
    this.config = config;
    this.spiders = spiders;
    this.connections = 0;

    this.config.active = false;
    
    const wss = new WebSocket.Server({
      port: 8080,
      clientTracking: true,
    });
    wss.on('connection', () => {
      this.start();
    });

    for (let spiderName of config.spiders) {
      let spiderDescriptor = this.loadSpider(spiderName);
      let spider = new Spider(spiderDescriptor, config);
      spider.emitter.on("item-scraped", (item, itemTypeName) => {
        wss.send(item);
      });
      this.spiders.push(spider);
    }
  }

  public start() {
    this.config.active = true;
    this.spiders.forEach(spider => {
      const url = spider.getNextUrl();
      if (spider.config.wait) {
        console.log(`waiting ${spider.config.wait} ms...`);
        Promise.delay(spider.config.wait).then(() => {
          download(url, spider.downloader).then(res => {
            spider.process(res);
          })
        });
      } else {
        download(url, spider.downloader).then(res => {
          spider.process(res);
        })
      }
    });
  }

  public pause() {
    this.config.active = false;
  }

  private download(url: string, downloader: Downloaders) {
    if (downloader === Downloaders.Headless) {
      return axios.get(url);
    } else {
      // TODO: puppeteer
    }
  }
}
