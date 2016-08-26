module.exports = {
    getResidueTextForSingleChain: getResidueTextForSingleChain
}

var singleResidue = {};
singleResidue["ALA"] =  "A";
singleResidue["CYS"] =  "C";
singleResidue["ASP"] =  "D";
singleResidue["GLU"] =  "E";
singleResidue["PHE"] =  "F";
singleResidue["GLY"] =  "G";
singleResidue["HIS"] =  "H";
singleResidue["ILE"] =  "I";
singleResidue["LYS"] =  "K";
singleResidue["LEU"] =  "L";
singleResidue["MET"] =  "M";
singleResidue["ASN"] =  "N";
singleResidue["PRO"] =  "P";
singleResidue["GLN"] =  "Q";
singleResidue["ARG"] =  "R";
singleResidue["SER"] =  "S";
singleResidue["THR"] =  "T";
singleResidue["VAL"] =  "V";
singleResidue["TRP"] =  "W";
singleResidue["TYR"] =  "Y";
singleResidue[" DA"] =  "a";
singleResidue[" DT"] =  "t";
singleResidue[" DG"] =  "g";
singleResidue[" DC"] =  "c";
singleResidue[" DI"] =  "i";
singleResidue[" DU"] =  "u";


function getResidueTextForSingleChain(chain, residues) {
  var i;
  var lastResidue = residues[0];
  var ranges = [];
  var range = null;
  residues.forEach(function (residue) {
    if (residue && (residue.num() === (lastResidue.num() + 1))) {
      lastResidue = residue; 
      range.end = lastResidue;
    }else {
      if (range) {
        ranges.push(range);
      }
      lastResidue = residue; 
      range = {
          start: lastResidue,
          end: lastResidue
      };
    }
  });
  ranges.push(range);

  var rangeTexts = ranges.map(function (r) {
    var ret = singleResidue[r.start.name()] + "(" + r.start.num() + ")" ;
    return r.start === r.end ? ret : ret + '-' + singleResidue[r.end.name()] + "(" + r.end.num() + ")";  
  })
  return chain.name() + ": " + rangeTexts.join(",") + "<br>"; 
};