const puppeteer = require('puppeteer');

const { analyze } = require('./analyze');

const url = process.argv.length >= 3 ? process.argv[2] : 'https://www.solidpoint.net/';

(async () => {
    const browser = await puppeteer.launch();
    const page = await browser.newPage();

    const pageScripts = [];
    const client = await page.createCDPSession();

    await client.send('Debugger.enable');

    const scriptPromises = [];
    let finished = false;
    client.on('Debugger.scriptParsed', function ({ scriptId, url }) {
        if (finished) return;
        async function getSource() {
            const { scriptSource } = await client.send(
                'Debugger.getScriptSource',
                { scriptId }
            );
            pageScripts.push({ scriptSource, url });
        }
        const scriptAcquired = getSource();
        scriptPromises.push(scriptAcquired);
    });

    await page.goto(url);
    await Promise.all(scriptPromises);

    for (const { url, scriptSource }  of pageScripts) {
        console.log('analyzing script', url);
        analyze(scriptSource);
    }

    finished = true;

    await browser.close();
})();