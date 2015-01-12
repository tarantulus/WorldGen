// uses web workers to generate world
function importResources(){
	importScripts("res/malenames-french.js","res/femalenames-french.js","res/surnames-french.js");
	importScripts("cities.js", "history.js", "primitives.js", "people.js", "../../scripts/mersenne-random.js","../../scripts/json.js", "aStar.js"); //also aStar, history, events, and whatever else I'd like to share between main program and this
}

var progress;

onmessage = function(event){
	if(event.data === "start"){
		if(!sizeX)
			craftNewWorld();
	}
	else{
		importResources();

		params = event.data;
		sizeX = params.sizeX;
		sizeY = params.sizeY;
		progress = params.progress;
		m = new MersenneTwister(params.seed);
		craftNewWorld();
		self.close();
	}
}

var sendMessages = true;
function sendMessage(message){
	if(sendMessages){
		postMessage(message);
	}
}

var print = sendMessage;

function craftNewWorld(times){
	world = new World(sizeX,sizeY);
	world.areas = {};
	world.people = [];
	world.cities = []; 
	world.cultures = []; 
	world.roads = []; 
	world.rivers = [];
	sendMessage("WELCOME\n");
	sendMessage("Starting world generation");
	sendMessage("Starting terrain generation");
	sendMessage("Generating world of size " + world.sizeX + "X" + world.sizeY + " tiles");
	world.done = false;
	var t1 = new Date();
	var tStart = t1;
	world.tiles = generateTerrain(world.sizeX,world.sizeY);
	var t2 = new Date();
	timeDiff(t2,t1,"Terrain generation took : ");
	if(progress)
		postMessage(JSON.stringify(world)); 
	if(times === undefined) times = 7;
	sendMessage("\nEroding world " + times + " times");
	t1 = new Date();
	world.tiles = beautify(world.tiles, times);
	t2 = new Date();
	timeDiff(t2,t1,"Erosion took : ");
	if(progress)
		postMessage(JSON.stringify(world)); 
	t1 = new Date();
	sendMessage("\nMeasuring depths");
	measureDepth(world,0,false);//,1,true); //needs tiles to measure
	t2 = new Date();
	timeDiff(t2,t1,"Depth measurement took : ");
	if(progress)
		postMessage(JSON.stringify(world)); 
	t1 = new Date();
	sendMessage("\nFinding areas");
	checkAreas();				//needs settlements from generatePopulation
	t2 = new Date();
	timeDiff(t2,t1,"Finding areas took : ");
	if(progress)
		postMessage(JSON.stringify(world)); 
	sendMessage("\nGenerating rivers");
	t1 = new Date();
	generateRiversRandomly(1000);		//need0s depth from measureDepth
	t2 = new Date();
	timeDiff(t2,t1,"River generation took : ");
	if(progress)
		postMessage(JSON.stringify(world)); 
	sendMessage("\nGenerating resources");
	t1 = new Date();
	generateResources();		//needs depth from measureDepth
	t2 = new Date();
	timeDiff(t2,t1,"Resource generation took : ");
	sendMessage("\nDetermining tile values");
	t1 = new Date();
	determineValue();			//needs resources from generateResources
	t2 = new Date();
	timeDiff(t2,t1,"Value calculation took : ");
	t1 = new Date();
	sendMessage("\nGenerating population");
	generatePopulation(); 		//needs values from determineValue
	t2 = new Date();
	timeDiff(t2,t1,"Population generation took : ");

	t1 = new Date();
	sendMessage("\nFinding areas again");
	checkAreas();				//needs settlements from generatePopulation
	t2 = new Date();
	timeDiff(t2,t1,"Finding areas took : ");
	t1 = new Date();
	sendMessage("\nGenerating roads");
	generateRoads();
	t2 = new Date();
	timeDiff(t2,t1,"Road generation took : ");
	t1 = new Date();
	sendMessage("\nGenerating cultures");
	
	world.areas = areas;
	world.rivers = rivers;
	world.roads = roads;
	world.plates = plates;
	world.people = allPeople;
	world.population = people;
	world.cities = cities; 
	culture = 0;
	generateCultures();
	t2 = new Date();
	timeDiff(t2,t1,"Culture generation took : ");
	sendMessage("\nGenerating history");
    generateHistory(1000);
	var player = allPeople[random(0,allPeople.length-1)]; //new generatePerson(); //needs areas to pick a city at random.
	createDynasty(player); //move these to newGame()
	sendMessage("\nWorld generation done!");
	var tEnd = new Date();
	timeDiff(tEnd,tStart,"World generation took : ");
	areas = 0;
	cultures = 0;
	cities = 0;
	allPeople = 0;
	world.done = true;
	postMessage(JSON.stringify(world)); 
}

function Plate(minX, maxX, minY, maxY){
	this.minX = minX;
	this.maxX = maxX;
	this.minY = minY;
	this.maxY = maxY;
	this.area = (maxX-minX) * (maxY-minY);
	this.moveX = 0;
	this.moveY = 0;
}

var  plates = [];
var minEdge = 1;
var maxEdge = 12;

function generateTerrain(sizeX, sizeY){
	var size = sizeX * sizeY;
	var temp = [];
	var randomN;
	var sources = [];
	var center = {"x":sizeX/2, "y":sizeY/2};
	var radius = sizeX / 2 - 2;
	var lastRandom = random(10,30);
	for(var y = 0; y < sizeY; y++){ //iteration 1
		lastRandom += random(-5,5);
		if(lastRandom < 0) lastRandom = 0;
		if(lastRandom > 80) lastRandom = 70;

		for(var x = 0; x < sizeX; x++){
			var type = "grass";
			if(y == 0){
				temp[x] = [];
			}
			var edge = random(minEdge,maxEdge);
			if(euclideanDistance({"x":x,"y":y},center) > radius - lastRandom){
				type = "water";
			}
			temp[x][y] = new Tile({ x: x, y: y }, type, []);

			//find neighbours
			var tile = temp[x][y];
			tile.neighbours = [];
			
			// 8-connected neighbours, Diagonal
			for(nX = -1; nX < 2; nX++){
				for(nY = 1; nY > -2; nY--){ 		
					cX = x + nX;
					cY = y + nY;
					if((nY == 0 && nX == 0) || cX < 0 || cY < 0 || cX >= sizeX || cY >= sizeY){
						continue; //out of bounds
					}
					else{
						tile.neighbours.push([cX,cY]);
					}
				}
			}

			// 4-connected neighbours, non-diagonal
			/*for(nX = -1; nX < 2; nX++){
				for(nY = 1; nY > -2; nY--){ 		
					cX = x + nX;
					cY = y + nY;
					if((Math.abs(nY) == Math.abs(nX)) || cX < 0 || cY < 0 || cX >= sizeX || cY >= sizeY){
						continue; //out of bounds
					}
					else{
						tile.neighbours.push([cX,cY]);
					}
				}
			}*/
		}
	}
    			world.tiles = temp;
			if (progress)
			    postMessage(JSON.stringify(world));
    var nrPlates = 7; //seven is always a good number

    //generate Plates
    plates.push(new Plate(0, sizeX-1, 0, sizeY-1));
    sources = [];
    for (var i = nrPlates; i--;) {
    	var nr;
    	//choose "randomly"
    	var r = random(0,size);
    	var plate;
    	for(var n = 0; n < plates.length; n++){
    		plate = plates[n];
    		r -= plate.area;
    		if(r < 0){
    			break;
    		}
    	}
        var minX = plate.minX;
        var maxX = plate.maxX;
        var minY = plate.minY;
        var maxY = plate.maxY;
        var split = random(0, maxY-minY+maxX-minX);
        var newX = 0;
        var newY = 0;
        if (maxY-minY < maxX - minX) { //split on x
            maxX = minX + Math.round((random(1, 9) * (maxX - minX)) / 10);

            newX = maxX;
            newY = random(minY, maxY);

        	plates.push(new Plate(maxX, plate.maxX+0, minY, maxY));

        } else { //split on y
            maxY = minY +  Math.round((random(1, 9) * (maxY - minY)) / 10);

            newX = random(minX, maxX);
            newY = maxY;

        	plates.push(new Plate(minX, maxX, maxY, plate.maxY+0));
        }

        temp[newX][newY].type = "mountain";
        
        sources.push({
            x: newX,
            y: newY
        });
        plate.minX = minX;
        plate.maxX = maxX;
        plate.minY = minY;
        plate.maxY = maxY;
        plate.area = (maxX - minX) * (maxY - minY);
    }

    for (var k = 0; k < 4; k++) {

        x = (k % 4 === 0) ? 0: sizeX-1;
        y = (k % 4 === 1) ? 0: sizeY-1;

        if (k % 1) {
            y = random(0, sizeY-1);
        } else {
            x = random(0, sizeX-1);
        }	
        temp[x][y].type = "water";
        sources.push({
            x: x,
            y: y
        });
    }

    // other sources. right now just forests.
    var keys = Object.keys(mapRules);
    var lowestAllowedDistanceST = 50;//size*0.001;
	var lowestAllowedDistanceDT = 20;//size*0.0001;
	for(var i = 0; i< tileTypes.length;i++) 
	{
		if(tileTypes[i] != "forest") continue;
		var type = tileTypes[i];
		var averageSize = 1+size*((mapRules[tileTypes[i]]["size"]["min"] + mapRules[tileTypes[i]]["size"]["max"])/2);
		var amount = Math.round((mapRules[tileTypes[i]]["freq"]*size)/averageSize);
		for(var k = 0; k < amount; k++){
			var stopLooping = false;
			var x,y;
			while(!stopLooping){
				x = random(0,sizeX-1);
				y = random(0,sizeY-1);
				stopLooping = true;
				for(var n = 0; n < sources.length; n++){
					var distance = Math.sqrt(Math.pow(sources[n].x-x,2) + Math.pow(sources[n].y-y,2));
					if(distance < lowestAllowedDistanceST && temp[sources[n].x][sources[n].y].type == tileTypes[i]){
						stopLooping = false;
					}
					else if(distance < lowestAllowedDistanceDT){
						stopLooping = false;
					}
				}
			}
			temp[x][y].type = tileTypes[i];
			sources.push({x:x,y:y});
		}
	}
	
	waterTiles = 0;
	placed = 0;
	for(var i = 0; i < sources.length; i++){
		var origin = {x:sources[i].x, y:sources[i].y}
		var direction, x, y;
		x = origin.x;
		y = origin.y;
		var type = temp[origin.x][origin.y].type;
		var amountLeft = random(Math.round(size*mapRules[type]["size"]["min"]),Math.round(size*mapRules[type]["size"]["max"]));
		amountLeft = Math.round(size*((mapRules[type]["size"]["min"] + mapRules[type]["size"]["max"])/2));
		var shouldPlace;
		if(type == "water"){
			waterTiles += amountLeft;
			shouldPlace = amountLeft;
		}
		var errorsInARow = 0;
		while(amountLeft > 1 && errorsInARow < 200){
			if(errorsInARow == -1 && random(0,100) > 75){
				x+= direction;
				y+= direction;
			}
			else{
				direction = random(-1,1);//Math.floor(Math.random()*3) - 1;
				x += direction;
				if(direction == 0){
					direction = random(-1,1);//Math.floor(Math.random()*3) - 1;
					y += direction;
				}
			}
			if(x < 0 || x >= sizeX || y < 0 || y >= sizeY || temp[x][y].type != "grass" ){
				x = origin.x + random(-10,10);
				y = origin.y + random(-10,10);
				errorsInARow++;
			}
			else{
				if(random(0,100) > 91){	
					origin.x = x;
					origin.y = y;
					
				}
				temp[x][y].type = type;
				amountLeft--;
				errorsInARow = -1;
			}
		}
		if(type == "water"){
			placed += shouldPlace - amountLeft;
		}
	}
	return temp;
}

function beautify(temp, times){
	var sizeX = world.sizeX;
	var sizeY = world.sizeY;
	for(var twice = 0; twice < times; twice++){
		for(var y = 0; y < sizeY; y++){
			for(var x = 0; x < sizeX; x++){
				//count neighbours
				var tile = temp[x][y];
				var sameType = 0;
				var types = {grass:0, water:0, mountain:0, forest:0, sand:0, hill:0};
				for(nX = -1; nX < 2; nX++){
					for(nY = 1; nY > -2; nY--){ 		
						cX = x + nX;
						cY = y + nY;
						if((nY == 0 && nX == 0) || cX < 0 || cY < 0 || cX >= sizeX || cY >= sizeY){
							continue; //out of bounds
						}
						else{
						//	tile.neighbours.push(temp[cX][cY]);
							var nType = temp[cX][cY].type
							if(nType == tile.type){
								sameType++;
							}
							types[nType]++;
							if(temp[cX][cY].hill)
								types.hill += temp[cX][cY].hill;
						}
					}
				}
				if(sameType < 3){
					mostOf = {type:"grass", amount:types['grass']};
					if(types["water"] > mostOf.amount){
						mostOf = {type:"water", amount:types['water']};	
					}
					if(types["mountain"] > mostOf.amount){
						mostOf = {type:"mountain", amount:types['mountain']};	
					}
					if(types["forest"] > mostOf.amount){
						mostOf = {type:"forest", amount:types['forest']};
					}
					if(tile.type == "mountain" && mostOf.type == "grass"){
						if(tile.hill) tile.hill++;
						else tile.hill = 1;
					}
					tile.type = mostOf.type;
				}
				if(tile.type == "grass"){
					tile.hill += types.hill / 12;
				}
				if(types['mountain'] < 2 && tile.type == "mountain"){
					tile.type = "grass";
					if(tile.hill) tile.hill++;
					else tile.hill = 1;
				}
				if(types['water'] > 2 && tile.type != "water" && (random(5) > 2)){
					tile.type = "sand";	
				}
				if(types['water'] > 0 && tile.type == "mountain" && (random(6) > 2)){
					tile.type = "grass";	
				}
				if(types['sand'] > 1 && tile.type == "forest" && (random(6) > 2)){
					tile.type = "grass";
				}
			}
		}
	}
	return temp;
}

var riverSources = [];
var desertSources = [];

function measureDepth(worldT, type, heightModeOn){
	worldT = (worldT == undefined) ? world : worldT;
	type = (type == undefined) ? 0 : type;
	heightModeOn = (heightModeOn == undefined) ? false : heightModeOn; 
	var tile;
	var tiles = worldT.tiles;
	var borderFound;
	var depth = 0;	
	var heightSet = false;
	var depthSet = false;
	var prevTile;

	for(var x = 0; x < worldT.sizeX; x++){
		prevTile = (x > 0) ? tiles[x-1][0] : false;
		for(var y = 0; y < worldT.sizeY; y++){
			tile = tiles[x][y];
			borderFound = false;
			if(type == 1 && (tile.type != "water" && tile.type != "mountain")){
				continue;
			}
			if(type == 2 && (tile.type == "water" || tile.type == "mountain")){
				continue;
			}
			depth = (prevTile && prevTile.type == tile.type) ? prevTile.depth - 1 : 0; //This line HALVES the work

			prevTile = tile;
			heightSet = false;
			depthSet = false;
			while(!borderFound){
				var yInc = 1;
				if(depth >= depthMax) {
					borderFound = true;
					break;
				}
				for(nx=-depth;nx<=depth;nx++){
					if(Math.abs(nx) == depth){
						yInc = 1;
					}
					else{
						yInc = 2*depth;
					}
					for(ny=-depth;ny<=depth;ny += yInc){	
						if(Math.abs(nx) == depth || Math.abs(ny) == depth){
							var cx = nx+x;
							var cy = ny+y;
							if(cx > 0 && cx < worldT.sizeX && cy > 0 && cy < worldT.sizeY){
								if(worldT.tiles[cx][cy].type != tile.type){
									if(heightModeOn && type == 2 && !heightSet && worldT.tiles[cx][cy].type == "mountain"){
										tile.height = worldT.tiles[cx][cy].height - 3 - 2*(depth);//-1);
										if(tile.height < 0) tile.height = 0;
										heightSet = true;
										/*if(tile.heigth < minHeight/2){
											tile.height = Math.ceil(minHeight/2);
										}*/
									}
									else if(heightModeOn && type == 2 && !heightSet && worldT.tiles[cx][cy].type == "water"){
										tile.height =  worldT.tiles[cx][cy].height + 3 + 2*(depth-1);
										if(tile.height > 0) tile.height = 0;
										heightSet = true;
										/*if(tile.heigth > maxHeight/2){
											tile.height = Math.floor(maxHeight/2);
										}*/
									}
									if(tile.type == "grass"){
										borderFound = (worldT.tiles[cx][cy].type == "water");
									}
									else if(tile.type == "forest"){
										if(!depthSet){
											depthSet = true;
											tile.depth = depth-1;
										}
										borderFound = heightSet || !heightModeOn;
									}
									else{
										borderFound = true;
										break;
									}
								}			
								
							}
							else{
								//borderFound = true;
							}
								
						}
						if(borderFound) break;
					}
					if(borderFound) break;
				}
				depth++;
			}
			if(!depthSet){
			tile.depth = depth-1;
			}
			if(heightModeOn && tile.type == "mountain"){
				tile.height = 30+tile.depth;
				if(maxHeight < tile.height){
					maxHeight = tile.height;
				}
			}
			else if(heightModeOn && tile.type == "water"){
				tile.height = -30-tile.depth;
				if(minHeight > tile.height){
					minHeight = tile.height;
				}
			}
		}
	}
}

var cities;
var areas;
function jQ(){
	this.each = function(a,f){
		var keys = Object.keys(a);
		for(var i = 0; i < keys.length; i++){
			if(false === f(keys[i],a[keys[i]])) break;
		}
		return a;
	}
}
var $ = new jQ();
var checkedPreviously = false;
function checkAreas(worldT){
	areas = {"totalAmount":0,"id":0};
	$.each(tileTypes, function(i,val){
		areas[val] = 0;
	});

	worldT = (worldT == undefined) ? world : worldT;
	if(checkedPreviously){
		for(var x = 0; x < worldT.tiles.length; x++){
			for(var y = 0; y < worldT.tiles[0].length; y++){
				worldT.tiles[x][y].field = null;
			}
		}
	}
	checkedPreviously = true;
	for(var x = 0; x < worldT.sizeX; x++){
		for(var y = 0; y < worldT.sizeY; y++){
			var tile = worldT.tiles[x][y];
			tile.borders = [];
			var alone = true;
			for(var nx = -1; nx < 2; nx++){
				for(var ny = -1; ny < 2; ny++){	
					var cx = x+nx;
					var cy = y+ny;
					if((nx == 0 && ny == 0) || (cx > worldT.sizeX-1) || (cx < 0) || (cy > worldT.sizeY-1) || (cy < 0) || tile.type != worldT.tiles[cx][cy].type){
						//add borders
						if(Math.abs(nx) != Math.abs(ny)){
							switch(nx){
								case -1:
									//add border to the left
									tile.borders.push("left"); //Use enum? (left = 0, right = 1 etc)
									break;
								case 1:
									//add border to the right
									tile.borders.push("right")
									break;
								case 0:
									switch(ny){
										case -1:
											//add border above
											tile.borders.push("above")
											break;
										case 1:
											//add border below
											tile.borders.push("below");
											break;
									}
									break;
							}
						}
					}
					else{
						alone = false;
						var nTile = worldT.tiles[cx][cy];
						if(tile.field != null){
							if(nTile.field != null){
								if(tile.field == nTile.field)
								{
									//do nothing
								}
								else{
									//append fields	
									appendAreas(areas[tile.field], areas[nTile.field]);
								}
							}
							else{
								//add nTile to tile.field
								addToArea(areas[tile.field], nTile.globalPosition);
							}
						}
						else if(nTile.field != null){
							//add tile to nTile.field
							addToArea(areas[nTile.field], tile.globalPosition);
						}
						else{
							//create new field and add both
							var field = new Area();
							field.id = "a"+areas['id']++;
							field.name = "TEMP " + tile.type.toUpperCase() + "AREA";
							field.tiles = [tile.globalPosition, nTile.globalPosition];
							field.type = tile.type;
							areas[field.id] = field;
							areas['totalAmount'] = areas['totalAmount'] + 1;
							areas[field.type]++
							tile.field = nTile.field = field.id;
						}
					} 
				}
			}
			if(alone){
				var field = new Area();
				field.id = "a"+areas['id']++;
				field.name = "TEMP " + tile.type.toUpperCase() + "AREA";
				field.tiles = [tile.globalPosition];
				field.type = tile.type;
				areas[field.id] = field;
				areas['totalAmount'] = areas['totalAmount'] + 1;
				areas[field.type]++
				tile.field = field.id;
			}
		}
	}
	cities = [];
	$.each(areas, function(i, area){
		if(i[0] == "a" && area.type != undefined)
		{
			if(checkedPreviously && area.type == "settlement"){
				area.name = generateRandomPlaceName(area);
				cities.push(i);
			} else 
			if(area.type == "mountain"){
				if(area.tiles.length > 25){ //  && random(100) > 30
					$.each(area.tiles, function(j, coord){
						var tile = lookUpCoord(coord);
						if(tile.depth == 1 && random(area.tiles.length) > area.tiles.length-5){
							riverSources.push(tile.globalPosition);
							return false;
						}/* else if(tile.depth > 5 && random(0,3) == 3){
							tile.volcano = true;
							area.volcano = true;
							//TODO: should affect nearby tiles as well...
						}*/
					});
				}
			}
		}
	});
}

function inBounds(world,x,y){
	return (x >= 0 && x < world.sizeX && y >= 0 && y < world.sizeY);
}


function generateResourcesforTile(type, areaType, tile)
{
	var res = {};
	var keys = Object.keys(resourceData);
	for(var i = keys.length;i--;) 
	{
		if(resourceData[keys[i]].tileType != type) continue;
		if(resourceData[keys[i]].areaType != areaType && resourceData[keys[i]].areaType != 'any') continue;
		var r = random(1000);

		if(areaType == "shallow"){
			r += tile.depth*10;
		} else if(areaType == "depth"){
			r -= tile.depth*10;
		}

		if(r <= resourceData[keys[i]].chance*10)
		{
			res[keys[i]] = random(1,10);
		}
	}
	return res;
}



/*		GENERATE RESOURCES
 *
 *	List of naturally occurring resources: 
 *   Grassland: Cow (shallow), Sheep, Horse (deep), Wheat
 *   Mountain:  Stone, Iron (deep), Copper (deep), Coal (deep) 
 *   Forest: 	Wood (deep), Pigs (shallow)
 *	 Water:		Fish, Drinking water (shallow)
 *	
 */
function generateResources(){
	for(var x = 0; x < world.tiles.length; x++)
	{
		for(var y = 0; y < world.tiles[0].length; y++)
		{
			var tile = world.tiles[x][y];
			var type = tile.type;
			if(tile.depth < 5){
				tile.resources = generateResourcesforTile(type,'shallow', tile);
			}
			else if(tile.depth < 10)
			{
				tile.resources = generateResourcesforTile(type,'medium', tile);
			}
			else
			{
				tile.resources = generateResourcesforTile(type,'deep', tile);
			}
		}
	}
}

function resourceValues(resources)
{
	var res = 0;
	var keys = Object.keys(resources);
	for(var i = keys.length;i--;) 
	{
		if(resourceData[keys[i]] == undefined) continue;
		res += resources[keys[i]]*resourceData[keys[i]].value;
	}
	return res;
}

function determineValue(){
	for(var x = 0; x < world.tiles.length; x++){
		for(var y = 0; y < world.tiles[0].length; y++){
			var tile = world.tiles[x][y];
			var value = 100;
			value += resourceValues(tile.resources);
			tile.value = value;
			tile.baseValue = value;
			world.tiles[x][y] = tile;
		}
	}
	for(var x = 0; x < world.sizeX; x++){
		for(var y = 0; y < world.sizeY; y++){
			var tile = world.tiles[x][y];
			var value = 0;
			for(nX = -2; nX < 3; nX++){
				for(nY = 2; nY > -3; nY--){ 	
					cX = x + nX;
					cY = y + nY;
					if((nY == 0 && nX == 0) || cX < 0 || cY < 0 || cX >= world.sizeX || cY >= world.sizeY){
						continue; //out of bounds
					}
					value += Math.floor(world.tiles[cX][cY].baseValue/5);
				}
			}
			tile.value += value;
			world.tiles[x][y] = tile;
		}
	}
}

function generateRiversRandomly(amount){
	amount = Math.min(riverSources.length,amount);
	rivers = [];
	var waterAreas = [];
	/*$.each(areas, function(name, area){
		if(name[0] == "a" && area.type == "water" && area.tiles.length > 250)
			waterAreas.push(area);
	});*/

	waterAreas.push(areas[world.tiles[0][0].field]);
	waterAreas.push(areas[world.tiles[world.tiles.length-1][0].field]);
				
	for(var i = amount; i--; ){
		var gP = riverSources[i];
		var startTile = world.tiles[gP.x][gP.y];

		var endTile;
		var closest;
		var lowestDistance = Infinity
		$.each(waterAreas, function(name, area){
			var distance1 = euclideanDistance(area.tiles[0], gP);
			var distance2 = euclideanDistance(area.tiles[area.tiles.length-1], gP);
			var place3 = area.tiles[random(1, area.tiles.length-2)];
			var distance3 = euclideanDistance(place3, gP);
			if(distance1 < distance2){
				if(distance1 < distance3){
					if(distance1 < lowestDistance){
						closest = area.tiles[0];
						lowestDistance = distance1;
					}
				} else if(distance3 < lowestDistance){
					closest = place3;
					lowestDistance = distance3;
				}
			} else if(distance2 < distance3){
				if(distance2 < lowestDistance){
					closest = area.tiles[area.tiles.length-1];
					lowestDistance = distance2;
				}
			} else if(distance3 < lowestDistance){
				closest = place3;
				lowestDistance = distance3;	
			}
		});
		if(lowestDistance > 100) continue;
		sendMessage("\nGenerating a river of distance " + Math.round(lowestDistance));
		var riverLength = random(7*lowestDistance+50,10*lowestDistance+250);
		generateRiverFrom(startTile,lookUpCoord(closest),riverLength);
	}
	sendMessage("\nRecalculating depths");
	measureDepth();
}

function generateRiverFrom(start, goal, riverLength){
	goalCond = function(node){
	/*	return node.globalPosition.x == goal.globalPosition.x &&
		node.globalPosition.y == goal.globalPosition.y; */
		return (node.field == goal.field);		
	//	return (node.type == "water") && (node.river || node.field == goal.field);
		return (node.type == "water") && (node.river != undefined || areas[node.field].tiles.length > 10);
	}
	distanceFunc = function(node1,node2){	
		if(node2.type == "water") return 0;
		if(node2.type == "mountain") return Infinity;
		if(node1.type == node2.type){
			var d1 = node1.depth;
			var d2 = node2.depth;
			if(node1.type == "grass"){
				var hill1 = (node1.hill) ? node1.hill : 0;
				var hill2 = (node2.hill) ? node2.hill : 0;
				if(hill2 > hill1)
					return (hill2 - hill1) * 10 + random(0,10);
			}
			if(d1 > d2){
				return 2 + random(0,10);
			}
			else if(d1 == d2){
				if(node1.type == "mountain")
					return 100;
				return 3 + random(0,10);
			}
			else{
				return 4 + random(0,10);
			}
		}
		else if(node1.type == "mountain" && (node2.type == "grass" || node2.type == "forest")){
			return 1;
		}
		else if((node1.type == "grass" || node1.type == "forest") && node2.type == "mountain"){
			return Infinity;
		}
		else if((node1.type == "grass" || node1.type == "forest") && node2.type == "sand"){
			return 1;
		}
		else{
			return 3 + random(0,10);
		}
	}
	function heuristicFunc(node,goal){
		var d = node.depth;
		if(node.type == "mountain") d += depthMax;
		return d * 0.2 + euclideanDistance(goal.globalPosition, node.globalPosition) * 0.8;
		/* return node.depth; */
	}
	function returnFunc(end,goal){
		var path = [end];
		while(end.cameFrom !== undefined){
			path.unshift(end.cameFrom);
			end = end.cameFrom;
			if(end == start) break;
		}

		var stop = false;
		$.each(path, function(i,item){
			if(!stop){
				
				var area = areas[item.field];
				//if(area.type == "water" && area.tiles.length > 250) stop = true;
				if(item.river) stop = true;
				item.type = "water";
				item.depth = 1;
				item.river = true;	
			}
			delete(item.visited);
			delete(item.closed);
			delete(item.h);
			delete(item.f);
			delete(item.g);
			delete(item.cameFrom);
		});
		rivers.push(path);
		lastSeason = -1;
		sendMessage("Generated river of length " + path.length + " , there are now " + rivers.length + " rivers");
		return path;
	}
	function failFunc(){
		sendMessage("Failed to generate a river");
		return null;
	}
	return heapAStar(start,goal,goalCond,distanceFunc,heuristicFunc,returnFunc,failFunc, riverLength);
}

var roads = [];

function generateRoadTo(start,goal,maxLength){
	var goalCond;
	var distanceFunc;
	var heuristicFunc;
	var returnFunc;
	var failFunc;
	goalCond = function(node){
		return (node == goal);
	};
	distanceFunc = distanceBetween;
	heuristicFunc = heuristic;
	returnFunc = function(end){
		var path = [end];
		var connections = [];
		var lastConnection = -1;
		var id = roads.length;
		while(end.cameFrom !== undefined){
			path.push(end.cameFrom); // TODO: push coordinates
			if(end.road !== undefined && end.road){
				if(end.roadIndex != lastConnection && member(end.roadIndex, connections) ==  -1){
					connections.push(end.roadIndex);
					roads[end.roadIndex].connections.push(id);
					lastConnection = end.roadIndex;
				}
			}
			end.road = true;
			end.roadIndex = id;
			end = end.cameFrom;
			if(end == start) break;
		}

		var fromCity = areas[start.field];
		var toCity = areas[goal.field];

		if(fromCity.roads === undefined || fromCity.roads.length === 0) sendMessage("From roads empty");
		if(toCity.roads === undefined || toCity.roads.length === 0) sendMessage("toCity roads empty");

		$.each(fromCity.roads, function(i,val){
			if(val != id && val != lastConnection && member(val, connections) == -1){
				if(!roads[val]){
					sendMessage("Check id: " + val + " in world.roads");
				} else {
					roads[val].connections.push(id);
					connections.push(val);	
				}
			}
			else{
				sendMessage("Check id: " + val != id + ", not pushed: " + val != lastConnection + ", not member: " + member(val, connections));
			}
		});
		
		$.each(toCity.roads, function(i,val){
			if(val != id && val != lastConnection && member(val, connections) == -1){
				connections.push(val);
				roads[val].connections.push(id);
			}
			else sendMessage(val != id + " " + val != lastConnection + " " + member(val, connections));
		});

		var road = {"id":id, "connections" : connections,  "path" : path, "from" : fromCity,
					 "to" : toCity};

		$.each(road.path, function(i,item){
			delete(item.visited);
			delete(item.closed);
			delete(item.h);
			delete(item.f);
			delete(item.g);
			delete(item.cameFrom);
		});
		roads.push(road);
		return road;
	};
	failFunc = function(){return null;};
	return heapAStar(start,goal,goalCond,distanceFunc,heuristicFunc,returnFunc,failFunc,maxLength); //returns returnFunc(end);
}

function generateRoads(){
	//for now I'm just picking cities at random...

	var i;
	var abandon = 0;
	for(i = 0; i < cities.length; i++) areas[cities[i]].roads = [];
	for(i = 0; i < cities.length-1; i++){
		var startCity = areas[cities[i]];
		var goalCity = areas[cities[(i + 1) % cities.length]];
		var start = lookUpCoord(startCity.tiles[0]);
		var x1 = start.globalPosition.x;
		var y1 = start.globalPosition.y;
		var goal = lookUpCoord(goalCity.tiles[0]);
		var x2 = goal.globalPosition.x;
		var y2 = goal.globalPosition.y;
		sendMessage("    Working on road " + i + " from ("+x1+","+y1+") to ("+x2+","+y2+")");
		if(heuristic(start,goal) < 100){
			var road = generateRoadTo(start,goal,1000);
			if(road != []){
				startCity.roads.push(road.id);
				goalCity.roads.push(road.id);
			}
		}
		else{
			sendMessage("    Abandoned work on road, as it was deemed too expensive");
			abandon++;
		}
	}
	sendMessage("Generated " + (i - abandon) + " roads")
	lastSeason = -1;
}