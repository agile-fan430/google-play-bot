const axios = require('axios');
const { BASE_URL, bot_id } = require('../constants');

async function getPlayList() {
  let playlist = [
    'https://play.google.com/music/listen#/album/B2vnmcacvojodm6554iqs333oau/J.+Cole/MIDDLE+CHILD',
    'https://play.google.com/music/listen#/album/Brnkpxufjkjwf6dqao6wxppl3mi/J.+Cole/2014+Forest+Hills+Drive',
    'https://play.google.com/music/listen#/album/Bibija7fxblbvtu2feszdfp3rpq/J.+Cole/Born+Sinner',
    'https://play.google.com/music/listen#/album/Brnkpxufjkjwf6dqao6wxppl3mi/J.+Cole/2014+Forest+Hills+Drive',
    `https://play.google.com/music/listen#/album/Bwa4xlgrlms7pau6v4mggugkx2i/Keith+Whitley/Don't+Close+Your+Eyes`,
    'https://play.google.com/music/listen#/album/Bkkilvldibjuajpy4b5dy23c7ye/Keith+Whitley/The+Essential+Keith+Whitley',
    'https://play.google.com/music/listen#/album/B6afvte7iwnqvu5gkhompyefbfq/Keith+Whitley/The+Essential+Keith+Whitley'
  ]
  return playlist;
}

async function getAlbumList() {
  
  // let playlist = [
  //   `https://music.apple.com/us/album/the-saga-of-wiz-khalifa/1508399988`,
  //   `https://music.apple.com/us/album/a-muse-in-her-feelings/1503186015`,
  //   `https://music.apple.com/us/album/sxtp4/1507640966`
  // ]
  var response = await axios.get(BASE_URL + '/api/album');
  return response.data;
  // return playlist;
}

async function getTrackList() {
  var response = await axios.get(BASE_URL + '/api/track');
  return response.data;
}

async function getArtistList() {
  var response = await axios.get(BASE_URL + '/api/artist');
  return response.data;
}

module.exports = {
  getPlayList,
  getAlbumList,
  getTrackList,
  getArtistList
}