/* S: Config ************************************************/
const puppeteer = require('puppeteer');
const robot= require('robotjs');
const fs= require("fs");
const request= require("request");

/* S: Utils *************************************************/
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

Date.prototype.addDays = function(days) {
    var date = new Date(this.valueOf());
    date.setDate(date.getDate() + days);
    return date;
}

Date.prototype.getString = function() {
  var day = this.getDate();
  if (day < 10) { day = `0${day}`; } //A: Add leading zero

  var month = this.getMonth() + 1; //A: It's the index
  if (month < 10) { month = `0${month}`; }

  var year = this.getFullYear();

  return `${year}-${month}-${day}`;
}


/* S: Variables *********************************************/
var userData = 'datos_nav';

const out_data = './o_data';
if (!fs.existsSync(out_data)) {
	fs.mkdirSync(out_data);
}

const tpd = 500;
const language = 'es';
const keywords = [
	'vacuna',
	'covid',
	'coronavirus',
	'sputnik',
	'hospital',
	'doctor',
	'cuarentena',
	'pandemia',
]

var Browser;

var last_date = new Date('2020-01-18'); //U: Starting date
var fin_date = new Date('2021-01-01'); //U: Final date

//*************************************************************************

function getUrl() { //U: Gets an url of the search with filters
	var since = last_date; 
	last_date = last_date.addDays(1);
	var url = `https://twitter.com/search?f=live&q=(${keywords.join('%20OR%20')})%20lang%3A${language}%20until%3A${last_date.getString()}%20since%3A${since.getString()}%20-filter%3Alinks%20-filter%3Areplies&src=typed_query`
	console.log('URL: since', since, url);

	return url
}

(async () => { //U: Main, opens browser and starts process
  Browser = await puppeteer.launch({
		headless: true,
		args: [`--user-data-dir=${userData}`],//, `--auto-open-devtools-for-tabs`],
	});
	const page = await Browser.newPage();
	 var failed = false;
	while (last_date <= fin_date) {
		await page.goto(getUrl());
		await sleep(3000 + Math.floor(Math.random() * 500));

		var saved = 0; var prev = [];
		while (saved < tpd) { //A: Download up to tpd tweets per day 
			await page.keyboard.press('End');
			await sleep(3000 + Math.floor(Math.random() * 500));

			var x = await page.$x('//*[@role="article"]')
			if (x.length == 0) { failed = true; break;}
			if (x[0] in prev) { continue; } //A: There're overlapping tweets
			console.log('Continuing saved:', saved);
			prev = x;
			
			for (e of x) { //A: Saving each tweet's html
				var html = (await e.getProperty('innerHTML'))._remoteObject.value;
				fs.appendFileSync(`${out_data}/html.txt`, `\nXXX:SPLIT\n${html}`);
			}

			saved += x.length;
		}
		console.log('DAY DONE');
		await sleep(3000 + Math.floor(Math.random() * 500));

		if (failed) { console.error('FAILED WAIT UNTIL RETRY'); await sleep(120000); last_date = last_date.addDays(-1); failed = false; } //A: Wait 2 minutes
	}
	console.log('DONE');
	Browser.close();
})();
