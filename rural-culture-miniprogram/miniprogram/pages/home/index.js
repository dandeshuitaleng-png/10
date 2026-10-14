const ui = require('../../utils/page');
Page({
 data:{loading:true,error:'',summary:{},themes:[]},
 onShow(){this.refresh();},
 refresh(){return ui.load(this,async()=>{this.setData(await ui.api.getHome());});},
 explore(){ui.go('/pages/themes/index');},
 progress(){ui.go('/pages/progress/index');},
 ranking(){ui.go('/pages/ranking/index');},
 certificate(){ui.go('/pages/certificate/index');},
 onShareAppMessage:ui.share
});
