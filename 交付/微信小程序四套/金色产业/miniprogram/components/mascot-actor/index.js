const {rigs}=require('../../services-v4/mascot-rig');
// Keep every body in the ordinary view layer throughout idle/play/replay.
// No native animation surface or whole-body visibility handoff is needed.
Component({
 properties:{pose:{type:String,value:'welcome'},scrollSafe:{type:Boolean,value:false},playing:{type:Boolean,value:false},responding:{type:Boolean,value:false},cycle:{type:Number,value:0},touchCycle:{type:Number,value:0}},
 data:{rigs}
});
