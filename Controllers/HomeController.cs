using System;
using System.Collections.Generic;
using System.Linq;
using System.Web;
using System.Web.Mvc;
using WorldGen.Classes;

namespace WorldGen.Controllers
{
    public class HomeController : Controller
    {
        public ActionResult Index()
        {
            var World = new World(1000, 1000, 32);
            ViewBag.WorldMap = World.First().ToString();
            return View();
        }       
    }
}
