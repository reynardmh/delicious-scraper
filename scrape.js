const request = require("request");
const cheerio = require("cheerio");
const fs = require('fs');
const sleep = require('sleep');

const username = process.argv[2];
const baseUrl = `https://del.icio.us/${username}`;
const outFile = "links.json";
const sleepInterval = 1; // sleep between request (in seconds)

let totalPages = process.argv[3] || null;
let allLinks = [];

// add your session cookies here if you want to download private link
const cookie = 'session=; ' +
    'delvisitor=; ' +
    'delavid=; ' +
    '_jsuid=; ' +
    '_eventqueue=; ';

requestPage(1);

function requestPage(page) {
  let url = `${baseUrl}?page=${page}`;
  console.log(`Scraping ${url}`);
  request({url: url, headers: {Cookie: cookie}}, (error, response, body) => {
    if (error) {
      return console.log(error);
    }

    let links = extract(body);
    allLinks = allLinks.concat(links);

    if (++page <= totalPages) {
      sleep.sleep(sleepInterval);
      requestPage(page);
    } else {
      writeLinks();
    }
  });
}

function writeLinks() {
  // console.log(allLinks);
  fs.writeFile(outFile, JSON.stringify(allLinks), (err) => {
    if (err) {
      console.log(err);
    } else {
      console.log('-----');
      console.log(`Total links: ${allLinks.length}`);
      console.log(`Saved to ${outFile}`);
    }
  });
}

function extract(html) {
  let links = [];
  let $ = cheerio.load(html);
  if (!totalPages) {
    let pagination = $("ul.pagination li");
    totalPages = pagination.eq(pagination.length - 2).text();
  }
  $("div.articleThumbBlock").each( (x, el) => {
    let link = {};
    link.title = $(el).find("div.articleTitlePan h3 a.title").text();
    link.url = $(el).find("div.articleInfoPan p a").eq(0).text();
    link.created_at = new Date($(el).find("div.articleInfoPan p").eq(2).text().match(/ on (.+)$/)[1]);
    link.desc = $(el).find("div.thumbTBriefTxt p").eq(1).text();
    if (isBlank(link.desc)) {
      link.desc = null;
    }
    link.tags = $(el).find("div.thumbTBriefTxt ul li").map( (i, e) => $(e).text() ).get();
    links.push(link);
  });
  // console.log(links);
  return links;
}

function isBlank(str) {
  return (!str || /^\s*$/.test(str));
}
