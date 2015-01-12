function startGame(){
	var root = world.dynasty.root;
	var city = world.areas[lookUpCoord(root.location).field];
	var vicinity = city.farmableTiles; //should be grass tiles in vicinity

	var r = random(0,vicinity.length-1);
	var tile = lookUpCoord(vicinity[r]);
	
	tile.ownedBy = root.id;

	root.ownedTiles =  [tile];

	triggerEvent(startEvent, [root.name, "your participation in the war", city.name]);
}

var eventID = 0;
function Event(title, text, choices, effects){
	this.id = eventID++;
	this.title = title;
	this.text = text;
	this.choices = choices;
	this.effects = effects;
}

function triggerEvent(event, arguments){

	
	console.log(event.title);
	console.log(event.text.with(arguments));
}

var startEvent = new Event("New Land", "Dear $0. As thanks for $1, $2 has decided to grant you one plot of land");