using System;
using System.Collections.Generic;
using System.Linq;
using System.Web;

namespace WorldGen.Classes
{
    public class platemap : List<plate>
    {
        public platemap(int count)
        {
            this.Capacity = count;
        }
    }
}