function personScreen(person){
	
	var name = $("<h1>").text(person.name).addClass("personName");
	var gender;
	var age = $("<span>").text(person.age).addClass("personAge");
	var born = $("<span>").text(person.DoB).addClass("personDoB");
	var city = world.areas[lookUpCoord(person.location).field];
	var location = $("<span>").text(city.name).addClass("personLocation", "link")
	.click(function(){
		showCityScreen(city);
	});
	
	var header = $("<div>").append(name, age, born, location);
	/*
	var resources = $("<div>").addClass("cityResources");
	resources.append($("<span>").text("Resources:").addClass("header"));

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
	*/
	var close = $("<div>").text("close").click(function(i){
		$("canvas").show();
		$(".cityScreen").remove();	
	}).addClass("close").css("left","47%");
	return $("<div>").addClass("personScreen").append(header, close);
}

function showPersonScreen(screen){
	$(".cityScreen").remove();
	$(".personScreen").remove();
	$("#tileInfo").hide();
	$("#MenuDisplay").hide();

	var top = 0.07*($("body").height());
	var left = 0.05*($("body").width());
	$(screen).css({"top":top,"left":left});
	$("#newPlayer").append(screen);
}