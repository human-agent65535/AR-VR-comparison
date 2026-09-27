import {build} from 'esbuild';
import {mkdir,copyFile,readFile,writeFile,readdir,rm} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {DEVICES,deviceFov,physicalGeometry,RENDER_ASSUMPTIONS,VERIFIED_AT,META_SDK_PROFILE} from './src/device-data.js';
const pages=process.argv.includes('--pages'),directory=pages?'dist-pages':'dist',output=name=>directory+'/'+name;
// A Pages artifact contains only this build's public files, never local QA pages.
if(pages)await rm(directory,{recursive:true,force:true});
await mkdir(directory,{recursive:true});
const sourceHash=createHash('sha256');
for(const name of (await readdir('src')).filter(n=>n.endsWith('.js')).sort())sourceHash.update(name).update(await readFile('src/'+name));
const clientBuild='static-'+sourceHash.digest('hex').slice(0,16);
await build({entryPoints:['src/app.js'],bundle:true,minify:true,format:'esm',target:['es2020'],outfile:output('app.v6.js'),legalComments:'eof'});
await build({entryPoints:['src/headset.js'],bundle:true,minify:true,format:'esm',target:['es2020'],outfile:output('headset.v6.js'),legalComments:'eof'});
await writeFile(output('style.v6.css'),(await readFile('public/style.css','utf8'))+'\n'+(await readFile('public/layout.css','utf8')));
const revision=async path=>createHash('sha256').update(await readFile(path)).digest('hex').slice(0,12);
let html=await readFile('public/index.html','utf8');
for(const asset of ['app.v6.js','style.v6.css'])html=html.replace(`./${asset}`,`./${asset}?v=${await revision(output(asset))}`);
await writeFile(output('room.html'),html);
await writeFile(output('index.html'),html);
let headset=await readFile('public/headset.html','utf8');
for(const asset of ['headset.v6.js','style.v6.css'])headset=headset.replace(`./${asset}`,`./${asset}?v=${await revision(output(asset))}`);
await writeFile(output('headset.html'),headset);
await copyFile('public/EARTH-DATA-LICENSE.txt',output('EARTH-DATA-LICENSE.txt'));
await copyFile('node_modules/three/LICENSE',output('THREE-LICENSE.txt'));
console.log(`Built comparison, 3D room and local assets in ${directory}/.`);

await copyFile('public/skyline.png',output('skyline.png'));
await copyFile('public/earth-blue-marble.jpg',output('earth-blue-marble.jpg'));
if(pages)await writeFile(output('.nojekyll'),'');

const derivedFov=Object.fromEntries(DEVICES.map(d=>[d.id,{
 default:deviceFov(d,'diagonal',true),
 strictlyKnownAxes:deviceFov(d),
 withExplicitDiagonalAssumption:deviceFov(d,'diagonal',true),
 ...(d.id==='aura'?{withHorizontalAssumption:deviceFov(d,'horizontal')}:{})
}]));
await writeFile(output('parameters.json'),JSON.stringify({clientBuild,verifiedAt:VERIFIED_AT,metaSdk:META_SDK_PROFILE,devices:DEVICES,derivedFov,physicalGeometry,renderAssumptions:RENDER_ASSUMPTIONS},null,2));
