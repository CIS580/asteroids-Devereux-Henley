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
