using System;
using System.Collections.Generic;
using System.Linq;
using System.Web;

namespace WorldGen.Classes
{
    public class World
    {
    List<Map> maps = new List<Map>();
    int tileSize;
    public World(int width, int height, int tilesize) {
        this.maps.Add(new Map(width,height));
    }
    //this.dynasty = {};
    //this.options = {};
    //this.areas = {};
    //this.people = [];
    //this.cities = [];
    //this.cultures = [];
    //this.roads = [];
    //this.rivers = [];
    }
}