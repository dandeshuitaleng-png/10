'use strict';
// One page owns its contexts. Sounds follow gestures and authoritative feedback, never a request being sent.
const preferenceKey='rural-quiz:audio:enabled';
const settingsKey='rural-quiz:audio:settings-v1';
const files={click:'paper.mp3',select:'wood.mp3',correct:'confirm-wood.mp3',complete:'piano-close.mp3',mascot:'leaf-rustle.mp3'};
const volumes={click:.25,select:.30,correct:.28,complete:.26,mascot:.26};
function createAudio(api,opts={}){
 const now=opts.now||Date.now,later=opts.setTimeout||setTimeout,cancel=opts.clearTimeout||clearTimeout,onChange=opts.onChange||(()=>{});
 let musicEnabled=true,effectsEnabled=true,musicLevel=.40,effectsLevel=.60,lastChannels={music:true,effects:true},available=!!(api&&api.createInnerAudioContext),started=false,foreground=true,disposed=false,bgm=null,musicPlaying=false,musicPending=false,media=false,route='home',fadeTimer=null,feedbackKey='',lastEffect='',lastEffectAt=-Infinity,feedbackUntil=0;
 const effects=new Map();let errors=0,effectPlays=0,lastPlayedEffect='';
 const clamp=value=>Math.max(0,Math.min(1,Number(value)));
 try{const saved=api.getStorageSync(settingsKey);if(saved&&saved.version===1){musicLevel=Number.isFinite(saved.musicLevel)?clamp(saved.musicLevel):.40;effectsLevel=Number.isFinite(saved.effectsLevel)?clamp(saved.effectsLevel):.60;musicEnabled=saved.musicEnabled!==false&&musicLevel>0;effectsEnabled=saved.effectsEnabled!==false&&effectsLevel>0;if(saved.lastChannels&&(saved.lastChannels.music||saved.lastChannels.effects))lastChannels={music:!!saved.lastChannels.music,effects:!!saved.lastChannels.effects};}else if(api.getStorageSync(preferenceKey)===false){musicEnabled=false;effectsEnabled=false;}}catch{}
 const state=()=>({enabled:musicEnabled||effectsEnabled,musicEnabled,effectsEnabled,musicLevel,effectsLevel,available,started,musicPlaying,errors,effectPlays,lastPlayedEffect});
 function save(){try{api.setStorageSync(settingsKey,{version:1,musicEnabled,effectsEnabled,musicLevel,effectsLevel,lastChannels});api.setStorageSync(preferenceKey,musicEnabled||effectsEnabled);}catch{}}
 function publish(){onChange(state());}
 function safe(fn){try{return fn();}catch{errors++;return undefined;}}
 function targetVolume(){return (route==='quiz'?.175:.30)*musicLevel;}
 function clearFade(){if(fadeTimer!==null)cancel(fadeTimer);fadeTimer=null;}
 function pauseMusic(){clearFade();musicPending=false;if(bgm)safe(()=>bgm.pause());if(musicPlaying){musicPlaying=false;publish();}}
 function music(immediate=false){
  if(!available||!musicEnabled||musicLevel===0||!started||!foreground||disposed||media){pauseMusic();return;}
  if(!bgm){bgm=safe(()=>api.createInnerAudioContext());if(!bgm){available=false;publish();return;}bgm.src='/assets/audio/ambient-piano.mp3';bgm.loop=true;bgm.autoplay=false;bgm.obeyMuteSwitch=true;bgm.volume=0;
   if(bgm.onPlay)bgm.onPlay(()=>{if(disposed)return;musicPending=false;if(!musicEnabled||musicLevel===0||!foreground||media){pauseMusic();return;}musicPlaying=true;publish();});
   if(bgm.onError)bgm.onError(()=>{if(disposed)return;errors++;musicPending=false;musicPlaying=false;publish();});
  }
  clearFade();const from=Number(bgm.volume)||0,to=targetVolume();let step=0;
  const fade=()=>{fadeTimer=null;if(disposed||!musicEnabled||!foreground||media)return;step++;safe(()=>{bgm.volume=immediate?to:from+(to-from)*Math.min(1,step/30);});if(!immediate&&step<30)fadeTimer=later(fade,40);};
  // A playing loop only changes volume; polling and route refreshes never restart it.
  if(!musicPlaying&&!musicPending){musicPending=true;try{bgm.play();}catch{musicPending=false;errors++;publish();}}fade();
 }
 function effect(name){
  if(!available||!effectsEnabled||effectsLevel===0||!started||!foreground||disposed||!files[name])return false;
  const t=now(),feedback=name==='correct'||name==='complete';
  if(!feedback&&(t<feedbackUntil||t-lastEffectAt<220))return false;
  if(name===lastEffect&&t-lastEffectAt<220)return false;
  lastEffect=name;lastEffectAt=t;if(feedback)feedbackUntil=t+(name==='complete'?1100:320);
  // Only one short cue at a time. Result feedback replaces touch sounds; rapid taps cannot form a chorus.
  stopEffects();
  let ctx=effects.get(name);if(!ctx){ctx=safe(()=>api.createInnerAudioContext());if(!ctx)return false;ctx.src='/assets/audio/'+files[name];ctx.autoplay=false;ctx.obeyMuteSwitch=true;if(ctx.onPlay)ctx.onPlay(()=>{if(disposed)return;if(!effectsEnabled||effectsLevel===0||!foreground){safe(()=>ctx.stop());return;}effectPlays++;lastPlayedEffect=name;publish();});if(ctx.onError)ctx.onError(()=>{if(!disposed){errors++;publish();}});effects.set(name,ctx);}
  ctx.volume=volumes[name]*effectsLevel/.60;
  safe(()=>{ctx.stop();ctx.seek(0);ctx.play();});return true;
 }
 function stopEffects(){effects.forEach(ctx=>safe(()=>ctx.stop()));}
 function observe(s={}){
  const nextRoute=s.route||'home',nextMedia=!!s.media;const changed=nextRoute!==route||nextMedia!==media;route=nextRoute;media=nextMedia;if(changed)music();
  const c=s.challenge;if(!c)return;
  const status=c.status,key=[c.id,c.index,status,c.used??c.usedRevives??c.reviveUsed??c.reviveRemaining??0].join(':');
  if(!['correct','revive','locked','result'].includes(status))return;
  if(key===feedbackKey)return;feedbackKey=key;
  // Restoring an old feedback screen is quiet; only a live interaction unlocks audio.
  // An incorrect answer keeps its existing visual explanation, without an alarm or negative jingle.
  if(status==='correct')effect('correct');else if(status==='result')effect('complete');
 }
 publish();
 return {state,gesture(name){if(disposed)return;const first=!started;started=true;if(first)publish();if(first||(!musicPlaying&&!musicPending))music();if(name)effect(name);},effect,observe,
  toggle(){if(disposed)return state();started=true;if(musicEnabled||effectsEnabled){lastChannels={music:musicEnabled,effects:effectsEnabled};musicEnabled=false;effectsEnabled=false;pauseMusic();stopEffects();}else{musicEnabled=lastChannels.music;effectsEnabled=lastChannels.effects;if(musicEnabled&&!musicLevel)musicLevel=.40;if(effectsEnabled&&!effectsLevel)effectsLevel=.60;music();}save();publish();return state();},
  setChannel(channel,on){if(disposed||!['music','effects'].includes(channel))return state();started=true;if(channel==='music'){musicEnabled=!!on;if(on&&musicLevel===0)musicLevel=.40;music();}else{effectsEnabled=!!on;if(on&&effectsLevel===0)effectsLevel=.60;if(!on)stopEffects();}save();publish();return state();},
  setVolume(channel,value,{persist=true,preview=false}={}){if(disposed||!['music','effects'].includes(channel)||!Number.isFinite(Number(value)))return state();started=true;const level=clamp(value);if(channel==='music'){musicLevel=level;musicEnabled=level>0;music(true);}else{effectsLevel=level;effectsEnabled=level>0;effects.forEach((ctx,name)=>{ctx.volume=volumes[name]*effectsLevel/.60;});if(!effectsEnabled)stopEffects();}if(persist)save();publish();if(preview&&channel==='effects')effect('select');return state();},save,
  hide(){foreground=false;save();pauseMusic();stopEffects();},show(){if(disposed)return;foreground=true;music();},
  dispose(){if(disposed)return;save();foreground=false;pauseMusic();stopEffects();disposed=true;if(bgm)safe(()=>bgm.destroy());effects.forEach(ctx=>safe(()=>ctx.destroy()));effects.clear();bgm=null;},
 };
}
module.exports={createAudio,preferenceKey,settingsKey,files};
