// Local playtest state machine. Production scoring must use the server adapter.
const {copyQuestion,questionView}=require('./question');
class Challenge {
  constructor({ questions, level, random = Math.random, verifyShare = null }) {
    if (!level || !Array.isArray(questions) || questions.length < 10) throw new Error('INSUFFICIENT_QUESTIONS');
    const ids = new Set();
    const pool=questions.map(q=>{
      const copy=copyQuestion(q);if(ids.has(copy.id))throw new Error('INVALID_QUESTION');ids.add(copy.id);return copy;
    });
    for(let i=pool.length-1;i>0;i--){const j=Math.floor(random()*(i+1));if(j<0||j>i)throw new Error('INVALID_RANDOM');[pool[i],pool[j]]=[pool[j],pool[i]];}
    this.questions=pool.slice(0,10);this.level={...level};this.verifyShare=verifyShare;
    this.position=0;this.correct=0;this.attempts=0;this.selected=null;this.revived=false;this.state='answering';this.pending=false;this.closed=false;
  }
  select(index,expectedQuestionId=null) {
    if(this.closed||this.state!=='answering'||(expectedQuestionId!=null&&expectedQuestionId!==this.questions[this.position].id)||!Number.isInteger(index)||index<0||index>3)return false;
    this.selected=index;return true;
  }
  submit(expectedQuestionId) {
    if(this.closed||this.state!=='answering'||this.selected===null||expectedQuestionId!==this.questions[this.position].id)return false;
    const right=this.selected===this.questions[this.position].answer;
    this.attempts++;this.selected=null;
    if(right){this.correct++;if(this.correct===10)this.state='complete';else this.position++;}
    else this.state=this.revived?'locked':'revive';
    return {right,state:this.state};
  }
  async revive(evidence) {
    if(this.closed||this.state!=='revive'||this.revived||this.pending)return false;
    if(!this.verifyShare)throw new Error('SHARE_VERIFICATION_UNAVAILABLE');
    this.pending=true;
    try {
      const response=await this.verifyShare(evidence);
      if(this.closed||this.state!=='revive'||!response||response.verified!==true)return false;
      this.revived=true;this.state='answering';this.selected=null;return true;
    } finally {this.pending=false;}
  }
  close(){this.closed=true;}
  get question(){return questionView(this.questions[this.position],{position:this.position+1,total:this.questions.length,levelOrder:this.level.order,difficultyLabel:this.level.difficulty,themeName:this.level.themeName,practice:true});}
  get result(){return {themeName:this.level.themeName,levelOrder:this.level.order,points:null,accuracyPercent:null,correct:this.correct,attempts:this.attempts,practice:true,complete:this.state==='complete'};}
}
module.exports={Challenge};
