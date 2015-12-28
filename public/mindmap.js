'use strict';

// Colors for tags ?
// Tags in caps, and articles in lower case ?
var density = 2;
var shadow = 4 * density;
var size = 16 * density;
var foreground = 'black';
document.body.style.margin = '0';
document.body.style.overflow = 'hidden';
var canvas = document.createElement('canvas');
canvas.width = window.innerWidth * density;
canvas.height = window.innerHeight * density;
canvas.style.width = '100%';
canvas.style.height = '100%';
document.body.style.height = '100%';
var context = canvas.getContext('2d');
context.font = 'bold ' + size + 'px "Open Sans Condensed"';
context.strokeStyle = foreground;
//context.shadowColor = 'gray';
context.lineWidth = 3 * density;
context.textAlign = 'center';
context.textBaseline = 'middle';
context.imageSmoothingEnabled = true;
document.body.appendChild(canvas);

String.prototype.capitalizeFirstLetter = function() {
    return this.charAt(0).toUpperCase() + this.slice(1);
}

function Vector(x, y) {
    this.x = x;
    this.y = y;
}
Vector.random = function() {
    return new Vector(Math.random(), Math.random());
};
Vector.prototype.add = function(v) {
    this.x += v.x;
    this.y += v.y;
    return this;
};
Vector.prototype.scale = function(k) {
    this.x *= k;
    this.y *= k;
    return this;
};
Vector.prototype.substract = function(v) {
    this.x -= v.x;
    this.y -= v.y;
    return this;
};
Vector.prototype.multiply = function(v) {
    this.x *= v.x;
    this.y *= v.y;
    return this;
};
Vector.prototype.norm = function() {
    return Math.sqrt(Math.pow(this.x, 2) + Math.pow(this.y, 2));
};
Vector.prototype.normalize = function() {
    var norm = this.norm();
    this.x /= norm;
    this.y /= norm;
    return this;
};

Vector.prototype.clone = function() {
    return new Vector(this.x, this.y);
};

var rze = 0;
function Bubble(name, bonds, p) {
    this.name = name.toLowerCase().capitalizeFirstLetter().toUpperCase();
    this.bonds = bonds || [];
    this._bonds = [];
    this.p = p || Vector.random().multiply(new Vector(canvas.width, canvas.height));
    this.v = new Vector(0, 0);
    this.a = new Vector(0, 0);
    this.color = this.bonds.length > 0 ? 'hsl(' + Math.floor(360 / window.tags.childs.length * rze % 360) + ', 100%, 50%)' : 'hsl(0, 0%, 0%)';
}

Bubble.prototype.isBondedTo = function(other) {
    for (var a in this.bonds) {
        if (this.bonds[a].toLowerCase() === other.name.toLowerCase()) return true;
    }
    return false;
};

Bubble.prototype.integrate = function(delta) {
    this.v.add(this.a.scale(delta));
    this.p.add(this.v.clone().scale(delta));
    this.a = new Vector(0, 0);
};


var bubbles = [];

function effervesce(node, parent, name) {
    bubbles.push(new Bubble(name || node.name, parent ? [parent] : [], name ? new Vector(canvas.width / 2, canvas.height / 2) : null));
    
    node.childs.forEach(function(child) {
        effervesce(child, name || node.name);
        if (!parent) rze += 1;
    });
}

effervesce(window.tags, null, window.blog);

function peers(f) {
    bubbles.forEach(function(a) {
        bubbles.forEach(function(b) {
            if (a != b) f(a, b);
        });
    });
}

peers(function(a, b) {
    if (b.isBondedTo(a)) {
        b._bonds.push(a);
        if (a.bonds.length > 0) b.color = a.color;
    }
});

var spring_length = 300;
var distanceP = 1;
var repulsives = canvas.width > canvas.height ? [new Vector(canvas.width / 2, 0), new Vector(canvas.width / 2, canvas.height)] : [new Vector(0, canvas.height / 2), new Vector(canvas.width, canvas.height / 2)];
function integrate(delta) {
    peers(function(from, to) {
        if (to.bonds.length > 0) {
            var ab = from.p.clone().substract(to.p); // to -> from
            if (to.isBondedTo(from)) {
                var spring = ab.clone().scale(-1).normalize().scale(spring_length).add(from.p);
                var s2 = spring.clone().substract(to.p);
                //to.s = spring;
                if (s2.norm() > 10) {
                    to.a.add(s2.normalize().scale(s2.norm()).scale(spring_length * 10));
                } else {
                    to.p = spring.clone();
                }
            } else {
                to.a.add(ab.normalize().scale(-1 / Math.pow(ab.norm(), distanceP)).scale(spring_length));
            }
        }
    });
    bubbles.forEach(function(bubble) {
        repulsives.forEach(function(repulsif) {
            var ab = bubble.p.clone().substract(repulsif);
            bubble.a.add(ab.normalize().scale(1 / Math.pow(ab.norm(), distanceP)).scale(spring_length));
        });
        bubble.v.scale(9/10);
        bubble.integrate(delta);
    });
}

var accumulator = 0;
var fixedDelta = 1/60;
var speed = 10;
function pace(delta) {
    delta *= speed;
    for (accumulator += delta; accumulator > fixedDelta; accumulator -= fixedDelta) {
        integrate(fixedDelta);
    }
}

function draw() {
    context.clearRect(0, 0, canvas.width, canvas.height);
    bubbles.forEach(function(bubble) {
        context.fillStyle = 'white';
        context.shadowBlur = shadow;
        bubble._bonds.forEach(function(other) {
            var gradient = context.createLinearGradient(bubble.p.x, bubble.p.y, other.p.x, other.p.y);
            gradient.addColorStop(0, bubble.color);
            gradient.addColorStop(1, other.color);
            context.strokeStyle = gradient
            context.beginPath();
            context.moveTo(bubble.p.x, bubble.p.y);
            context.lineTo(other.p.x, other.p.y);
            context.stroke();
        });
    });
    bubbles.forEach(function(bubble) {
        var measure = context.measureText(bubble.name);
        context.fillStyle = 'white';
        context.strokeStyle = bubble.color;
        if (bubble.s) {
            context.beginPath();
            context.moveTo(bubble.p.x, bubble.p.y);
            context.lineTo(bubble.s.x, bubble.s.y);
            context.stroke();
        }
        context.shadowBlur = shadow;
        context.beginPath();
        context.ellipse(bubble.p.x, bubble.p.y, measure.width, Math.max(size + 5, measure.width / 2), 0, 0, 2 * Math.PI, false);
        context.stroke();
        context.fill();
        context.fillStyle = bubble.color;
        context.shadowBlur = 0;
        context.fillText(bubble.name, bubble.p.x, bubble.p.y);
    });
}

var last = null;
function step() {
    var now = Date.now();
    if (last && (now - last) < 1000 / 10) {
        pace((now - last) / 1000);
    }
    last = now;
    draw();
    window.requestAnimationFrame(step);
}
step();