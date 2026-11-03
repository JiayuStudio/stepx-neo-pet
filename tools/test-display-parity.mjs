// Execute production web scene selection and production Java MoriMatrix against one trace.
// Tiny org.json adapters provide only object access for this JVM test, never scene rules.
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import os from 'node:os';
import path from 'node:path';
import vm from 'node:vm';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { spawnSync } from 'node:child_process';
const require=createRequire(import.meta.url),ts=require('../web/node_modules/typescript');
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const modules={};
function load(file){file=path.resolve(file);if(modules[file])return modules[file].exports;const m={exports:{}};modules[file]=m;const js=ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020}}).outputText;vm.runInNewContext(js,{module:m,exports:m.exports,require:s=>load(path.resolve(path.dirname(file),s+'.ts')),Date,Math});return m.exports;}
const {selectScene,selectArtKey}=load(path.join(root,'web/src/game/matrixScene.ts'));
const now=1_800_000_000_000;
const base={hatched:true,egg:null,farewellAt:null,actionNonce:0,lastAction:null,messages:[],needs:{health:80,energy:80,hunger:80,joy:80,hygiene:80},character:'fox',growthPoints:140,personalityScores:{gentle:3,playful:5,curious:4},personalityFocus:'playful',equippedWearable:'star-ribbon',headphones:true,lifeMode:'gentle'};
const trace=[];function add(patch,expected,offset=0){trace.push({pet:{...base,...patch},now:now+offset,expected});}
add({hatched:false,egg:{startedAt:now,durationMs:60000}},'egg');
add({hatched:false,egg:{startedAt:now,durationMs:60000}},'crack',50000);
add({hatched:false,egg:{startedAt:now,durationMs:60000}},'hatch',58000);
add({},'happy',60000);
add({actionNonce:1,lastAction:'feed',messages:[{at:now+61000,action:'pet'}]},'eat',61000);
add({actionNonce:1,lastAction:'feed',messages:[{at:now+61000,action:'pet'}]},'pet',67000);
add({actionNonce:1,lastAction:'feed',messages:[{at:now+61000,action:'pet'}]},'happy',71001);
add({needs:{...base.needs,health:0}},'sick',80000);
add({lifeMode:'cycle',needs:{...base.needs,health:0}},'sick',90000);
add({messages:[{at:now+100000,action:'INVALID'}],needs:{...base.needs,hunger:10}},'hungry',100000);
add({messages:[{at:now+120000,action:'pet'}],needs:{...base.needs,joy:10}},'unhappy',110000);
add({needs:{...base.needs,energy:10}},'sleep',120000);
add({actionNonce:2,lastAction:'wash'},'wash',130000);
add({farewellAt:now+131000,actionNonce:3,lastAction:'feed'},'dead',131000);
const tracker={lastNonce:-1,actionAt:0};
const expected=trace.map(row=>{const scene=selectScene(row.pet,row.now,tracker);assert.equal(scene,row.expected);return scene+'|'+selectArtKey(row.pet,scene)});
const temp=fs.mkdtempSync(path.join(os.tmpdir(),'pet-display-'));
const obj=`package org.json; import java.util.*; public class JSONObject { private Map<String,Object> m=new HashMap<>(); public JSONObject put(String k,Object v){m.put(k,v);return this;} public boolean has(String k){return m.containsKey(k);} public boolean isNull(String k){return m.get(k)==null;} public JSONObject optJSONObject(String k){return (JSONObject)m.get(k);} public JSONArray optJSONArray(String k){return (JSONArray)m.get(k);} public boolean optBoolean(String k,boolean d){return m.get(k) instanceof Boolean?(Boolean)m.get(k):d;} public String optString(String k){return optString(k,"");} public String optString(String k,String d){return m.get(k) instanceof String?(String)m.get(k):d;} public long optLong(String k,long d){return m.get(k) instanceof Number?((Number)m.get(k)).longValue():d;} public int optInt(String k){return (int)optLong(k,0);} public double optDouble(String k){return m.get(k) instanceof Number?((Number)m.get(k)).doubleValue():0;} }`;
const arr=`package org.json; import java.util.*; public class JSONArray {private List<Object> a=new ArrayList<>(); public JSONArray put(Object v){a.add(v);return this;} public int length(){return a.size();} public JSONObject optJSONObject(int i){return i<a.size()?(JSONObject)a.get(i):null;}}`;
function java(v){if(v===null)return 'null';if(typeof v==='string')return JSON.stringify(v);if(typeof v==='number')return v+'L';if(typeof v==='boolean')return String(v);if(Array.isArray(v))return 'new JSONArray()'+v.map(x=>'.put('+java(x)+')').join('');return 'new JSONObject()'+Object.entries(v).map(([k,x])=>'.put('+JSON.stringify(k)+','+java(x)+')').join('');}
fs.writeFileSync(path.join(temp,'JSONObject.java'),obj);fs.writeFileSync(path.join(temp,'JSONArray.java'),arr);
fs.writeFileSync(path.join(temp,'DisplayTrace.java'),'package com.diandian.neopet; import org.json.*; public class DisplayTrace { public static void main(String[] args){MoriMatrix matrix=new MoriMatrix();JSONObject pet;String scene;'+trace.map(r=>'pet='+java(r.pet)+';scene=matrix.scene(pet,'+r.now+'L);System.out.println(scene+"|"+matrix.artKey(pet,scene));').join('\n')+'}}');
function run(cmd,args){const r=spawnSync(cmd,args,{encoding:'utf8'});if(r.status!==0)throw new Error(r.stderr||r.error?.message||r.stdout);return r.stdout;}
try{run('javac',['-d',temp,...['JSONObject.java','JSONArray.java','DisplayTrace.java'].map(f=>path.join(temp,f)),...['MoriMatrix.java','MoriAppearance.java'].map(f=>path.join(root,'app/src/com/diandian/neopet',f))]);const actual=run('java',['-cp',temp,'com.diandian.neopet.DisplayTrace']).trim().split('\n');assert.deepEqual(actual,expected);console.log(trace.length+' production Java/web scene and appearance trace cases passed');}finally{fs.rmSync(temp,{recursive:true,force:true});}
