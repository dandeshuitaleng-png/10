// Only player-visible question content participates; review/source metadata is excluded.
function levelContent(questions){return JSON.stringify(questions.map(q=>({id:q.id,title:q.title,options:q.options,answer:q.answer,explanation:q.explanation||'',difficulty:q.difficulty||null,media:q.media?{type:q.media.type,src:q.media.src,alt:q.media.alt||'',caption:q.media.caption||''}:null})).sort((a,b)=>a.id.localeCompare(b.id)));}
module.exports={levelContent};
