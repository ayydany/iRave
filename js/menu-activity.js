
/***************************
 *  Run callback functions *
 ***************************/

// toggles subscription of the Activity the given option is about
// option: the option that we're trying to run.
var runActivityOption = function( option ){
	var activity = option.data("subject");

	if( activity.isActive ){
		unsubscribeActivity( activity );	
	} else {
		subscribeActivity( activity );
	}
	
	updateOption( option );	
}

//previews changes to an activity option, before actually performing them
// copyOption: the option to perform changes on
// originalOption: the option to read data from
// NOTE: returns true if operation should be aborted
var previewActivityOption = function ( copyOption, originalOption ){
	var activity = originalOption.data("subject");
	var cornerText = copyOption.find(".corner .text");
	
	if( activity.isActive ){
		cornerText.text( activity.averageWait + " min" );	//TODO: delete this line once the unqueue error prevention feature is done
		copyOption.removeClass("active");
		
	} else {
		copyOption.addClass("active");
	}
}

//previews changes to an activity unqueue-option (as seen in alert submenu), before actually performing them
// copyOption: the option to perform changes on
// originalOption: the option to read data from
// NOTE: returns true if operation should be aborted
var previewUnqueueActivityOption = function ( copyOption, originalOption ){
	var activity = originalOption.data("subject");
	var cornerText = copyOption.find(".corner .text");
	var icon = copyOption.find(".iconContainer .icon");
	var text = copyOption.children(".text");
	
	if( activity.isActive ){
		icon.attr("src", "img/icons/ticketWIP.svg");
		text.html( "Voltar à fila" );
		cornerText.text( activity.averageWait + " min" );	//TODO: delete this line once the unqueue error prevention feature is done
		copyOption.removeClass("active");
		
	} else {
		icon.attr("src", "img/icons/crossedTicket.svg");		
		text.html( "Sair da fila" );
		copyOption.addClass("active");
	}
}


/******************************
 *  Option-related functions  *
 ******************************/

//Returns a FUNCTION that, given an option, updates its corner text based on activity ETA
activityCornerUpdateFunc = function(){
	return function(option){
		var subject = option.data("subject");
		var cornerText = option.find(".corner .text");

		if(subject.isActive){
			cornerText.text( getTimeLeftString(subject.datetime) );
		}
		else {
			cornerText.text( subject.averageWait + " min" );
		}
	}
}



//Returns a FUNCTION that, given an option, updates its icon and text to match the unqueue/requeue actions
unqueueActivityUpdateFunc = function(){
	return function(option){
		var subject = option.data("subject");
		var text = option.children(".text");
		var icon = option.find(".iconContainer .icon");

		if(subject.isActive){
			text.html( "Sair da fila" );
			icon.attr("src", "img/icons/crossedTicket.svg");
		}
		else {
			text.html( "Voltar à fila" );
			icon.attr("src", "img/icons/ticketWIP.svg");
		}
	}
}

/***********************************
 *  Activity-related menu builders *
 ***********************************/

//creates the HTML menu for the root of the Lines functionality (result is stored in screenObject.html)
var newActivityMenu = function (screenObject) {
    screenObject.html = $("<div/>").addClass("menu").data("screenObject", screenObject);	//html remembers who the screenObject is

	var option;

	option = addOption(screenObject,
		{
			icon: "ticketWIP.svg",
			count: "",
			text: "Senhas<br>Activas",

			subject: {elements: getActivityActiveQueue()},
			updateCallback: composition(
					countUpdateFunc("isActive", true),
					elementAttributeUpdateFunc("isExpired", "disabled", true)
			),
			selectionCallback: prepareConditionalSubmenuOptionFunc(),
		}
	);
	option.data("submenuParams",
		{
			statusBarIcon: "ticketWIP.svg",
			statusBarText: "Senhas Activas",
			newHTMLCallback: newActivityActiveQueueMenu,
			updateCallback: updateMenuOptions,
		}
	);

	var activities = getActivityCategories();
	var i;
	var option;
	var totalHeight = 1;
	for( i=0; i < activities.length; i++ ){
		var activity = activities[i];

		option = addOption(screenObject,
			{
				icon: activity.icon,
				text: activity.name,
				count: "",

				subject: activity,
				updateCallback:	countUpdateFunc("isActive"),
				selectionCallback: prepareSubmenuOptionFunc(),
			}
		);
		option.data("submenuParams",
			{
				statusBarIcon: "ticketWIP.svg",
				statusBarText: activity.shortName,
				newHTMLCallback: newActivityCategoryMenu,
				updateCallback: updateMenuOptions,
				data: {categoryID: i,selectedIndex: -2 },
			}
		);

		totalHeight++;
    }

	if( totalHeight < 4 ){
		addVoidOption( screenObject, 4 - totalHeight );
	}

	updateMenuOptions(screenObject);
	initMenuSelection(screenObject);
	initMenuScroll(screenObject);
};

//creates the HTML menu for the currently active activities (result is stored in screenObject.html)
var newActivityActiveQueueMenu = function (screenObject) {
    screenObject.html = $("<div/>").addClass("menu").data("screenObject", screenObject);	//html remembers who the screenObject is

	var activities = getActivityActiveQueue();
	var i;
	var option;
	var totalHeight = 0;
	for( i=0; i < activities.length; i++ ){
		var activity = activities[i];

		option = addOption(screenObject,
			{
				icon: activity.icon,
				text: activity.name,
				cornerIcon: "ticketWIP.svg",
				cornerText: "",

				subject: activity,
				updateCallback: composition(
					attributeUpdateFunc("isActive", "active"),
					activityCornerUpdateFunc()
				),
				selectionCallback: prepareCallbackOptionFunc( runActivityOption, previewActivityOption ),
			}
		);

		totalHeight++;
    }

	if( totalHeight == 0 ){
		addOption( screenObject, {text:"Não há actividades!"} ).addClass("unselectable");
		totalHeight++;
	}

	if( totalHeight < 4 ){
		addVoidOption( screenObject, 4 - totalHeight );
	}

	updateMenuOptions(screenObject);
	initMenuSelection(screenObject);
	initMenuScroll(screenObject);
};

//creates the HTML menu for a given Activity Category (result is stored in screenObject.html)
//  screenObject.data.categoryID: the ID of the current category
var newActivityCategoryMenu = function (screenObject) {
    screenObject.html = $("<div/>").addClass("menu").data("screenObject", screenObject);	//html remembers who the screenObject is


	var categoryID = screenObject.data.categoryID;
	var category = getActivityCategories()[categoryID];

	var activities = category.elements;
	var i;
	var option;
	var totalHeight = 0;
	for( i=0; i < activities.length; i++ ){
		var activity = activities[i];

		option = addOption(screenObject,
			{
				icon: activity.icon,
				text: activity.name,
				cornerIcon: "ticketWIP.svg",
				cornerText: "",

				subject: activity,
				updateCallback: composition(
					attributeUpdateFunc("isActive", "active"),
					activityCornerUpdateFunc()
				),
				selectionCallback: prepareCallbackOptionFunc( runActivityOption, previewActivityOption ),
			}
		);

		totalHeight++;
    }

	if( totalHeight == 0 ){
		addOption( screenObject, {text:"Não há actividades"} ).addClass("unselectable");
		totalHeight++;
	}

	if( totalHeight < 4 ){
		addVoidOption( screenObject, 4 - totalHeight );
	}

	updateMenuOptions(screenObject);
	initMenuSelection(screenObject);
	initMenuScroll(screenObject);
};

//creates the HTML menu for the alert-submenu for a given activity (result is stored in screenObject.html)
var newActivityAlertMenu = function (screenObject) {
    screenObject.html = $("<div/>").addClass("menu").data("screenObject", screenObject);	//html remembers who the screenObject is

	var option;
	var activity = screenObject.data.activity
	var category = getActivityCategories()[activity.categoryID];

	option = addOption(screenObject,
		{
			icon: category.icon,
			text: "Ver Categoria:<br>"+category.shortName ,
			selectionCallback: prepareSubmenuOptionFunc(),
		}
	);
	option.data("submenuParams",
		{
			statusBarIcon: "ticketWIP.svg",
			statusBarText: category.shortName,
			newHTMLCallback: newActivityCategoryMenu,
			updateCallback: updateMenuOptions,
			data: {categoryID: activity.categoryID},
		}
	);

	option = addOption(screenObject,
		{
			icon: "crossedTicket.svg",
			text: "",

			cornerIcon: "ticketWIP.svg",
			cornerText: getTimeLeftString(activity.datetime),

			subject: activity,
			updateCallback:  composition(
				attributeUpdateFunc("isActive", "active"),
				activityCornerUpdateFunc(),
				unqueueActivityUpdateFunc()
			),
			selectionCallback: prepareCallbackOptionFunc( runActivityOption, previewUnqueueActivityOption ),
		}
	);

	addVoidOption(screenObject, 2);

	updateMenuOptions(screenObject);
	initMenuSelection(screenObject);
	initMenuScroll(screenObject);
};
