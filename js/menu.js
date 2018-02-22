

/**************************
 *  Status bar functions  *
 **************************/

//updates the status bar to show the given icon and text, along with the current time (optionally provided)
var updateStatusBarTitle = function( icon, text ){
	$("#statusBarLeft").html(
    	$("<div/>").addClass("iconContainer").append(
    		$("<img/>").addClass("icon").attr("src", "img/icons/" + icon )
    	)
    ).append(
    	$("<span/>").addClass("text").text(text)
    );

    updateStatusBarTime();
}

//updates the status bar to show the current time
var updateStatusBarTime = function(){
	$("#statusBarRight").html(
    	$("<span/>").addClass("text").text( getCurrentTime().toLocaleFormat("%H:%M") )
    )
}

/******************************
 *  Selection-related functions  *
 ******************************/

//Sets up menu internals to ready it for selection,
//and selects the correct option.
//  screenObject.data.selectedIndex: index of menu option to start selection on. (if -1: first non-disabled, or last disabled)
var initMenuSelection = function( screenObject ){
	var menu = screenObject.html;
	var options = menu.find(".option:not(.void)");	//ignore "void" options: those are never selectable

	menu.data("selection-minIndex", 0);
	menu.data("selection-maxIndex", options.length - 1);

	updateMenuSelection( screenObject );
}


// Selects the correct option in a menu.
//  screenObject.data.selectedIndex: index of menu option to start selection on. (if -1: first non-disabled, or last disabled)
var updateMenuSelection = function( screenObject ){
	var menu = screenObject.html;
	var options = menu.find(".option:not(.void)");	//ignore "void" options: those are never selectable

	switch( screenObject.data.selectedIndex ){
		case -1:					/* topmost non-disabled */
			var i=0;
			while( screenObject.data.selectedIndex == -1 &&  i < options.length ){
				var option = $( options[i] );
	
				if( !option.hasClass("disabled") ){
					screenObject.data.selectedIndex = i;
				};
	
				i++;
			}
	
			if( screenObject.data.selectedIndex == -1 ){
				screenObject.data.selectedIndex = options.length - 1;
			}
			break;
			
		case -2:					/* second option, as long as it's not the last */
			screenObject.data.selectedIndex = ( menu.data("selection-maxIndex") > 1 ? 1 : 0 );
			break;
			
		case -3:					/* third option at most */
			screenObject.data.selectedIndex = ( menu.data("selection-maxIndex") > 2 ? 2 : menu.data("selection-maxIndex") );
			break;
			
		case -4:					/* last option */
			screenObject.data.selectedIndex = menu.data("selection-maxIndex");
			break;

		case -5:					/* same as parent menu */
			screenObject.data.selectedIndex = belowTopScreen().data.selectedIndex;
			break;

		case -6:					/* same as parent menu's scroll position */
			screenObject.data.selectedIndex = Math.min( menu.data("selection-maxIndex"), belowTopScreen().data.scrollIndex );
			break;

	}

	
	//unselect whatever was already selected, then select the right thing, and run selectionCallback on it
	options.removeClass("selected");
	
	var selected =  getSelectedOption(screenObject);
	selected.addClass("selected");
	
	console.log(selected, screenObject);
	
	selected.data("selectionCallback")( selected );
}


//returns the jquery object for for the selected option in a given menu
// screenObject: the object representing the menu to find selected option in
// forceFind (optional): whether to always return SOME option, if none is selected
var getSelectedOption = function( screenObject, forceFind ){
	var menu = screenObject.html;
	var options = menu.find(".option:not(.void)");	//ignore "void" options: those are never selectable
	
	var index = screenObject.data.selectedIndex;
	if( index < 0 && forceFind ){
		index = 0;
	}
	
	return $( options[index] );
}

/******************************
 *  Scroll-related functions  *
 ******************************/

//Sets up menu internals to ready it for scrolling,
//and scrolls it to fit the correct option on screen.
//  screenObject.data.scrollIndex:   index of menu option to start scroll on. (if -1: uses selectedIndex)
//  screenObject.data.isAscending:   whether scroll is going up or down.
var initMenuScroll = function( screenObject ){
	var menu = screenObject.html;

	//create scrollable hints and add them to menu
	var hintUp = $("<div/>").addClass("scrollableHint").addClass("up");
	var hintDown = $("<div/>").addClass("scrollableHint").addClass("down");

	menu.addClass("scrollable").append(hintUp).append(hintDown);

	//calculate option/total heights
	var options = menu.find(".option");
	
	menu.data("scroll-minIndex", 0);
	menu.data("scroll-maxIndex", options.length - 1);

	var totalHeight = 0;
	options.each(
		function(currIndex)
		{
			var option = $(this);

			var height = 1;
			if( option.hasClass("double") ){
				height = 2;
			} else if( option.hasClass("triple") ){
				height = 3;
			} else if( option.hasClass("quadruple") ){
				height = 4;
			}

			option.data( "scroll-topY", totalHeight );
			option.data( "scroll-height", height );

			totalHeight += height;
		}
	);

	//calculate menu min/max scroll
	var minY = 0;
	var maxY = Math.max( 0, totalHeight-4 );

	screenObject.data.scrollMinY = minY;
	screenObject.data.scrollMaxY = maxY;

	//calculate ascending/descending scroll positions for each option
	options.each(
		function(currIndex){
			var option = $(this);

			var topY = option.data("scroll-topY");
			var height = option.data("scroll-height");

			var ascendingY;
			var descendingY;
			if( height == 4 ){
				ascendingY = topY;
				descendingY = topY;
			} else {
				ascendingY = topY - 1;
				descendingY = topY - 3 + height;
			}

			ascendingY = Math.max( minY, Math.min(maxY, ascendingY) );
			descendingY = Math.max( minY, Math.min(maxY, descendingY) );

			option.data( "scroll-ascendingY", ascendingY );
			option.data( "scroll-descendingY", descendingY );
		}
	);

	//move scroll to starting position
	screenObject.data.scrollDuration = 0;
	updateMenuScroll( screenObject );
}

//Scrolls the given menu object's view to the correct option on screen.
//  screenObject.data.scrollIndex:   index of menu option to start scroll on. (if -1: uses selectedIndex)
//  screenObject.data.isAscending:   whether scroll is going up or down.
var updateMenuScroll = function( screenObject ){
	var menu = screenObject.html;

	var autoScrolling = false;
	switch( screenObject.data.scrollIndex ){
		case -1:					/* same scroll as selection, or topmost option if none */
			screenObject.data.scrollIndex = Math.max( menu.data("scroll-minIndex"), screenObject.data.selectedIndex );
			autoScrolling = true;
			break;
			
		case -4:					/* scroll to bottom */
			screenObject.data.scrollIndex = menu.data("scroll-maxIndex");
			autoScrolling = true;
			break;
			
		case -5:					/* same scroll as parent menu */
			var parentScreen = belowTopScreen();
			screenObject.data.scrollIndex = parentScreen.data.scrollIndex;
			screenObject.data.isAscending = parentScreen.data.isAscending;
			break;
	}

	//get correct scroll amount
	option = $( menu.find(".option")[screenObject.data.scrollIndex] );

	//manual tweak: autoscroll shows the wrong side when it lands on a triple option
	if( autoScrolling && option.data( "scroll-height" ) == 3 ){
		screenObject.data.isAscending = !screenObject.data.isAscending
	}

	var scrollY = getScrollY(screenObject, option);


	//update menu scroll position
	menu.finish().transition(
		{ y: "-" + (3.5*scrollY) + "rem" },
		screenObject.data.scrollDuration,
		"out"
	);
	menu.find(".scrollableHint").finish().transition(
		{ y: (3.5*scrollY) + "rem"},
		screenObject.data.scrollDuration,
		"out"
	);

	//update scrollable hints
	var minY = screenObject.data.scrollMinY;
	var maxY = screenObject.data.scrollMaxY;


	if( scrollY == minY ){
		menu.find(".scrollableHint.up").addClass("hidden");
	} else {
		menu.find(".scrollableHint.up").removeClass("hidden");
	}

	if( scrollY == maxY ){
		menu.find(".scrollableHint.down").addClass("hidden");
	} else {
		menu.find(".scrollableHint.down").removeClass("hidden");
	}
	
	//call scrollCallback for this screen
	screenObject.scrollCallback( screenObject );
}


//returns the current scrollY for the given screen
//screenObject: the screen for which we want the current scroll
//option (optional): the option at which the scroll is currently positioned
var getScrollY = function( screenObject, option ){	
	option = option || $( getScreenHTML(screenObject).find(".option")[screenObject.data.scrollIndex] );
	
	if( screenObject.data.isAscending ){
		return option.data( "scroll-ascendingY");
	} else {
		return option.data( "scroll-descendingY");
	}
}

/********************************
 *  Selection callback functions *
 *******************************/

//returns a FUNCTION that updates the given screenObject's scroll to match the current menu's
var matchScrollFunc = function( screenObject ){
	return function( currScreen ){
		screenObject.data.scrollIndex = currScreen.data.scrollIndex;
		screenObject.data.isAscending = currScreen.data.isAscending;
	}
}

//returns a FUNCTION that updates the given screenObject's selection to match the current menu's
var matchSelectionFunc = function( screenObject ){
	return function( option ){
		var currScreen = option.data("screenObject");
		
		screenObject.data.selectedIndex = currScreen.data.selectedIndex;
	}
}

//returns a FUNCTION that sets up the menu action to do a "nope" shake
var prepareNopeFunc  = function( ){
	return function( option ){
		var screenObject = option.data("screenObject");
		
		screenObject.actionType = null;
	}
}

//returns a FUNCTION that sets up the menu action to run a given callback
//runCallback: the function to run when "ok" is pressed. (expects option as its argument)
//previewCallback (optional): function to run to preview changes to option before actually affecting database. (expects copyOption, originalOption as its arguments)
//  NOTE: if previewCallback returns true, operation will be aborted, and a "nope" animation will play
var prepareCallbackOptionFunc  = function( runCallback, previewCallback ){
	previewCallback = previewCallback || function(){};
	
	return function( option ){
		var screenObject = option.data("screenObject");
		
		screenObject.actionType = "option";
		screenObject.actionParams = option;
		screenObject.runCallback = runCallback;
		screenObject.previewCallback = previewCallback;
	}
}

//returns a FUNCTION that sets up the menu action to open a submenu
// paramName (optional): name of parameter where the submenu parameters are stored ("submenuParams" by default)
var prepareSubmenuOptionFunc  = function( paramName ){
	return function( option ){
		var screenObject = option.data("screenObject");
		
		screenObject.actionType = "screen";
		screenObject.actionParams = option.data( paramName || "submenuParams");
	}
}


//returns a FUNCTION that sets up the menu action to open a submenu, but only if the option being run is not disabled
// paramName (optional): name of parameter where the submenu parameters are stored
var prepareConditionalSubmenuOptionFunc = function( paramName ){
	return function( option ){		
		if( option.hasClass("disabled") ){
			prepareNopeFunc()( option );
			
		} else {
			prepareSubmenuOptionFunc(paramName)( option );
		}
	}
}


/***************************
 *  Run callback functions *
 ***************************/

// returns a FUNCTION that opens a submenu
// paramName (optional): name of parameter where the submenuParameters are stored
var runSubmenuOptionFunc = function( paramName ){
	return function( option ){
		var submenuParams = option.data( paramName || "submenuParams");
		var submenuObject = newScreen( submenuParams );
					
		enterScreen( submenuObject, (submenuObject.isPopup ? null : option) );
	}
}



// returns a FUNCTION that opens a submenu, but only if the option being run is not disabled
// paramName (optional): name of parameter where the submenuParameters are stored
var runConditionalSubmenuOptionFunc = function( paramName ){
	return function( option ){
		if( option.hasClass("disabled") ){
			nopeShake( option );
		} else {
			runSubmenuOptionFunc(paramName)( option );
		}
	}
}


/******************************
 *  Option-related functions  *
 ******************************/

//updates all options that have an appropriate callback in the given menu
var updateMenuOptions = function( screenObject ){
 	screenObject.html.find(".option").each(
 		function(){
 			var option = $(this);
 			updateOption( option );
 		}
 	);

 	//updateStatusBarTime();
}

//updates a menu option
var updateOption = function( option ){
	option.data("updateCallback")( option );
}


//updates a menu option, by animating a transition
//option: the option to animate
//finishedCallback (optional): function to call when animation completes
var animateOption = function( option, finishedCallback ){
    //disable buttons while we animate, buffering the last input
	startBufferingButtons();
	
	var screenObject = option.data("screenObject")

	var copyMenu = getScreenHTML( screenObject ).clone().addClass("noMouse");
    var copyOption = copyMenu.find(".selected");

    var abort = screenObject.previewCallback( copyOption, option );
	if(abort){
		copyMenu.remove();
		stopBufferingButtons();
		nopeShake(option);
		return;			//finishedCallback is NOT called
	}
	
	copyOption.transition( { x: "100%" }, 0);
    
    $("#mainArea").append(copyMenu);

    copyOption.transition( { x: "0" }, ANIMATION_TIME, "in-out" );
    option.transition(
    	{ x: "-100%" },
    	ANIMATION_TIME,
    	"in-out",
    	function(){
    		option.transition( { x: "0" }, 0 );
			copyMenu.remove();

			stopBufferingButtons();
			
			if( finishedCallback ){
				finishedCallback( option );
			}
    	}
    );
}

//Returns a FUNCTION that, given an option, adds or removes a css class to it, depending on whether a certain attribute of its subject is true
attributeUpdateFunc = function(attribute, cssClass, invert){
	return function(option){
		var hasAttribute = option.data("subject")[attribute];
		if( invert ){
			hasAttribute = !hasAttribute;
		}

		if( hasAttribute ){
			option.addClass(cssClass);
		} else {
			option.removeClass(cssClass);
		}
	}
}

//Returns a FUNCTION that, given an option, adds or removes a css class to it, depending on whether any/all of its elements have a given attribute
elementAttributeUpdateFunc = function(attribute, cssClass, requireAll){
	return function(option){
		var subject = option.data("subject");

		var found = countActiveElements( subject, attribute);
		if( requireAll ){
			found = (found == subject.elements.length)
		}

		if( found ){
			option.addClass(cssClass);
		} else {
			option.removeClass(cssClass);
		}
	}
}

//Returns a FUNCTION that, given an option, updates its icon's count with how many of of its subjects' elements have a given attribute
countUpdateFunc = function(attribute, showWhenZero){
	return function(option){
		var count = countActiveElements( option.data("subject"), attribute);
		if( !showWhenZero && count == 0 ){
			count = "";
		}

		option.find(".iconContainer .count").text( count );
	}
}


//screenObject: the menu object to add an option to
//paramsObj: object which describes the option being created
//  paramsObj.text: text to display for this option
//
//  paramsObj.icon (optional): an icon's filename
//  paramsObj.iconClass (optional): the class to give the icon (defaults to "icon")
//  paramsObj.count (optional): small text to appear by the icon's corner
//
//  paramsObj.cornerText (optional): small text to display in a rectangle, in the top-right corner
//  paramsObj.cornerIcon (optional): icon to appear next to corner text
//
//  paramsObj.subject (optional): the subject this option is associated with (usually a js object)

//  paramsObj.noSelect (optional): if true, clicking the option won't select it
//  paramsObj.updateCallback (optional): function to call when updating this option
//  paramsObj.selectionCallback (optional): function to run when option is selected
//  paramsObj.longpressCallback (optional): function to call when longpressing this option. If it returns true, normal release callback will also be processed on long-release.
//Returns the added option.
var addOption = function (screenObject, paramsObj) {
	var option = $("<div/>").addClass("option").data("screenObject", screenObject);		//html remembers who the MENU's screenObject is
    screenObject.html.append(option);

    option.data("selectedIndex", ++screenObject.data.selectedMax );	//remember our index for selection purposes

    //bind mousedowns
    if( !paramsObj.noSelect ){
    	initOptionBinds(option);
    }

    option.data("subject", paramsObj.subject );
    option.data("updateCallback", paramsObj.updateCallback || function(){} );
    option.data("selectionCallback", paramsObj.selectionCallback || prepareNopeFunc() );
	option.data("longpressCallback", paramsObj.longpressCallback || function(){ return true; } );	

    var part;

    //(optional) icon
    if ( paramsObj.hasOwnProperty("icon") ) {
    	part = $("<div/>").addClass("iconContainer");
		
		var iconClass = paramsObj.iconClass || "icon";
        part.append( $("<img/>").addClass(iconClass).attr("src", "img/icons/" + paramsObj.icon) );

        //(optional) count
	    if( paramsObj.hasOwnProperty("count") ){
	    	part.append( $("<span/>").addClass("count").text( paramsObj.count ) );
		}

        option.append(part);
    }

    //text
    part = $("<span/>").addClass("text").html( paramsObj.text );
    option.append(part);

    //(optional) corner
    if( paramsObj.hasOwnProperty("cornerText") ){
        part = $("<div/>").addClass("corner");

        //(optional) corner-icon
        if( paramsObj.hasOwnProperty("cornerIcon") ){
            part.append($("<img/>").addClass("icon").attr("src", "img/icons/" + paramsObj.cornerIcon));
        }

        part.append( $("<span/>").addClass("text").text( paramsObj.cornerText ) );
        option.append(part);
    }

    return option;
};


//Adds a void "option" of the specified height to a menu.
//Returns the added "option".
//screenObject: screen to add void option to
//height (optional): height of void option, default to 1
//allowClicks (optional): whether to allow clicking void to activate "ok", defaults to false
var addVoidOption = function (screenObject, height, allowClicks ) {
    var option = $("<div/>").addClass("option").addClass("void").data("screenObject", screenObject);		//html remembers who the MENU's screenObject is

	if( !allowClicks ){
    	initUnclickableBinds( option );
    }

    switch( height ){
    	case 2:
    		option.addClass("double");
    		break;

    	case 3:
    		option.addClass("triple");
    		break;

    	case 4:
    		option.addClass("quadruple");
    		break;
    }

	option.data("updateCallback",  function(){} ) ;
	option.data("longpressCallback", function(){ return true; } );

    screenObject.html.append(option);

    return option;
};


/***********************
 *  Core menu builders *
 ***********************/


//creates the HTML menu for the functionality choice (result is stored in screenObject.html)
var newHomeMenu = function (screenObject) {
    screenObject.html = $("<div/>").addClass("menu").data("screenObject", screenObject);	//html remembers who the screenObject is

	var option;

	option = addOption(screenObject,
		{
			icon: "message.svg",
			count: "",
			text: "SMS",

			updateCallback: function(option){
				var count = countTotalActiveSMS();
				if( count == 0 ){
					count = "";
				}

				option.find(".iconContainer .count").text( count );

				if( countTotalSMS() == 0 ){
					option.addClass("disabled");
				} else {
					option.removeClass("disabled");
				}
			},
			selectionCallback: prepareSubmenuOptionFunc(),
			//TODO: longpressCallback: runDeepSubmenuOption,
		}
	);
	option.data("submenuParams",
		{
			statusBarIcon: "message.svg",
			statusBarText: "SMS",
			newHTMLCallback: newSMSMenu,
			updateCallback: updateMenuOptions,
			data: {selectedIndex: -1},
		}
	);


	option = addOption(screenObject,
		{
			icon: "ticketWIP.svg",
			count: "",
			text: "Filas de<br>Espera",

			subject: {elements: getActivityActiveQueue()},
			updateCallback: countUpdateFunc("isActive"),
			selectionCallback: prepareSubmenuOptionFunc(),
			//TODO: longpressCallback: runDeepSubmenuOption,
		}
	);
	option.data("submenuParams",
		{
			statusBarIcon: "ticketWIP.svg",
			statusBarText: "Fila Espera",
			newHTMLCallback: newActivityMenu,
			updateCallback: updateMenuOptions,
			data: {selectedIndex: -2},
		}
	);

	option = addOption(screenObject,
		{
			icon: "musicNote.svg",
			count: "",
			text: "Cartaz de<br>Concertos",

			subject: {elements: getConcertActiveQueue()},
			updateCallback: countUpdateFunc("isActive"),
			selectionCallback: prepareSubmenuOptionFunc(),
			//TODO: longpressCallback: runDeepSubmenuOption,
		}
	);
	option.data("submenuParams",
		{
			statusBarIcon: "musicNote.svg",
			statusBarText: "Concertos",
			newHTMLCallback: newConcertMenu,
			updateCallback: updateMenuOptions,
			data: {selectedIndex: -2},
		}
	);


	option = addOption(screenObject,
		{
			icon: "help.svg",
			count: "",
			text: "Ajuda",
		}
	).addClass("disabled");

	updateMenuOptions(screenObject);
	initMenuSelection(screenObject);
	initMenuScroll(screenObject);
};

