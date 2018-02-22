
var addClockStatusBarCount = function( container, icon, count ){
	if( count ){
		container.append(
			$("<div/>").addClass("iconContainer").append(
	    		$("<img/>").addClass("icon").attr("src", "img/icons/" + icon )
	    	).append(
	    		$("<span/>").addClass("count").text(count)
	    	)
		)
	}
}

//updates the status bar to show the given icon and text, along with the current time (optionally provided)
var updateClockStatusBar = function( ){	
	var left = $("#statusBarLeft").empty();
	var right = $("#statusBarRight").empty();
	
	addClockStatusBarCount( left, "message.svg", countTotalActiveSMS() );
	addClockStatusBarCount( right, "musicNote.svg", countActiveElements( {elements:getConcertActiveQueue()} ) );
	addClockStatusBarCount( right, "ticketWIP.svg", countActiveElements( {elements:getActivityActiveQueue()} ) );
}

var updateClockScreen = function( screenObject ){
	var screen = screenObject.html;
	
	screen.find(".dateTime .date .text").text( getDateString(getCurrentTime()) );
	screen.find(".dateTime .time.text").text( getCurrentTime().toLocaleTimeString('pt-PT', {hour:'2-digit', minute:'2-digit'}) );
	
	var nextConcert = getConcertActiveQueue()[0];
	var nextActivity = getActivityActiveQueue()[0];
	
	var bottomBar = screen.find(".statusBar.bottom");
	if (nextConcert && (!nextActivity || nextConcert.datetime < nextActivity.datetime) ){
		bottomBar.find(".icon").attr("src","img/icons/musicNote.svg" );
		bottomBar.find(".text.title").text(nextConcert.band.shortName);
		bottomBar.find(".text.time").text( getTimeLeftString(nextConcert.datetime) );
		
		bottomBar.removeClass("empty");
	} else if (nextActivity){
		bottomBar.find(".icon").attr("src","img/icons/ticketWIP.svg" );
		bottomBar.find(".text.title").text(nextActivity.shortName);		
		bottomBar.find(".text.time").text( getTimeLeftString(nextActivity.datetime) );
		
		bottomBar.removeClass("empty");
	} else {
		bottomBar.addClass("empty");
	}
}

/**********************************
 *  Concert-related menu builders *
 *********************************/


//creates the HTML menu for the functionality choice (result is stored in screenObject.html)
var newClockScreen = function (screenObject) {
    screenObject.html = $("<div/>").addClass("clockScreen").data("screenObject", screenObject);	//html remembers who the screenObject is
    
	var element;
	
	/* datetime central area */
	element = $("<div/>").addClass("dateTime");	
	
	element.append(
		$("<div/>").addClass("date").append(
			$("<div/>").addClass("padding")
		).append(
			$("<div/>").addClass("text")
		)
	);	
	element.append( $("<span/>").addClass("text").addClass("time") );	
	element.append( $("<div/>").addClass("padding") );
	
	screenObject.html.append( element );
	
	
	/* bottom status bar */
	element = $("<div/>").addClass("statusBar").addClass("bottom");
	
	initUnclickableBinds( element );
	
	element.append( $("<div/>").addClass("padding") );
	element.append(
		$("<div/>").addClass("iconContainer").append(
    		$("<img/>").addClass("icon")
    	)
	);
	element.append( $("<span/>").addClass("text").addClass("title") );
	element.append( $("<div/>").addClass("padding") );
	element.append( $("<span/>").addClass("text").addClass("time") );	
	element.append( $("<div/>").addClass("padding") );
	screenObject.html.append( element );	
	
	updateClockScreen(screenObject);
};

