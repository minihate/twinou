'use strict';

// Tags in colored caps, and articles in lower case ?
// TODO fix shudder without hacks
// TODO bubbles repulse more depending on width or height
// TODO dont place randomly bubbles
// TODO real joint physics

var zoom = 1;
var reverse = false;
var density = 2;
var size = zoom * 16 * zoom * density;
var foreground = 'black';
var shadow;
document.body.style.margin = '0';
document.body.style.overflow = 'hidden';
var canvas = document.createElement('canvas');
canvas.width = window.innerWidth * density;
canvas.height = window.innerHeight * density;
canvas.style.width = '100%';
canvas.style.height = '100%';
document.body.style.height = '100%';
var context = canvas.getContext('2d');
function setThin(thin) {
    shadow = (thin ? 3 : 5) * zoom * density;
    context.font = (!thin ? 'bold ' : '') + size + 'px "Open Sans Condensed"';
context.lineWidth = (thin ? 1 : 3) * density * zoom;
}
context.strokeStyle = foreground;
context.shadowColor = 'gray';
context.textAlign = 'center';
context.textBaseline = 'middle';
context.imageSmoothingEnabled = true;
document.body.appendChild(canvas);

function drawEllipse(ctx, x, y, w, h) {
  var kappa = .5522848,
      ox = (w / 2) * kappa, // control point offset horizontal
      oy = (h / 2) * kappa, // control point offset vertical
      xe = x + w,           // x-end
      ye = y + h,           // y-end
      xm = x + w / 2,       // x-middle
      ym = y + h / 2;       // y-middle
  ctx.moveTo(x, ym);
  ctx.bezierCurveTo(x, ym - oy, xm - ox, y, xm, y);
  ctx.bezierCurveTo(xm + ox, y, xe, ym - oy, xe, ym);
  ctx.bezierCurveTo(xe, ym + oy, xm + ox, ye, xm, ye);
  ctx.bezierCurveTo(xm - ox, ye, x, ym + oy, x, ym);
}

if (!context.ellipse) {
    context.ellipse = function(cx, cy, w, h) {
        drawEllipse(this, cx - w, cy - h, w * 2, h * 2);
    };
}

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
    this.mass = 1;
    this.childs = [];
    this._color = Math.floor(360 / window.tags.childs.length * rze % 360);
}

var minMass = 100;
var maxMass = 0;
Bubble.prototype.computeMass = function() {
    this.mass = this.childs.map(function(child) {return child.computeMass();}).reduce(function(a, b) {return a + b;}, 1);
    if (this.mass < minMass) minMass = this.mass;
    if (this.mass > maxMass) maxMass = this.mass;
    return this.mass
};

Bubble.prototype.massP = function() {
    return maxMass !== minMass ? (this.mass - minMass) / (maxMass - minMass) : 1;
};

Bubble.prototype.computeColor = function() {
    this.color = this.bonds.length > 0 ? 'hsl(' + this._color + ', ' +  Math.floor((1 - this.massP()) * 100)+ '%, 50%)' : 'hsl(0, 0%, 0%)';
};

Bubble.prototype.isBondedTo = function(other) {
    for (var a in this.bonds) {
        if (this.bonds[a].toLowerCase() === other.name.toLowerCase()) return true;
    }
    return false;
};

Bubble.prototype.isChildOf = function(other) {
    return other.childs.indexOf(this) !== -1 ? true : this._bonds.length > 0 ? this._bonds[0].isChildOf(other) : false;//other.childs.indexOf(this) !== -1;
};

Bubble.prototype.integrate = function(delta) {
    this.v.add(this.a.scale(delta));
    this.p.add(this.v.clone().scale(delta));
    this.a = new Vector(0, 0);
};

Bubble.prototype.depth = function() {
    return 1 + this.childs.length > 0 ? Math.max.apply(null, this.childs.map(function(child) {return child.depth();})) : 0;
}


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
        a.childs.push(b);
        b._bonds.push(a);
        if (a.bonds.length > 0) b.color = a.color;
    }
});

bubbles[0].computeMass();
bubbles.forEach(function(bubble) {bubble.computeColor();});

var spring_length = zoom * 150 * density;//, 0 * Math.max(canvas.width, canvas.height) / bubbles[0].depth());
var repulsives = canvas.width > canvas.height ? [new Vector(canvas.width / 2, 0), new Vector(canvas.width / 2, canvas.height)] : [new Vector(0, canvas.height / 2), new Vector(canvas.width, canvas.height / 2)];
var use_tige = true;
function integrate(delta) {
    peers(function(from, to) {
        if (to.bonds.length > 0) {
            var ab = from.p.clone().substract(to.p); // to -> from
            if (to.isBondedTo(from)) {
                var s1 = ab.clone().scale(-1).normalize().scale(spring_length);
                var spring = s1.clone().add(from.p);
                var s2 = spring.clone().substract(to.p);
                if (use_tige && (s2.norm() <= 10 || to.tige)) {
                    to.tige = true;
                    to.p = spring.clone();
                } else {
                    to.a.add(s2.normalize().scale(Math.pow(s1.norm(), 1)).scale(from.mass));
                }
            } else /*if (!to.isChildOf(from))*/ if (to.mass === from.mass) { // HACK
                to.a.substract(ab.normalize().scale(Math.pow(ab.norm(), -2)).scale(from.mass).scale(10));
            }
        }
    });
    bubbles.forEach(function(bubble) {
        repulsives.forEach(function(repulsif) {
            var ab = bubble.p.clone().substract(repulsif);
            bubble.a.add(ab.normalize().scale(Math.pow(ab.norm(), -2)));
        });
        bubble.v.scale(0.99);
        bubble.integrate(delta);
    });
}

var accumulator = 0;
var fixedDelta = 1/60;
var speed = 30;
function pace(delta) {
    for (accumulator += delta * speed; accumulator > fixedDelta; accumulator -= fixedDelta) {
        integrate(fixedDelta);
    }
}

function draw() {
    context.clearRect(0, 0, canvas.width, canvas.height);
    bubbles.forEach(function(bubble) {
        var measure = context.measureText(bubble.name);
        context.shadowBlur = shadow;
        context.beginPath();
        context.ellipse(bubble.p.x, bubble.p.y, measure.width / 2 + 20 * density, size + 5 * density, 0, 0, 2 * Math.PI, false);
        context.stroke();
    });
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
        setThin(bubble.bonds.length> 0);
        context.shadowBlur = 0;
        var measure = context.measureText(bubble.name);
        context.fillStyle = !reverse ? 'white' : bubble.color;
        context.strokeStyle = bubble.color;
        context.beginPath();
        context.ellipse(bubble.p.x, bubble.p.y, measure.width / 2 + 20 * density, size + 5 * density, 0, 0, 2 * Math.PI, false);
        context.stroke();
        context.fill();
        context.fillStyle = !reverse ? bubble.color : 'white';
        context.fillText(bubble.name, bubble.p.x, bubble.p.y);
    });
}

var last = null;
var aaaa = !use_tige;
function step() {
    var now = Date.now();
    if (last && (now - last) < 1000 / 10) {
        pace((now - last) / 1000);
    }
    last = now;
    if (aaaa || bubbles.every(function(bubble) {return bubble.bonds.length === 0 || !!bubble.tige;})) {
        draw();
        aaaa = true;
    }
    window.requestAnimationFrame(step);
}
step();