async function lowQuality(page) {
  await page.waitFor(15000);
  await page.waitForSelector('#left-nav-open-button');

  await page.goto('https://play.google.com/music/listen?hl=en_US#/accountsettings');

  await page.waitFor(10000);

  await page.click('#labelAndInputContainer');
  await page.waitFor(2000);

  let options = await page.$$('#audio-quality-menu *[role="option"]');
  await options[3].click();

  await page.waitFor(3000);
}

module.exports = {
  lowQuality
}