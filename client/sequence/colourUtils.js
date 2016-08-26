module.exports = {
    byElementWithBlack: byElementWithBlack 
}
function byElementWithBlack () {
  return new ColorOp(function(atom, out, index) {
    var ele = atom.element();
    if (ele === 'C') {
      out[index] = 0.0; 
      out[index+1] = 0.0; 
      out[index+2] = 0.0; 
      out[index+3] = 1.0;
      return out;
    }
    if (ele === 'N') {
      out[index] = 0; 
      out[index+1] = 0; 
      out[index+2] = 1;
      out[index+3] = 1.0;
      return out;
    }
    if (ele === 'O') {
      out[index] = 1; 
      out[index+1] = 0; 
      out[index+2] = 0;
      out[index+3] = 1.0;
      return out;
    }
    if (ele === 'S') {
      out[index] = 0.8; 
      out[index+1] = 0.8; 
      out[index+2] = 0;
      out[index+3] = 1.0;
      return out;
    }
    if (ele === 'CA') {
      out[index] = 0.533; 
      out[index+1] = 0.533; 
      out[index+2] = 0.666;
      out[index+3] = 1.0;
      return out;
    }
    out[index] = 1; 
    out[index+1] = 0; 
    out[index+2] = 1;
    out[index+3] = 1.0;
    return out;
  }, null, null);
};