(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
"use strict;"

/* Classes */
const Game = require('./game.js');
const Player = require('./player.js');
const Laser = require('./laser.js');
const Asteroid = require('./asteroid.js');
const Vector = require('./vector.js');

/* Global variables */
var canvas = document.getElementById('screen');
var game = new Game(canvas, update, render);
var player = new Player({x: canvas.width/2, y: canvas.height/2}, canvas);
var lives = 3;
var score = 0;
var level = 0;
var lasers = [];
var asteroids = [];

var laserSound = new Audio();
var asteroidSound = new Audio();
var deathSound = new Audio();
laserSound.src = 'assets/laser.wav';
asteroidSound.src = 'assets/asteroid.wav';
deathSound.src = 'assets/death.wav';

function levelUp() {
	level += 1;
	score *= 2;
	lasers = [];
	for(var i = 0; i < 9 + level; i++) {
		asteroids.push(new Asteroid(Math.random() * 15 + 15, {x: Math.random() * 600, y: Math.random() * 450}, {x: Math.random() * .2 - .1, y: Math.random() * .2 - .1}, 0, canvas));
	}
}
levelUp();

	/**
	 * @function masterLoop
	 * Advances the game in sync with the refresh rate of the screen
	 * @param {DOMHighResTimeStamp} timestamp the current time
	 */
var masterLoop = function(timestamp) {
	game.loop(timestamp);
	window.requestAnimationFrame(masterLoop);
}
masterLoop(performance.now());

window.onkeydown = function(event) {	
	switch(event.key) {
		case 'ArrowUp': // up
		case 'w':
			player.thrusting = true;
			break;
		case 'ArrowLeft': // left
		case 'a':
			player.steerLeft = true;
			break;
		case 'ArrowRight': // right
		case 'd':
			player.steerRight = true;
			break;
		case ' ':
			lasers.push(new Laser(player.angle + Math.PI / 2, {x: player.position.x, y: player.position.y}, canvas));
			laserSound.play();
			break;
	}
}

window.onkeyup = function(event) {
	switch(event.key) {
		case 'ArrowUp': // up
		case 'w':
			player.thrusting = false;
			break;
		case 'ArrowLeft': // left
		case 'a':
			player.steerLeft = false;
			break;
		case 'ArrowRight': // right
		case 'd':
			player.steerRight = false;
			break;
	}
}



	/**
	 * @function update
	 * Updates the game state, moving
	 * game objects and handling interactions
	 * between them.
	 * @param {DOMHighResTimeStamp} elapsedTime indicates
	 * the number of milliseconds passed since the last frame.
	 */
function update(elapsedTime) {
	//Update player
	player.update(elapsedTime);

	//Update lasers
	lasers = lasers.filter(function(laser) {
		laser.update(elapsedTime);
		return laser.alive;
	});

	//Update asteroids
	asteroids = asteroids.filter(function(asteroid) {
		asteroid.update(elapsedTime);
		return asteroid.alive;
	});

	var active = [];
	var potentiallyColliding = [];

	//Asteroid collisions
	asteroids.forEach(function(asteroid) {

		var shipx = clamp(asteroid.position.x, player.position.x, player.position.x + 10);
		var shipy = clamp(asteroid.position.y, player.position.y, player.position.y + 10);
		var dx =
			Math.pow(shipx - asteroid.position.x, 2) +
			Math.pow(shipy - asteroid.position.y, 2);
		if(dx < Math.pow(asteroid.radius, 2)) {
			lives -= 1;
			asteroid.alive = false;
			deathSound.play();
			return;
		}

		lasers.forEach(function(laser) {
			var rx = clamp(asteroid.position.x, laser.position.x, laser.position.x + laser.width);
			var ry = clamp(asteroid.position.y, laser.position.y, laser.position.y + laser.height);
			var distanceSquared =
				Math.pow(rx - asteroid.position.x, 2) +
				Math.pow(ry - asteroid.position.y, 2);
			if(distanceSquared < Math.pow(asteroid.radius, 2)) {
				score += 10;
				asteroid.alive = false;
				laser.alive = false;
				return;
			}
		});

		active = active.filter(function(asteroidCol) {
			return (asteroid.position.x - asteroidCol.position.x) < (asteroid.radius + asteroidCol.radius);
		});	

		active.forEach(function(asteroidCol) {
			potentiallyColliding.push({a: asteroidCol, b: asteroid});
		});

		active.push(asteroid);
	});

	var collisions = [];
	potentiallyColliding.forEach(function(pair) {
		var distSquared = 
			Math.pow(pair.a.position.x - pair.b.position.x, 2) +
			Math.pow(pair.a.position.y - pair.b.position.y, 2);

		if(distSquared < Math.pow(pair.a.radius + pair.b.radius, 2)) {
			collisions.push(pair);
		}
	});

	collisions.forEach(function(pair) {	
		var collisionNormal = {
			x: pair.a.position.x - pair.b.position.x,
			y: pair.a.position.y - pair.b.position.y
		};

		var overlap = pair.a.radius + pair.b.radius + 2 - Vector.magnitude(collisionNormal);
		collisionNormal = Vector.normalize(collisionNormal);

		pair.a.position.x += collisionNormal.x * overlap / 2;
		pair.a.position.y += collisionNormal.y * overlap / 2;
		pair.b.position.x -= collisionNormal.x * overlap / 2;
		pair.b.position.y -= collisionNormal.y * overlap / 2;

		var angle = Math.atan2(collisionNormal.y, collisionNormal.x);
		var a = Vector.rotate(pair.a.velocity, angle);
		var b = Vector.rotate(pair.b.velocity, angle);

		var tmp = a.x;
		a.x = b.x;
		b.x = tmp;
		a = Vector.rotate(a, -angle);
		b = Vector.rotate(b, -angle);
		pair.a.velocity.x = a.x;
		pair.a.velocity.y = a.y;
		pair.b.velocity.x = b.x;
		pair.b.velocity.y = b.y;
		asteroidSound.play();
	});

	if(asteroids.length == 0) {
		levelUp();
	}
}

function clamp(a,b,c) {
	return Math.min(Math.max(a, b), c);
}

	/**
	 * @function render
	 * Renders the current game state into a back buffer.
	 * @param {DOMHighResTimeStamp} elapsedTime indicates
	 * the number of milliseconds passed since the last frame.
	 * @param {CanvasRenderingContext2D} ctx the context to render to
	 */
function render(elapsedTime, ctx) {
	ctx.fillStyle = "black";
	ctx.fillRect(0, 0, canvas.width, canvas.height);	

	player.render(elapsedTime, ctx);

	asteroids.forEach(function(asteroid) {
		asteroid.render(elapsedTime, ctx);
	});

	lasers.forEach(function(laser) {
		laser.render(elapsedTime, ctx);
	});

	for(var i = 0; i < lives; i++) {
		ctx.save();
		ctx.translate(20 + i * 30, 450);
		ctx.beginPath();
		ctx.moveTo(0, -10);
		ctx.lineTo(-10, 10);
		ctx.lineTo(0, 0);
		ctx.lineTo(10, 10);
		ctx.closePath();
		ctx.strokeStyle = 'white';
		ctx.stroke();
		ctx.restore();
	}

	ctx.fillStyle = 'white';
	ctx.font = "18px Arial";
	ctx.fillText("Score: " + score, 120, 460);
	ctx.fillText("Level: " + level, 250, 460);
}

},{"./asteroid.js":2,"./game.js":3,"./laser.js":4,"./player.js":5,"./vector.js":6}],2:[function(require,module,exports){
module.exports = exports = Asteroid;

var image = new Image();
image.src = 'assets/asteroids.png';

var MASS_CONSTANT = 1;

function Asteroid(radius, position, initialVelocity, initialAngle, canvas) {
	this.worldWidth = canvas.width;
	this.worldHeight = canvas.height;
	this.radius = radius;
	this.mass = 4 / 3 * Math.PI * Math.pow(radius, 3) * MASS_CONSTANT;
	this.position = position;
	this.velocity = initialVelocity;
	this.angle = initialAngle;
	this.alive = true;
}

Asteroid.prototype.update = function(elapsedTime) {
	this.position.x += elapsedTime * this.velocity.x;
	this.position.y += elapsedTime * this.velocity.y;

	if(this.position.x < 0) this.position.x += this.worldWidth;
	if(this.position.x > this.worldWidth) this.position.x -= this.worldWidth;
	if(this.position.y < 0) this.position.y += this.worldHeight;
	if(this.position.y > this.worldHeight) this.position.y -= this.worldHeight;
}

Asteroid.prototype.render = function(elapsedTime, ctx) {
	if(this.alive) {
		ctx.save();
		ctx.translate(-15, -15);
		ctx.rotate(this.angle);
		ctx.translate(this.position.x, this.position.y);
		ctx.drawImage(
			image,
			0, 0, 75, 75,
			0, 0, this.radius*2, this.radius*2
		);	
		ctx.restore();
	}
}

},{}],3:[function(require,module,exports){
"use strict";

/**
 * @module exports the Game class
 */
module.exports = exports = Game;

/**
 * @constructor Game
 * Creates a new game object
 * @param {canvasDOMElement} screen canvas object to draw into
 * @param {function} updateFunction function to update the game
 * @param {function} renderFunction function to render the game
 */
function Game(screen, updateFunction, renderFunction) {
  this.update = updateFunction;
  this.render = renderFunction;

  // Set up buffers
  this.frontBuffer = screen;
  this.frontCtx = screen.getContext('2d');
  this.backBuffer = document.createElement('canvas');
  this.backBuffer.width = screen.width;
  this.backBuffer.height = screen.height;
  this.backCtx = this.backBuffer.getContext('2d');

  // Start the game loop
  this.oldTime = performance.now();
  this.paused = false;
}

/**
 * @function pause
 * Pause or unpause the game
 * @param {bool} pause true to pause, false to start
 */
Game.prototype.pause = function(flag) {
  this.paused = (flag == true);
}

/**
 * @function loop
 * The main game loop.
 * @param{time} the current time as a DOMHighResTimeStamp
 */
Game.prototype.loop = function(newTime) {
  var game = this;
  var elapsedTime = newTime - this.oldTime;
  this.oldTime = newTime;

  if(!this.paused) this.update(elapsedTime);
  this.render(elapsedTime, this.frontCtx);

  // Flip the back buffer
  this.frontCtx.drawImage(this.backBuffer, 0, 0);
}

},{}],4:[function(require,module,exports){
module.exports = exports = Laser;

var VELOCITY_CONSTANT = 10;

function Laser(angle, position, canvas) {
	this.worldWidth = canvas.width;
	this.worldHeight = canvas.height;
	this.width = 30;
	this.height = 10;
	this.angle = angle;
	this.position = position;
	this.alive = true;
	this.velocity = {x: Math.cos(-this.angle) * VELOCITY_CONSTANT, y: Math.sin(-this.angle) * VELOCITY_CONSTANT}
}

Laser.prototype.update = function(elapsedTime) {

	this.position.x += this.velocity.x;
	this.position.y += this.velocity.y;

	if((this.position.x < 0)
		|| (this.position.x > this.worldWidth)
		|| (this.position.y < 0)
		|| (this.position.y > this.worldHeight))
	{
		this.alive = false;
	}	
}

Laser.prototype.render = function(elapsedTime, ctx) {
	if(this.alive) {
		ctx.save();
		ctx.translate(this.position.x, this.position.y);
		ctx.rotate(-this.angle);	
		ctx.fillStyle = 'red';
		ctx.fillRect(
			0, 0, this.width, this.height
		);	
		ctx.restore();
	}
}

},{}],5:[function(require,module,exports){
"use strict";

const MS_PER_FRAME = 1000/8;

/**
 * @module exports the Player class
 */
module.exports = exports = Player;

/**
 * @constructor Player
 * Creates a new player object
 * @param {Postition} position object specifying an x and y
 */
function Player(position, canvas) {
  this.worldWidth = canvas.width;
  this.worldHeight = canvas.height;
  this.state = "idle";
  this.position = {
    x: position.x,
    y: position.y
  };
  this.velocity = {
    x: 0,
    y: 0
  }
  this.angle = 0;
  this.radius  = 64;
  this.thrusting = false;
  this.steerLeft = false;
  this.steerRight = false;
}
  var self = this;
  


/**
 * @function updates the player object
 * {DOMHighResTimeStamp} time the elapsed time since the last frame
 */
Player.prototype.update = function(time) {
  // Apply angular velocity
  if(this.steerLeft) {
    this.angle += time * 0.005;
  }
  if(this.steerRight) {
    this.angle -= 0.1;
  }
  // Apply acceleration
  if(this.thrusting) {
    var acceleration = {
      x: Math.sin(this.angle),
      y: Math.cos(this.angle)
    }
    this.velocity.x -= acceleration.x;
    this.velocity.y -= acceleration.y;
  }
  // Apply velocity
  this.position.x += this.velocity.x;
  this.position.y += this.velocity.y;
  // Wrap around the screen
  if(this.position.x < 0) this.position.x += this.worldWidth;
  if(this.position.x > this.worldWidth) this.position.x -= this.worldWidth;
  if(this.position.y < 0) this.position.y += this.worldHeight;
  if(this.position.y > this.worldHeight) this.position.y -= this.worldHeight;
}

/**
 * @function renders the player into the provided context
 * {DOMHighResTimeStamp} time the elapsed time since the last frame
 * {CanvasRenderingContext2D} ctx the context to render into
 */
Player.prototype.render = function(time, ctx) {
  ctx.save();

  // Draw player's ship
  ctx.translate(this.position.x, this.position.y);
  ctx.rotate(-this.angle);
  ctx.beginPath();
  ctx.moveTo(0, -10);
  ctx.lineTo(-10, 10);
  ctx.lineTo(0, 0);
  ctx.lineTo(10, 10);
  ctx.closePath();
  ctx.strokeStyle = 'white';
  ctx.stroke();

  // Draw engine thrust
  if(this.thrusting) {
    ctx.beginPath();
    ctx.moveTo(0, 20);
    ctx.lineTo(5, 10);
    ctx.arc(0, 10, 5, 0, Math.PI, true);
    ctx.closePath();
    ctx.strokeStyle = 'orange';
    ctx.stroke();
  }
  ctx.restore();
}


},{}],6:[function(require,module,exports){
module.exports = exports = {
	rotate: rotate,
	dotProduct: dotProduct,
	magnitude: magnitude,
	normalize: normalize
}

function rotate(a, angle) {
	return {
		x: a.x * Math.cos(angle) - a.y * Math.sin(angle),
		y: a.x * Math.sin(angle) + a.y * Math.cos(angle)
	}
}

function dotProduct(a, b) {
	return a.x * b.x + a.y * b.y;
}

function magnitude(a) {
	return Math.sqrt(dotProduct(a, a));
}

function normalize(a) {
	var mag = magnitude(a);
	return {x: a.x / mag, y: a.y / mag};
}

},{}]},{},[1]);
