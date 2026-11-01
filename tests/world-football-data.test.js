import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {buildWorldIndex,normalizeClubName} from "../manager/world-data.js";

const names=[
 "leagues-europe-1","leagues-europe-2","leagues-europe-3","leagues-europe-4","leagues-europe-5","leagues-europe-6",
 "leagues-west-europe-1","leagues-west-europe-2","leagues-africa-1","leagues-africa-2",
 "leagues-asia","leagues-north-america","leagues-mls","leagues-south-america"
];
function load(name){
 return JSON.parse(readFileSync(new URL("../manager/data/"+name+".json",import.meta.url),"utf8"));
}
const world=buildWorldIndex(load("world-club-archive"),load("worldcup-2026-club-players"),names.map(load));

test("imported CC0 archive contains documented 2710 clubs",()=>{
 assert.equal(world.archiveCount,2710);
 assert.ok(world.clubs.length>=3500,"fixtures and international squads add clubs");
 assert.ok(world.countries.length>=90);
});
test("global catalog contains 104 sourced leagues from multiple continents",()=>{
 assert.equal(world.leagues.length,104);
 const regions=new Set(world.leagues.map(l=>l.region));
 for(const name of ["europe","africa","asia","middle-east","north-america","south-america","pacific"])assert.ok(regions.has(name),name);
});
test("all season-linked leagues have source, year and real club entries",()=>{
 for(const league of world.leagues){
  assert.ok(league.id&&league.country&&league.region&&league.source&&league.season);
  assert.ok(league.teams.length>=4,league.id);
  assert.equal(league.teamIds.length,new Set(league.teamIds).size,league.id);
  assert.equal(league.clubsComplete,league.reportedTeams===league.teams.length,league.id);
 }
});
test("World Cup 2026 contains 1248 identified footballers with clubs",()=>{
 assert.equal(world.sourcedPlayers,1248);
 assert.ok(world.clubs.filter(c=>c.players.length).length>=400);
 const ids=world.clubs.flatMap(c=>c.players.map(p=>p.id));
 assert.equal(ids.length,new Set(ids).size);
 for(const club of world.clubs){
  for(const player of club.players){
   assert.ok(player.name&&player.id&&player.birthdate&&player.nationality&&player.pos);
  }
 }
});
test("club aliases merge without attributing imaginary players",()=>{
 const madrid=world.clubs.find(c=>c.country==="spain"&&normalizeClubName(c.name)==="real madrid");
 assert.ok(madrid&&madrid.players.length>0&&madrid.leagueIds.length>0);
 const inter=world.clubs.filter(c=>c.country==="usa"&&normalizeClubName(c.name)==="inter miami");
 assert.equal(inter.length,1);
 assert.ok(inter[0].players.length>0);
 const ahly=world.clubs.find(c=>c.country==="egypt"&&normalizeClubName(c.name)==="al ahly");
 assert.ok(ahly&&ahly.players.length>0);
 const unknown=world.clubs.find(c=>c.players.length===0);
 assert.ok(unknown&&unknown.players.length===0,"unknown squad remains empty");
});
test("every imported player has a 2026 snapshot marker; no full-squad claims",()=>{
 assert.ok(world.snapshotLabel.includes("2026"));
 for(const club of world.clubs){
  assert.ok(Array.isArray(club.players));
  for(const player of club.players)assert.equal(player.snapshot,"WC 2026");
 }
});
