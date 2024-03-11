const puppeteer = require('puppeteer');

const { analyze } = require('./analyze');

const url = process.argv.length >= 3 ? process.argv[2] : 'https://www.solidpoint.net/';

(async () => {
    const browser = await puppeteer.launch();
    const page = await browser.newPage();

    const pageScripts = [];
    const client = await page.target().createCDPSession();

    await client.send('Debugger.enable');

    client.on('Debugger.scriptParsed', async function ({ scriptId, url }) {
        const { scriptSource } = await client.send(
            'Debugger.getScriptSource',
              { scriptId }
        );
        pageScripts.push({ scriptSource, url });
    });

    await page.goto(url);

    for (const { url, scriptSource} of pageScripts) {
        console.log('analyzing script', url);
        analyze(scriptSource);
    }


    await browser.close();
})();