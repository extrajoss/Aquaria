module.exports = {
    computePCA: computePCA
}

function computePCA (atomList) {
  var X = [];

//  pViewer.rm('feature');

  console.log("computing PCA for: " + X.length + "residues");

  if (!X.length) {
    return(mat4.create());
  }

  // compute and subtract column means
  var svd = pca(X);
  var V = svd.V;
  var right = V[0];
  var up = V[1];
  var view = V[2];
  var m = mat4.fromValues(
      right[0], right[1], right[2], 0,
      up[0], up[1], up[2], 0,
      view[0], view[1], view[2], 0,
      0, 0, 0, 1);

  var r = mat3.create();
  mat3.fromMat4(r, m);
  if (mat3.determinant(r) < 0) {
    m = mat4.fromValues(-right[0], -right[1], -right[2], 0,
        -up[0], -up[1], -up[2], 0,
        -view[0], -view[1], -view[2], 0,
        0, 0, 0, 1);
  }
  return(m);
}

function pca(X) {
  var XT = numeric.transpose(X);
  var mean = XT.map(function(row) {return numeric.sum(row) / row.length;});
  X = numeric.transpose(XT.map(function(row, i) {return numeric.sub(row, mean[i]);}));

  var sigma = numeric.dot(numeric.transpose(X), X);
  var svd = numeric.svd(sigma);
  return svd;
}
