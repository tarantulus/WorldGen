using System;
using System.Collections.Generic;
using System.Linq;
using System.Web;
using System.Drawing;

namespace WorldGen.Classes
{
    public class Tile
    {
        public Point location;        
        public TileType type;
        public List<Point> neighbours;
        public Tile()
        {

        }
    }
    public enum TileType{
        grass,
        water,
        forest,
        mountain,
        settlement        
    }
}