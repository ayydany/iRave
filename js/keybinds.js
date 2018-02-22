
/***********************
* Mouse handling stuff *
***********************/

//gets the current click mode object
var getClickMode = function( ){
	var mode = $("body").data("ui-clickMode");
	if( !mode ){
		mode = {
			startX: -1,
			startY: -1,
			lastX: -1,
			lastY: -1,
	 		x: -1,
	 		y: -1,
	 		
	 		mode: "",					//"", "click", "dragH", "dragV"
	 		ignoreClicks: false,		//if true, no "click" actions will happen on release
	 		direction: 0, 				//0, -1 (left), 1 (right)
	 		consecutive: 0,				//number of consecutive pixels we moved in whatever direction
	 		selectedOption: null,		//the selected option in the currently active screen
	 		leftPreview: null,			//jquery object for preview of previous screen
	 		leftPreviewOption: null,	//jquery object for selected option of previous screen
	 		rightPreview: null,			//jquery object for preview of next screen
	 		rightPreviewOption: null,	//jquery object for selected option of next screen (for single-option previews)
	 	};
		 $("body").data("ui-clickMode", mode );
	}
	
	return mode;
}

//returns a FUNCTION that deletes any preview screens existent at the time of its creation
var delDragPreviewsFunc = function (){
	var clickMode = getClickMode();
	var leftPreview = clickMode.leftPreview;
	var rightPreview  = clickMode.rightPreview;
	
	return function(){
		if( leftPreview ){
	    	leftPreview.remove();
	    }			    
	    if( rightPreview ){
	    	rightPreview.remove();
	    }
	}
}


//moves all preview screens to the given position
//relativeX: the position (in pixels) to move them to (0 is starting position)
//duration (optional): the time (in ms) to animate for, defaults to instant
//callback (optional): function to call when animation completes
var moveDragPreviews = function ( relativeX, duration, callback ){
	duration = duration || 0;
	callback = callback || function(){};
	
	var callbackAndUnbuffer = callback;
	if( duration ){
		startBufferingButtons();
		
		callbackAndUnbuffer = composition(
			callback,
			stopBufferingButtons
		);
	}
	
	
	var screenObject = topScreen()
	var menu = getScreenHTML( screenObject );
	
	var clickMode = getClickMode();

	if(
		(relativeX > 0 && !clickMode.leftPreview) ||
		(relativeX < 0 && !clickMode.rightPreview)
	){
		relativeX = 0;		//clamp max swipe distance if this side's preview doesn't exist
	}
	
	
	if( clickMode.selectedOption && clickMode.selectedOption.length ){
		var menuX = Math.max( relativeX, 0 );
		var optionX = Math.min( relativeX, 0 );
		
		menu.finish().transition( { x: menuX + "px" }, duration, "in-out", callbackAndUnbuffer );
		clickMode.selectedOption.finish().transition( { x: optionX + "px" }, duration, "in-out");
		
	} else {
		var middleX = relativeX;
		if( screenObject.actionType == "screen" || screenObject.actionType == "replace screen"  ){
			middleX = Math.max( 0, middleX );
		}
		menu.finish().transition( { x: middleX + "px" }, duration, "in-out", callbackAndUnbuffer );
	}
	
	var leftPreview = clickMode.leftPreview
	if( leftPreview ){
		if( clickMode.leftPreviewOption && clickMode.leftPreviewOption.length ){		//move left preview option, if it exists
	    	clickMode.leftPreviewOption.finish().transition( { x: relativeX - clickMode.leftPreviewOption.width() + "px" }, duration, "in-out");
	    }
	    
		leftPreview.finish().transition(
			{},
			duration,
			"in-out",
			function(){				
				if( relativeX > 0 ){
		    		leftPreview.removeClass("hidden");
		    	} else {
		    		leftPreview.addClass("hidden");
		    	}
			}
		);
    	
	}
	
	if( clickMode.rightPreview ){
		var rightPreview = clickMode.rightPreview;
		var rightMove = clickMode.rightPreview;
		
		if( clickMode.rightPreviewOption && clickMode.rightPreviewOption.length ){	//if right preview option exists, move only that
			rightMove = clickMode.rightPreviewOption;		
		}
		
		
		var transformMatrix = rightMove.css("transform");	/* { {xx, xy, x+}, {yx, yy, y+} }*/
		var translateY = 0;
		if( transformMatrix && transformMatrix != "none" ){
			translateY = parseFloat( transformMatrix.match(/-?[\d\.]+/g)[5] );	//
		}
		
		var rightX = relativeX + rightMove.width();
		if( screenObject.actionType == "back" ){
			rightX = 0;		//when backing out, "next" screen shouldn't animate
		}
		rightMove.finish().transition(
			{
				x: rightX + "px",
				y: translateY,
			},
			duration,
			"in-out",
			function(){				
				if( relativeX < 0 ){
		    		rightPreview.removeClass("hidden");
		    	} else {
		    		rightPreview.addClass("hidden");
		    	}
			}
		);
		
    }
	
}

//handle a mouse1 longtouch
var doLongTouch = function(){
	var clickMode = getClickMode();
	if( clickMode.mode == "click" && !clickMode.ignoreClicks ){
		var keybinds =  $().extend(
			{},
			defaultBinds,
			topScreen().keybinds
		)
		
		clickMode.ignoreClicks = !keybinds["long_ok"](false, "ok") || clickMode.ignoreClicks;	//press
		clickMode.ignoreClicks = !keybinds["long_ok"](true, "ok") || clickMode.ignoreClicks;	//release
	}
}

//handles mouse1 presses
var onMouseDown = function(event) {
	if( event.which == 1){
		bindButtons( disabledBinds );	//turn buttons off while mouse stays down
		
		var clickMode = getClickMode();
		
		clickMode.startX = event.pageX;
		clickMode.startY = event.pageY;
		clickMode.lastX = event.pageX;
		clickMode.lastY = event.pageY;
		clickMode.x = event.pageX;
		clickMode.y = event.pageY;
		clickMode.mode = "click";
		
		delayCall( doLongTouch, 400, "timer-longtouch" );		//schedule longtouch
	}
}

//handles mouse1 releases
var onMouseUp = function(event) {
	if( event.which == 1){
		var screenObject = topScreen()
		var menu = getScreenHTML( screenObject );
		
		bindButtons( screenObject.keybinds );	//turn buttons back on
		
		var clickMode = getClickMode();
		
		cancelDelayedCall( "timer-longtouch" );		//unschedule longtouch
		
		switch( clickMode.mode ){
			case "click":
				if(  !clickMode.ignoreClicks ){
					doButton("ok");	//press
					doButton("ok", true);	//release
				}
				break;
				
			case "dragV":				
				if( menu.hasClass("scrollable") ){						// do nothing if no scrollable exists
					var pxPerOption = $("#mainArea").height() / 4;
					
					var bestDistance = Infinity;
					var bestIndex = 0;
					var bestIsAscending = true;
									
					var transformMatrix = menu.css("transform");	/* { {xx, xy, x+}, {yx, yy, y+} }*/
					var translateY = 0;
					if( transformMatrix && transformMatrix != "none" ){
						translateY = parseFloat( transformMatrix.match(/-?[\d\.]+/g)[5] );	//
					}
					
					menu.find(".option").each(
						function(currIndex)
						{
							var option = $(this);
				
							var optionY = option.data( "scroll-ascendingY" ) * pxPerOption;
							var distance = Math.abs( optionY + translateY );		//translateY is negative, so this is actually a subtraction
							if( distance < bestDistance ){
								bestDistance = distance;
								bestIndex = currIndex;
								bestIsAscending = true;
							}
							
							optionY = option.data( "scroll-descendingY" ) * pxPerOption;
							distance = Math.abs( optionY + translateY );		//translateY is negative, so this is actually a subtraction
							if( distance < bestDistance ){
								bestDistance = distance;
								bestIndex = currIndex;
								bestIsAscending = false;
							}
						}
					);
					
					screenObject.data.scrollDuration = ANIMATION_TIME;
					screenObject.data.scrollIndex = bestIndex;
					screenObject.data.isAscending = bestIsAscending;
					
					updateMenuScroll(screenObject);
		    	}
				break;
				
			case "dragH":
				var relativeX = clickMode.x - clickMode.startX;
				var threshold = 20;
				
				if( relativeX == 0 ){										//neither left nor right: instantly remove previews
			    	delDragPreviewsFunc()();
			    	
			    } else if( relativeX > 0 ){			//swiping left to right
			    	if( clickMode.leftPreview ){
				    	if( (clickMode.direction > 0) && (relativeX > threshold) ){
				    		moveDragPreviews(
				    			menu.width(),
				    			ANIMATION_TIME,
				    			composition(
						    		delDragPreviewsFunc(),
						    		function(){
						    			leaveScreen(1,1,true);
						    		}
						    	)
						    );
				 
				    	} else {	//animate away from preview
			    			moveDragPreviews( 0, ANIMATION_TIME, delDragPreviewsFunc() );
				    	}
				    } else {
				    	nopeShake( menu );
			    		delDragPreviewsFunc()();
				    }
			    	
			    } else if( relativeX < 0 ){									//swiping right to left
			    	if( clickMode.rightPreview ){
			    		if( (clickMode.direction < 0) && (-relativeX > threshold) ){
				    		moveDragPreviews(
				    			-menu.width(),
				    			ANIMATION_TIME,
				    			composition(
						    		delDragPreviewsFunc(),
						    		function(){
						    			var isReplacement = false;
		
										switch( screenObject.actionType ){
											case "back":
												leaveScreen(1,-1, true);
												break;
											
											case "replace screen":
												isReplacement = true;
												/* no break */
												
											case "screen":
												var menuObject = newScreen( screenObject.actionParams );	
												
												if( screenObject.isSplashScreen ){
													menuObject.data.selectedIndex = -2;	//same as "ok"
												}
												
												enterScreen( menuObject, null, true, isReplacement );
												break;
												
											case "option":
												var option = screenObject.actionParams;
												option.transition( { x: "0px" }, 0 );
												screenObject.runCallback( option );
												break;
												
											default:
												nopeShake( getScreenHTML(screenObject) );
										}
						    		}
						    	)
						    );
				    		
				    	} else {
				    		moveDragPreviews( 0, ANIMATION_TIME, delDragPreviewsFunc() );	//animate away from preview mode
				    	}
				    } else {
				    	if( !clickMode.ignoreClicks ){
					    	if( clickMode.selectedOption && clickMode.selectedOption.length ){
					    		nopeShake( clickMode.selectedOption );
					    	} else {
					    		nopeShake( menu );
					    	}
					    }
			    		delDragPreviewsFunc()();
				    }
			    }
			    			    
			    break;
		}
    	
		clickMode.startX = -1;
		clickMode.startY = -1;
		clickMode.lastX = -1;
		clickMode.lastY = -1;
		clickMode.x = -1;
		clickMode.y = -1;
		
		clickMode.mode = "";
		clickMode.ignoreClicks = false;
		clickMode.direction = 0;
		clickMode.consecutive = 0;
		clickMode.selectedOption = null;
		clickMode.leftPreview = null;
		clickMode.leftPreviewOption = null;
		clickMode.rightPreview = null;
		clickMode.rightPreviewOption = null;
    }
}


//handles mouse movement while mouse1 is presse
var onMouseMove = function(event) {
	var clickMode = getClickMode();
	if( !clickMode.mode ){	//insta-abort if mouse isn't down
		return;
	}

	var screenObject = topScreen();
	var menu = getScreenHTML( screenObject );
	
	var clickThreshold = 5;
	var dragHThreshold = 5;
	
	clickMode.x = event.pageX;
	clickMode.y = event.pageY;
	
	
	var deltaX = clickMode.x - clickMode.lastX;
	var deltaY = clickMode.y - clickMode.lastY;
	
	
	//see if we transitioned from clicking to dragging
    if( clickMode.mode == "click" ){        		
		if( Math.max( Math.abs(deltaX), Math.abs(deltaY) ) > clickThreshold ){
			if( Math.abs(deltaX) > Math.abs(deltaY) ){
				clickMode.mode = "dragH";
				
				//clear any previous previews, if for some reason they still existed
				delDragPreviewsFunc()();
				
				clickMode.selectedOption = getSelectedOption(screenObject);
					
				var belowTop = belowTopScreen();
				
				//create a preview version of next screen/option
				if( !clickMode.ignoreClicks ){
					switch( screenObject.actionType ){
						case "back":
							if( belowTop ){
								clickMode.rightPreview = getScreenHTML( belowTop ).clone();
								delScreenHTML( belowTop );
								
								$("#mainArea").prepend( clickMode.rightPreview );								
							}
							break;
						
						case "replace screen":
						case "screen":
							var menuObject = newScreen( screenObject.actionParams );
							
							if( screenObject.isSplashScreen ){
								menuObject.data.selectedIndex = -2;		//same as an "ok" press
							}
							
							clickMode.rightPreview = getScreenHTML( menuObject ).clone().addClass("noMouse");
							delScreenHTML( menuObject );
							
							$("#mainArea").append( clickMode.rightPreview );
							break;
							
						case "option":
						    var option = getSelectedOption(screenObject);
							var copyMenu = menu.clone().addClass("noMouse");
						    var copyOption = copyMenu.find(".selected");
						
						    var abort = screenObject.previewCallback( copyOption, option );
							if(abort){
								copyMenu.remove();
							} else {
								clickMode.rightPreview = copyMenu;
								clickMode.rightPreviewOption = copyOption;
								
								$("#mainArea").append( clickMode.rightPreview );
							}
							
							break;
							
						default:
							/* do nothing: no right preview exists */
					}
				}
				
				
				//create a preview version of previous screen
				if( belowTop ){
					clickMode.leftPreview = getScreenHTML( belowTop ).clone();
					delScreenHTML( belowTop );
					
					//locate prev selected option, if any is needed
    				clickMode.leftPreviewOption = screenObject.isPopup || clickMode.leftPreview.find(".selected");
    				
    				$("#mainArea").prepend( clickMode.leftPreview );
				}
				
				
			} else {
				clickMode.mode = "dragV";
			}
		}
	}
	
	//process horizontal drags
	if( clickMode.mode == "dragH" ){		
		if( Math.sign(clickMode.consecutive) == Math.sign( deltaX ) ){
			clickMode.consecutive += deltaX;
		} else {
			clickMode.consecutive = deltaX;
		}
		
		if( Math.abs(clickMode.consecutive) > dragHThreshold ){
			clickMode.direction = Math.sign( clickMode.consecutive );
		}
		
		var relativeX = clickMode.x - clickMode.startX;
		
		moveDragPreviews( relativeX );
		
		clickMode.lastX = clickMode.x;
		
	
	//process vertical drags
	} else  if( clickMode.mode == "dragV" ){
		if( menu.hasClass("scrollable") ){						// do nothing if no scrollable exists
			var pxPerOption = $("#mainArea").height() / 4;
			
			var minTranslateY = screenObject.data.scrollMinY * pxPerOption;
			var maxTranslateY = screenObject.data.scrollMaxY * pxPerOption;
		
			var transformMatrix = menu.css("transform");	/* { {xx, xy, x+}, {yx, yy, y+} }*/
			var translateY = 0;
			if( transformMatrix && transformMatrix != "none" ){
				translateY = parseFloat( transformMatrix.match(/-?[\d\.]+/g)[5] );	//
			}
			
			translateY = Math.max( minTranslateY, Math.min( maxTranslateY, -translateY - deltaY ) );	//use positive values, so min/max bounds make sense
			
			menu.finish().transition( { y: -translateY + "px" }, 0 );
			menu.find(".scrollableHint").finish().transition( { y: translateY + "px" }, 0 );
			
			if( translateY == minTranslateY ){
				menu.find(".scrollableHint.up").addClass("hidden");
			} else {
				menu.find(".scrollableHint.up").removeClass("hidden");
			}
			
			if( translateY == maxTranslateY ){
				menu.find(".scrollableHint.down").addClass("hidden");
			} else {
				menu.find(".scrollableHint.down").removeClass("hidden");
			}
    	}
		
		clickMode.lastY = clickMode.y;
	}            
}



/*******************************
 *  Delayed calling functions  *
 *******************************/

//callback: function to call
//initialDelay: how long to wait before calling it for the second time (in milliseconds)
//repeatDelay (optional): how long to wait before calling it after the second time (in milliseconds), defaults to initialDelay
//timerID (optional): the ID of the timer to use for repeated function. Defaults to "timer-longpress"
//Returns a FUNCTION that, when called, immediately runs callback, then schedules itself for running again.
var repeatFunc = function( callback, initialDelay, repeatDelay, timerID ){
    repeatDelay = repeatDelay || initialDelay;
    
    return function(){
        callback();
        delayCall( repeatFunc(callback, repeatDelay, repeatDelay, timerID), initialDelay, timerID );
    };
}


//callback: function to call
//delay: how long to wait before calling it (in milliseconds)
//timerID (optional): the ID of the timer to use for repeated function. Defaults to "timer-longpress"
var delayCall = function( callback, delay, timerID ){
	timerID = timerID || "timer-longpress";
	
    var body = $("body");
    
    //cancel previous delayed call (only one delayed call can be active at a time for the same timerID)
    cancelDelayedCall(timerID, body);
    
    //setup a timer to wait for delay, then remove all traces of itself when it runs run callback
    var timeoutID = window.setTimeout(      
        function(){
            cancelDelayedCall(timerID, body);
            callback();
        }, 
        delay
    );
    
    //remember about this running timer, in case we want to cancel early
    body.data(timerID, timeoutID);        
}


//cancels current timer for delayed call, and forgets about it
//timerID (optional): the ID of the timer to use for repeated function. Defaults to "timer-longpress"
//body: body where timer is stored
var cancelDelayedCall = function(timerID, body){
	timerID = timerID || "timer-longpress";
    body = body || $("body");
    
    var timeoutID = body.data(timerID);
    if( timeoutID ){                            //if there was a timer running for this ID,
        window.clearTimeout(timeoutID);         //stop the timer
        body.data(timerID, null);  //and forget about it
    }
}
	
	
/************************
* Generic Binding stuff *
*************************/

//generic function to back out of any screen, if possible
var backBind = function(isRelease, button) {	
	if(isRelease){
		leaveScreen();
	}
}

//generic function to back out of any screen, if possible
var longBackBind = function(isRelease, button) {	
	if(!isRelease){
		leaveScreen(Infinity);
	}
}

//performs a generic "ok" for any screen, if possible
var okBind = function(isRelease, button) {
	if(isRelease){
		var screenObject = topScreen();
		
		var isReplacement = false;
		
		switch( screenObject.actionType ){
			case "back":
				leaveScreen(1,-1);
				break;
			
			case "replace screen":
				isReplacement = true;
				/* no break */
				
			case "screen":
				var menuObject = newScreen( screenObject.actionParams );	
				
				if( screenObject.isSplashScreen ){
					var buttonIndexes = {
						up: -1,
						ok: -2,
						down: -3,
					};	
					menuObject.data.selectedIndex = buttonIndexes[button];
				}
				
				var selectedOption;
				if( !menuObject.isPopup ){
					selectedOption =  getSelectedOption(screenObject);
				}
				
				enterScreen( menuObject, selectedOption, false, isReplacement );
				break;
				
			case "option":
				animateOption( screenObject.actionParams, screenObject.runCallback );
				break;
				
			default:
				nopeShake( getScreenHTML(screenObject) );
		}
	}
}

	
/*********************
* Menu Binding stuff *
**********************/

var menuSelectUpBind = function(isRelease, button) {	
	if( !isRelease ){
		var screenObject = topScreen();
		
		var selectedIndex = screenObject.data.selectedIndex;
		var minIndex = screenObject.html.data("selection-minIndex");
		
		screenObject.data.selectedIndex = Math.max( selectedIndex - 1, minIndex );
		screenObject.data.scrollIndex = screenObject.data.selectedIndex;
		screenObject.data.isAscending = true;
		
		screenObject.data.scrollDuration = 400;
	
		updateMenuSelection( screenObject );
	    updateMenuScroll( screenObject );
		bindButtons( screenObject.keybinds );
	}
}

var menuSelectDownBind = function(isRelease, button) {	
	if( !isRelease ){
		var screenObject = topScreen();
		
		var selectedIndex = screenObject.data.selectedIndex;
		var maxIndex = screenObject.html.data("selection-maxIndex");
		
		screenObject.data.selectedIndex = Math.min( selectedIndex + 1, maxIndex );
		screenObject.data.scrollIndex = screenObject.data.selectedIndex;
		screenObject.data.isAscending = false;
		
		screenObject.data.scrollDuration = 400;
		
		updateMenuSelection( screenObject  );
	    updateMenuScroll( screenObject );
	}
}


var menuScrollUpBind = function(isRelease, button) {	
	if( !isRelease ){
		var screenObject = topScreen();
		var menu = getScreenHTML(screenObject);
		
		var currScrollY = getScrollY( screenObject );		
		var minIndex = menu.data("scroll-minIndex");
		
		screenObject.data.isAscending = true;
		screenObject.data.scrollDuration = 400;
		
		while( screenObject.data.scrollIndex > minIndex ){
			if( getScrollY( screenObject ) != currScrollY ){
				break;
			}
			
			screenObject.data.scrollIndex--;
		}
		
	    updateMenuScroll( screenObject );
	}
}

var menuScrollDownBind = function(isRelease, button) {	
	if( !isRelease ){
		var screenObject = topScreen();
		var menu = getScreenHTML(screenObject);
		
		var currScrollY = getScrollY( screenObject );		
		var maxIndex = menu.data("scroll-maxIndex");
		
		screenObject.data.isAscending = false;
		screenObject.data.scrollDuration = 400;
		
		while( screenObject.data.scrollIndex < maxIndex ){
			if( getScrollY( screenObject ) != currScrollY ){
				break;
			}
			
			screenObject.data.scrollIndex++;
		}
		
	    updateMenuScroll( screenObject );
	}
}

var menuLongOkBind = function(isRelease, button) {
	var screenObject = topScreen();
	var option = getSelectedOption( screenObject, true );	//always return an option, even if no selection cursor exists
	
	if( !isRelease ){
		if( option.length ){		
			return option.data("longpressCallback")( option );			
		}
	} else {
		return true;
	}
}



/**********************
* Button buffer stuff *
***********************/

//starts buffering keypresses
var startBufferingButtons = function(){	
    resetButtonBuffer();
    bindButtons( bufferBinds );
}

//stops buffering keypresses, processing any buffered ones
var stopBufferingButtons = function(){
	bindButtons( topScreen().keybinds );
	doBufferedButton();
	
	//force-refresh currentPress button callbacks, so the new ones are run when animation ends (instead of losing ongoing ones to a stopped buffer)
	var currentPress = getCurrentPress();
	var keybinds = getKeybinds();
	
	currentPress.pressCallback = keybinds[currentPress.button];
	currentPress.longpressCallback = keybinds["long_" + currentPress.button];	
}



//returns the button buffer
var getButtonBuffer = function(){
	return $("body").data("ui-buttonBuffer");
}

//resets button buffer, making it ready for use
var resetButtonBuffer = function(){
	$("body").data("ui-buttonBuffer",
		{
			press: "",
			release: "",
			mousedown: null,
			mouseup: null,
		}
	);
}

//adds a button press or release to the buffer
var bufferButton = function( isRelease, button ){
	var buffer = getButtonBuffer();
	if( isRelease ){
		buffer.release = button;
	} else {
		buffer.press = button;
	}
}

//returns a FUCNTION that adds a mouse press/release to buffer
//button: "mousedown" for presses, "mouseup" for releases
var bufferMouseFunc = function( button ){
	return function( event ){
		getButtonBuffer()[button] = event;
	}
}


//processes the buffered button press
var doBufferedButton = function(){
	var buffer = getButtonBuffer();
	
	if( buffer.press ){
		doButton(buffer.press);
	}
	
	if( buffer.release ){
		doButton(buffer.release, true);
	}
	
	if( buffer.mousedown ){
		getKeybinds().mousedown( buffer.mousedown );
	}
	if( buffer.mouseup ){
		getKeybinds().mouseup( buffer.mouseup );
	}
}


/*************************
* Premade keybind groups *
*************************/

//fallback keybind where every key does nothing
var disabledBinds = {};


//buffer keys while an animation is in progress
var bufferBinds = {
	up: bufferButton,
	down: bufferButton,
	ok: bufferButton,
	back: bufferButton,
	
	
	mousedown: bufferMouseFunc("mousedown"),
	mouseup: bufferMouseFunc("mouseup"),
	mousemove: function(){},	//completely ignore drags while still buffering
};


//menus with selection cursor
var menuSelectBinds = {
	up: menuSelectUpBind,
	down: menuSelectDownBind,
	ok: okBind,
	back: backBind,
	
	long_ok: menuLongOkBind,
	long_back: longBackBind,
};


//menus with selection cursor
var menuScrollBinds = {
	up: menuScrollUpBind,
	down: menuScrollDownBind,
	ok: okBind,
	back: backBind,
	
	long_ok: menuLongOkBind,
	long_back: longBackBind,
};


//clock screen, alert
var splashScreenBinds = {
	up: okBind,
	ok: okBind,
	down: okBind,
	back: backBind,
	
	bla: "potato",
	
	long_back: longBackBind,
};



/************************
* Generic Binding stuff *
************************/

//returns the current keybinds object
var getKeybinds = function(){
	return $("body").data("ui-keybinds");
}

var defaultBinds = {
		up:		function( isRelease, button ){ },
		down:	function( isRelease, button ){ },
		ok:		function( isRelease, button ){ },
		back:	function( isRelease, button ){ },
		
		long_up:	function( isRelease, button ){ return true; },
		long_down:	function( isRelease, button ){ return true; },
		long_ok:	function( isRelease, button ){ return true; },
		long_back:	function( isRelease, button ){ return true; },
		
		mousedown: onMouseDown,
		mouseup: onMouseUp,
		mousemove: onMouseMove,
	};

//binds the iRave buttons to the functions given in keybinds for each button,
//defaults to "do nothing" for any button that is ommitted
var bindButtons = function( keybinds ){
	$("body").data("ui-keybinds", 
		$().extend(
			{},
			defaultBinds,
			keybinds
		)
	);
}


//gets object describing currently pressed button
var getCurrentPress = function(){
	return $("body").data("ui-currentPress");
}

//resets currently pressed button, so it describes no key being pressed
var resetCurrentPress = function(){
	var currentPress = getCurrentPress();
	
	cancelDelayedCall("timer-longpress");				//unschedule any longpresses remaining
	
	if( !currentPress ){
		currentPress = {
			pressCallback: function(){},	
			longpressCallback: function(){return true;},	/* if this function does not return true, short-release is not run */
		};
	}
	
	currentPress.button = "";
	currentPress.isLong = false;
	currentPress.processRelease = true;
	
	$("body").data("ui-currentPress",currentPress);
}

//processes an iRave-button press or release
//button: the name of the pressed button ("up", "down", "ok", "back")
//isRelease: whether key was pressed (false) or released (true)
var doButton = function( button, isRelease ){
	var keybinds = getKeybinds();
	
	var currentPress = getCurrentPress();
	
	if( isRelease ){
		if( currentPress.button == button ){			//if this was the button that was last pressed,             
            if( currentPress.isLong ){
				currentPress.processRelease = currentPress.longpressCallback( true, button ) && currentPress.processRelease;	//process its long-release (if needed)
			}
        	
        	if( currentPress.processRelease ){
        		currentPress.pressCallback( true, button );			//process its release, if long-release didn't eat it
        	}
        
            resetCurrentPress();								//button is now released, unschedule longpress, and start listening to its presses again
        }
        
	} else { /* keypress */
		if( currentPress.button != button ){			//if this button was not pressed yet,
			if( currentPress.button){								//force-release the previously pressed button (if any)
				doButton( currentPress.button, true );
			}
        	
        	currentPress.button = button; 							//update which button is pressed
        	currentPress.isLong = false;        							
        	currentPress.pressCallback = keybinds[currentPress.button];	//save what the CURRENT binds are, so they'll still run on release/longpress even if binds change
        	currentPress.longpressCallback = keybinds["long_" + currentPress.button];	

			currentPress.pressCallback( false, button );			//process new press
			
        	delayCall(												//schedule longpress
				function(){
					var currentPress = getCurrentPress();
					currentPress.isLong = true;
					
					currentPress.processRelease = currentPress.longpressCallback( false, currentPress.button ) && currentPress.processRelease;
				},
				400,
				"timer-longpress"
			);
        }
	}
	
	return 
}


//event: a keypress event
//isRelease: whether key was pressed (false) or released (true)
var keyboardHandler = function( event, isRelease ) {
	switch( event.which ){    	
		
        case 8:         //backspace 
            event.preventDefault();     //avoid "back" functionality
        case 27:        //esc
    	case 37:        //left
        case 65:        //a
        case 81:        //q
        case 97:        //num1
        case 100:       //num4
        case 103:       //num7
            return doButton("back", isRelease);
            break;
        
        
        case 38:        //up    	
        case 87:        //w
        case 104:       //num8
        case 105:       //num9    	
            return doButton("up", isRelease);
            break;
        
        case 13:        //enter
        case 32:        //space
            event.preventDefault();     //avoid "admin-button click" functionality
        case 39:        //right
        case 68:        //d
        case 69:        //e
        case 101:       //num5
        case 102:       //num6
            return doButton("ok", isRelease);
            break;
    	
        case 40:        //down
        case 83:        //s
        case 98:        //num2
        case 99:        //num3
           return doButton("down", isRelease);
           break;
    }    
}


//body (optional): the body we're binding keyboard to
var initBodyBinds = function( body ) {
    body = body || $("body");
    
    bindButtons(disabledBinds);	//initially, buttons do nothing when pressed
    
    initUnclickableBinds( $(".watchScreen > .statusBar") );		//make status bar cancel clicks on it
    
    //setup keyboard handlers
    body.keydown(function( event ) {
       keyboardHandler(event);
    });
    
    body.keyup(function( event ) {
       keyboardHandler(event, true);
    });    
    

    //setup left mouse button, movement handlers
    $("#watchScreen").mousedown(
    	function(event){
    		getKeybinds().mousedown(event);
    	}
    );
    $("#watchScreen").mousemove(
    	function(event){
    		getKeybinds().mousemove(event);
    	}
    );
    body.mouseup(
    	function(event){
    		getKeybinds().mouseup(event);
    	}
    );
    
    
    //setup middle/right mouse buttons, mousewheel handlers
    body.mousedown( function(event){
    	switch( event.which ){
			case 2:
        		doButton("ok");
				break;
				
			case 3:
				doButton("back");
				break;
				
		}    
    });
    body.mouseup( function(event){
		switch( event.which ){
			case 2:
				doButton("ok", true);
				break;
				
			case 3:
				doButton("back", true);
				break;    				
		}    
    });
   	body.bind('DOMMouseScroll', function(e){
		if(e.originalEvent.detail < 0) {
			doButton("up");
			doButton("up", true);
		}else {
			doButton("down");
			doButton("down", true);
		}
		
		//prevent page fom scrolling
		return false;
	});
    
    //prevent image-drag functionality
    body.on("dragstart", "img", function() { return false; } );
    
    //prevent context menu from appearing when rightclicking
	body.on("contextmenu", function(event){ if(event.which == 3 ) event.preventDefault(); } );
    
}


//shows floaty hint about currently moused-over iRave button
var showButtonHint = function( event, buttonName ){
	var hint = $("#buttonHint");
	if( hint.length == 0 ){
		hint = $("<img/>").attr("id","buttonHint").attr("src", "img/cursors/" + buttonName + ".svg" );
	}
	
	hint.css(
		{
			top: event.pageY - 6,
			left: event.pageX + 8,
		}
	);
	
	$("body").append( hint );
	
	$(".hand .clock").attr("src", "img/iRave-" + buttonName + ".png");
}

//shows floaty hint about moused-over iRave button
var hideButtonHint = function( event, buttonName ){
	$("#buttonHint").remove();
	
	$(".hand .clock").attr("src", "img/iRave.png");
}

var resetClockTick = function( ){
	var delayPerMinute = 15*1000; /* virtual minutes take 15 real seconds */
	
	delayCall(
		repeatFunc(
			function(){ incCurrentTime(1,0,0) },
			delayPerMinute,
			delayPerMinute, 
			"timer-clockTick"
		),
		delayPerMinute,
		"timer-clockTick"
	);
		
}

//option: the option we're enabling mouse bindings for
var initOptionBinds = function( option ){    
    option.mousedown(
        function(event) {
            if( 1 == event.which ){	//listen only to left-clicks
                var screenObject = option.data("screenObject");
                screenObject.data.selectedIndex = option.data("selectedIndex");
                
                updateMenuSelection( screenObject );
            }                    
        }
    );
}
//option: the unclickable option we're enabling mouse bindings for
var initUnclickableBinds = function( option ){    
    option.mousedown(
        function(event) {
            if( 1 == event.which ){	//listen only to left-clicks
                getClickMode().ignoreClicks = true;
            }                    
        }
    );
}
	
//binds the iRave and admin buttons
//body (optional): the body we're storing data in
var initButtonBinds = function( body ) {
	//find watch buttons
    body = body || $("body");
    var buttons = $(".watchButton");
    
    //start with no button currently pressed
 	resetCurrentPress();

    //setup hints on mouseover
	buttons.mouseover( function(event){
		showButtonHint( event, $(this).attr("name") );
	});
	buttons.mousemove( function(event){
		showButtonHint( event, $(this).attr("name") );
	});
	buttons.mouseout( hideButtonHint );


	//setup click binds
    buttons.mousedown(function(event){
		if(event.which == 1){
        	return doButton( $(this).attr("name"), false );
        }
    });
    
    buttons.mouseup(function(event){
		if(event.which == 1){
        	return doButton( $(this).attr("name"), true );
        }
    });
    
    
    //setup click binds for admin buttons
    $("#addMinute").click( function(){ 
    	incCurrentTime(1,0,0);
    });
    $("#addHour").click( function(){ 
    	incCurrentTime(0,1,0);
    });
    $("#addDay").click( function(){ 
    	incCurrentTime(0,0,1);
    });
    $("#nextEvent").click( function(){ 
    	var event = getInternalEvents()[0];
    	if( event ){
    		setCurrentTime(event.datetime);
    	} else {
    		nopeShake( $(this) );    		
    	}
    });
    $("#getSMS").click( function(){ 
    	var contacts = getSMSContacts();
    	var contactID = randomInt( 1, contacts.length - 1  );
    	
    	var contact = contacts[ contactID ];
    	var messageID = randomInt( 0, contact.elements.length - 1  );
    	var message = contact.elements[messageID];
    	
    	var sms = addSMS(contactID, false, true, getCurrentTime(), message.text, message.size);
    	
    	alertSMS( sms );
    });
    
}


if(false){	//2014 legacy stuff, left here for scavenging purposes
	
	//binds buttons to work with dynamic menus
	var bindButtonsDynamic = function(){
	    bindButton( $("button#up"), repeatFunc(dynamicSelectPrevious,400,115) );
	    bindButton( $("button#down"), repeatFunc(dynamicSelectNext,400,115) );
	    bindButton( $("button#ok"), dynamicRunSelected );
	    bindButton( $("button#back"), hideMenu );
	}
	
	//binds buttons to work with scrollable menus
	var bindButtonsScrollable = function(){
	    bindButton( $("button#up"), repeatFunc(scrollableSelectPrevious,400,115) );
	    bindButton( $("button#down"), repeatFunc(scrollableSelectNext,400,115) );
	    bindButton( $("button#ok"), scrollableAccept );
	    bindButton( $("button#back"), scrollableCancel );
	}

	
	/********************
	 *  Initialization  *
	 ********************/
	 
	//body (optional): the body we're storing data in
	var initButtonBinds = function( body ) {
	    body = body || $("body");
	    var buttons = $("button");
	    
	    bindButtonsNothing();                                       //buttons start bound as if nothing is shown
	    
	    buttons.mousedown(function(event){
	        event.stopPropagation();                                //button mousedowns shouldn't be detected by body, to avoid recursion
	
	        var button = $(this);
	        var oldButton = body.data("pressedButtonID");
	        if( oldButton != button.attr('id') ){                   //if this button wasn't pressed yet, 
	            cancelDelayedCall(body);                            //cancel any delayed calls queued by the previously pressed button
	            
	            body.data("pressedButtonID", button.attr('id') );   //then this button is now pressed
	            
	            debugPrint();                                       //clear debug output whenever this happens
	            
	            var callback = button.data("callback");
	            callback();                                         //get button's callback function, and run it.
	        }
	    });
	    
	    buttons.mouseup(function(event){
	        event.stopPropagation();                                //button mouseups shouldn't be detected by body, to avoid recursion
	
	        var button = $(this);
	        var oldButton = body.data("pressedButtonID");
	        if( oldButton == button.attr('id') ){                   //if this was the button that was last pressed, 
	            body.data("pressedButtonID", false);                //button is now released, start listening to its presses again
	            
	            delayCall( hideAllMenus, 10000 );                   //start timeout until menus auto-hide (this cancels any previous delayed call)
	        }
	    })
	}
}

