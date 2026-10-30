// Chromium can transiently abort an initial loopback navigation on Windows.
// Retry only network failures, preserving the original error if all attempts fail.
async function loadLocalApp(win,origin,delay=ms=>new Promise(resolve=>setTimeout(resolve,ms))){
  for(let attempt=0;;attempt++){
    try{return await win.loadURL(origin);}
    catch(error){
      if(attempt>=2 || ![-2,-21,-101,-102].includes(error.errno))throw error;
      await delay(250*(attempt+1));
      if(win.isDestroyed())throw error;
    }
  }
}
module.exports={loadLocalApp};
