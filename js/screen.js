// JavaScript file responsible for handling generic iRave screens


/************************************
* Screen stack management functions *
************************************/

var getScreenStack = function(){
	return $("body").data("ui-screenStack");
}

// creates an EMPTY screen stack, readying it for use
var initScreen = function(){
	$("body").data("ui-screenStack", new Array() );
}


// adds screen object to stack
var pushScreen = function( screenObject ){
	getScreenStack().push(screenObject);
}

//removes screen object from stack,
//returns removed object
var popScreen = function(){
	return getScreenStack().pop();
}

//returns screen object on top of stack
var topScreen = function(){
	return getScreenStack().top();
}

//returns screen object BELOW the top of the stack
//depth (optional): how many levels below top to peek (defaults to 1)
var belowTopScreen = function(depth){
	return getScreenStack().belowTop(depth);
}


/******************************
* Screen transition functions *
*******************************/

//adds a given screen to the stack, and shows it, animating/kybinding as necessary
//screenObject: the screen to enter
//option (optional): the option that caused the screen to be entered
//isInstant (optional): skips animation and instantly shows when true
//isReplacement (optional): whether to pop previous top screen before pushing new one
var enterScreen = function ( screenObject, option, isInstant, isReplacement ){
	
	//disable buttons while we animate, buffering the last input
	if( !isInstant ){
		startBufferingButtons();
	}
        
	var oldTopScreen = topScreen();
	
	if( oldTopScreen ){
		oldTopScreen.leaveCallback( oldTopScreen );
		
		if( isReplacement ){
			popScreen();
		}
	}
	
	pushScreen( screenObject );
	
	//show new screen sliding on top of old one
    var menu = getScreenHTML( topScreen() );
    menu.transition( { x: "100%" }, 0 );
    
    $("#mainArea").append(menu);
    
    if(option && !isInstant){
    	option.transition( { x: "-100%" }, ANIMATION_TIME, "in-out");
    }
    
    menu.transition(
    	{ x: "0" },
    	(isInstant ? 0 : ANIMATION_TIME),
    	"in-out",
    	function(){
			if( oldTopScreen ){
				delScreenHTML( oldTopScreen );
			}
			
    		showScreenStatusBar( topScreen() );
    		
    		if( !isInstant ){
				stopBufferingButtons();
			}
		}
    );
}


//removes a given screen from the stack, shows the one below it, animating/kybinding as necessary
//depth (optional) how many screens to leave at once. Defaults to 1.
//direction (optional): 1 to animate from left to right (the default), -1 to animate from right to left 
//isInstant (optional): skips animation and instantly shows when true
var leaveScreen = function (depth, direction, isInstant){
	direction = direction || 1 ;
	depth = depth || 1;
	depth = Math.min( depth, getScreenStack().length - 1 ); //prevent leaving the topmost screen
	
	var oldTopScreen = topScreen();	//remember which screen was on top	
	var oldHTML = getScreenHTML( oldTopScreen );
	
	if( depth == 0){	//avoid unnecessary work if we can'd do anything, anyway
		nopeShake( oldHTML );		
		return;
	}
	

    //disable buttons while we animate, buffering the last input
    if( !isInstant ){
    	startBufferingButtons();
    }
	
	oldTopScreen.leaveCallback( oldTopScreen );
	
	while( depth > 0 ){
		//remove topmost menu from stack
		popScreen();
		depth--;
	}	

	//show new top menu underneath the old one
    var menu = getScreenHTML( topScreen() );		
    $("#mainArea").prepend(menu);
    
    var option = oldTopScreen.isPopup || getSelectedOption(topScreen());
    if( option.length && !isInstant ){
    	option.transition( { x: (-100 * direction) + "%" }, 0);
    	option.transition( { x: "0" }, ANIMATION_TIME, "in-out");
    }
    
    //animate old top screen away, update status bar and keybinds when done
    oldHTML.transition(
    	{ x: (100 * direction) + "%" },
    	(isInstant ? 0 : ANIMATION_TIME),
    	"in-out",
    	function(){
    		delScreenHTML(oldTopScreen);
    		showScreenStatusBar( topScreen() );
    		
    		if( !isInstant ){
    			stopBufferingButtons();
    		}
    	}
    );
}



/******************************
* Screen generation functions *
******************************/

//returns HTML associated with screen object, generating it if necessary
var getScreenHTML = function( screenObject ){
	if( !screenObject.html ){
		screenObject.newHTMLCallback( screenObject );
	}
	
	return screenObject.html;
}

//destroys HTML associated with screen object
var delScreenHTML = function( screenObject ){
	if( screenObject.html ){
		screenObject.data.selectedMax = -1;
		screenObject.html.remove();
		screenObject.html = null;
	}
}

//updates the given screen object's HTML with any changes that happened since last update
var updateScreen = function( screenObject ){
	if(!screenObject) return;
	
	screenObject.updateCallback( screenObject );	
	updateScreenStatusBar( screenObject );
}

//shows the statusbar associated with the given screen object
var showScreenStatusBar = function( screenObject ){	
	if(!screenObject) return;
	
	if( screenObject.statusBarText && screenObject.statusBarIcon ){
		updateStatusBarTitle(
			screenObject.statusBarIcon,
			screenObject.statusBarText
		);
	} else {
		updateClockStatusBar( );
	}
}

//updates the statusbar for this object with any changes that happened since last update 
var updateScreenStatusBar = function( screenObject ){
	if(!screenObject) return;
	
	if( screenObject.statusBarText && screenObject.statusBarIcon ){
		updateStatusBarTime();
	} else {
		updateClockStatusBar();
	}
}


//creates a new screen object
//paramsObj.newHTMLCallback: function that takes a screenObject, creates HTML for it
//
//paramsObj.statusBarIcon (optional): icon to place in status bar
//paramsObj.statusBarText (optional): text to place in status bar
//
//paramsObj.updateCallback (optional): function that takes a screenObject, updates its HTML with recent changes
//paramsObj.leaveCallback (optional): function that will be called whenever the screenObject ceases to be on top of stack
//paramsObj.scrollCallback (optional): function to run whenever the screenObject's scroll is updated
//
//paramsObj.isSplashScreen (optional): if true, and actionType is "screen", child menu's cursor position will depend on which key was pressed
//paramsObj.isPopup (optional): if true, previously selected option won't animate when backing out of this screen
//paramsObj.actionType (optional): type of action to perform on "ok"
//									null: the nope action (default),
//									"screen": push a screen onto stack
//									"replace screen": pop self out of stack, push a screen onto stack
//									"option": run a given callback function, after an option preview animation
//									"back": close current screen
//paramsObj.actionParams (optional): parameters for next screen object, when actionType is "screen", or to pass to callback function, when action type is "runCallback" or "option"
//paramsObj.runCallback (optional): function to run, when actionType is "option"
//paramsObj.previewCallback (optional): function to preview changes before actually making them, when actionType is "option"
//
//paramsObj.keybinds (optional): object that specifies what each button should do, for this screen
//paramsObj.data (optional): information to store in screenObject.data
//  the following additional fields will be created, if not provided:
//    data.selectedIndex (optional): index of menu option to start selection on. (defaults to -1: first non-disabled, or last disabled)
//    data.scrollIndex (optional):   index of menu option to start scroll on. (defaults to -1: selectedIndex)
//    data.isAscending (optional):   whether scroll is going up or down. (Defaults to true: up)
var newScreen = function (paramsObject) {
	
	//default values for arguments
	var defaults = {
		data: {},
		
		updateCallback: function(paramsObject){},
		leaveCallback: function(paramsObject){},
		scrollCallback: function(paramsObject){},
		
		isSplashScreen: false,
		isPopup: false,
		actionType: null,
		actionParams: {},
		runCallback: nopeShake,
		previewCallback: function(){},
		
		keybinds: menuSelectBinds,
		html: null,
	};
	
	var dataDefaults = {
		selectedMax: -1,
		selectedIndex: -1,
		scrollMinY: 0,
		scrollMaxY: 0,
		scrollIndex: -1,
		scrollDuration: 0,
		isAscending: true,
	};
	
	
	//copy first level of data into new screenObject, so original paramsObj and paramsObj.data aren't modified later
	var screenObject = jQuery.extend( defaults, paramsObject );
	screenObject.data =  jQuery.extend( dataDefaults, paramsObject.data );
	
	
	//return newly created copy
	return screenObject;
}
