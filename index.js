var https = require('https');
var http = require('http');
var fs = require('fs');
const axios = require('axios');
const NodeID3 = require('node-id3')
const moment = require('moment');
const programs = require('./programs.json');

const downloadUrl = "http://arkiv.radio24syv.dk/attachment";
const imageSet = new Set();

//https://api.radio24syv.dk/v2/podcasts/program/10839671?year=2015&month=2


var download = function(url, dest = "") {
  let protocol = http;
  if (url.startsWith("https")){
    protocol = https;
  }
  console.log(url)
  return new Promise((resolve, reject)=>{
    var request = protocol.get(url, function(response) {
      const filename = dest;
      console.log(filename);
      var file = fs.createWriteStream(filename);
      response.pipe(file);
      file.on('finish', function() {
        file.close(()=>resolve(filename));  // close() is async, call cb after close completes.
      });
    }).on('error', function(err) { // Handle errors
      fs.unlink(filename); // Delete the file async. (But we don't check the result)
      reject(err.message);
    });
  })
};

async function writeMetaToMp3(file, programMeta){
  let pathToimage = "images/"+ programMeta.image.src.split("/").slice(-1)[0];
  if (!imageSet.has(programMeta.image.src)){
    pathToimage = await download(programMeta.image.src, "images/"+ programMeta.image.src.split("/").slice(-1)[0]);
    imageSet.add(programMeta.image.src);
  } else {
    console.log("already have image");
  }

  console.log(pathToimage);
  const date = moment(programMeta.publishInfo.createdAt);
  let tags = {
    title: programMeta.metaInfo.title,
    artist: "Kirsten Birgit",
    APIC: "./"+pathToimage,
    comment: {
      language: "dk",
      text: programMeta.metaInfo.description,
    },
    subtitle: programMeta.metaInfo.description,
    performerInfo: programMeta.metaInfo.description,
    date: date.format("DDMM"),
    year: date.format("YYYY")
  };
  const ID3FrameBuffer = NodeID3.create(tags)
  let success = await NodeID3.write(tags, file);
  return programMeta.metaInfo.title;
}

async function fetchProgramsMeta(year, month, programId=10839671){
  const resp = await axios.get(`https://api.radio24syv.dk/v2/podcasts/program/${programId}?year=${year}&month=${month}`);
  console.log(resp.data);
  return resp.data;
}

async function downloadAndAddMeta(programMeta){
  let date = moment(programMeta.publishInfo.createdAt);
  const path = await download(downloadUrl+programMeta.audioInfo.url, date.format('YYYY-MM-DD')+"_"+ programMeta.audioInfo.url.split("/").slice(-1)[0]);
  console.log(path);
  if (path.endsWith("mp3")){
    writeMetaToMp3(path, programMeta).then((title)=>{console.log("done writing meta for " + title)});
  }
}

async function fetchProgramsForYearMonth(year, month, programId=10839671){
  const programsMeta = await fetchProgramsMeta(year, month, programId);
  await Promise.all(programsMeta.map(programMeta=>downloadAndAddMeta(programMeta)))
  return true;
}

async function fetchAllProgramsSinceYear(startYear=2018, startMonth=1, programId=10839671){
    const now = moment();
    currentYear = now.year();
    currentMonth = now.month()+1;
    console.log({currentYear, currentMonth})
    let year = startYear;

    while (year<=currentYear){
      console.log(year);

      let month = year===startYear ? startMonth : 1;
      while ((month <=12 && year<currentYear) || (year===currentYear && month<=currentMonth) ){
        console.log(year, month);
        await fetchProgramsForYearMonth(year, month);
        month++;
      }
      year++;

    }
}

async function fetchApiToFile(startYear=2014, startMonth=1, programId=10839671){
  const now = moment();
  let result = [];
  currentYear = now.year();
  currentMonth = now.month()+1;
  console.log({currentYear, currentMonth})
  let year = startYear;

  while (year<=currentYear){
    console.log(year);

    let month = year===startYear ? startMonth : 1;
    while ((month <=12 && year<currentYear) || (year===currentYear && month<=currentMonth) ){
      console.log(year, month);
      const data = await fetchProgramsMeta(year, month);
      result = result.concat(data);
      month++;
    }
    year++;

  }
  console.log(result);
  console.log(result.length);
  fs.writeFile("programs.json", JSON.stringify(result), function(err) {
    if(err) {
        return console.log(err);
    }

    console.log("The file was saved!");
});
}

//fetchAllProgramsSinceYear();
//fetchProgramsForYearMonth(2016, 9).then(()=>console.log("done"))
