const {rigs}=require('../../services-v4/mascot-rig');
Component({properties:{pose:{type:String,value:'welcome'},playing:{type:Boolean,value:false},responding:{type:Boolean,value:false},cycle:{type:Number,value:0}},data:{rigs}});
