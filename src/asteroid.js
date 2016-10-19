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
