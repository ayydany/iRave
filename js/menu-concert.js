

/***************************
 *  Run callback functions *
 ***************************/

// toggles subscription of the concert the given option is about
// option: the option that we're trying to run.
var runConcertOption = function( option ){
	var concert = option.data("subject");
	
	if( concert.isActive ){
		unsubscribeConcert( concert );
	} else {
		subscribeConcert( concert );
	}
	
	updateOption( option );
}

//previews changes to a concert option, before actually performing them
// copyOption: the option to perform changes on
// originalOption: the option to read data from
// NOTE: returns true if operation should be aborted
var previewConcertOption = function ( copyOption, originalOption ){
	var concert = originalOption.data("subject");
	var cornerText = copyOption.find(".corner .text");
	
	if( concert.isExpired ){
		return true;	//abort!
		
	} else if( concert.isActive ){
		copyOption.removeClass("active");
		
	} else {
		copyOption.addClass("active");
	}
}


//previews changes to an concert unwatch-option (as seen in alert submenu), before actually performing them
// copyOption: the option to perform changes on
// originalOption: the option to read data from
// NOTE: returns true if operation should be aborted
var previewUnwatchConcertOption = function ( copyOption, originalOption ){
	var concert = originalOption.data("subject");
	var cornerText = copyOption.find(".corner .text");
	var icon = copyOption.find(".iconContainer .icon");
	var text = copyOption.children(".text");
	
	if( concert.isExpired ){
		return true;	//abort!
		
	} else if( concert.isActive ){
		icon.attr("src", "img/icons/cartaz/eye.svg");
		text.html( "Subscrever" );
		copyOption.removeClass("active");
		
	} else {
		icon.attr("src", "img/icons/cartaz/crossedEye.svg");		
		text.html( "Anular<br>Subscrição" );
		copyOption.addClass("active");
	}
}


/******************************
 *  Option-related functions  *
 ******************************/

//Returns a FUNCTION that, given an option, updates its icons to match the correct day
dayIconUpdateFunc = function(datetime){
	return function(option){
		option.find(".iconContainer > .icon").attr("src", "img/icons/" + getDateIcon(datetime) );
	}
}

//Returns a FUNCTION that, given an option, updates its icon and text to match the unwatch/rewatch actions
unwatchConcertUpdateFunc = function(){
	return function(option){
		var subject = option.data("subject");
		var text = option.children(".text");
		var icon = option.find(".iconContainer .icon");

		if(subject.isActive){
			text.html( "Anular<br>Subscrição" );
			icon.attr("src", "img/icons/cartaz/crossedEye.svg");
		}
		else {
			text.html( "Subscrever" );
			icon.attr("src", "img/icons/cartaz/eye.svg");
		}
	}
}


//screenObject: the menu object to add an option to
//paramsObj: object which describes the option being created
//  paramsObj.corner (optional): small text to display in a rectangle, in the top-right corner
//  paramsObj.cornerIcon (optional): icon to appear next to each active line (not in the corner itself)
//
//  paramsObj.subject: the subject this option is associated with (a js object with a .elements array in it)
//Returns the added option.
var addMultiConcertOption = function (screenObject, paramsObj) {
	var option = $("<div/>").addClass("option").addClass("multiConcert").data("screenObject", screenObject);		//html remembers who the MENU's screenObject is
    screenObject.html.append(option);

    //bind mousedowns
    initOptionBinds(option);

    option.data("selectedIndex", ++screenObject.data.selectedMax );	//remember our index for selection purposes
    option.data("subject", paramsObj.subject );
    option.data("updateCallback",
    	composition(
			elementAttributeUpdateFunc("isActive", "active"),
			elementAttributeUpdateFunc("isExpired", "disabled", true),

	    	function( option ){
	    		var concertContainers = option.find(".concertContainer");

	    		var i;
	    		for( i=0; i < concertContainers.length; i++ ){
	    			var container = $( concertContainers[i] );
	    			updateOption( container );
	    		}
	    	}
	    )
    );
    option.data("selectionCallback", prepareSubmenuOptionFunc() );	
	option.data("longpressCallback", paramsObj.longpressCallback || function(){ return true; } );

    var part;
    var concerts = paramsObj.subject.elements;

	var i;
	for( i=0; i < concerts.length; i++ ){
		var concert = concerts[i];

		part = $("<div/>").addClass("concertContainer");

		//icon
		part.append(
			$("<div/>").addClass("iconContainer").append(
				$("<img/>").addClass("icon").attr("src", "img/icons/" + getConcertStages()[concert.stageID].icon)
			)
		);

		//text
	    part.append( $("<span/>").addClass("text").html(concert.band.shortName) );

        //(optional) "corner"-icon
        if( paramsObj.hasOwnProperty("cornerIcon") ){
            part.append(
            	$("<img/>").addClass("icon").addClass("subscribed").attr("src", "img/icons/" + paramsObj.cornerIcon)
            );
        }

		part.data("subject", concert);
		part.data("updateCallback", attributeUpdateFunc("isActive", "active") );

		option.append( part );
	}

    //(optional) corner
    if( paramsObj.hasOwnProperty("cornerText") ){
        part = $("<div/>").addClass("corner");

        part.append( $("<span/>").addClass("text").text( paramsObj.cornerText ) );
        option.append(part);
    }

    return option;
};



/**********************************
 *  Concert-related menu builders *
 *********************************/

//creates the HTML menu for the root of the concerts functionality (result is stored in screenObject.html)
var newConcertMenu = function (screenObject) {
    screenObject.html = $("<div/>").addClass("menu").data("screenObject", screenObject);	//html remembers who the screenObject is

	var option;

	option = addOption(screenObject,
		{
			icon: "musicNote.svg",
			count: "",
			text: "Subscrições<br>Activas",

			subject: {elements: getConcertActiveQueue()},
			updateCallback: composition(
				countUpdateFunc("isActive", true),
				elementAttributeUpdateFunc("isExpired", "disabled", true)
			),
			selectionCallback: prepareConditionalSubmenuOptionFunc(),
		}
	);
	option.data("submenuParams",
		{
			statusBarIcon: "musicNote.svg",
			statusBarText: "Subscrições",
			newHTMLCallback: newConcertActiveQueueMenu,
			updateCallback: updateMenuOptions,
		}
	);


	option = addOption(screenObject,
		{
			icon: "cartaz/calendarBase.svg",
			text: "Actuações<br>por Dia",
			selectionCallback: prepareSubmenuOptionFunc(),
		}
	);
	option.data("submenuParams",
		{
			statusBarIcon: "musicNote.svg",
			statusBarText: "Por Dia",
			newHTMLCallback: newConcertDaysMenu,
			updateCallback: updateMenuOptions,
		}
	);


	option = addOption(screenObject,
		{
			icon: "cartaz/local.svg",
			text: "Actuações<br>por Palco",
			selectionCallback: prepareSubmenuOptionFunc(),
		}
	);
	option.data("submenuParams",
		{
			statusBarIcon: "musicNote.svg",
			statusBarText: "Por Palco",
			newHTMLCallback: newConcertStagesMenu,
			updateCallback: updateMenuOptions,
			data: {selectedIndex: -2},
		}
	);


	addVoidOption( screenObject, 1 );

	updateMenuOptions(screenObject);
	initMenuSelection(screenObject);
	initMenuScroll(screenObject);
};


//creates the HTML menu for the currently active concerts (result is stored in screenObject.html)
var newConcertActiveQueueMenu = function (screenObject) {
    screenObject.html = $("<div/>").addClass("menu").data("screenObject", screenObject);	//html remembers who the screenObject is

	var concerts = getConcertActiveQueue();
	var i;
	var option;
	var totalHeight = 0;
	for( i=0; i < concerts.length; i++ ){
		var concert = concerts[i];

		option = addOption(screenObject,
			{
				icon: getDateIcon(concert.datetime),
				text: concert.band.name,
				cornerIcon: "cartaz/eye.svg",
				cornerText: concert.datetime.toLocaleFormat("%H:%M"),

				subject: concert,
				updateCallback: composition(
					attributeUpdateFunc("isActive", "active"),
					attributeUpdateFunc("isExpired", "disabled")
				),
				selectionCallback: prepareCallbackOptionFunc( runConcertOption, previewConcertOption ),
				longpressCallback: runSubmenuOptionFunc(),
			}
		);
		option.data("submenuParams",
			{
				statusBarIcon: "musicNote.svg",
				statusBarText: concert.band.shortName,
				newHTMLCallback: newConcertBandMenu,
				updateCallback: updateMenuOptions,
				keybinds: menuScrollBinds,
				isPopup: true,
				//actionType: "back",
				data: {band: concert.band},
			}
		);

		totalHeight++;
    }

	if( totalHeight == 0 ){
		addOption( screenObject, {text:"Não há actuações"} ).addClass("unselectable");
		totalHeight++;
	}

	if( totalHeight < 4 ){
		addVoidOption( screenObject, 4 - totalHeight );
	}

	updateMenuOptions(screenObject);
	initMenuSelection(screenObject);
	initMenuScroll(screenObject);
};


//creates the HTML menu for the list of concert stages (result is stored in screenObject.html)
var newConcertStagesMenu = function (screenObject) {
	screenObject.html = $("<div/>").addClass("menu").data("screenObject", screenObject);	//html remembers who the screenObject is

	var stages = getConcertStages();
	var numStages = stages.length;
	var i;
	var option;
	var totalHeight = 0;
	for( i=0; i < numStages; i++ ){
		var stage = stages[i];

		option = addOption( screenObject,
			{
				icon: stage.icon,
				count: "",
				text: stage.name,

				subject: stage,
				updateCallback: composition(
					countUpdateFunc("isActive"),
					elementAttributeUpdateFunc("isExpired", "disabled", true)
				),
				selectionCallback: prepareSubmenuOptionFunc(),
			}
		);
		option.data("submenuParams",
			{
				statusBarIcon: "musicNote.svg",
				statusBarText: stage.name,
				newHTMLCallback: newConcertStageMenu,
				updateCallback: updateMenuOptions,
				data: {stageID: i},
			}
		);

		totalHeight++;
    }

	if( totalHeight == 0 ){
		addOption( screenObject, {text:"Não há palcos"} ).addClass("unselectable");
		totalHeight++;
	}

	if( totalHeight < 4 ){
		addVoidOption( screenObject, 4 - totalHeight );
	}

	updateMenuOptions(screenObject);
	initMenuSelection(screenObject);
	initMenuScroll(screenObject);
};


//creates the HTML menu for a given stage's concerts (result is stored in screenObject.html)
//  screenObject.data.stageID: the ID of the current stage
var newConcertStageMenu = function (screenObject) {
    screenObject.html = $("<div/>").addClass("menu").data("screenObject", screenObject);	//html remembers who the screenObject is


	var stageID = screenObject.data.stageID;
	var stage = getConcertStages()[stageID];

	var concerts = stage.elements;
	var i;
	var option;
	var totalHeight = 0;
	for( i=0; i < concerts.length; i++ ){
		var concert = concerts[i];

		option = addOption(screenObject,
			{
				icon: "",
				text: concert.band.name,
				cornerIcon: "cartaz/eye.svg",
				cornerText: concert.datetime.toLocaleFormat("%H:%M"),

				subject: concert,
				updateCallback: composition(
					attributeUpdateFunc("isActive", "active"),
					attributeUpdateFunc("isExpired", "disabled"),
					dayIconUpdateFunc( concert.datetime )
				),
				selectionCallback: prepareCallbackOptionFunc( runConcertOption, previewConcertOption ),
				longpressCallback: runSubmenuOptionFunc(),
			}
		);
		option.data("submenuParams",
			{
				statusBarIcon: "musicNote.svg",
				statusBarText: concert.band.shortName,
				newHTMLCallback: newConcertBandMenu,
				updateCallback: updateMenuOptions,
				keybinds: menuScrollBinds,
				isPopup: true,
				//actionType: "back",
				data: {band: concert.band},
			}
		);

		totalHeight++;
    }

	if( totalHeight == 0 ){
		addOption( screenObject, {text:"Não há actuações"} ).addClass("unselectable");
		totalHeight++;
	}

	if( totalHeight < 4 ){
		addVoidOption( screenObject, 4 - totalHeight );
	}

	updateMenuOptions(screenObject);
	initMenuSelection(screenObject);
	initMenuScroll(screenObject);
};


//creates the HTML menu for the list of concert days (result is stored in screenObject.html)
var newConcertDaysMenu = function (screenObject) {
	screenObject.html = $("<div/>").addClass("menu").data("screenObject", screenObject);	//html remembers who the screenObject is

	var days = getConcertDays();
	var numDays = days.length;
	var i;
	var option;
	var totalHeight = 0;
	for( i=0; i < numDays; i++ ){
		var day = days[i];

		option = addOption( screenObject,
			{
				icon: "",
				count: "",
				text: getDateShortString( day.datetime ),

				subject: day,
				updateCallback: composition(
					countUpdateFunc("isActive"),
					elementAttributeUpdateFunc("isExpired", "disabled", true),
					dayIconUpdateFunc( day.datetime )
				),
				selectionCallback: prepareSubmenuOptionFunc(),
			}
		);
		option.data("submenuParams",
			{
				statusBarIcon: "musicNote.svg",
				statusBarText:  getDateString( day.datetime ),
				newHTMLCallback: newConcertDayMenu,
				updateCallback: updateMenuOptions,
				data: {dayID: i},
			}
		);

		totalHeight++;
    }

	if( totalHeight == 0 ){
		addOption( screenObject, {text:"Não há dias"} ).addClass("unselectable");
		totalHeight++;
	}

	if( totalHeight < 4 ){
		addVoidOption( screenObject, 4 - totalHeight );
	}

	updateMenuOptions(screenObject);
	initMenuSelection(screenObject);
	initMenuScroll(screenObject);
};


//creates the HTML menu for a given day's concerts (result is stored in screenObject.html)
//  screenObject.data.dayID: the ID of the current day
var newConcertDayMenu = function (screenObject) {
    screenObject.html = $("<div/>").addClass("menu").data("screenObject", screenObject);	//html remembers who the screenObject is


	var dayID = screenObject.data.dayID;
	var day = getConcertDays()[dayID];

	var concerts = day.elements;
	var i;
	var option;
	var totalHeight = 0;
	for( i=0; i < concerts.length; i++ ){
		var concert = concerts[i];

		var datetime = concert.datetime;
		var simultaneousConcerts = [ concert ];

		var j;
		for( j=i+1; j < concerts.length; j++ ){
			var nextConcert = concerts[j];
			if( nextConcert.datetime <= concert.datetime ){
				simultaneousConcerts.push(nextConcert);
				i++;
			}
		}

		if( simultaneousConcerts.length == 1 ){
			option = addOption(screenObject,
				{
					icon: getConcertStages()[concert.stageID].icon,
					text: concert.band.name,
					cornerIcon: "cartaz/eye.svg",
					cornerText: concert.datetime.toLocaleFormat("%H:%M"),

					subject: concert,
					updateCallback: composition(
						attributeUpdateFunc("isActive", "active"),
						attributeUpdateFunc("isExpired", "disabled")
					),
					selectionCallback: prepareCallbackOptionFunc( runConcertOption, previewConcertOption ),
					longpressCallback: runSubmenuOptionFunc(),
				}
			);
			option.data("submenuParams",
				{
					statusBarIcon: "musicNote.svg",
					statusBarText: concert.band.shortName,
					newHTMLCallback: newConcertBandMenu,
					updateCallback: updateMenuOptions,
					keybinds: menuScrollBinds,
					isPopup: true,
					//actionType: "back",
					data: {band: concert.band},
				}
			);
		totalHeight++;
		} else {
			option = addMultiConcertOption(screenObject,
				{
					cornerIcon: "cartaz/eye.svg",
					cornerText: concert.datetime.toLocaleFormat("%H:%M"),

					subject: { elements:simultaneousConcerts },
					selectionCallback: prepareSubmenuOptionFunc(),
				}
			);
			option.data("submenuParams",
				{
					statusBarIcon: "musicNote.svg",
					statusBarText:  getDateString( day.datetime ),
					newHTMLCallback: newConcertHourMenu,
					updateCallback: updateMenuOptions,
					data: {
						elements: simultaneousConcerts,
						selectedIndex: -2,
					},
				}
			);

			if( simultaneousConcerts.length == 4 ){
				option.addClass("triple");
				totalHeight += 3;
			} else {
				option.addClass("double");
				totalHeight += 2;
			}
		}
    }

	if( totalHeight == 0 ){
		addOption( screenObject, {text:"Não há actuações"} ).addClass("unselectable");
		totalHeight++;
	}

	if( totalHeight < 4 ){
		addVoidOption( screenObject, 4 - totalHeight );
	}

	updateMenuOptions(screenObject);
	initMenuSelection(screenObject);
	initMenuScroll(screenObject);
};


//creates the HTML menu for a given hour's concerts (result is stored in screenObject.html)
//  screenObject.data.elements: array of concerts in the current hour
var newConcertHourMenu = function (screenObject) {
    screenObject.html = $("<div/>").addClass("menu").data("screenObject", screenObject);	//html remembers who the screenObject is

    var concerts = screenObject.data.elements;
	var i;
	var option;
	var totalHeight = 0;
	for( i=0; i < concerts.length; i++ ){
		var concert = concerts[i];

		option = addOption(screenObject,
			{
				icon: getConcertStages()[concert.stageID].icon,
				text: concert.band.name,
				cornerIcon: "cartaz/eye.svg",
				cornerText: concert.datetime.toLocaleFormat("%H:%M"),

				subject: concert,
				updateCallback: composition(
					attributeUpdateFunc("isActive", "active"),
					attributeUpdateFunc("isExpired", "disabled")
				),
				selectionCallback: prepareCallbackOptionFunc( runConcertOption, previewConcertOption ),
				longpressCallback: runSubmenuOptionFunc(),
			}
		);
		option.data("submenuParams",
			{
				statusBarIcon: "musicNote.svg",
				statusBarText: concert.band.shortName,
				newHTMLCallback: newConcertBandMenu,
				updateCallback: updateMenuOptions,
				keybinds: menuScrollBinds,
				isPopup: true,
				//actionType: "back",
				data: {band: concert.band},
			}
		);

		totalHeight++;
    }

	if( totalHeight == 0 ){
		addOption( screenObject, {text:"Não há actuações"} ).addClass("unselectable");
		totalHeight++;
	}

	if( totalHeight < 4 ){
		addVoidOption( screenObject, 4 - totalHeight );
	}

	updateMenuOptions(screenObject);
	initMenuSelection(screenObject);
	initMenuScroll(screenObject);
};


//creates the HTML menu for the alert-submenu for a given concert (result is stored in screenObject.html)
var newConcertAlertMenu = function (screenObject) {
    screenObject.html = $("<div/>").addClass("menu").data("screenObject", screenObject);	//html remembers who the screenObject is

	var option;
	var concert = screenObject.data.concert
	var stage = getConcertStages()[concert.stageID];

	option = addOption(screenObject,
		{
			icon: "cartaz/calendarBase.svg",
			text: "Ver no menu:<br>" + getDateString( concert.datetime ),
			selectionCallback: prepareSubmenuOptionFunc(),
		}
	);
	option.data("submenuParams",
			{
				statusBarIcon: "musicNote.svg",
				statusBarText:  getDateString( concert.datetime ),
				newHTMLCallback: newConcertDayMenu,
				updateCallback: updateMenuOptions,
				data: { dayID: concert.dayID },	/* every concert before this one has expired, so default selection finds us */
			}
		);


	option = addOption(screenObject,
		{
			icon: "cartaz/local.svg",
			text: "Ver no menu:<br>"+stage.name ,
			selectionCallback: prepareSubmenuOptionFunc(),
		}
	);
	option.data("submenuParams",
		{
			statusBarIcon: "musicNote.svg",
			statusBarText: stage.name,
			newHTMLCallback: newConcertStageMenu,
			updateCallback: updateMenuOptions,
			data: {stageID: concert.stageID},
		}
	);

	option = addOption(screenObject,
		{
			icon: "cartaz/crossedEye.svg",
			text: "",

			cornerIcon: "cartaz/eye.svg",
			cornerText: concert.datetime.toLocaleFormat("%H:%M"),

			subject: concert,
			updateCallback: composition(
				attributeUpdateFunc("isActive", "active"),
				attributeUpdateFunc("isExpired", "disabled"),
				unwatchConcertUpdateFunc()
			),
			selectionCallback: prepareCallbackOptionFunc( runConcertOption, previewUnwatchConcertOption ),
		}
	);

	addVoidOption(screenObject, 1);

	updateMenuOptions(screenObject);
	initMenuSelection(screenObject);
	initMenuScroll(screenObject);
};

var newConcertBandMenu = function (screenObject) {
    screenObject.html = $("<div/>").addClass("menu").data("screenObject", screenObject);	//html remembers who the screenObject is

	var option;
	var band = screenObject.data.band;
	option = addOption(screenObject,
		{
			text: "Genero:<br>"+ "&nbsp;&nbsp;"+band.style,
			noSelect: true,
		}
	);


	var i;
	var option;
	var totalHeight = 1;
	for( i=0; i < band.elements.length; i++ ){
		var artist = band.elements[i];

		option = addOption(screenObject,
			{
				text:  artist.instrument + ":<br>&nbsp;&nbsp;" + artist.name,
				noSelect: true,
			}
		);

		totalHeight++;
    }

	if( totalHeight < 4 ){
		addVoidOption( screenObject, 4 - totalHeight, true );	/* this void won't cancel clicks */
	}

	updateMenuOptions(screenObject);
	initMenuScroll(screenObject);
};
