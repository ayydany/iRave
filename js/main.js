
// Main JavaScript file for the project


/**************
*  Constants  *
***************/

var ANIMATION_TIME = 200;


/***********************
*  Datetime functions  *
***********************/

// Returns true whether two datetimes are on the same day, false otherwise.
var areDaysEqual = function( left, right ){
	return	left.getDate() == right.getDate() &&
			left.getMonth() == right.getMonth() &&
			left.getFullYear() == right.getFullYear();		
}

// Returns true whether the first datetime is on a day before the second datetime, false otherwise.
var areDaysOrdered = function( left, right ){
	return	left.getFullYear() < right.getFullYear() ||
			(
				left.getFullYear() == right.getFullYear() &&
				(
					left.getMonth() < right.getMonth() ||
					(
						left.getMonth() == right.getMonth() && 
						left.getDate() < right.getDate()
					)
				)
			)
}

//returns the correct icon for the given datetime
var getDateIcon = function( datetime ){	
	if( areDaysEqual(getCurrentTime(), datetime) ){
		return "cartaz/dia-hoje2.svg";
	} else {
		var weekdayIcons = [
			"cartaz/dia-dom.svg",
			"cartaz/dia-seg.svg",
			"cartaz/dia-ter.svg",
			"cartaz/dia-qua.svg",
			"cartaz/dia-qui.svg",
			"cartaz/dia-sex.svg",
			"cartaz/dia-sab.svg",
		];
		
		return weekdayIcons[ datetime.getDay() ];
	}
}

//returns string version of how far away a given datetime is ("2 min")
var getTimeLeftString = function( datetime ){
	var now = getCurrentTime();
	datetime = datetime || now;		//function will return "0 min" when given a null
	
	var timeDiff = Math.max(0, datetime.getTime() - now.getTime() );	/* milliseconds */

	timeDiff = Math.floor( timeDiff / (1000*60) ) /* minutes */
	
	if( timeDiff <= 60 ){
		return timeDiff + " min";
	}
	
	timeDiff = Math.floor( timeDiff / 60 ) /* hours */
	if( timeDiff <= 24 ){
		return timeDiff + " hora" + (timeDiff==1 ? "" : "s");
	}
	
	timeDiff = Math.floor( timeDiff / 24 ) /* days */
	return timeDiff + " dia" + (timeDiff==1 ? "" : "s");
}


//returns string version of a given datetime ("Sex, 23 Jan")
var getDateString = function( datetime ){
	var weekdays = [
		"Dom",
		"Seg",
		"Ter",
		"Qua",
		"Qui",
		"Sex",
		"Sab",
	];
	
	return weekdays[ datetime.getDay() ] + ", " + getDateShortString( datetime );
}

//returns short string version of a given datetime ("23 Jan")
var getDateShortString = function( datetime ){	
	var months = [
		"Jan",
		"Fev",
		"Mar",
		"Abr",
		"Mai",
		"Jun",
		"Jul",
		"Ago",
		"Set",
		"Out",
		"Nov",
		"Dez",
	];
	
	return datetime.getDate().toString() + " " + months[ datetime.getMonth() ];
}


/****************************************
 *  Utilitary, test, and debug functions  *
 ****************************************/

//shakes a given jquery element in a "nope" fashion
var nopeShake = function( shaked ){
	if( shaked.hasClass("clockScreen") ){	//make sure bottom bar in clock screen doesn't shake
		shaked = shaked.find(".dateTime");
		
	} else if( shaked.hasClass("menu") ){	//make selected option shake instead of menu, if any
		var selected = shaked.find(".selected");
		
		if( selected.length ){
			shaked = selected;
		}
	}
	
	var moveDistance = 2;
	var stepDuration = 100;
	var repeatSwings = 2;

	shaked.finish();
	shaked.animate( {left: -moveDistance}, stepDuration/2 );
	for( var i=0; i<repeatSwings; i++ ){
		shaked.animate( {left: +moveDistance}, stepDuration );
		shaked.animate( {left: -moveDistance}, stepDuration );
	}
	shaked.animate( {left: 0}, stepDuration/2 );
}


// (arguments): arbitrary amount of things to print.
var debugPrint = function () {    
    var output = $("#debugOutput");
    
    output.html("");    
    for (var i = 0; i < arguments.length; i++) {
        output.append( arguments[i] + "<br>" );
    }
}


// Returns whatever is passed as its argument
var identity = function( x ){
	return x;
}

// (arguments): arbitrary amount of functions to call, one after the other
// Returns a FUNCTION, that when called runs all the previously provided functions in succession, passing its arguments to each of them.
var composition = function( ){
    var funcs = arguments;
    return function(){
        for (var i = 0; i < funcs.length; i++) {
            funcs[i].apply(this, arguments);
        }
    }
}

//returns a FUNCTION that, given an object, returns one of its properties
var getPropertyFunc = function( property ){
	return function(x){
		return x[property];
	};
}

//returns a random integer between min and max (inclusive)
var randomInt = function( min, max ){
	return Math.floor( Math.random() * (max - min + 1) + min );
}

// Adds an element to the correct position of an ordered array
// element: the element to add
// valueFunc (optional): function that returns the value to compare elements by (the element itself by default)
if (!Array.prototype.orderedInsert){
    Array.prototype.orderedInsert = function(element, valueFunc){
    	valueFunc = valueFunc || identity;
    	
    	var length = this.length;
    	var i;
    	for( i=0; i<length; i++ ){
    		if( valueFunc(element) < valueFunc(this[i]) ){	//element's smaller than the next member we found:
    			this.splice(i, 0, element);					//  insert element into the array, before the bigger member
    			return;	
    		}
    	}
    	
    	this.push(element);		//element's bigger than everything else: add it to end of array
    }
};

// Removes an element with the given value from an array
// value: the value of the element to remove
// valueFunc (optional): function that returns the value to compare elements by (the element itself by default)
// Returns the removed element.
if (!Array.prototype.valueRemove){
    Array.prototype.valueRemove = function(value, valueFunc){
    	valueFunc = valueFunc || identity;
    	
    	var length = this.length;
    	var i;
    	for( i=0; i<length; i++ ){
    		if( valueFunc(this[i]) == value ){	//element's got the correct value:
    			return this.splice(i, 1);		//  remove element from the array, returning it
    		}
    	}
    	
    	return null;	//found nothing
    }
};


// Returns the last member of an array.
if (!Array.prototype.last){
    Array.prototype.last = function(){
        return this[this.length - 1];
    };
};

// Returns the top of a stack (array)
if (!Array.prototype.top){
    Array.prototype.top = Array.prototype.last;
};

// Returns the element BELOW the top of a stack (array)
//depth (optional): how many levels below top to peek (defaults to 1)
if (!Array.prototype.belowTop){
    Array.prototype.belowTop = function(depth){
        return this[this.length - (depth || 1) - 1];
    };
};



// same as (number % modulus), except the return is never negative
var mod = function ( number, modulus ){
    return ( (number % modulus) + modulus ) % modulus;
}

//object: an object whose alias string we want to find
//Returns: the object's ID, if it has one, or a constructed alias, derived from its predecessors
var objectAlias = function( object ){
    //get object's ID
    var alias = object.attr("id");
    
    //if it doesn't have one, derive one from its predecessors
    if( !alias ){
        
        if( 0 == object.length ){
            //if NOBODY has an ID, provide an escape clause to avoid infinite recursion.
            alias = "ORPHAN";
            
        } else {
            //otherwise, get parent's alias, and append our index to it
            var parent = object.parent();
            alias = objectAlias( parent ) + "-" + parent.children().index( object );
        }
    
    }
    
    //return resulting name
    return alias;
}


/*************************
 *  Main Initialization  *
 *************************/

$(document).ready(
	function(){
        var body = $("body");
        
        //initialize button and key bindings
		initBodyBinds(body);
		initButtonBinds(body);
				
		//init stuff
		initScreen();
		initDatabase();
		
		
				
		//make clock screen, add it to stack
		enterScreen(
			newScreen(
				{
					newHTMLCallback: newClockScreen,
					updateCallback: updateClockScreen,
					keybinds: splashScreenBinds,
					
					isSplashScreen: true,
					actionType: "screen",
					actionParams: {
						statusBarIcon: "home.svg",
						statusBarText: "Menu",
						newHTMLCallback: newHomeMenu,
						updateCallback: updateMenuOptions,
					}
				}
			),
			null,
			true	/* instant entry */
		);
		
		//all done!
		console.log("ready");
	}
);

