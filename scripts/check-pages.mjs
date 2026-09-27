import assert from 'node:assert/strict';
import {readFile,readdir,access} from 'node:fs/promises';

const directory='dist-pages';
const expected=['.nojekyll','index.html','room.html','headset.html','app.v6.js','headset.v6.js','style.v6.css','skyline.png','earth-blue-marble.jpg','THREE-LICENSE.txt','EARTH-DATA-LICENSE.txt','parameters.json'].sort();
assert.deepEqual((await readdir(directory)).sort(),expected,'Publish only runtime assets');
for(const name of ['index.html','room.html','headset.html']){
 const html=await readFile(`${directory}/${name}`,'utf8');
 assert.doesNotMatch(html,/xr-diagnostics|xr-log-|xr-copy-runtime|xr-runtime|runtime-report|refresh-diagnostics/,'Static pages contain no diagnostic panel');
 for(const [,href] of html.matchAll(/(?:src|href)="([^"]+)"/g)){
  if(/^(https?:|data:|#)/.test(href))continue;
  assert.ok(!href.startsWith('/'),'Links must support the GitHub project subpath');
  const local=href.split(/[?#]/)[0].replace(/^\.\//,'');
  if(local)await access(`${directory}/${local}`);
 }
}
for(const name of ['app.v6.js','headset.v6.js']){
 const js=await readFile(`${directory}/${name}`,'utf8');
 assert.doesNotMatch(js,/\/api\/xr-log|sendBeacon\(|xr-log-enabled|xr-copy-runtime|runtime-report|refresh-diagnostics/,'No log transport in published JavaScript');
}
console.log('Pages artifact verified: 12 public files, subpath-safe links, no diagnostic UI or log transport.');
