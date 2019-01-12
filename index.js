var https = require('https');
var http = require('http');
var fs = require('fs');
const axios = require('axios');

const downloadUrl = "http://arkiv.radio24syv.dk/attachment";

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


async function fetchProgramsMeta(year, month, programId=10839671){
  const resp = await axios.get(`https://api.radio24syv.dk/v2/podcasts/program/${programId}?year=${year}&month=${month}`);
  console.log(resp.data);
  return resp.data;
}

async function fetchProgramsForYearMonth(year, month, programId=10839671){
  const programsMeta = await fetchProgramsMeta(year, month, programId);
  for (const programMeta of programsMeta){
    const path = await download(downloadUrl+programMeta.audioInfo.url, programMeta.metaInfo.title+".mp3");
    console.log(path);
  }
  return true;
}

fetchProgramsForYearMonth(2015, 2).then(()=>console.log("done"))
