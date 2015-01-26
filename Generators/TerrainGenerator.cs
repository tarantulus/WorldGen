using System;
using System.Collections.Generic;
using System.Linq;
using System.Web;
using System.Drawing;
using WorldGen.Classes;
using Rei.Random;

namespace WorldGen.Generators
{
    public class TerrainGenerator
    {
        private Random _random = new Random();
        private Map _currentMap;
        private Point _centre;
        private int _radius;

        public TerrainGenerator(Map map)
        {
            
            _currentMap = map;
            _centre = new Point(_currentMap.width / 2, _currentMap.height / 2);
            _radius = (_currentMap.width / 2) - 2;
            GeneratePrimordial();
        }
        public void GeneratePrimordial(){

            
            for (int y = 0; y < _currentMap.height; y++)
            {
                for (int x = 0; x < _currentMap.width; x++)
                {
                    {
                        var location = new Point(x,y);
                        _currentMap.Add(EuclideanDistance(location, _centre) > _radius - 12 ?
                            new Tile { location = location, type = TileType.grass } :
                            new Tile { location = location, type = TileType.water });                         
                    }
                }
            }
        }

        public static double EuclideanDistance(Point p1, Point p2)
        {
            return Math.Sqrt(Math.Pow(p1.X - p2.X, 2) + Math.Pow(p1.Y - p2.Y, 2));
        }

        public void getNeighbours(Tile tile)
        {
            			for(int nX = -1; nX < 2; nX++){
				for(int nY = 1; nY > -2; nY--){ 		
					int cX = tile.location.X + nX;
					int cY = tile.location.Y + nY;
					if((nY == 0 && nX == 0) || cX < 0 || cY < 0 || cX >= _currentMap.width || cY >= _currentMap.height){
						continue; //out of bounds
					}
					else{
						tile.neighbours.Add(new Point(cX,cY));
					}
				}
			}
        }
    }
}