// ==UserScript==  
// @name         CM.Js.Tank 1.0.0
// @version		 1.0.0
// @author       cm.ivan@qq.com
// @namespace    CMTankJs
// @description  JS版坦克世界(By CM)
// @include      *://*
// @require	https://ajax.googleapis.com/ajax/libs/jquery/1.7.1/jquery.min.js
// ==/UserScript== 

function withjQuery(callback, safe){
	if(typeof(jQuery) == "undefined") {
		var script = document.createElement("script");
		script.type = "text/javascript";
		script.src = "https://ajax.googleapis.com/ajax/libs/jquery/1.7.1/jquery.min.js";
		if(safe) {
			var cb = document.createElement("script");
			cb.type = "text/javascript";
			cb.textContent = "jQuery.noConflict();(" + callback.toString() + ")(jQuery, window);";
			script.addEventListener('load', function() { document.head.appendChild(cb); });
		}
		else {
			var dollar = undefined;
			if(typeof($) != "undefined") dollar = $;
			script.addEventListener('load', function() {
				jQuery.noConflict();
				$ = dollar;
				callback(jQuery, window);
			});
		}
		document.head.appendChild(script);
	} else {
		setTimeout(function() { //Firefox supports
			callback(jQuery, typeof unsafeWindow === "undefined" ? window : unsafeWindow);
		}, 30);
	}
}

withjQuery(function($, window){
	var _width  = $(window).width();
	var _height = $(window).height();
	
	//容错模式
	window.onerror = CMerror;
	function CMerror(_message,_url,_line) { return true; }
	 
	$(document).click(function() {
		if( window.webkitNotifications && window.webkitNotifications.checkPermission() != 0 ) {
			window.webkitNotifications.requestPermission();
		}
	});
	function route(match, fn) {
		if( window.location.href.indexOf(match) != -1 ) {
			fn();
		};
	}
	//验证
	function is_null(str){
		if( str=='undefined' || str=='' || str==null ){
			return false;
		} else {
			return true;
		}
	}
	//调用事件，通过GM很难调用原页面的函数，最好只从Element的事件方向处理
	function CM_event(ele, type) {
		var thisid,thisobj;
		thisid = ele.attr('id');
		if( is_null(thisid) == false ){
			var D = new Date();
			thisid = 'cm' + D.getTime().toString();
			ele.attr('id',thisid);
		}
		var evt = document.createEvent("Event");  
		evt.initEvent(type, true, false);  
		document.getElementById(thisid).dispatchEvent(evt);
	}
	
	//初始化按钮
	function boxobj(txt) {
		var BtuID;
		BtuID = 'CmWarStart';
		$('<a href=\'javascript:void(0);\'></a>').appendTo('body')
		.attr('id', BtuID).html(txt)
		.css({'font-size':'12px','line-height':'15px'})
		.css({'font-family':'Tahoma, Geneva, sans-serif'})
		.css({'left':'800px','top':'0'})
		.css({'position':'absolute','color':'white'})
		.css({'border-radius':'5px','text-shadow':'-1px -1px 0 rgba(0, 0, 0, 0.2)'})
		.css({'background':'#2CC03E','border-color':'#259A33'})
		.css({'border-bottom-color':'#2CC03E','border-right-color':'#2CC03E'})
		.css({'padding':'5px 10px','z-index':'9998'})
		.css({'opacity':'0.85'});
		return $('#' + BtuID);
	}



	/******************************
	 * 设置障碍物遮罩
	 ******************************/
	function CollisionFocus(obj){
		var _mark = $('#collision_mark');
		var _size = _mark.size();
		var _cl = 0;
		var _ct = 0;
		if(_size>0){
			_cl = _mark.css('left');
			_ct = _mark.css('top');
		}
		if(obj!=null){
			var _l = obj.css('left');
			var _t = obj.css('top');
			var _w = obj.css('width');
			var _h = obj.css('height');
			if(_cl!=_l||_ct!=_t){
				if(_size<=0){ $('<div id="collision_mark">&nbsp;</div>').appendTo('body'); }
				$('#collision_mark')
				  .css({'left':_l,'top':_t})
				  .css({'width':_w,'height':_h})
				  .css({'background-color':'#F90','position':'absolute'})
				  .css({'border':'#F00 1px solid'})
				  .css({'opacity':'0.4'});
			}		
		}else{
			if(_size>0){ $('#collision_mark').remove(); }
		}
	}
	
	
	
	/******************************
	 * 扫描并返回运行方向上最近的障碍物
	 ******************************/
	function ScanCollisionObj(Mobj,arrow){
		var obj = null;
		var _max = null;
		var _x1 = parseInt(Mobj.css('left'));
		var _y1 = parseInt(Mobj.css('top'));
		var _w1 = parseInt(Mobj.css('width'));
		var _h1 = parseInt(Mobj.css('height'));
		$('.collision').each(function(){
			var _collision = false;
			var type = $(this).attr('type');
			//if(type=='obstacle'){
			if(type!=''){
				var _x2 = parseInt($(this).css('left'));
				var _y2 = parseInt($(this).css('top'));
				var _w2 = parseInt($(this).css('width'));
				var _h2 = parseInt($(this).css('height'));
				//判断方向
				var _x_arrow_left = (_x1<_x2)&&(_x1+_w1>_x2)&&(_x1+_w1<_x2+_w2);
				var _x_arrow_right = (_x2<_x1)&&(_x1-_x2<_w2);
				var _y_arrow_top = (_y1<=_y2)&&(_y1+_h1>_y2)&&(_y1+_h1<_y2+_h2);
				var _y_arrow_bottom = (_y2<=_y1)&&(_y1-_y2<_h2);
				switch( arrow ){
				  case 't': //上
					if( ( (_x_arrow_left||_x_arrow_right) && (_y1>_y2) ) ){ _collision = true;
						if(_max==null || _max<_y2){ _max = _y2; obj = $(this); }
					}
					break;
				  case 'b': //下
					if( ( (_x_arrow_left||_x_arrow_right) && ((_y1<_y2)||(_y1>=_y2)&&(_y1+_h1<_y2+_h2)) ) ){ _collision = true;
						if(_max==null || _max>_y2){ _max = _y2; obj = $(this); }
					}
					break;
				  case 'l': //左
					if( ( (_y_arrow_top||_y_arrow_bottom) && (_x1>_x2) ) ){ _collision = true;
						if(_max==null || _max<_x2){ _max = _x2; obj = $(this); }
					}
					break;
				  case 'r': //右
					if( ( (_y_arrow_top||_y_arrow_bottom) && ((_x1<_x2)||(_x1>=_x2)&&(_x1+_w1<_x2+_w2)) ) ){ _collision = true;
						if(_max==null || _max>_x2){ _max = _x2; obj = $(this); }
					}
					break;
				}
			}
		});
		return obj;	
	}
	
	
	
	/*************
	 * 障碍物
	 *************/
	function Obstacle(){
	var thisObst = new Object();
		thisObst.id = 'obstacle_' + parseInt(Math.random() * 100000);
		thisObst.size = 175;
		thisObst.left = 100;
		thisObst.top = 100;
		thisObst.body = '<div class="collision" type="obstacle" id="' + thisObst.id + '"></div>';
		thisObst.obstacle = $( thisObst.body );
		thisObst.creat = function(){
			var _left = thisObst.left-(thisObst.size/2);
			var _top = thisObst.top-(thisObst.size/2);
			thisObst.obstacle.appendTo('body')
			.css({'left':_left,'top':_top})
			.css({'width':''+thisObst.size+'px','height':''+thisObst.size+'px'})
			.css({'background-color':'#060','position':'absolute'})
			.css({'background-repeat':'no-repeat'})
			.css({'opacity':'0.8'});
		};
		return thisObst;
	}
	
		
	/*************
	 * 坦克对象
	 *************/
	function Tank(id){
	var thisTank = new Object();
		thisTank.id = 'tank_' + id;
		thisTank.size = 60;
		thisTank.left = parseInt(($(window).width()-thisTank.size)/2);
		thisTank.top = parseInt($(window).height()-thisTank.size);
		thisTank.body = '<div id="' + thisTank.id + '"></div>';
		thisTank.img = 'http://p13.freep.cn/p.aspx?u=v20_p13_photo_1205130104136275_0.png';
		thisTank.speed = 2;
		thisTank.play = 0; //0表示暂停，1表示运行
		thisTank.arrow = 't';
		thisTank.clas = null;
		thisTank.type = null;
		thisTank.auto = false; //是否自动寻向
		thisTank.tank = $( thisTank.body );
		thisTank.creat = function(){
			thisTank.tank.appendTo('body')
			.css({'left':thisTank.left+'px','top':thisTank.top+'px'})
			.css({'width':''+thisTank.size+'px','height':''+thisTank.size+'px'})
			.css({'background-color':'','position':'absolute'})
			.css({'background-repeat':'no-repeat'})
			.css({'background-image':'url('+thisTank.img+')'});
			if(thisTank.clas!=null){ thisTank.tank.attr('class',thisTank.clas); }
			if(thisTank.type!=null){ thisTank.tank.attr('type',thisTank.type); }
		};
		
		//坦克的炮弹
		thisTank.bean = function(){
			var _TankBean = Bean(id);
			//判断方向
			var _left = parseInt(thisTank.tank.css('left'));
			var _top = parseInt(thisTank.tank.css('top'));
			switch( thisTank.arrow ){
				case 't': //上
				  _TankBean.left = _left + thisTank.size/2;
				  _TankBean.top = _top;
				  break;
				case 'b': //下
				  _TankBean.left = _left + thisTank.size/2;
				  _TankBean.top = _top + thisTank.size;
				  break;
				case 'l': //左
				  _TankBean.left = _left;
				  _TankBean.top = _top + thisTank.size/2;
				  break;
				case 'r': //右
				  _TankBean.left = _left + thisTank.size;
				  _TankBean.top = _top + thisTank.size/2;
				  break;
			}
			_TankBean.creat();
			_TankBean.arrow = thisTank.arrow; //保证炮弹和坦克同向
			_TankBean.move();
		}
		
		//判断是否碰撞场景边缘
		thisTank.onScreen = function(){
			var _left = parseInt(thisTank.tank.css('left'));
			var _top  = parseInt(thisTank.tank.css('top'));
			var _w    = parseInt(thisTank.tank.css('width'));
			var _h    = parseInt(thisTank.tank.css('height'));
			var _Bw   = parseInt($(window).width());
			var _Bh   = parseInt($(window).height());
			var onScreen = true;
			//判断方向
			switch( thisTank.arrow ){
				case 't': //上
				  if( _top - thisTank.speed <= 0 ){ onScreen = false; }
				  break;
				case 'b': //下
				  if( _top + _h + thisTank.speed  >= _Bh ){ onScreen = false; }
				  break;
				case 'l': //左
				  if( _left - thisTank.speed <= 0 ){ onScreen = false; }
				  break;
				case 'r': //右
				  if( _left + _w + thisTank.speed  >= _Bw ){ onScreen = false; }
				  break;
			}
			if(onScreen==false){ thisTank._auto(); }
			return onScreen;
		}
		
		
	
		//判断是否已与其他物体碰撞
		thisTank._beanNum = 0;
		thisTank._times = 0;
		thisTank.onCollision = function(){
			var _collision = true;
			
			var _x1 = parseInt(thisTank.tank.css('left'));
			var _y1 = parseInt(thisTank.tank.css('top'));
			var _w1 = parseInt(thisTank.tank.css('width'));
			var _h1 = parseInt(thisTank.tank.css('height'));
			
			//扫描返回障碍物
			var Scan = ScanCollisionObj(thisTank.tank,thisTank.arrow);
			//设置障碍物焦点
			if(thisTank.auto==false){ CollisionFocus(Scan); }
			
			if(Scan!=null){
				
				var type = Scan.attr('type');
				var id = Scan.attr('id');
				if(type=='obstacle'){
					
					//如果自动坦克遇到tank_cm则自动发射
					if(thisTank.auto && id=='tank_cm'){
						thisTank._times++;
						if(thisTank._times%80 == 0){
							setTimeout(function(){ thisTank.bean(); },500);
						}
					}
					
					var _x2 = parseInt(Scan.css('left'));
					var _y2 = parseInt(Scan.css('top'));
					var _w2 = parseInt(Scan.css('width'));
					var _h2 = parseInt(Scan.css('height'));
					//判断方向
					var _x_arrow_left = (_x1<_x2)&&(_x2-_x1<_w1);
					var _x_arrow_right = (_x2<_x1)&&(_x1-_x2<_w2);
					var _y_arrow_top = (_y1<=_y2)&&(_y2-_y1<_h1);
					var _y_arrow_bottom = (_y2<=_y1)&&(_y1-_y2<_h2);
					switch( thisTank.arrow ){
						case 't': //上
						  if( ( _x_arrow_left&&(_y1-thisTank.speed<=_y2+_h2)&&(_y1-thisTank.speed>_y2) ) || ( _x_arrow_right&&(_y1-thisTank.speed<=_y2+_h2)&&(_y1-thisTank.speed>_y2) ) ){_collision = false; }
						  break;
						case 'b': //下
						  if( ( _x_arrow_left&&(_y1+_h1+thisTank.speed>=_y2)&&(_y1+_h1+thisTank.speed<_y2+_h2) ) || ( _x_arrow_right&&(_y1+_h1+thisTank.speed>=_y2)&&(_y1+_h1+thisTank.speed<_y2+_h2) ) ){_collision = false; }
						  break;
						case 'l': //左
						  if( ( _y_arrow_top&&(_x1-thisTank.speed<=_w2+_x2)&&(_x1-thisTank.speed>_x2) ) || ( _y_arrow_bottom&&(_x1-thisTank.speed<=_w2+_x2)&&(_x1-thisTank.speed>_x2) ) ){_collision = false; }
						  break;
						case 'r': //右
						  if( ( _y_arrow_top&&(_x1+_w1+thisTank.speed-_x2>=0)&&(_x1+_w1+thisTank.speed-_x2<_w2) ) || ( _y_arrow_bottom&&(_x1+_w1+thisTank.speed-_x2>=0)&&(_x1+_w1+thisTank.speed-_x2<_w2) )  ){_collision = false; }
						  break;
					}
				}	
			}
			if(_collision==false){ thisTank._auto(); }
			return _collision;
		}
		
		
		//对象智能寻向
		thisTank._auto = function(){
			if(thisTank.auto){
				var a = ['t','b','l','r'];
				var _a = thisTank.arrow;
				a.remove(_a);
				var n = Math.floor(Math.random()*a.length+1)-1;
				thisTank.arrow = a[n];
				thisTank.reArrow();	
			}
		}
		//重新调整方向
		thisTank.reArrow = function(){
			switch( thisTank.arrow ){
				case 't': //上
				  thisTank.tank.css({'background-position':'left top'});
				  break;
				case 'b': //下
				  thisTank.tank.css({'background-position':'right top'});
				  break;
				case 'l': //左
				  thisTank.tank.css({'background-position':'bottom right'});
				  break;
				case 'r': //右
				  thisTank.tank.css({'background-position':'bottom left'});
				  break;
			}
		}
		
		
		//对象移动
		thisTank.move = function(){
			//判断状态
			if(thisTank.play==1 && thisTank.onScreen() && thisTank.onCollision() ){
				//判断方向
				var _t = parseInt(thisTank.tank.css('top'));
				var _l = parseInt(thisTank.tank.css('left'));
				switch( thisTank.arrow ){
					case 't': //上
					  thisTank.tank.css({'top':_t-thisTank.speed+'px'});
					  break;
					case 'b': //下
					  thisTank.tank.css({'top':_t+thisTank.speed+'px'});
					  break;
					case 'l': //左
					  thisTank.tank.css({'left':_l-thisTank.speed+'px'});
					  break;
					case 'r': //右
					  thisTank.tank.css({'left':_l+thisTank.speed+'px'});
					  break;
				}
			}
			setTimeout(function(){thisTank.move();},10);
		};
		
		
		//键盘监听
		thisTank.keyboard = function(){
			$('body').keydown(function(e){
				switch( e.keyCode ){
					case 38: //上
					  thisTank.arrow = 't';
					  thisTank.reArrow();
					  break;
					case 40: //下
					  thisTank.arrow = 'b';
					  thisTank.reArrow();
					  break;
					case 37: //左
					  thisTank.arrow = 'l';
					  thisTank.reArrow();
					  break;
					case 39: //右
					  thisTank.arrow = 'r';
					  thisTank.reArrow();
					  break;
					case 32: //发射
					  thisTank.bean();
					  break;
					case 13: //回车键暂停或运行
					  if(thisTank.play==0){
						  thisTank.play = 1;
					  }else{
						  thisTank.play = 0;
					  }
					  break;
					case 116: //刷新
					  return true;
					  break;
				}
				return false;
			});
		};
		//返回对象
		return thisTank;
	}
	
	
	
	
	
	/*************
	 * 炸弹对象
	 *************/
	function Bean(id){
	var thisBean = new Object();
		thisBean.id = id + '_bean_' + parseInt(Math.random() * 100000);
		thisBean.range = 600;
		thisBean.timer = 800;
		thisBean.size = 40;
		thisBean.left = 100;
		thisBean.top = 100;
		thisBean.img = 'http://p13.freep.cn/p.aspx?u=v20_p13_photo_1205130907271655_0.png';
		thisBean.arrow = 't';
		thisBean.body = '<div class="collision" type="bean" id="' + thisBean.id + '"></div>';
		thisBean.bean = $( thisBean.body );
		thisBean.creat = function(){
			var _left = thisBean.left-(thisBean.size/2);
			var _top = thisBean.top-(thisBean.size/2);
			thisBean.bean.appendTo('body')
			.css({'left':_left,'top':_top})
			.css({'width':''+thisBean.size+'px','height':''+thisBean.size+'px'})
			.css({'background-color':'','position':'absolute'})
			.css({'background-repeat':'no-repeat'})
			.css({'background-image':'url('+thisBean.img+')'});
		};
	
		//炮弹的障碍对象
		thisBean.CollisionObj = null;
		//判断是否已与其他物体碰撞
		thisBean.onCollision = function(){
			var _collision = false;
			
			var _x1 = parseInt(thisBean.bean.css('left'));
			var _y1 = parseInt(thisBean.bean.css('top'));
			var _w1 = parseInt(thisBean.bean.css('width'));
			var _h1 = parseInt(thisBean.bean.css('height'));
	
			var Scan = ScanCollisionObj(thisBean.bean,thisBean.arrow);
			thisBean.CollisionObj = Scan;
			
			if(Scan!=null){
				var type = Scan.attr('type');
				var _id = Scan.attr('id');
				if(_id!='tank_cm'){
					var _x2 = parseInt(Scan.css('left'));
					var _y2 = parseInt(Scan.css('top'));
					var _w2 = parseInt(Scan.css('width'));
					var _h2 = parseInt(Scan.css('height'));
					//判断方向
					var _x_arrow_left = (_x1<_x2)&&(_x2-_x1<_w1);
					var _x_arrow_right = (_x2<_x1)&&(_x1-_x2<_w2);
					var _y_arrow_top = (_y1<=_y2)&&(_y2-_y1<_h1);
					var _y_arrow_bottom = (_y2<=_y1)&&(_y1-_y2<_h2);
					_collision = ((_x_arrow_left||_x_arrow_right)&&(_y_arrow_top||_y_arrow_bottom)); 
				}	
			}
			return _collision;
		}
		
		//检测是否碰撞
		thisBean.collision = function(){
			if( thisBean.onCollision() ){
				thisBean.bean.stop(true,true);
				thisBean.bean.remove();
				var _type = thisBean.CollisionObj.attr('type');
				if(_type=='bean'){
					thisBean.CollisionObj.stop(true,true);
					thisBean.CollisionObj.remove();
				}else{
					thisBean.CollisionObj.css({'background-color':'#060'});
					thisBean.CollisionObj.fadeOut(300,function(){ $(this).remove(); });	
				}
			}
		}
	
		thisBean.move = function(){
			var TimeId = window.setInterval(function(){ thisBean.collision(); },10);
			switch( thisBean.arrow ){
				case 't': //上
				  thisBean.bean.css({'background-position':'left top'});
				  thisBean.bean.animate({'opacity':'0','top':'-='+thisBean.range+'px'},thisBean.timer,function(){window.clearInterval(TimeId);$(this).remove();});
				  break;
				case 'b': //下
				  thisBean.bean.css({'background-position':'right top'});
				  thisBean.bean.animate({'opacity':'0','top':'+='+thisBean.range+'px'},thisBean.timer,function(){window.clearInterval(TimeId);$(this).remove();});
				  break;
				case 'l': //左
				  thisBean.bean.css({'background-position':'bottom right'});
				  thisBean.bean.animate({'opacity':'0','left':'-='+thisBean.range+'px'},thisBean.timer,function(){window.clearInterval(TimeId);$(this).remove();});
				  break;
				case 'r': //右
				  thisBean.bean.css({'background-position':'bottom left'});
				  thisBean.bean.animate({'opacity':'0','left':'+='+thisBean.range+'px'},thisBean.timer,function(){window.clearInterval(TimeId);$(this).remove();});
				  break;
			}
		};
		
		return thisBean;
	}
	
	
	
	//Output
	function echo(){
		this.id = 'echo_div';
		this.max = 20;
		this.obj = null;
		this.echoobj = null;
		this.creat = function(){
			$('<div id="'+this.id+'_box"><div id="'+this.id+'">&nbsp;</div></div>').appendTo('body')
			.css({'font-size':'12px'})
			.css({'font-family':'Tahoma, Geneva, sans-serif'})
			.css({'line-height':'15px'})
			.css({'left':'10px','top':'10px'})
			.css({'background-color':'#ccc','position':'absolute'})
			.css({'border':'#666 1px solid','z-index':'9999'})
			.css({'border-radius':'5px'})
			.css({'opacity':'0.85'})
			.css({'overflow':'hidden'});
			
			this.obj = $('#' + this.id + '_box');
			this.echoobj = $('#' + this.id);
			this.echoobj.css({'margin':'12px'})
			.css({'padding-left':'60px'})
			.css({'text-align':'left'})
			.css({'width':'250px','height':'106px'})
			.css({'background-image':'url(http://p13.freep.cn/p.aspx?u=v20_p13_photo_1205130126331050_0.png)'})
			.css({'background-repeat':'no-repeat'})
			.css({'overflow':'hidden'});
		}
		this.echoNum = 0;
		this.err  = function(str){ this.out(str,'color:#f00;'); }
		this.errB = function(str){ this.out(str,'color:#f00;font-weight:bold;'); }
		this.outB = function(str){ this.out(str,'font-weight:bold;text-decoration:underline'); }
		this.outG = function(str){ this.out(str,'color:#0C0;font-weight:bold;'); }
		this.out  = function(str,style){
			var _echoID = 'tip_' + parseInt(Math.random()*1000000);
			str = '<div id="'+_echoID+'" style="'+style+'">'+str+'</div>';
			this.echoNum++;
			if(this.echoNum>this.max){
				this.echoNum = 0;
				this.echoobj.html( str );
			}else{
				this.echoobj.prepend( str );
			}
			$('#' + _echoID).CMwriter(10);
		}
		return this;	
	}
	
	
	/*打字效果插件*/
	(function(a) {
		a.fn.CMwriter = function(speed){
			this.each(function() {
				var d = a(this),
				c = d.html(),
				b = 0;
				d.html('');
				var e = setInterval(function(){
					var f = c.substr(b,1);
					if(f == '<'){ b = c.indexOf('>', b) + 1; }else{ b++; }
					if(b >= c.length){
						d.html(c.substring(0, b));
						clearInterval(e);
					}else{
						d.html(c.substring(0, b) + (b & 1 ? '_': ''));
					}
				},speed);
			});
			return this;
		}
	})(jQuery);
	
	loadImages = function(){
		for(var i = 0; i<arguments.length; i++){
			img = new Image();
			img.src = arguments[i];
		}
	}


	route("/", function() {
		
		Array.prototype.indexOf = function(val) {  
		   for (var i=0; i<this.length;i++) { if (this[i] == val) return i; }  
		   return -1;  
		};  
		Array.prototype.remove = function(val) {  
		   var index = this.indexOf(val);  
		   if (index>-1) {this.splice(index, 1); }  
		};
		
		$(function(){
			boxobj('Start CM War!').click(function() {
				
				loadImages(
				"http://p13.freep.cn/p.aspx?u=v20_p13_photo_1205130104136275_0.png",
				"http://p13.freep.cn/p.aspx?u=v20_p13_photo_1205130907271655_0.png",
				"http://p13.freep.cn/p.aspx?u=v20_p13_photo_1205130126331050_0.png"
				);
				
				//$(this).remove();
				var _width = $(window).width();
				var _height = $(window).height();
				$('body').css({'position':'relative','overflow':'hidden','width':_width+'px','height':_height+'px'});

				var _echo = echo();
				_echo.creat();
				_echo_w = parseInt(_echo.obj.width());
				_echo_h = parseInt(_echo.obj.height());
				_echo_l = (_width-_echo_w)/2;
				_echo_t = (_height-_echo_h)/2;
				_echo.obj.css({'left':_echo_l+'px','top':_echo_t+'px'});
				_echo.obj.fadeOut(0);
				
				var _this_width = parseInt($(this).width());
				var _this_left = (_width-_this_width)/2;
				$(this).animate({'opacity':'0','left':_this_left+'px','top':_echo_t+'px'},600,function(){
				
					_echo.obj.fadeOut(0).delay(500)
					.fadeIn(500,function(){ _echo.errB('Welcome To The Game!'); }).delay(500)
					.fadeIn(500,function(){ _echo.errB('Help:'); }).delay(1200)
					.fadeIn(500,function(){ _echo.out('You Can Press the key:'); }).delay(500)
					.fadeIn(500,function(){ _echo.out('<b>"→ ← ↑ ↓"</b> to change direction'); }).delay(1200)
					.fadeIn(500,function(){ _echo.out('<b>"Spacebar"</b> to attack'); }).delay(1200)
					.fadeIn(500,function(){ _echo.out('<b>"Enter"</b> to stop running!'); }).delay(800)
					.fadeIn(500,function(){ _echo.outB('Now! Enjoy it!'); }).delay(1200)
					.fadeIn(500,function(){ _echo.out('Development: 2012/5/12'); }).delay(500)
					.fadeIn(500,function(){ _echo.outB('Game Design: CM.Ivan'); }).delay(500)
					.fadeIn(500,function(){ _echo.out('Contact: cm.ivan@qq.com'); }).delay(1000)
					.fadeIn(500,function(){ _echo.outG('Loading....'); }).delay(1000)
					.fadeIn(500,function(){ _echo.errB('Now!let`s war.'); }).delay(800)
					.animate({'left':'10px','top':'10px'},500,function(){
						var _anum = 0;
						$('img').each(function(){
							_anum++;
							if(_anum<100){
								_id = 'obstacle_' + parseInt(Math.random() * 100000);
								_left = Math.random() * parseInt( $('body').width() );
								_top = Math.random() * (parseInt( $('body').height() )-235);
								_w = $(this).width();
								_h = $(this).height();
								$(this).appendTo('body')
								.attr('id',_id)
								.attr('class','collision')
								.attr('type','obstacle')
								.css({'position':'absolute'})
								.css({'left':_left+'px','top':_top+'px'})
							}
						});
						
						if(_anum<15){
							
							$('a').each(function(){
								_anum++;
								if(_anum<70){
									_id = 'obstacle_' + parseInt(Math.random() * 100000);
									_left = Math.random() * parseInt( $('body').width() );
									_top = Math.random() * (parseInt( $('body').height() )-235);
									_w = $(this).width();
									_h = $(this).height();
									$(this).appendTo('body')
									.attr('id',_id)
									.attr('class','collision')
									.attr('type','obstacle')
									.css({'position':'absolute'})
									.css({'left':_left+'px','top':_top+'px'})
								}
							});
						}
		
						var CM_Tank = Tank('cm');
						CM_Tank.clas = 'collision';
						CM_Tank.type = 'obstacle';
						CM_Tank.creat();
						CM_Tank.play = 1;
						CM_Tank.move();
						CM_Tank.keyboard();
						delete CM_Tank;	
					});
					
				});
				
			});
	    });
	});
	
}, true);
