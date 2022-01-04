const { expose } = require('threads');
const { exec } = require('child_process');
const { Worker } = require('worker_threads');
const { getSetting, sendLogs } = require('./services/setting.service');

expose(async (accountInfo) => {
  const setting = await getSetting();
  let playHours = Math.round(Math.random() * (setting[0].max_stream - setting[0].min_stream) + setting[0].min_stream);
  let sleepHours = 24 - playHours;

  const playWorker = new Worker('./controllers/main.controller.js', { workerData: { setting, accountInfo } });
  startPlaying(playWorker, playHours * 3600000, sleepHours * 3600000, accountInfo);
});

function startPlaying(worker, playHours, sleepHours, accountInfo) {
    worker.postMessage('start');
  
    sendLogs(accountInfo.id, `Started streaming for ${playHours / 3600000} hours`, 0);
    var begin = new Date();
    let timing = setInterval(() => {
      let now = new Date();
      let playTime = now - begin;
      if(playTime > playHours) {
        clearInterval(timing);
        stopPlaying(worker, playHours, sleepHours);
      }
    }, 1000);
}

function stopPlaying(worker, playHours, sleepHours, accountInfo) {
  worker.postMessage('stop');
  sendLogs(accountInfo.id, `Started sleeping for ${sleepHours / 3600000} hours`, 0);
  var begin = new Date();
  exec('git pull', (err, stdout, stderr) => {
    console.log('execute git pull');
    let timing = setInterval(() => {
      let now = new Date();
      let sleepTime = now - begin;
      if(sleepTime > sleepHours) {
        clearInterval(timing);
        startPlaying(worker, playHours, sleepHours);
      }
    }, 1000);
  });
}