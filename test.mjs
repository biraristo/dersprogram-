import assert from 'node:assert/strict';
import {solve,verify} from './dist/engine.mjs';
const school={school:'Test',days:2,hours:3,closed:[{resource:'Öğretmen · A',slot:0}],lessons:[
 {name:'Fen',groups:['9/A','9/B'],teachers:['A','B'],room:'Lab',blocks:[2]},
 {name:'Fen',groups:['9/C'],teachers:['C'],room:'Lab',blocks:[2]},
 {name:'Tarih',groups:['9/A'],teachers:['C'],room:'',blocks:[1]}]};
for(let i=0;i<20;i++)assert(verify(school,solve(school)));
for(const invalid of [[0,3,5],[1,1,5],[2,3,5],[1,3],[-1,3,5]])assert.throws(()=>verify(school,invalid));
assert.throws(()=>solve({...school,days:1}),/saat gerekli/);
console.log('Üretim, ortak ders, blok, kapalı saat, eksik ders ve kaynak çakışması kontrolleri geçti.');
