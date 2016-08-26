module.exports = {
  gaussian: gaussian,
  spherical: spherical,
  mvNormal: mvNormal,
  normal: normal,
  sphericalDistance: sphericalDistance,
  createRotation: createRotation,
  getCenterOfMass: getCenterOfMass,
  sampleRotations: sampleRotations
}

//returns spherical coordinates
function haltonSampler(n, p2) {
  var points = [];
  for (var k = 0, pos = 0; k < n; ++k) {
    var t = 0;
    for (var p = 0.5, kk=k; kk; p*=0.5, kk>>=1) {
      if (kk & 1) { // kk % 2 == 1
        t += p;
      }
    }
    t = 2 * t - 1;        // map from [0,1] to [-1,1]
    var st = Math.sqrt(1 - t*t);
    var phi = 0;
    var ip = 1/p2;
    for (var p = ip, kk=k; kk; p *= ip, kk/=p2) {
      var a = kk % p2;
      if (a) {
        phi += a * p;
      }
    }
    var phirad = phi * 4 * Math.PI;
    var p = vec3.fromValues(st * Math.cos(phirad), st*Math.sin(phirad), t);
    var r = vec3.length(p);
    points.push(vec3.fromValues(r, phirad, Math.acos(t)));
//    points.push(p);
  }

  return points;
}

sphericalToRotation = function(point) {
  var t = Math.cos(point[2]);
  var st = Math.sqrt(1 - t*t);
  var phirad = point[1];
  var p = vec3.fromValues(st * Math.cos(phirad), st*Math.sin(phirad), t);
  var start = vec3.fromValues(0, 0, 1);
  var q = quat.create();
  var m = mat4.create();
  var tmpVec = vec3.create();
  vec3.normalize(tmpVec, p);
  return mat4.fromQuat(m, quat.rotationTo(q, tmpVec, start));
}

function createRandomRotations(n) {

  return hammersleySampler(n);

  var start = vec3.fromValues(0, 0, 1);
  var points = hammersleySampler(n);
  var ret = points.map(function(p) {
    var q = quat.create();
    var m = mat4.create();
    var tmpVec = vec3.create();
    vec3.normalize(tmpVec, p);
    return mat4.fromQuat(m, quat.rotationTo(q, tmpVec, start));
  });

//  var twoPI = 2 * Math.PI;
//  var ret = [];
//  for (var i = 0; i < n; ++i) {
//  var u1 = Math.random();
//  var u2 = Math.random();
//  var u3 = Math.random();
//  var st = Math.sqrt(1-u1);

//  var q = quat.fromValues(st*Math.sin(twoPI*u2),st*Math.cos(twoPI*u2), Math.sqrt(u1)*Math.sin(twoPI*u3), Math.sqrt(u1)*Math.cos(twoPI*u3));
//  var auxRotation = mat4.create();
//  mat4.fromQuat(auxRotation,q);
//  ret.push(auxRotation);
//  }
  return(ret);
}

function hammersleySampler(n) {
  var points = [];
  var t;
  for (var k = 0; k < n; ++k) {
    t = 0;
    var kk;
    for (var p = 0.5, kk=k; kk; p*=0.5, kk>>=1) {
      if (kk & 1) {
        t += p;
      }
    }
    t = 2 * t - 1;
    var st = Math.sqrt(1 - t*t);
    var phi = (k + 0.5) / n;  // theta in [0,1]
    var phirad = phi * 2 * Math.PI;
//    var phi = Math.acos(t);
    var p = vec3.fromValues(st * Math.cos(phirad), st*Math.sin(phirad), t);
//    points.push(vec3.fromValues(1, phirad, Math.acos(t)));
    points.push(p);

  }
  return points;
}

function gaussian(mu, sigma) {
  return function(x) {
    var dx = x[0] - mu[0];
    var dy = x[1] - mu[1];
    return Math.exp(-(dx*dx/(2*sigma[0]) + dy*dy/2*sigma[1]));
  }
}

function normal(mu, sd) {
  return mvNormal([mu], [[sd]]);
}

function mvNormal(mu, S) {
  var Sinv = numeric.inv(S);
  var Sdet = numeric.det(S);
  var k = mu.length;
  var A = Math.sqrt(Math.pow(2*Math.PI, k) * Sdet);
  A = 1/A;
  return function(x) {
    var xx = x;
    if (!(x instanceof Array)) {
      xx = [x];
    }
    var dx = numeric.sub(xx, mu);
    var v = numeric.dot(numeric.dot(numeric.transpose([dx]), Sinv), [dx]);
    return A * Math.exp(-0.5 * v[0][0]);
  }
}

function spherical(cartesian) {
  var r = vec3.length(cartesian);
  var theta = Math.atan2(cartesian[1], cartesian[0]);
  var phi = Math.acos(cartesian[2]/r);
  return vec3.fromValues(r, theta, phi);
}

//returns the normalized spherical distance of two cartesian vectors
function sphericalDistance (a, b) {
  var an = vec3.create();
  var bn = vec3.create();
  vec3.normalize(an, a);
  vec3.normalize(bn, b);
  return Math.acos(vec3.dot(an, bn)) / Math.PI;
};


 function createRotation(view) {
  var start = vec3.fromValues(0, 0, 1);
  var q = quat.create();
  var m = mat4.create();
  var tmpVec = vec3.create();
  vec3.normalize(tmpVec, view);
  var rotation = mat4.fromQuat(m, quat.rotationTo(q, tmpVec, start));

  return(rotation);
}

function getCenterOfMass(points) {
  var c = [0, 0, 0];
  var l = points.length;
  points.forEach(function(point) {
    c[0] += point[0] / l;
    c[1] += point[1] / l;
    c[2] += point[2] / l;
  });
  return c;
}

function sampleRotations(ret, rotation, axis, samples) {
  for (var i = 0; i < samples; ++i) {
    var rad = 2*Math.PI*(i+1)/(samples + 1);
    var auxRotation = mat4.create();
    mat4.rotate(auxRotation, rotation, rad, axis);
    var p = vec3.fromValues(auxRotation[2], auxRotation[6], auxRotation[10]);
    vec3.normalize(p,p);
    ret.push(p);
  }
  return(ret);
}
