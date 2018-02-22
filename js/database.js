// JavaScript file responsible for storing event/activity/sms data


/*****************************
*  Time and internal events  *
*****************************/

//returns a unique, positive ID number for internal use
var getUniqueID = function(){
	var body = $("body");

	var id = body.data("db-lastUniqueID" ) + 1;
	body.data("db-lastUniqueID", id );

	return id;
}

// Returns the current date and time
var getCurrentTime = function(body){
	body = body || $("body");
	return body.data("db-currentTime");
}


// Returns a NEW datetime object, set to a certain time after the given one
var newFutureTime = function( datetime, minutes, hours, days ){
	var newDatetime = new Date( datetime );

	if( hours || minutes ){
		newDatetime.setHours( newDatetime.getHours() + (hours?hours:0), newDatetime.getMinutes() + (minutes?minutes:0) );
	}

	if( days ){
		newDatetime.setDate( newDatetime.getDate() + days );
	}

	return newDatetime;
}


// Increments the current time by the given amount.
// Returns how many internal events were triggered.
var incCurrentTime = function( minutes, hours, days ){
	return setCurrentTime(
		newFutureTime(
			getCurrentTime(),
			minutes,
			hours,
			days
		)
	);
}


// Sets the current time to the given datetime.
// Returns how many internal events were triggered.
var setCurrentTime = function( datetime ){
	$("body").data("db-currentTime", datetime);		//update current time value

	var numEvents = triggerInternalEvents( datetime );

	if( topScreen() ){
		updateScreen( topScreen() );
	}

	resetClockTick();	//time changed: reset time until next minute increase

	return numEvents;
}

// returns the ordered array of internal events
var getInternalEvents = function(){
	return $("body").data("db-internalEvents");
}

// Triggers all internal events that are scheduled to occur before or at the given datetime (optional, defaults to current time).
// Returns how many internal events were triggered.
var triggerInternalEvents = function( datetime ){
	datetime = datetime || getCurrentTime( $("body") );

	var eventsTriggered = 0;
	var events = getInternalEvents();
	while( (events.length > 0) && (events[0].datetime <= datetime) ){	//go through all events that are now in the past or present
		event = events.shift();									//  remove past event from events array
		event.triggerCallback( event.callbackArg );				//  call its trigger callback
		eventsTriggered++;
	}

	return eventsTriggered;
}


//creates a new internal event, adding it to the internal event list
//datetime: when to trigger event
//triggerCallback: function to call when event is triggered.
//callbackArg (optional): argument to pass to callback function
//returns eventID of created event
var addInternalEvent = function( datetime, triggerCallback, callbackArg ){
	var eventID = getUniqueID();

	var event = {
		eventID: eventID,
		datetime: datetime,
		triggerCallback: triggerCallback,
		callbackArg: callbackArg,
	};

	var events = getInternalEvents();
	events.orderedInsert( event, getPropertyFunc("datetime") );

	return eventID;
}

//unqueues the internal event with the given ID
var delInternalEvent = function( eventID ){
	var events = getInternalEvents();
	events.valueRemove( eventID, getPropertyFunc("eventID") );
}

/************************
*  Generic collections  *
*************************/


//returns the number of active (activities/concerts/sms) in the given (queue/stage/day/conversation)
var countActiveElements = function( collection, attribute, invert ){
	var attribute = attribute || "isActive";
	var numElements = collection.elements.length;
	var numActive = 0;

	var i;
	for( i=0; i < numElements; i++ ){
		var hasAttribute = collection.elements[i][attribute];
		if( invert ){
			hasAttribute = !hasAttribute;
		}

		if( hasAttribute ){
			numActive++;
		}
	}

	return numActive;
}

//mark/unmark an activity/concert/sms as active
var markElementActive = function( element, unmark, toggle, attribute ){
	var attribute = attribute || "isActive";

	if( toggle ){
		element[attribute] = !element[attribute];
	} else {
		element[attribute] = !unmark;
	}
};

//mark/unmark all activities/concerts/sms in a given (queue/stage/day/conversation) as active
var markAllElementsActive = function( collection, unmark, toggle, attribute ){
	var numElements = collection.elements.length;

	var i;
	for( i=0; i < numElements; i++ ){
		markElementActive( collection.elements[i], unmark, toggle, attribute );
	}
};

//delete all elements in a collection for which the given predicate returns true
var deleteMatchingElements = function( collection, shouldDelete ){
	shouldDelete = shouldDelete || function(x){ return !x.isActive; };

	var i=0;
	while( i < collection.elements.length ){
		if( shouldDelete(collection.elements[i]) ){
			collection.elements.splice(i, 1);
		}else{
			i++;
		}
	}
}



/***************
*  Activities  *
***************/

//returns the array of activity categories
var getActivityCategories = function()  {
	return $("body").data("db-activityCategories");
}


//returns the array of active activities
var getActivityActiveQueue = function(){
	return $("body").data("db-activityActiveQueue");
}

//adds a new activity to the given category
var addActivity = function(categoryID, name, shortName, icon, averageWait, alertMinutes){
	var activity = {
		uniqueID: getUniqueID(),
		name: name,
		shortName: shortName,
		icon: icon,

		averageWait: averageWait,
		alertMinutes: alertMinutes || Math.floor( averageWait / 2 ),
		datetime: null,				/* ETA (when subscribed) */

		categoryID: categoryID,

		isActive: false,			/* Does user have a ticket? */

		unsubscribeEventID: null,
		alertEventID: null,
	};

	getActivityCategories()[categoryID].elements.push(activity);
};


//subscribes an activity, making it active, adding it to active concerts queue, and scheduling future events
var subscribeActivity = function( activity ){
	activity.isActive = true;
	activity.datetime = newFutureTime( getCurrentTime(), activity.averageWait );

	getActivityActiveQueue().orderedInsert( activity, getPropertyFunc("datetime") );

	activity.alertEventID = addInternalEvent(	 	//set alert to show the specified time before activity starts
		newFutureTime(activity.datetime, -activity.alertMinutes),
		alertActivity,
		activity
	);

	activity.unsubscribeEventID = addInternalEvent(		//set activity to become inactive one minute after it begins
		newFutureTime(activity.datetime, 1),
		unsubscribeActivity,
		activity
	);
}


//unsubscribes an activity, making it inactive, removing it from active activities queue, and aborting its future events
var unsubscribeActivity = function( activity ){
	activity.isActive = false;
	activity.datetime = null;

	getActivityActiveQueue().valueRemove( activity.uniqueID, getPropertyFunc("uniqueID") );

	if( activity.alertEventID ){
		delInternalEvent( activity.alertEventID );
		activity.alertEventID = null;
	}

	if( activity.unsubscribeEventID ){
		delInternalEvent( activity.unsubscribeEventID );
		activity.unsubscribeEventID = null;
	}
}



/*************
*  Concerts  *
**************/

//returns the array of concert stages
var getConcertStages = function( ){
	return $("body").data("db-concertStages");
}


//returns the array of concert days
var getConcertDays = function(){
	return $("body").data("db-concertDays");
}

//returns the array of active concerts
var getConcertActiveQueue = function(){
	return $("body").data("db-concertActiveQueue");
}



//returns a concert day ID corresponding to the given datetime
//this creates an appropriate empty day, if none exists yet
var getDatetimeDayID = function( datetime ){
	var days = getConcertDays();
	var numDays = days.length

	var i=0;
	while(i < numDays){
		if( areDaysEqual(datetime, days[i].datetime) ){			//day found:
			return i;											//  return its ID

		} else if (areDaysOrdered(datetime, days[i].datetime)){	//our day should come before current one:
			var day = {											//  create new day
				datetime: datetime,
				elements: new Array(),
			};
			days.splice(i, 0, day);								//  add new day to right position in array of days
			return i;											//  and return said new day's ID

		} else {												//keep looking
			i++;
		}
	}

	//If we reach this point, our day comes after all existing ones.
	var day = {					//  create new day
		datetime: datetime,
		elements: new Array(),
	};

	days.push(day);				//  add new day to end of array of days
	return numDays;				//  and return said new day's ID
}


//adds a concert to the correct day
var addConcert = function(stageID, timestamp, band){
	var datetime = new Date(timestamp);
	var body = $("body");


	var dayID = getDatetimeDayID(datetime);

	var concert = {
		uniqueID: getUniqueID(),
		datetime: datetime,
		band: band,

		alertMinutes: 30,

		stageID: stageID,
		dayID: dayID,

		isExpired: false,
		isActive: false,	/* Is user subscribed? */

		unsubscribeEventID: null,
		alertEventID: null,
	};

	getConcertStages()[stageID].elements.orderedInsert( concert, getPropertyFunc("datetime") );
	getConcertDays()[dayID].elements.orderedInsert( concert, getPropertyFunc("datetime") );

	addInternalEvent(	//set concert to become expired one minute after it begins
		newFutureTime(datetime,1),
		function(concert){concert.isExpired = true;},
		concert
	);
};


//subscribes a concert, making it active, adding it to active concerts queue, and scheduling future events
var subscribeConcert = function( concert ){
	concert.isActive = true;

	getConcertActiveQueue().orderedInsert( concert, getPropertyFunc("datetime") );

	concert.alertEventID = addInternalEvent(	 //set alert to show the specified time before concert
		newFutureTime(concert.datetime, -concert.alertMinutes),
		alertConcert,
		concert
	);

	concert.unsubscribeEventID = addInternalEvent(		//set concert to become inactive one minute after it begins
		newFutureTime(concert.datetime, 1),
		unsubscribeConcert,
		concert
	);
}


//unsubscribes a concert, making it inactive, removing it from active concerts queue, and aborting its future events
var unsubscribeConcert = function( concert ){
	concert.isActive = false;

	getConcertActiveQueue().valueRemove( concert.uniqueID, getPropertyFunc("uniqueID") );

	if( concert.alertEventID ){
		delInternalEvent( concert.alertEventID );
		concert.alertEventID = null;
	}

	if( concert.unsubscribeEventID ){
		delInternalEvent( concert.unsubscribeEventID );
		concert.unsubscribeEventID = null;
	}
}


/********
*  SMS  *
********/

//get the array of contacts in sms database
var getSMSContacts = function( ){
	return $("body").data("db-smsContacts");
}

//get the array of conversations in SMS database
var getSMSConversations = function( ){
	return $("body").data("db-smsConversations");
}


//count the TOTAL number of unread messages
countTotalSMS = function(){
	var conversations = getSMSConversations();
	var count = 0;

	var i;
	for( i=0; i<conversations.length; i++ ){
		count += conversations[i].elements.length;
	}

	return count;
}

//count the TOTAL number of unread messages
countTotalActiveSMS = function(){
	var conversations = getSMSConversations();
	var count = 0;

	var i;
	for( i=0; i<conversations.length; i++ ){
		count += countActiveElements( conversations[i] );
	}

	return count;
}


//adds an SMS to the database, creating a new conversation if needed
//returns the created sms
var addSMS = function(contactID, isOutgoing, isActive, datetime, text, size){
	var body = $("body");
	var conversations = getSMSConversations();
	var numConversations = conversations.length;

	//find conversation for given contactID
	var conversation;
	var i=0;
	while( i < numConversations ){
		if( conversations[i].contactID == contactID ){	//convo found: remember it and remove it from middle of array
			conversation = conversations.splice(i, 1)[0];
			break;
		} else {
			i++;
		}
	}

	if( i == numConversations ){						//convo not found: create new one
		conversation = {
			contactID: contactID,
			isTrash: false,
			elements: new Array(),
		};
	}

	conversations.unshift(conversation);				//put current convo at start of array

	var sms = {
		uniqueID: getUniqueID(),
		datetime: datetime,
		text: text,
		size: size,
		isActive: isActive,			/* Is message unread? */
		isTrash: false,
		contactID: (isOutgoing ? 0 : contactID ),
	}

	conversation.elements.push( sms );					//add message to end of conversation

	return sms;
};


/*******************
*  Initialization  *
*******************/

//initializes database, filling it with some initial data
var initDatabase = function(){
	var body = $("body");

	//unique IDs start counting up from ONE. (they always evaluate as true)
	body.data("db-lastUniqueID", 0 );

	//array of future internal events starts empty
	body.data("db-internalEvents", new Array() );


	//------------//
	// activities //
	//------------//

	var activityCategories = [
		{
			name: "Actividades Radicais",
			shortName: "Radicais",
			icon: "fila/radical.svg",
			elements: new Array(),
		},
		{
			name: "Restauração",
			shortName: "Restauração",
			icon: "fila/restauration.svg",
			elements: new Array(),
		},
		{
			name: "Outras Actividades",
			shortName: "Outras",
			icon: "fila/service.svg",
			elements: new Array(),
		},
	];
	body.data("db-activityCategories",activityCategories);

	body.data("db-activityActiveQueue", new Array() );


	addActivity(0, "BMX", "BMX", "fila/radical/bmx.svg", 7, 3);
	addActivity(0, "Escalada", "Escalada", "fila/radical/climbing.svg", 15, 5);
	addActivity(0, "Skate", "Skate", "fila/radical/skate.svg", 4, 2);
	addActivity(0, "Ski", "Ski", "fila/radical/ski.svg", 25, 10);
	addActivity(0, "Natação", "Natação", "fila/radical/swimming.svg", 9, 4);

	addActivity(1, "Bear Grills' BBQ", "BBQ", "fila/restauration/bbq.svg", 6, 3);
	addActivity(1, "Starbucks", "Starbucks", "fila/restauration/coffee.svg", 3, 1);
	addActivity(1, "Tozé das Farturas", "Farturas", "fila/restauration/dinner.svg", 5, 2);
	addActivity(1, "Barraca Sagres", "Sagres", "fila/restauration/drink.svg", 2, 1);
	addActivity(1, "McBifana", "McBifana", "fila/restauration/fast-food.svg", 2, 1);

	addActivity(2, "Primeiros Socorros", "Prim.Socorr.", "fila/service/firstaid.svg", 2, 1);
	addActivity(2, "Casa de Banho", "WC", "fila/service/wc.svg", 14, 5);
	addActivity(2, "Segurança", "Segurança", "fila/service/security.svg", 2, 1);


	//----------//
	// concerts //
	//----------//

	var concertStages = [
		{
			name: "Palco Norte",
			icon: "cartaz/north.svg",
			elements: new Array(),
		},
		{
			name: "Palco Sul",
			icon: "cartaz/south.svg",
			elements: new Array(),
		},
		{
			name: "Palco Este",
			icon: "cartaz/east.svg",
			elements: new Array(),
		},
		{
			name: "Palco Oeste",
			icon: "cartaz/west.svg",
			elements: new Array(),
		},
	];
	body.data("db-concertStages", concertStages);

	var concertDays = new Array();
	body.data("db-concertDays", concertDays);

	body.data("db-concertActiveQueue", new Array() );

	//Day 23 - Friday

	addConcert(0, "2015-01-23T22:00:00",
		{
			name: "Britney Spears",
			shortName: "Britney S.",
			style: "Pop-Dance",
			elements: [
  			{name:"Britney Spears", instrument:"Vocalista"},
			]
		}
	)
	addConcert(0, "2015-01-23T23:00:00",
		{
			name: "Shakira",
			shortName: "Shakira",
			style: "Latin Pop",
			elements: [
				{name:"Shakira", instrument:"Vocalista"},
			],
		}
	);

	//Day 24 - Saturday
	addConcert(0, "2015-01-24T20:00:00",
		{
			name: "GNR",
			shortName: "GNR",
			style: "Rock",
			elements: [
				{name:"Alexandre Soares", instrument:"Vocalista"},
				{name:"Vitor Rua", instrument:"Guitarrista"},
				{name:"César Machado", instrument:"Baterista"},
			],
		}
	);

	addConcert(0, "2015-01-24T21:00:00",
		{
			name: "Nickelback",
			shortName: "Nickelback",
			style: "Post-Grunge",
			elements: [
				{name:"Chad Kroeger", instrument:"Vocalista"},
				{name:"Mike Kroeger", instrument:"Baixista"},
				{name:"Ryan Peake", instrument:"Guitarrista"},
				{name:"Daniel Adair", instrument:"Baterista"},
			],
		}
	);
	addConcert(1, "2015-01-24T21:00:00",
		{
			name: "The Offspring",
			shortName: "Offspring",
			style: "Punk Rock",
			elements: [
				{name:"Dexter Holland", instrument:"Vocalista"},
				{name:"Greg Kriesel", instrument:"Baixista"},
				{name:"Kevin Wasser.", instrument:"Guitarrista"},
				{name:"Pete Parada", instrument:"Baterista"},
			],
		}
	);
	addConcert(2, "2015-01-24T21:00:00",
		{
			name: "Korn",
			shortName: "Korn",
			style: "Nu Metal",
			elements: [
				{name:"Jonathan Davis", instrument:"Vocalista"},
				{name:"Reginald Arvizu", instrument:"Baixista"},
				{name:"James Shaffer", instrument:"Guitarrista"},
				{name:"Brian Welch", instrument:"Guitarrista"},
				{name:"Ray Luzier", instrument:"Baterista"},
			],
		}
	);

	addConcert(0, "2015-01-24T23:00:00",
		{
			name: "Beyoncé",
			shortName: "Beyoncé",
			style: "R&B",
			elements: [
				{name:"Giselle Carter", instrument:"Vocalista"},
			],
		}
	);


	//Day 25 - Sunday
	addConcert(3, "2015-01-25T20:00:00",
		{
			name: "Madredeus",
			shortName: "Madredeus",
			style: "Fado",
			elements: [
				{name:"Beatriz Nunes", instrument:"Vocalista"},
				{name:"Carlos Trindade", instrument:"Teclado"},
				{name:"Pedro Magalhães", instrument:"Guitarrista"},
				{name:"Jorge Varrecoso", instrument:"Violino"},
				{name:"António Figueira", instrument:"Violino"},
				{name:"Luis Clode", instrument:"Violoncelo"},
			],
		}
	);
	addConcert(0, "2015-01-25T20:00:00",
		{
			name: "System<br>Of a Down",
			shortName: "SOAD",
			style: "Hard Rock",
			elements: [
				{name:"Serj Tankian", instrument:"Vocalista"},
				{name:"Shavo Odadjian", instrument:"Baixista"},
				{name:"Daron Malakian", instrument:"Guitarrista"},
				{name:"John Dolmayan", instrument:"Baterista"},
			],
		}
	);
	addConcert(2, "2015-01-25T21:00:00",
		{
			name: "Elton John",
			shortName: "Elton John",
			style: "Rock",
			elements: [
				{name:"Reginald Dwight", instrument:"Vocalista"},
			],
		}
	);
	addConcert(1, "2015-01-25T22:00:00",
		{
			name: "Quim<br>Barreiros",
			shortName: "Quim Barreiros",
			style: "Popular",
			elements: [
				{name:"Joaquim Barreiros", instrument:"Vocalista"},
			],
		}
	);
	addConcert(3, "2015-01-25T23:00:00",
		{
			name: "Lamb of God",
			shortName: "Lamb of God",
			style: "Thrash Metal",
			elements: [
				{name:"Randy Blythe", instrument:"Vocalista"},
				{name:"John Campbell", instrument:"Baixista"},
				{name:"Willie Adler", instrument:"Guitarrista"},
				{name:"Mark Morton", instrument:"Baterista"},
			],
		}
	);


		//Day 30 - Friday
		addConcert(0, "2015-01-30T21:00:00",
			{
				name: "Iron Maiden",
				shortName: "Iron Maiden",
				style: "Heavy Metal",
				elements: [
					{name:"Bruce Dickinson", instrument:"Vocalista"},
					{name:"Steve Harris", instrument:"Baixista"},
					{name:"Dave Murray", instrument:"Guitarrista"},
					{name:"Nicko McBrain", instrument:"Baterista"},
				],
			}
		);
		addConcert(1, "2015-01-30T22:00:00",
			{
				name: "Mariza",
				shortName: "Mariza",
				style: "Fado",
				elements: [
					{name:"Marisa Nunes", instrument:"Vocalista"},
				],
			}
		);
		addConcert(2, "2015-01-30T23:00:00",
			{
				name: "Rihanna",
				shortName: "Rihanna",
				style: "R&B",
				elements: [
					{name:"Robyn Fenty", instrument:"Vocalista"},
				],
			}
		);


		//Day 31 - Saturday
		addConcert(0, "2015-01-31T20:00:00",
			{
				name: "Gorillaz",
				shortName: "Gorillaz",
				style: "Alternative Rock",
				elements: [
					{name:"Damon Albarn", instrument:"Vocalista"},
					{name:"Damon Albarn", instrument:"Baixista"},
					{name:"Damon Albarn", instrument:"Guitarrista"},
					{name:"Damon Albarn", instrument:"Baterista"},
				],
			}
		);
		addConcert(2, "2015-01-31T21:00:00",
			{
				name: "Kanye West",
				shortName: "Kanye West",
				style: "Hip-hop",
				elements: [
					{name:"Kanye West", instrument:"Vocalista"},
				],
			}
		);
		addConcert(3, "2015-01-31T21:00:00",
			{
				name: "The Script",
				shortName: "The Script",
				style: "Pop Rock",
				elements: [
					{name:"Danny O'Dono.", instrument:"Vocalista"},
					{name:"Mark Sheehan", instrument:"Guitarrista"},
					{name:"Glen Power", instrument:"Baterista"},
				],
			}
		);
		addConcert(0, "2015-01-31T22:00:00",
			{
				name: "Limp Bizkit",
				shortName: "Limp Bizkit",
				style: "Nu Metal",
				elements: [
					{name:"Fred Durst", instrument:"Vocalista"},
					{name:"Sam Rivers", instrument:"Baixista"},
					{name:"Wes Borland", instrument:"Guitarrista"},
					{name:"John Otto", instrument:"Baterista"},
				],
			}
		);
		addConcert(1, "2015-01-31T23:00:00",
			{
				name: "Slipknot",
				shortName: "Slipknot",
				style: "Nu Metal",
				elements: [
					{name:"Corey Taylor", instrument:"Vocalista"},
					{name:"Jim Root", instrument:"Guitarrista"},
					{name:"Mick Thomson", instrument:"Guitarrista"},
					{name:"Shawn Crahan", instrument:"Baterista"},
					{name:"Chris Fehn", instrument:"Baterista"},
				],
			}
		);


		//Day 1 - Sunday
		addConcert(0, "2015-02-01T20:00:00",
			{
				name: "Goldfish",
				shortName: "Goldfish",
				style: "Dance",
				elements: [
					{name:"Sakhile Moleshe", instrument:"Vocalista"},
					{name:"Max Vidima", instrument:"Vocalista"},
					{name:"Monique Hellen", instrument:"Vocalista"},
					{name:"David Poole", instrument:"Vocalista"},
				],
			}
		);
		addConcert(2, "2015-02-01T21:00:00",
			{
				name: "Snoop Dogg",
				shortName: "Snoop Dogg",
				style: "Rap",
				elements: [
					{name:"Calvin Cordozar", instrument:"Vocalista"},
				],
			}
		);
		addConcert(1, "2015-02-01T21:00:00",
			{
				name: "Imagine Dragons",
				shortName: "Im.Dragons",
				style: "Indie Rock",
				elements: [
					{name:"Dan Reynolds", instrument:"Vocalista"},
					{name:"Ben McKee", instrument:"Baixista"},
					{name:"Daniel Sermon", instrument:"Guitarrista"},
					{name:"Daniel Platzman", instrument:"Baterista"},
				],
			}
		);
		addConcert(3, "2015-02-01T22:00:00",
			{
				name: "António<br>Variações",
				shortName: "A. Variações",
				style: "Pop",
				elements: [
					{name:"António Variações", instrument:"Vocalista"},
				],
			}
		);
		addConcert(0, "2015-02-01T23:00:00",
			{
				name: "Judas Priest",
				shortName: "Judas Priest",
				style: "Thrash Metal",
				elements: [
					{name:"Rob Halford", instrument:"Vocalista"},
					{name:"Ian Hill", instrument:"Baixista"},
					{name:"Glenn Tipton", instrument:"Guitarrista"},
					{name:"Richie Faulkner", instrument:"Guitarrista"},
					{name:"Scott Travis", instrument:"Baterista"},
				],
			}
		);

	//-----//
	// sms //
	//-----//

	var smsContacts = [				//mostly for internal use (no equivalent list in watch UI)
		{							//includes list of all possible sms senders, and their future messages
			name: "iRave User",
			shortName: "iRave",
			icon: "sms/defaultPerson.svg",
			isSelf: true,
			elements: [					//canned replies go here
				{text: "OK"},
				{text: "Sim"},
				{text: "Não"},
				{text: "Vou a caminho."},
				{text: "Agora não posso."},
				{text: "Já te respondo."},
				{text: ":)"},
				{text: ":P"},
				{text: ":("},
			],
		},
		{
			name: "Luís Camões",
			shortName: "Luís C.",
			icon: "sms/people/camoes.png",
			isSelf: false,
			elements: [					//possible incoming messages go here
				{
					text: "Viste o meu caderno?"
				},
				{
					text: "Já reparaste que o Pessoa anda sempre com um chapéu?",
					size: "double",
				},
				{
					text: "Posso ser zarolho, mas ainda gosto de fazer ski. Fica combinado para mais logo então?",
					size: "triple",
				},
			],
		},
		{
			name: "José Sócrates",
			shortName: "José S.",
			icon: "sms/people/socrates.png",
			isSelf: false,
			elements: [					//possible incoming messages go here
				{
					text: "Porreiro pá!"
				},
				{
					text: "Preciso mesmo de falar contigo, é um assunto importante.",
					size: "double",
				},
				{
					text: "Ainda há quem pense que não sou engenheiro, e esta confusão toda recentemente não veio ajudar.",
					size: "triple",
				},
			],
		},
		{
			name: "Nuno Markl",
			shortName: "Nuno M.",
			icon: "sms/people/markl.png",
			isSelf: false,
			elements: [					//possible incoming messages go here
				{
					text: "Olha, já tens um iRave?"
				},
				{
					text: "Não te esqueças, rappel com o Pessoa daqui a bocado.",
					size: "double",
				},
				{
					text: "A Camões mandou-me ontem um link para aquele video do gato. Muito fixe!",
					size: "triple",
				},
			],
		},
		{
			name: "Cláudia Vieira",
			shortName: "Cláudia V.",
			icon: "sms/people/claudia.png",
			isSelf: false,
			elements: [					//possible incoming messages go here
				{
					text: "Olha, já tens um iRave?"
				},
				{
					text: "Por acaso não consegues dar boleia a uma amiga mais logo?",
					size: "double",
				},
				{
					text: "Eu quero mesmo ouvir os Nickelback, mas acho que não vou chegar a tempo. :(",
					size: "triple",
				},
			],
		},
		{
			name: "Fernando Pessoa",
			shortName: "Fernando P.",
			icon: "sms/people/pessoa.png",
			isSelf: false,
			elements: [					//possible incoming messages go here
				{
					text: "Está mesmo sol."
				},
				{
					text: "Podes vir cá ter á banca das farturas?",
					size: "double",
				},
				{
					text: "Viste o Camões por acaso? Precisava da opinião dele acerca dum poema que estou a acabar.",
					size: "triple",
				},
			],
		},
	];
	body.data("db-smsContacts", smsContacts);

	var smsConversations = new Array();
	body.data("db-smsConversations", smsConversations);


	addSMS(2, false, false, new Date("2015-01-23T23:14:00"), "Olha, amanhã quando saires de casa diz qualquer coisa.", "double");

	addSMS(1, false, false, new Date("2015-01-24T09:47:00"), "Olá, tudo bem?");
	addSMS(1, true, false,  new Date("2015-01-24T10:03:00"), "Tudo, e tu?");
	addSMS(1, false, false,  new Date("2015-01-24T10:05:00"), "Vai indo. Estou a ver se decido a que concertos vou, hoje à noite.", "double");



	setCurrentTime( new Date("2015-01-24T16:43:00") );


}
