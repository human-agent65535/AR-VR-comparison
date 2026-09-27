import {readdirSync} from 'node:fs';
import {spawnSync} from 'node:child_process';
for(const name of readdirSync('src').filter(n=>n.endsWith('.js')&&!n.includes('backup'))){const r=spawnSync(process.execPath,['--check','src/'+name],{stdio:'inherit'});if(r.status)process.exit(r.status);}
console.log('All source modules passed syntax checks.');
