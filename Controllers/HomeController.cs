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
            var World = new World(10,10,32);
            ViewBag.Map = World[0].ToString();
            return View();
        }       
    }
}
