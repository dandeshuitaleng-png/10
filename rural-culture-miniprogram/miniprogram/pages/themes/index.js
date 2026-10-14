const ui=require('../../utils/page');
Page({data:{loading:true,error:'',themes:[]},onShow(){this.refresh();},refresh(){return ui.load(this,async()=>{this.setData({themes:await ui.api.getThemes()});});},enter(e){ui.go('/pages/chapters/index?themeId='+e.currentTarget.dataset.id);},home:ui.home,onShareAppMessage:ui.share});
