using System;
using System.Collections.Generic;
using System.Linq;
using System.Web;

namespace WorldGen.Classes
{
    public class Map : List<Tile>
    {
        public int width;
        public int height;
        public int seed;

        public Map(int width, int height)
        {
            this.height = height;
            this.width = width;            
        }
    }
}