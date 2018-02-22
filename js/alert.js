
var updateAlertScreen = function( screenObject ){
	var screen = screenObject.html;

	screen.find(".footer .text.time").text( "em " + getTimeLeftString(screenObject.data.datetime) );
}


/**********************************
 *  Activity-related menu builders *
 *********************************/

//process a activity's alert
var alertActivity = function(activity){

	if( activity.alertEventID ){
		delInternalEvent( activity.alertEventID );
		activity.alertEventID = null;
	}

	var screenObject = newScreen(
		{
			statusBarIcon: "ticketWIP.svg",
			statusBarText: "Actividade",
			newHTMLCallback: newActivityAlertScreen,
			updateCallback: updateAlertScreen,
			keybinds: splashScreenBinds,
			isSplashScreen: true,
			isPopup: true,
			data: {
				activity: activity,
				datetime: activity.datetime,
			},
			actionType: "replace screen",
			actionParams: {
				statusBarIcon: "ticketWIP.svg",
				statusBarText: activity.shortName,
				newHTMLCallback: newActivityAlertMenu,
				updateCallback: updateMenuOptions,
				isPopup: true,
				data: {activity: activity},
			}
		}
	);

	enterScreen( screenObject );
}


//creates the HTML for the Activity alert (result is stored in screenObject.html)
var newActivityAlertScreen = function (screenObject) {
    screenObject.html = $("<div/>").addClass("alert").addClass("activity").data("screenObject", screenObject);	//html remembers who the screenObject is

	var activity = screenObject.data.activity;

	var element;

	/* alert header */
	element = $("<div/>").addClass("header");

	element.append( $("<img/>").addClass("icon").attr("src", "img/icons/" + activity.icon ) );
	element.append( $("<span/>").addClass("text").html( activity.shortName ) );

	screenObject.html.append( element );


	/* alert footer */
	element = $("<div/>").addClass("footer");

	element.append( $("<span/>").addClass("text").addClass("time") );

	screenObject.html.append( element );

	updateAlertScreen(screenObject);
};


/**********************************
 *  Concert-related menu builders *
 *********************************/

//process a concert's alert
var alertConcert = function(concert){

	if( concert.alertEventID ){
		delInternalEvent( concert.alertEventID );
		concert.alertEventID = null;
	}

	var screenObject = newScreen(
		{
			statusBarIcon: "musicNote.svg",
			statusBarText: "Concerto",
			newHTMLCallback: newConcertAlertScreen,
			updateCallback: updateAlertScreen,
			keybinds: splashScreenBinds,
			isSplashScreen: true,
			isPopup: true,
			data: {
				concert: concert,
				datetime: concert.datetime,
			},
			actionType: "replace screen",
			actionParams: {
				statusBarIcon: "musicNote.svg",
				statusBarText: concert.band.shortName,
				newHTMLCallback: newConcertAlertMenu,
				updateCallback: updateMenuOptions,
				isPopup: true,
				data: {concert: concert},
			}
		}
	);

	enterScreen( screenObject );
}


//creates the HTML for the concert alert (result is stored in screenObject.html)
var newConcertAlertScreen = function (screenObject) {
    screenObject.html = $("<div/>").addClass("alert").addClass("concert").data("screenObject", screenObject);	//html remembers who the screenObject is

	var concert = screenObject.data.concert;

	var element;

	/* alert header */
	element = $("<div/>").addClass("header");

	element.append( $("<img/>").addClass("icon").attr("src", "img/icons/" + getConcertStages()[concert.stageID].icon ) );
	element.append( $("<span/>").addClass("text").html( concert.band.name ) );

	screenObject.html.append( element );


	/* alert footer */
	element = $("<div/>").addClass("footer");


	element.append( $("<span/>").addClass("text").addClass("stage").text( getConcertStages()[concert.stageID].name ) );
	element.append( $("<span/>").addClass("text").addClass("time") );

	screenObject.html.append( element );

	updateAlertScreen(screenObject);
};

/**********************************
 *  SMS-related menu builders *
 *********************************/

//process a activity's alert
var alertSMS = function(message){

	if( message.alertEventID ){
		delInternalEvent( message.alertEventID );
		message.alertEventID = null;
	}

	var screenObject = newScreen(
		{
			statusBarIcon: "message.svg",
			statusBarText: "SMS Recebido",
			newHTMLCallback: newSMSAlertScreen,
			updateCallback: updateAlertScreen,
			keybinds: splashScreenBinds,
			isSplashScreen: true,
			isPopup: true,
			data: {
				message: message,
				datetime: message.datetime,
			},
			actionType: "replace screen",
			actionParams: {
				statusBarIcon: "message.svg",
				statusBarText: getSMSContacts()[message.contactID].shortName,
				newHTMLCallback: newSMSAlertMenu,
				updateCallback: updateMenuOptions,
				isPopup: true,
				data: {message: message},
			}
		}
	);

	enterScreen( screenObject );
}

//creates the HTML for the SMS alert (result is stored in screenObject.html)
var newSMSAlertScreen = function (screenObject) {
    screenObject.html = $("<div/>").addClass("alert").addClass("sms").data("screenObject", screenObject);	//html remembers who the screenObject is

	var message = screenObject.data.message;
	var element;

	/* alert header */
	element = $("<div/>").addClass("header");

	element.append( $("<img/>").addClass("photo").attr("src", "img/icons/" + getSMSContacts()[message.contactID].icon ) );
	element.append( $("<span/>").addClass("text").html( getSMSContacts()[message.contactID].shortName ) );

	screenObject.html.append( element );


	/* alert footer */
	element = $("<div/>").addClass("footer");

	if(message.size){
		element.append( $("<span/>").addClass("text").addClass(message.size).text( message.text ) );
	}
	else {
		element.append( $("<span/>").addClass("text").text( message.text ) );
	}


	screenObject.html.append( element );

	updateAlertScreen(screenObject);
};
