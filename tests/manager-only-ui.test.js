import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
const read=path=>readFileSync(new URL("../manager/"+path,import.meta.url),"utf8");
const html=read("index.html"),app=read("app.js"),css=read("fc26-ui.css"),ui=read("coach-ui.js");
test("new career has only manager mode",()=>{
 assert.match(html,/data-type="coach"/);
 assert.doesNotMatch(html,/data-type="custom"|data-type="real"/);
 assert.doesNotMatch(html,/id="player-dashboard"|id="player-match-panel"|id="moment-overlay"/);
 assert.doesNotMatch(app,/ensurePlayerProfile|makeDecisions|playerMode|stepPlayerCareer/);
 assert.match(app,/mode:"coach"/);
});
test("old user player saves are not shown but not destroyed",()=>{
 assert.match(app,/saves\.filter\(w=>w\.mode==="coach"\)/);
 assert.doesNotMatch(app,/saves=saves\.filter\(w=>w\.mode==="coach"\)/);
});
test("all primary transfer actions are wired to actual controls",()=>{
 const controls=["market-send-offer","market-accept-counter","market-complete-signing",
  "market-shortlist-toggle","market-list-player","market-confirm-sale"];
 for(const id of controls){
  assert.ok(html.includes('id="'+id+'"'),id+" missing in HTML");
  assert.ok(ui.includes('$("'+id+'").onclick'),id+" missing in JavaScript");
 }
});
test("visual design uses separate original custom CSS and adaptive layouts",()=>{
 assert.match(html,/href="\.\/fc26-ui\.css"/);
 assert.match(css,/--fc-lime:/);
 assert.match(css,/\.transfer-workspace/);
 assert.match(css,/@media\(max-height:475px\)/);
 assert.doesNotMatch(html,/(?:ea-sports|electronic arts)\.com/i);
});
test("all manager screens keep unique IDs",()=>{
 const ids=[...html.matchAll(/id="([^"]+)"/g)].map(m=>m[1]);
 assert.equal(ids.length,new Set(ids).size);
 for(const id of ["career","market","match","standings","stadium-manager","tactics","world"]){
  assert.ok(ids.includes(id),id+" missing");
 }
});
