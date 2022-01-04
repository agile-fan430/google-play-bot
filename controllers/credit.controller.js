const { getCard, usedCard } = require('../services/setting.service');

async function addCard(browser, page, accountInfo) {
  try {
    await page.goto('https://play.google.com/music');
    await page.waitFor(5000);
    await page.waitForSelector('#left-nav-open-button');
  
    await page.click('#left-nav-open-button');
  
    await page.waitFor(3000);
  } catch(err) {
    console.log('error on credit start ', err);
  }

  try {

    await page.click('#nav_collections .upsell-button');

    await page.waitFor(20000);
  
    let pages = await browser.pages();
  
    let youtubePage = await pages[2];
  
    try {
      try {
        await youtubePage.click('#manage-subscription-button');
        await youtubePage.waitFor(10000);
      } catch(error) {
        try {
          await youtubePage.goto("https://music.youtube.com/music_premium/gpm");
          await youtubePage.waitFor(5000);
          await youtubePage.click('#manage-subscription-button');
        } catch(e) {
          await youtubePage.goto("https://music.youtube.com/music_premium/gpm");

          await youtubePage.waitFor(5000);
          await youtubePage.click('#manage-subscription-button');
          await youtubePage.waitFor(10000);
        }
      }
    
      let iframes = await youtubePage.frames();
    
      let iframe = iframes[1];
      // try {
      //   await iframe.click('.b3-expanding-form-selector-option-content-container .b3-expanding-form-selector-option-content');
    
      //   let radioButtons = await iframe.$$('.b3id-expanding-form-selector-radiobutton');
    
      //   await radioButtons[1].click();
      // } catch(e) {
      //   await iframe.click('.b3id-expanding-form-selector-radiobutton');
      // }
    
      await iframe.waitFor(10000);
    
      try {      
        await iframe.click('.jfk-button-action');
      } catch(error) {

        console.log('error on input card info');
      }
  
    } catch(error) {
      console.log('error on click buy buton');
    }
  
    await youtubePage.waitFor(10000);
    await youtubePage.close();
  } catch(e) {
    console.log('bot already have subscription')
  }
}

async function enterCoupon(currentPage) {
  await currentPage.waitFor(5000);
  await currentPage.waitForSelector('#left-nav-open-button');

  await currentPage.click('#left-nav-open-button');

  await currentPage.waitFor(3000);

  try {

    let subscribeBtn = await currentPage.$('#nav_collections .upsell-button');
    if(subscribeBtn) {

      await currentPage.goto('https://play.google.com/store');
      await currentPage.waitFor(10000);
      try {
        let leftMenus = await currentPage.$$('c-wiz div ul li');
        await leftMenus[4].click();

        await currentPage.waitFor(5000);

        let coupons = await getCard();
        await currentPage.keyboard.type(coupons[0].couponNo);
        
        let buttons = await currentPage.$$('button');
        await buttons[buttons.length - 1].click();

        await currentPage.waitFor(3000);

        buttons = await currentPage.$$('button');
        await buttons[buttons.length - 1].click();

        await currentPage.waitFor(8000);
        await currentPage.keyboard.type('30421');
        await currentPage.keyboard.type(String.fromCharCode(13));

        await currentPage.waitFor(10000);
        await usedCard(coupons[0].id);
      } catch(error) {
        console.log(error);
      }
    }
  } catch(e) {
    console.log('no need to subscribe more');
  }
}

module.exports = {
  addCard,
  enterCoupon
}