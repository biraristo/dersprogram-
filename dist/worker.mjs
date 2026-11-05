import {solve} from './engine.mjs';
self.onmessage=({data})=>{try{postMessage({starts:solve(data.p,data.limit)})}catch(e){postMessage({error:e.message})}};
