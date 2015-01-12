function analyseCity(city){
	var pop = 0;
	var xTot = 0;
	var yTot = 0;
	var xMin = Infinity;
	var xMax = -1;
	var yMin = Infinity;
	var yMax = -1;
	
	var food = 0;
	var drink = 0;

	for(var k = 0; k < city.tiles.length; k++){
		var tile = lookUpCoord(city.tiles[k]);
		if(tile.population !== undefined) pop += tile.population;
		var x = city.tiles[k].x;
		var y = city.tiles[k].y;
		xTot += x;
		yTot += y;
		if(x < xMin){ xMin = x; }
		if(x > xMax){ xMax = x; }
		if(y < yMin){ yMin = y; }
		if(y > xMax){ yMax = y; }
	}
	city.population = pop;

	getAllResources(city);

	$.each(city.allResources, function(name,amount){
		food += amount * resourceData[name].foodValue;
		drink += amount * resourceData[name].drinkValue;
	});

	city.food = food;
	city.drink = drink;
	city.density = city.population / city.tiles.length;
	var xMean = xTot / city.tiles.length;
	var yMean = yTot / city.tiles.length;
	var radius = Math.max ((xMean - xMin), (yMean - yMin), (xMax - xMean), (yMax - yMean));
	city.center = {"x":xMean,"y":yMean};
	city.radius = radius;

	var farmableTiles = [];
	var forestTiles = [];
	var waterTiles = [];
	var mountainTiles = [];
	var farmableResources = "wheat, rice, corn".split(", ");
	
	for(var i = 0; i < city.vicinity.length; i++){
		var coord = city.vicinity[i];
		var tile = lookUpCoord(coord);
		if(tile.type == "grass" && !tile.road){
			farmableTiles.push(coord);
			var resources = tile.resources;

			for(var j = 0; j < farmableResources.length; j++){
				var resource = farmableResources[j];
				if(resources[resource]){
					tile.farm = {type:resource, value:resources[resource]};
					break;
				}
			}
		} else if(tile.type == "mountain"){
			mountainTiles.push(coord);
		} else if(tile.type == "forest"){
			forestTiles.push(coord);
		} else if(tile.type == "water"){
			waterTiles.push(coord);
			var area = world.areas[tile.field];
			if(!area.ports) area.ports = [];
			if(!city.ports) city.ports = [];
			var found = false;
			for(var j = 0; j < city.ports.length; j++){
				if(city.ports[j] == area.id){
					found = true;
					break;
				}
			}
			if(!found){
				area.ports.push(city.id);
				city.ports.push(area.id);
			}
		}
	}

	city.forestTiles = forestTiles;
	city.farmableTiles = farmableTiles;
	city.waterTiles = waterTiles;
	city.mountainTiles = mountainTiles;
}

function increaseCityDetail(city){
	for(var i = 0; i < city.tiles.length; i++){
		var tile = city.tiles[i];
		tile.subTiles = [{x:0,y:0},{x:1,y:0},{x:0,y:1},{x:1,y:1}];
	}
}

function getAllResources(city){
	if(!city.resources) getResources(city);
	if(!city.vicinity) getCityRange(city);
	if(!city.nearbyResources) getResources(city,true);
	return city.allResources = combine(city.resources, city.nearbyResources);
}

function getResources(city, vicinity){
	var resources = {};
	var array = city.tiles;
	if(vicinity) array = city.vicinity;
	$.each(array, function(i,tile){
		tile = lookUpCoord(tile);
		$.each(tile.resources, function(name,amount){
			if(resources[name]){
				resources[name] += amount;
			}
			else{
				resources[name] = amount;
			}
		}); 
	});
	if(vicinity) return city.nearbyResources = resources;
	return city.resources = resources;
}

function getVicinity(city){
	var vicinity = [];
	$.each(city.tiles, function(i,val){
		var tile = lookUpCoord(val);
		var r = val;
		if(tile.borders != null){
			$.each(tile.borders, function(k, val2){
				try{
					var t;
					if(val2 == "left"){
						t = lookUpCoord(r.x - 1, r.y);
					}
					else if(val2 == "below"){
						t = lookUpCoord(r.x, r.y + 1);
					}
					else if(val2 == "above"){
						t = lookUpCoord(r.x, r.y - 1);
					}
					else if(val2 == "right"){
						t = lookUpCoord(r.x + 1, r.y);
					}
					vicinity.push(t.globalPosition);
				}
				catch(e){//coordinate was (most likely) out of bounds
				}
			});
		}
	});
	return city.vicinity = vicinity;
}

function calculateDistances(){
	forEachCity(function(city){
	   city.nearestDistance = distanceToNearestCity(city);
	});
}

function distanceToArea(a1,a2){
	//not necessarily the shortest distance...
	var tile1 = a1.tiles[0];
	var tile2 = a2.tiles[0];
	if(!tile1) return Infinity;
	if(!tile2) return Infinity;
	return euclideanDistance(a1.tiles[0], a2.tiles[0]);
}

function nearestArea(city, type){
	var dist = Infinity;
	var nearest;
	if(type == "river" || type == "road"){
		$.each(world[type + "s"], function(i,val){
			var array = (type == "road") ? val.path : val;
			var t = euclideanDistance(city.tiles[0], array[0].globalPosition);
			if(t < dist){
				dist = t;
				nearest = i;
			}
		});
	}
	else{
		forEachArea(function(area){
			if(area.type == type && area.id != city.id){
				var t = distanceToArea(city,area);
				if(t < dist){
					dist = t;
					nearest = area.id;
				}
			}
		});
	}
	return {"distance":dist, "nearest":nearest};
}

function findNearestAreas(city){
	var a = ["mountain", "river", "water", "grass", "forest", "road"];
	$.each(a, function(i,val){
		city["nearest" + val[0].toUpperCase() + val.substr(1)] = nearestArea(city,val);	
	});
	city.nearestNeighbours = distanceToNearestCity(city,true);
}

function getCityRange(city){
	var vicinity = [];
	if(city.vicinity) vicinity = city.vicinity;
	function add(tile, energy){
		if(tile.type == "settlement") return;
		var unique = true;
		var pos = tile.globalPosition;
		var index = -1;
		$.each(vicinity, function(i,val){
			index = i;
			return (unique = !(pos.x == val.x && pos.y == val.y));
		});
		if(unique){
			pos.e = energy;
			vicinity.push(pos);
		}
		var e = energy - getEnergy(tile);
		if(e <= 0) return;
		if(!unique){
			if(vicinity[index].e >= e) return; //already found a cheaper path to this tile.
			vicinity[index].e = e;
		}
		continueFrom(tile, e);
	};
	function continueFrom(tile, energy){
		$.each(tile.neighbours, function(i,val){
			add(lookUpCoord(val[0],val[1]), energy);
		});
	};
	function getEnergy(tile){
		if(tile.road) return 0.5;
		var cost = costs[tile.type];
		if(!cost) return 1.75;
		return cost;
	}																//was 6
	var costs = {"water":2.5, "forest":2, "mountain":5, "settlement":Infinity};
	
	var startEnergy = 5;
	if(city.tiles.length < 5)
		startEnergy = 3;
	else if(city.tiles.length > 10)
		startEnergy = 7;

	$.each(city.tiles, function(i,val){
		var tile = lookUpCoord(val);
		var r = val;
		if(tile.borders != null){
			$.each(tile.borders, function(k, val2){
				try{
					var t;
					if(val2 == "left"){
						t = lookUpCoord(r.x - 1, r.y);
					}
					else if(val2 == "below"){
						t = lookUpCoord(r.x, r.y + 1);
					}
					else if(val2 == "above"){
						t = lookUpCoord(r.x, r.y - 1);
					}
					else if(val2 == "right"){
						t = lookUpCoord(r.x + 1, r.y);
					}
					add(t, startEnergy); //was t, 5
				}
				catch(e){//coordinate was (most likely) out of bounds
				}
			});
		}
	});
	return city.vicinity = vicinity;
}

function makeRoadNetworks(road, system){
	system = (system) ? system : world.roads;
	//not exactly an optimal solution
    if(road.destinations)
        return road.destinations;
    
    function merge(obj1,obj2){
        var res = obj2;
        $.each(obj1, function(i,val){
            var different = true;
            $.each(obj2, function(k,val2){
                if(val == val2)
                    return different = false;
            });
            if(different){
                res.push(val);
            }
        });
        obj1 = res;
        return obj2 = res;
    };

    var destinations = road.destinations = [road.to.id,road.from.id];
    if(road.connections){
        $.each(road.connections, function(i,val){
            var connectingRoad = system[val];
            road.destinations = merge(destinations,  makeRoadNetworks(connectingRoad, system));
        });
    }
    return road.destinations;
}

//$.each(world.roads, function(i,r){makeRoadNetworks(r);});


function Factory(location, inArea, outArea, inResource, outResource){
	this.location = location;
	this.inArea = inArea;
	this.outArea = outArea;
	this.inResource = inResource;
	this.outResource = outResource;
	this.depletes = true;
}

function workFactory(factory){
	var inArea = world.areas[factory.inArea];
	var foundResource = false;
	$.each(inArea.tiles, function(i,tile){
		if(tile.resources[inResource]){
			if(depletes){
				tile.resources[inResource]--;
				if(tile.resources[inResource] <= 0){
					delete(tile.resources[inResource]);
				}
			}
			foundResource = true;
			return false;
		}
	});
	if(foundResource){
		if(!outArea.useableResources[outResource]) return outArea.useableResources[outResource] = 1;
		return outArea.allResources[outResource]++;
	}
}

var recipes = {
	"food" : [["cow"], ["pig"], ["horse"], ["wheat"], ["rice"], ["fish"]],
};

function placeFactory(city, wantedResource){
	var factory;
	var alternatives = recipes[wantedResource];
	$.each(alternatives, function(i,resources){
		var haveAll = resources.length;
		var locations = []; //areas
		$.each(resources, function(k, resource){
			if(city.allResources[resource]){
				haveAll--;
				var str = resourceData[resource].tileType;
				str = str[0].toUpperCase() + str.substr(1);
				locations.push(city["nearest" + str].nearest); //don't do this..
			}
		});
		if(haveAll == 0){
			var location;
			var foundLocation = false;
			$.each(city.vicinity, function(i,loc){
				var tile = lookUpCoord(loc);
				if(tile.factory) return true;
				if(tile.type == "grass"){
					location = tile;
					foundLocation = true;
					tile.factory = true;
					return false;
				}
			});
			if(foundLocation){
				factory = new Factory(location, locations, city, resources, wantedResource);
				return false;
			}
		}
	});
	return factory;
}

function distanceToNearestCity(city,cultureCheck){
	cultureCheck = !!cultureCheck; //Default to false
	var dist = Infinity;
	var nearest;
	var distDiff = (cultureCheck) ? Infinity : -1;
	var nearestOther;
	forEachCity(function(val){
	   if(val.id != city.id){
		 var sameCulture = (val.cultureID == city.cultureID); 
		 var t = euclideanDistance(city.center, val.center);
		 if(t < dist && (!cultureCheck || sameCulture)){
			dist = t;
			nearest = val.id;
		 }
		 else if(t < distDiff && !sameCulture)
		 {
			distDiff = t;
			nearestOther = val.id;
		 }
	   }
	});
	var res = {"distance":dist,"nearest":nearest};
	if(cultureCheck) return {"same":res, "other":
		{"distance":distDiff, "nearest":nearestOther}};
	return res;	
}

function cityScreen(city){
	city = (typeof city == "string") ? world.areas[city] :
			((typeof city == "number") ? world.areas[world.cities[city]] : city); 
	var name = $("<h1>").text(city.name).addClass("cityName");
	var population = $("<span>").text(city.population).addClass("cityPop");
	var density = $("<span>").text(Math.round(city.density) + " per tile").addClass("cityDensity");
	var culture = $("<span>").text(city.cultureID).addClass("cityCulture");
	var header = $("<div>").append(name, population, density, culture);
	var resources = $("<div>").addClass("cityResources");
	resources.append($("<span>").text("Resources:").addClass("header"));

	var index;

	$.each(world.cities, function(i, id){
		if(id == city.id){
			index = i;
			return false;
		}
	});

	var next = $("<span>").text(" > ").click(function(){
		var nextCity = world.areas[world.cities[index + 1 % world.cities.length]];
		zoomInOn(lookUpCoord(nextCity.tiles[0]), 24);
		showCityScreen(cityScreen(nextCity));
	}).addClass("link");
	var prev = $("<span>").text(" < ").click(function(){
		var prevCity = world.areas[world.cities[((index - 1) + world.cities.length) % world.cities.length]];
		zoomInOn(lookUpCoord(prevCity.tiles[0]), 24);
		showCityScreen(cityScreen(prevCity));
	}).addClass("link");

	header.append(prev, next);

	var inner = $("<div>");

	var show = $("<span>").text("(hide)").click(function(){
		if(inner.hasClass("hidden")){
			$(this).text("(hide)");
		} else {
			$(this).text("(show)");
		}

		inner.toggleClass("hidden");
	});
	$.each(city.allResources, function(name, amount){
		var realName = resourceData[name].name;
		var n = $("<div>").addClass("resource").append(
			$("<span>").text(realName),
			$("<span>").text(amount)
		);
		inner.append(n);
	});

	resources.append(show, inner);

	// FACTS

	var facts = $("<div>").addClass("facts");
	facts.append($("<span>").text("Facts:").addClass("header"));

	var inner3 = $("<div>").addClass("hidden");
	
	var show3 = $("<span>").text("(show)").click(function(){
		if(inner.hasClass("hidden")){
			$(this).text("(hide)");
		} else {
			$(this).text("(show)");
		}

		inner3.toggleClass("hidden");
	});

	$.each(city.facts, function(name, fact){
		if(fact.inEffect)
			inner3.append($("<div>").text(name));		
	});
	facts.append(show3, inner3);
		
	// HISTORY

	var history = $("<div>").addClass("cityHistory");
	history.append($("<span>").text("History:").addClass("header"));

	var inner2 = $("<div>").addClass("hidden");
	
	var show2 = $("<span>").text("(show)").click(function(){
		if(inner.hasClass("hidden")){
			$(this).text("(hide)");
		} else {
			$(this).text("(show)");
		}

		inner2.toggleClass("hidden");
	});

	$.each(city.history, function(year, events){
		var start = events.eventsStart;
		var end = events.eventsEnd;
		year = (year < 0) ? (-year) + " BCE" : year;
		$.each(start, function(i, event){
			var type = event.event;
			var id = event.id;
			var h = $("<div>").addClass("historyItem").attr("id", id);
			var years = $("<span>").addClass("historyYears").append(
							"(",
							$("<span>").addClass("yearStart").text(year),
							" - ",
							$("<span>").addClass("yearEnd"),
							")"
						); 
			h.append(
				$("<span>").addClass("historyName").text(type),
				years
				);
			inner2.append(h);
		});
		$.each(end, function(i, event){
			var id = event.id;
			inner2.find("[id='"+id+"'] .yearEnd").text(year);
		});
	});
	history.append(show2, inner2);

	var close = $("<div>").text("close").click(function(i){
		$("canvas").show();
		$(".cityScreen").remove();	
	}).addClass("close").css("left","47%");
	return $("<div>").addClass("cityScreen").append(header, resources, facts, history, close);
}

function showCityScreen(screen){
	$(".cityScreen").remove();
	$("#tileInfo").hide();
	$("#MenuDisplay").hide();

	var top = 0.07*($("body").height());
	var left = 0.05*($("body").width());
	$(screen).css({"top":top,"left":left});
	$("#newPlayer").append(screen);
}

function jarvis(S){
	var pointOnHull = S[0];
	$.each(S, function(j, point){
		if(point.x < pointOnHull.x){
			pointOnHull = point;
		}
	});

	var i = 0;
	var P = [pointOnHull];
	var endPoint;
	while(endPoint != P[0]){
		P[i] = pointOnHull;
		var endPoint = S[0];	// initial endPoint for a candidate edge on the hull
		$.each(S, function(j, point){			//S[j] is on left of line from P[i] to endPoint
			if(endPoint == pointOnHull || (((endPoint.x - P[i].x)*(point.y - P[i].y) - (endPoint.y - P[i].y)*(point.x - P[i].x)) > 0))
	        	endPoint = point;   // found greater left turn, update endPoint
		});
		i++;
		pointOnHull = endPoint;
	} // wrapped around to first hull point
	return P;
}

