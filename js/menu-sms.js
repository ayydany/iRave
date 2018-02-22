

/***************************
 *  Run callback functions *
 ***************************/

// toggles the isTrashed parameter the given option is about
// option: the option that we're trying to run.
var runMarkAsTrash = function(option) {
    var element = option.data("subject");
    markElementActive(element, false, true, "isTrashed")
    updateOption(option);
}

//previews changes to a trash-sms option, before actually performing them
// copyOption: the option to perform changes on
// originalOption: the option to read data from
// NOTE: returns true if operation should be aborted
var previewMarkAsTrash = function(copyOption, originalOption ) {
    var element = originalOption.data("subject");

	var icon = copyOption.find(".iconContainer > .icon");
	if(!element.isTrashed){
		icon.attr("src", "img/icons/" + "sms/trash.svg" );
	}
	else {
		icon.attr("src", "img/icons/" + "sms/trashDashed.svg" );
	}
}

//Returns a FUNCTION that, given an option, updates its corner text based on activity ETA
runSMSAnswerOptionFunc = function(toContact){
	return function(option){
		var screenObject = option.data("screenObject");
		var menu = getScreenHTML( screenObject );
		
		var sentState = option.data("sms-sentState");

		var options = menu.find(".option:not(.selected)");

		var i;
		for( i=0; i < options.length; i++ ){
			var option2 = $(options[i]);
			option2.data("sms-sentState", 0); //reset all other states
		}
		updateMenuOptions(screenObject);

		switch( sentState ){
			case 1:		//Send?
				option.data("sms-sentState", 2);	//switch status to "Sent!"

				var message = option.data("subject");

				var father = belowTopScreen(1);
				if(father.newHTMLCallback == newConversationMenu){	//reset scroll in grandfather menu if it's the SMS-in-a-conversation screen
					father.data.scrollIndex = -4;	/* bottom */
				}

				var grandfather = belowTopScreen(2);
				if(grandfather.newHTMLCallback == newSMSMenu){	//reset cursor in grandfather menu if it's the list of conversations
					grandfather.data.selectedIndex = -1;
					grandfather.data.scrollIndex = -1;
				}

				addSMS(toContact, true, false, getCurrentTime(), message.text );

				updateOption(option);
                leaveScreen(1, -1);
				break;

			default:	//(no corner)
				option.data("sms-sentState", 1);	//switch status to "Send?"
                updateOption( option );
                break;
		}

	}
}

//previews changes to an sms-answer option, before actually performing them
// copyOption: the option to perform changes on
// originalOption: the option to read data from
// NOTE: returns true if operation should be aborted
var previewSMSAnswerOption = function(copyOption, originalOption ) {
	var corner = copyOption.find(".corner");
	var cornerText = corner.find(".text");
		
    var sentState = originalOption.data("sms-sentState");


	switch( sentState ){
		case 1:		//was Send?
		case 2:		//was Sent!
			cornerText.text("Enviado!");
			corner.removeClass("hidden");
			copyOption.addClass("active");
			break;

		default:	//was (no corner)
			cornerText.text("Enviar?");
			corner.removeClass("hidden");
			copyOption.removeClass("active");
			break;
	}
}


/******************************
 *  Option-related functions  *
 ******************************/
 
var formatSMSTime = function( datetime ){
 	var today = getCurrentTime();
 	
 	if( areDaysEqual(today, datetime) ){
 		return datetime.toLocaleTimeString('pt-PT', {hour:'2-digit', minute:'2-digit'});
 	} else {
 		return getDateShortString( datetime );
	}
}

//Returns a FUNCTION that, given an option, updates its icons to match "isTrashed" flag
trashIconUpdateFunc = function(datetime){
	return function(option){
		var icon = option.find(".iconContainer > .icon");
		if(option.data("subject").isTrashed){
			icon.attr("src", "img/icons/" + "sms/trash.svg" );
		}
		else {
			icon.attr("src", "img/icons/" + "sms/trashDashed.svg" );
		}
	}
}

//Returns a FUNCTION that, given an option, checks if it has elements, and removes its corner otherwise
updateConversationCornerFunc = function(){
	return function (option){
	    var conversation = option.data("subject")
	    var corner = option.find(".corner");
	    var text = corner.find(".text");

	    if( conversation.elements.last() ){
	        text.text( formatSMSTime( conversation.elements.last().datetime ) );
	        corner.removeClass("hidden");
	    }
	    else{
	        corner.addClass("hidden");
	    }
	}
}


//Returns a FUNCTION that, given an option, updates its corner style and text based on its current sent status
smsAnswerCornerUpdateFunc = function(){
	return function(option){
		var sentState = option.data("sms-sentState");

		var corner = option.find(".corner");
		var cornerText = corner.find(".text");

		switch( sentState ){
			case 1:		//Send?
				cornerText.text("Enviar?");
				corner.removeClass("hidden");
				option.removeClass("active");
				break;

			case 2:		//Sent!
				cornerText.text("Enviado!");
				corner.removeClass("hidden");
				option.addClass("active");
				break;

			default:	//(no corner)
				corner.addClass("hidden");
				break;
		}
	}
}

/***********************************
 *     SMS-related menu builders   *
 ***********************************/

//creates the HTML menu for the list of SMS conversations (result is stored in screenObject.html)
var newSMSMenu = function (screenObject) {
    screenObject.html = $("<div/>").addClass("menu").data("screenObject", screenObject);	//html remembers who the screenObject is

	var conversations = getSMSConversations();
	var i;
	var option;
	var totalHeight = 0;
	for( i=0; i < conversations.length; i++ ){
		var contactID = conversations[i].contactID;
		var contact = getSMSContacts()[contactID];
		option = addOption(screenObject,
			{
				icon: contact.icon,
				iconClass: "photo",
				text: contact.name,
	
				cornerIcon: "message.svg",
				cornerText: "",
	
				subject: conversations[i],
	            updateCallback: composition(
					elementAttributeUpdateFunc("isActive", "active"),
	                updateConversationCornerFunc(),
	                function(option){
	                    var conversation = option.data("subject")
	                    if( !conversation.elements.last() ){
	                        option.addClass("disabled");
	                    }
	                }
			    ),
				selectionCallback: prepareSubmenuOptionFunc("submenuParams"),
				longpressCallback: runSubmenuOptionFunc("longSubmenuParams"),
	        }
    	);
		option.data("submenuParams",
			{
				statusBarIcon: "message.svg",
				statusBarText: contact.shortName,
				leaveCallback: function (screenObject) {
                    markAllElementsActive(screenObject.data.conversation, true)
                    },
				newHTMLCallback: newConversationMenu,
				updateCallback: updateMenuOptions,
				data: {
					conversation:conversations[i],					
	            	scrollIndex: -4,	/* bottom */
				},
				keybinds: menuScrollBinds,
				actionType: "screen",
				actionParams: {
			        statusBarIcon: "message.svg",
			        statusBarText: "Respostas",
			        newHTMLCallback: newSMSAnswersMenu,
			        updateCallback: updateMenuOptions,
			        data: {contactID: contactID, selectedIndex:1},
		        },
			}
		);
		option.data("longSubmenuParams",
			{
				statusBarIcon: "message.svg",
				statusBarText: "SMS",
				isPopup: true,
				newHTMLCallback: newSMSDeleteMenu,
				updateCallback: updateMenuOptions,
	            scrollCallback: matchScrollFunc(screenObject),
				leaveCallback: function(screenObject){
	                markAllElementsActive({elements: conversations}, true, false, "isTrashed");
	                },
	            data: {
	            	conversation: conversations[i],
	            	selectedIndex: -5,	/* same as parent menu */
	            	scrollIndex: -5,	/* same as parent menu */
	            },
            }
		);
		totalHeight++;
    }

	if( totalHeight == 0 ){
		addOption( screenObject, {text:"Não há Conversas!"} ).addClass("unselectable");
		totalHeight++;
	}

	if( totalHeight < 4 ){
		addVoidOption( screenObject, 4 - totalHeight );
	}

	updateMenuOptions(screenObject);
	initMenuSelection(screenObject);
	initMenuScroll(screenObject);
};

//creates the HTML menu for an SMS conversation (result is stored in screenObject.html)
var newConversationMenu = function (screenObject) {
    screenObject.html = $("<div/>").addClass("menu sms").data("screenObject", screenObject);	//html remembers who the screenObject is

	var conversation = screenObject.data.conversation;

	var i;
	var option;
	var totalHeight = 0;
	for( i=0; i < conversation.elements.length; i++ ){
    var message = conversation.elements[i];
    option = addOption(screenObject,
	       {
        text: message.text,
        cornerIcon: "message.svg",
		cornerText: formatSMSTime( message.datetime ),

        subject: message,
        noSelect: true,
        updateCallback: attributeUpdateFunc("isActive", "active"),
		longpressCallback: runSubmenuOptionFunc(),
	   }
	);
	option.data("submenuParams",
		{
			statusBarIcon: "message.svg",
			statusBarText: getSMSContacts()[conversation.contactID].shortName,
			isPopup: true,
			newHTMLCallback: newConversationDeleteMenu,
			updateCallback: updateMenuOptions,
	        scrollCallback: matchScrollFunc(screenObject),
			leaveCallback: function(screenObject){
                markAllElementsActive(conversation, true, false, "isTrashed");
			    },
			data: {
				conversation:conversation,				
	            selectedIndex: -6,	/* same as parent menu's scroll */
	            scrollIndex: -5,	/* same as parent menu's */
			},
		}
	);

    if( message.size ) option.addClass( message.size );
    switch(message.size){
      case "double":
      totalHeight = totalHeight+2;
      break;

      case "triple":
      totalHeight = totalHeight+3;
      break;

      case "quadruple":
      totalHeight = totalHeight+4;
      break;

      default:
      totalHeight++;
      break;
    }
    if( message.contactID == 0) option.addClass ("reversed");
    }

	if( totalHeight == 0 ){
		addOption( screenObject, {text:"Não há Mensagens!"} ).addClass("unselectable");
		totalHeight++;
	}

	if( totalHeight < 4 ){
		addVoidOption( screenObject, 4 - totalHeight, true );	/* this void won't cancel clicks */
	}

	updateMenuOptions(screenObject);
	initMenuScroll(screenObject);
};

//creates the HTML menu for SMS Quick Answers (result is stored in screenObject.html)
var newSMSAnswersMenu = function (screenObject) {
    screenObject.html = $("<div/>").addClass("menu").data("screenObject", screenObject);	//html remembers who the screenObject is

  var toContact = screenObject.data.contactID;
  var contact = getSMSContacts()[0]; //IRave User
	var i;
	var option;
	var totalHeight = 0;
	for( i=0; i < contact.elements.length; i++ ){
    var quickAnswer = contact.elements[i];

    option = addOption(screenObject,
	        {
	        text: quickAnswer.text,
	        subject: quickAnswer,
	        cornerText: "",
	
	        updateCallback:smsAnswerCornerUpdateFunc(),
	
			selectionCallback: prepareCallbackOptionFunc( runSMSAnswerOptionFunc(toContact), previewSMSAnswerOption ),
        }
    );

    totalHeight++;
    }

	if( totalHeight == 0 ){
		addOption( screenObject, {text:"Não há Conversas!"} ).addClass("unselectable");
		totalHeight++;
	}

	if( totalHeight < 4 ){
		addVoidOption( screenObject, 4 - totalHeight );
	}

	updateMenuOptions(screenObject);
	initMenuSelection(screenObject);
	initMenuScroll(screenObject);
};

//creates the HTML menu for the alert-submenu for a given SMS (result is stored in screenObject.html)
var newSMSAlertMenu = function (screenObject) {
    screenObject.html = $("<div/>").addClass("menu").data("screenObject", screenObject);	//html remembers who the screenObject is

	var option;
	var message = screenObject.data.message;
	message.isActive = false;	//user gave an OK from alert screen: mark message read.
	
	var conversations = getSMSConversations();
	var conversation;
	var i;
	for (i=0; conversations.length; i++){
		if(message.contactID == conversations[i].contactID){
			conversation = conversations[i];
			break;
		}
	}
	option = addOption(screenObject,
		{
			icon: getSMSContacts()[message.contactID].icon,
			iconClass: "photo",
			text: "Ver Conversa:<br>" + getSMSContacts()[message.contactID].shortName,
			selectionCallback: prepareSubmenuOptionFunc(),
		}
	);
	option.data("submenuParams",
		{
			statusBarIcon: "message.svg",
			statusBarText: getSMSContacts()[message.contactID].shortName,
			leaveCallback: function (screenObject) {
                markAllElementsActive(screenObject.data.conversation, true)
                },
			newHTMLCallback: newConversationMenu,
			updateCallback: updateMenuOptions,
			data: {
				conversation: conversation,					
	            scrollIndex: -4,	/* bottom */
			},
			keybinds: menuScrollBinds,
			actionType: "screen",
			actionParams: {
		        statusBarIcon: "message.svg",
		        statusBarText: "Respostas",
		        newHTMLCallback: newSMSAnswersMenu,
		        updateCallback: updateMenuOptions,
		        data: {contactID: conversation.contactID, selectedIndex:1},
	        },
		}
	);
	option = addOption(screenObject,
		{
			icon: "message.svg",
			text: "Responder",
			selectionCallback: prepareSubmenuOptionFunc(),
		}
	);
	option.data("submenuParams",
		{
			statusBarIcon: "message.svg",
			statusBarText: getSMSContacts()[message.contactID].shortName,
			newHTMLCallback: newSMSAnswersMenu,
			updateCallback: updateMenuOptions,
			data: {contactID: message.contactID},
		}
	);

	addVoidOption(screenObject, 2);

	updateMenuOptions(screenObject);
	initMenuSelection(screenObject);
	initMenuScroll(screenObject);
};

//creates the HTML menu for the list of SMS conversations (result is stored in screenObject.html)
var newSMSDeleteMenu = function (screenObject) {
    screenObject.html = $("<div/>").addClass("menu").data("screenObject", screenObject);	//html remembers who the screenObject is

	var conversations = getSMSConversations();
	var i;
	var option;
	var totalHeight = 0;
	for(i=0; i < conversations.length; i++){
		var contact = getSMSContacts()[conversations[i].contactID];
		var message = conversations[i].elements[conversations[i].elements.length-1];
		option = addOption(screenObject,
			{
				icon: "",
				text: contact.name,
	
				cornerIcon: "message.svg",
				cornerText: "",
	
				subject: conversations[i],
				leaveCallback: function(screenObject){
					markAllElementActive({elements: conversations}, true, false, "isTrashed");
				},
	
	    		updateCallback: composition(
					attributeUpdateFunc("isActive", "active"),
	                updateConversationCornerFunc(),
					trashIconUpdateFunc()
				),
				selectionCallback: composition(
					prepareCallbackOptionFunc( runMarkAsTrash, previewMarkAsTrash ),
					matchSelectionFunc( belowTopScreen() )
				),
	            longpressCallback: function(){
	                var conversation = option.data("subject");
	                deleteMatchingElements({elements: conversations}, getPropertyFunc("isTrashed"));
	                
		            belowTopScreen().data.selectedIndex = -1;
		            belowTopScreen().data.scrollIndex = -1;
	            
	                leaveScreen(1, -1);
	            },
            }
        );
		totalHeight++;
    }

	if( totalHeight == 0 ){
		addOption( screenObject, {text:"Não há Conversas!"} ).addClass("unselectable");
		totalHeight++;
	}

	if( totalHeight < 4 ){
		addVoidOption( screenObject, 4 - totalHeight );
	}

	updateMenuOptions(screenObject);
	initMenuSelection(screenObject);
	initMenuScroll(screenObject);
};

//creates the HTML menu for an SMS conversation (result is stored in screenObject.html)
var newConversationDeleteMenu = function (screenObject) {
    screenObject.html = $("<div/>").addClass("menu sms").data("screenObject", screenObject);	//html remembers who the screenObject is

	var conversation = screenObject.data.conversation;
	var i;
	var option;
	var totalHeight = 0;
	for( i=0; i < conversation.elements.length; i++ ){
    var message = conversation.elements[i];
    option = addOption(screenObject,
        {
	        text: message.text,
	        icon: "",
			cornerIcon: "message.svg",
			cornerText: formatSMSTime(message.datetime),
	
	        subject: message,
	        updateCallback: composition(
	            attributeUpdateFunc("isActive", "active"),
	            trashIconUpdateFunc()
	        ),
	
			selectionCallback: prepareCallbackOptionFunc( runMarkAsTrash, previewMarkAsTrash ),
	        longpressCallback: function(){
	            deleteMatchingElements(conversation, getPropertyFunc("isTrashed"));
	
	            belowTopScreen().data.scrollIndex = -4;	/* bottom */
	
	            leaveScreen(1, -1);
	        },
        }
	);

    if( message.size ) option.addClass( message.size );
    switch(message.size){
      case "double":
      totalHeight = totalHeight+2;
      break;

      case "triple":
      totalHeight = totalHeight+3;
      break;

      case "quadruple":
      totalHeight = totalHeight+4;
      break;

      default:
      totalHeight++;
      break;
    }
    if( message.contactID == 0) option.addClass ("reversed");
    }

	if( totalHeight == 0 ){
		addOption( screenObject, {text:"Não há Conversas!"} ).addClass("unselectable");
		totalHeight++;
	}

	if( totalHeight < 4 ){
		addVoidOption( screenObject, 4 - totalHeight );
	}

	updateMenuOptions(screenObject);
	initMenuSelection(screenObject);
	initMenuScroll(screenObject);
};
