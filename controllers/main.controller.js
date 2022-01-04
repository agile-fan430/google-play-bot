const { workerData, parentPort, Worker } = require('worker_threads');
const { getTrackList, getAlbumList, getArtistList } = require('../services/playlist.service');
const { sendLogs } = require('../services/setting.service');
const puppeteer = require('puppeteer-extra')
const StealthPlugin = require('puppeteer-extra-plugin-stealth')
const pluginProxy = require('puppeteer-extra-plugin-proxy');
const { login } = require('./login.controller');
const { enterCoupon, addCard } = require('./credit.controller');
const { lowQuality } = require('./quality.controller');
const { convertStringToTime, generateRandomInt, generateRandomSeqArray } = require('../utils/helper');

const sleep = (milliseconds) => {
  return new Promise(resolve => setTimeout(resolve, milliseconds))
}

puppeteer.use(StealthPlugin());

let accountInfo = workerData.accountInfo;
let proxyInfo = accountInfo.proxy.split(':');
let setting = workerData.setting[0];
let id = workerData.accountInfo.id;
let currentPage = null;
let stopScript = 0;         //if this is 1, 2, 3, 4, then stop function on playing track, artist, album, library for each

puppeteer.use(pluginProxy({
  address: proxyInfo[0],
  port: proxyInfo[1],
  credentials: {
    username: 'fr45t@34',
    password: '98uuyg%t'
  }
}));

async function run() {
  // puppeteer usage as normal
  var browser = await puppeteer.launch({ 
    headless: false
  });
  currentPage = await browser.newPage();

  let result = await login(currentPage, accountInfo);
  while(result === -1) {
    result = await login(currentPage, accountInfo);
  }

  sendLogs(id, "Account is logged in!", 0);
  await currentPage.setViewport({width: 1920, height: 900});
  
  await currentPage.goto('https://play.google.com/music?hl=en_US', {waitUntil: 'load', timeout: 0});
    
  await currentPage.waitFor(2000);

  await enterCoupon(currentPage);
  await addCard(browser, currentPage, accountInfo);
  
  let randomDuration1, randomDuration2, randomDuration3;
  
  currentPage.on('dialog', async dialog => {
    console.log(dialog.accept());
  });
  while(true) {

    const albumList = await getAlbumList();
    const artistList = await getArtistList();
    const trackList = await getTrackList();

    try {
      await sleep(2000);
      randomDuration1 = generateRandomInt(setting.min_rotation, setting.max_rotation);
      sendLogs(id, `Playing track list is started for ${randomDuration1} mins`, 0);
      setTimeout(() => {
        console.log('set stopscript 1 on tracklist');
        stopScript = 1;
      }, randomDuration1 * 60000);
      await Promise.race([playTrack(trackList, setting), sleep(randomDuration1 * 60000)]);
    } catch(error) {
      console.log('error is outside of tracklist', error);
    }
    
    try {
      await sleep(2000);
      randomDuration2 = generateRandomInt(setting.min_rotation, setting.max_rotation);
      sendLogs(id, `Playing artist list is started for ${randomDuration2} mins`, 0);
      setTimeout(() => {
        console.log('set stopscript 2 on artistlist');
        stopScript = 2;
      }, randomDuration2 * 60000);
      await Promise.race([playArtist(artistList, setting, randomDuration2 * 60000), sleep(randomDuration2 * 60000)]);
    } catch(error) {
      console.log('error is outside of artistlist', error);
    }
    
    try {
      await sleep(2000);
      randomDuration3 = generateRandomInt(setting.min_rotation, setting.max_rotation);
      sendLogs(id, `Playing album list is started for ${randomDuration3} mins`, 0);
      setTimeout(() => {
        console.log('set stopscript 3 on albumlist');
        stopScript = 3;
      }, randomDuration3 * 60000);
      await Promise.race([playAlbum(albumList, setting, randomDuration3 * 60000), sleep(randomDuration3 * 60000)]);
    } catch(error) {
      console.log('error is outside of  albumlist', error);
    }

    try {
      let libraryDuration = setting.library_rotation * (randomDuration1 + randomDuration2 + randomDuration3) / (100 - setting.library_rotation);
      sendLogs(id, `Play library is started for ${Math.floor(libraryDuration)}`, 0);
      setTimeout(() => {
        console.log('set stopscript 4 on library');
        stopScript = 4;
      }, libraryDuration * 60000);
      await Promise.race([playLibrary(), sleep(libraryDuration * 60000)]);
    } catch(error) {
      console.log('error is outside of library', error);
    }
  }
}

async function playAlbum(list, setting, totalPlayTime) {
  var index = 0;
  var randomMusic = generateRandomInt(setting.min_pause_frequency, setting.max_pause_frequency);
  var randomPause = generateRandomInt(setting.min_pause, setting.max_pause) * 1000;
  for(var i=0; i<list.length; i++) {
    if(index == randomMusic) {
      index = 0;
      randomMusic = generateRandomInt(setting.min_pause_frequency, setting.max_pause_frequency);
      randomPause = generateRandomInt(setting.min_pause, setting.max_pause) * 1000;
      sendLogs(id, `Paused for ${randomPause/1000} seconds after ${randomMusic} songs`, 0);
      await sleep(randomPause);
    }

    try {
      // open music URL and click play button
      await currentPage.goto(list[i].link);
      await sleep(5000);
      await currentPage.waitForSelector('#playButton');
    } catch(error) {
      await login(currentPage, accountInfo);
    }

    await sleep(5000);
    var playTime = 0;
    var playTimes;
    try {
      playTimes = await currentPage.$$('*[data-col="duration"] span');
      for(var j=0; j<playTimes.length; j++) {
        playTime += convertStringToTime(await (await playTimes[j].getProperty('textContent')).jsonValue());
      }
      await currentPage.click('#playButton');
    } catch(error) {
      console.log('error on calculating play time on album ', error);
      sendLogs(id, `Error happened on playing ${list[i].link}`, 1);
      continue;
    }
    playTime *= 1000;
    console.log(playTime);

    var addChance = generateRandomSeqArray(playTimes.length);
    var percentForAdd = Math.floor(setting.add_library / 100 * playTimes.length);
    for(var a=0; a<addChance.length; a++) {
      if(addChance[a] < percentForAdd) {
        var localPlayTime = 0;
        for(var j=0; j<a; j++) {
          localPlayTime += convertStringToTime(await (await playTimes[i].getProperty('textContent')).jsonValue());
        }
        if(localPlayTime * 1000 < totalPlayTime) {
          setTimeout(async () => {
            try {
              let moreButton = await currentPage.$('paper-icon-button[data-id="now-playing-menu"]');
              await moreButton.click();
              const needToAdd = await currentPage.evaluate(
                () => {
                  return document.querySelector('.goog-menuitem[id=":a"]').innerHTML.includes('Add to library');
                }
              )
              if(needToAdd) {
                let addToLibrary = await currentPage.$('.goog-menuitem[id=":a"]');
                if(await (await addToLibrary.getProperty('textContent')).jsonValue().includes('Add to library')) {
                  await addToLibrary.click();
                  console.log('added to library');
                  sendLogs(id, `Adding to library`, 0);
                }
              }
            } catch(error) {
              console.log('add failed album ', error);
              await currentPage.mouse.click(10, 600, { button: 'left' });
            }
          }, localPlayTime * 1000 + 5000);
        }
      }
    }

    sendLogs(id, `Started playing album on ${list[i].link} full time ${playTime/1000} seconds`, 0);

    var begin = new Date();
    var now = new Date();
    var diff = now - begin;
    while(diff < playTime) {
      now = new Date();
      diff = now - begin;
      if(stopScript == 3) {
        stopScript = 0;
        console.log('stop script works and return from album');
        return;
      } else {
        await sleep(1000);
      }
    }
    index ++;
  }
}

async function playArtist(list, setting, totalPlayTime) {
  var index = 0;
  var randomMusic = generateRandomInt(setting.min_pause_frequency, setting.max_pause_frequency);
  var randomPause = generateRandomInt(setting.min_pause, setting.max_pause) * 1000;
  for(var i=0; i<list.length; i++) {
    if(index == randomMusic) {
      index = 0;
      randomMusic = generateRandomInt(setting.min_pause_frequency, setting.max_pause_frequency);
      randomPause = generateRandomInt(setting.min_pause, setting.max_pause) * 1000;
      sendLogs(id, `Paused for ${randomPause / 1000} seconds after ${randomMusic} songs`, 0);
      await sleep(randomPause);
    }

    try {
      // open music URL and click play button
      await currentPage.goto(list[i].link);
      await sleep(5000);
      await currentPage.waitForSelector('#playButton');
      let playButtons = await currentPage.$$('.aria-play-button');
      await playButtons[0].click();
    } catch(error) {
      console.log('error happened on artist ', error);
      sendLogs(id, `Error happened on playing ${list[i].link}`, 1);
      continue;
    }
    

    try {
      let seeAllButton = await currentPage.$('.material-primary.more');
      await seeAllButton.click();
    } catch(err) {
      console.log(err);
      // sendLogs(id, `Error happened on playing ${list[i].link}`, 1);
      // continue;
    }

    await sleep(5000);
    
    var playTime = 0;
    var playTimes;
    try {
      playTimes = await currentPage.$$('*[data-col="duration"] span');
      for(var j=0; j<playTimes.length; j++) {
        playTime += convertStringToTime(await (await playTimes[j].getProperty('textContent')).jsonValue());
      }
    } catch(error) {
      console.log('error happened on calculating play time ', error);
      sendLogs(id, `Error happened on playing ${list[i].link}`, 1);
      continue;
    }
    playTime *= 1000;

    var addChance = generateRandomSeqArray(playTimes.length);
    var percentForAdd = Math.floor(setting.add_library / 100 * playTimes.length);
    for(var a=0; a<addChance.length; a++) {
      if(addChance[a] < percentForAdd) {
        var localPlayTime = 0;
        for(var j=0; j<a; j++) {
          localPlayTime += convertStringToTime(await (await playTimes[j].getProperty('textContent')).jsonValue());
        }
        if(localPlayTime * 1000 < totalPlayTime) {
          setTimeout(async () => {
            try {
              let moreButton = await currentPage.$('paper-icon-button[data-id="now-playing-menu"]');
              await moreButton.click();
              const needToAdd = await currentPage.evaluate(
                () => {
                  return document.querySelector('.goog-menuitem[id=":a"]').innerHTML.includes('Add to library');
                }
              )
              if(needToAdd) {
                let addToLibrary = await currentPage.$('.goog-menuitem[id=":a"]');
                if((await (await addToLibrary.getProperty('textContent')).jsonValue()).includes('Add to library')) {
                  await addToLibrary.click();
                  console.log('added to library');
                  sendLogs(id, `Adding to library`, 0);
                }
              }
            } catch(error) {
              console.log('error on adding library ', error);
              await currentPage.mouse.click(10, 600, { button: 'left' });
            }
          }, localPlayTime * 1000 + 5000);
        }
      }
    }
    sendLogs(id, `Started playing artist on ${list[i].link} full time`, 0);

    var begin = new Date();
    var now = new Date();
    var diff = now - begin;
    while(diff < playTime) {
      now = new Date();
      diff = now - begin;
      if(stopScript == 2) {
        console.log('stop script works and return from artist');
        stopScript = 0;
        return;
      } else {
        await sleep(1000);
      }
    }
    index ++;
  }
}

async function playTrack(trackList, setting) {
  var index = 0;
  var randomMusic = generateRandomInt(setting.min_pause_frequency, setting.max_pause_frequency);
  var randomPause = generateRandomInt(setting.min_pause, setting.max_pause);
  var chance = generateRandomSeqArray(trackList.length);
  var percentForSkip = Math.floor(setting.percent_play / 100 * trackList.length);
  var percentForAdd = Math.floor(setting.add_library / 100 * trackList.length);
  for(var i=0; i<trackList.length; i++) {
    if(index == randomMusic) {
      index = 0;
      randomMusic = generateRandomInt(setting.min_pause_frequency, setting.max_pause_frequency);
      randomPause = generateRandomInt(setting.min_pause, setting.max_pause);
      sendLogs(id, `Paused for ${randomPause} seconds after ${randomMusic} songs`, 0);
      await sleep(randomPause * 1000);
    }

    try {
      // open music URL and click play button
      await currentPage.goto(trackList[i].link);
      await sleep(5000);
    } catch(error) {
      await sleep(5000);
    }
    
    var playTime = 0;

    try {
      const playTimes = await currentPage.$('*[data-col="duration"] span');
      let timeString = await (await playTimes.getProperty('textContent')).jsonValue();

      if(chance[i] < percentForSkip) {
        playTime = generateRandomInt(setting.min_play, setting.max_play);
        sendLogs(id, `Started playing track on ${trackList[i].link} for ${playTime} seconds`, 0);
      } else {
        sendLogs(id, `Started playing track on ${trackList[i].link} full time`, 0);
        playTime = convertStringToTime(timeString);
      }

      await currentPage.click('#playButton');
    } catch(error) {
      console.log(error);
      sendLogs(id, `Error happened on playing ${trackList[i].link}`, 1);
      continue;
    }
    playTime *= 1000;

    await sleep(3000);

    try {
      if(chance[i] < percentForAdd) {
        let moreButton = await currentPage.$('paper-icon-button[data-id="now-playing-menu"]');
        await moreButton.click();
        const needToAdd = await currentPage.evaluate(
          () => {
            return document.querySelector('.goog-menuitem[id=":a"]').innerHTML.includes('Add to library');
          }
        )
        if(needToAdd) {
          let addToLibrary = await currentPage.$('.goog-menuitem[id=":a"]');
          await addToLibrary.click();
          console.log('added to library');
          sendLogs(id, `Adding ${trackList[i].link} to library`, 0);
        }
      }
    } catch(error) {
      console.log('error happened on adding track ', error);
      await currentPage.mouse.click(10, 600, { button: 'left' });
    }

    var begin = new Date();
    var now = new Date();
    var diff = now - begin;
    while(diff < playTime) {
      now = new Date();
      diff = now - begin;
      if(stopScript == 1) {
        console.log('stop script works and return from track list');
        stopScript = 0;
        return;
      } else{
        await sleep(1000);
      }
    }
    index ++;
    if(i == trackList.length - 1) {
      i = 0;
    }
  }
  stopScript = 1;
}

async function checkRefresh(currentUrl = '') {
  try {
    const needReload = await currentPage.evaluate(() => {
      return document.getElementsByName('body')[0].innerHTML.includes('Reload the page and try again');
    });
    if(needReload) {
      if(currentUrl != '') {
        await currentPage.goto(currentUrl);
      } else {
        const url = await currentPage.evaluate(() => {
          return window.location.href;
        });

        await currentPage.goto(url);
      }
    }
  } catch(err) {
  }
}

async function playLibrary() {
  await sleep(10000);
  var libraryButton = await currentPage.$$('gpm-quick-nav-item');
  try {
    await libraryButton[8].click();
  } catch(err) {
    await libraryButton[1].click();
  }

  await sleep(2000);
  try {
    var tabs = await currentPage.$$('paper-tab');
    await tabs[4].click(); 
  } catch(error) {
    console.log('error on selecting tab to library songs', error);
  }

  await sleep(5000);
  
  for(var i=0; i<100; i++) {
    try {
      // open music URL and click play button
      let playButtons = await currentPage.$$('.aria-play-button');
      await playButtons[0].click();
    } catch(error) {
      console.log('error happened on playing library ', error);
      sendLogs(id, `Error happened on playing library`, 1);
      return;
    }
    
    var playTime = 0;
    var playTimes;
    try {
      playTimes = await currentPage.$$('*[data-col="duration"] span');
      for(var j=0; j<playTimes.length; j++) {
        playTime += convertStringToTime(await (await playTimes[j].getProperty('textContent')).jsonValue());
      }
    } catch(error) {
      console.log('error is on calculating library playing time', error);
      sendLogs(id, `Error happened on playing library`, 1);
      return;
    }
    playTime *= 1000;
  
    sendLogs(id, `Started playing library full time`, 0);
  
    var begin = new Date();
    var now = new Date();
    var diff = now - begin;
    while(diff < playTime) {
      now = new Date();
      diff = now - begin;
      if(stopScript == 4) {
        stopScript = 0;
        console.log('stop script works and return from library');
        return;
      } else {
        await sleep(1000);
      }
    }
  }
  stopScript = 1;
}

parentPort.on("message", async message => {
  if(message == 'stop') {
    parentPort.postMessage('finish current playing');
    sendLogs(id, 'Account is logged out!', 0);
    await currentPage.quit();
  } else if(message == 'start') {
    run();
  }
});
