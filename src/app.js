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
