//var PVSelector = require('./pvSelector');
var seedrandom = require('seedrandom');
var menuBar = require('./pv/menuBar');
var numeric = require('numeric');
var rng = seedrandom('aquaria', {global: true});
var sequenceUtils = require('./sequence/sequenceUtils');
var pcaUtils = require('./sequence/pcaUtils');
var rotations = require('./rotations');
var colourUtils = require('./sequence/colourUtils');
var pViewer;
var structure;
var Jolecule3DPanel = function (attachToDiv) {
	var that = this;
	this.attachToDiv = attachToDiv;
	menuBar(this.attachToDiv, {
		type: function (type) {
			pViewer.clear();
			that.setType(type);
		},
		colourScheme: function (colourScheme) {
//			pViewer.clear();
			that.initFeatureView(structure);
			that.setColourScheme(colourScheme);
			that.geom.colorBy(that.colourScheme);
			pViewer.requestRedraw();
//			that.loadType(that.type, structure, attributes);
		},
		view: function (view, options) {
			that.setViewMode(view, options);
		}
	});
	this.type = 'cartoon';
	this.colourSchemeName = 'homology';
	this.attachPV = $(attachToDiv).append('<div id="pv"></div>');
	this.viewMode = 'pca';
	this.initialised = false;
};

Jolecule3DPanel.prototype.getChainsForAccession = function(accession) {
	var ret = [];
	var segments = this.attributes.alignment.split(';');
	segments.forEach(function (segment) {
		if (segment.trim().length > 0) {

			var parts = segment.split(',');
			var seqPart = parts[1].split(':');
			if (accession === seqPart[0]) {
				var pdbPart = parts[0].split(':');
				var chain = structure.select({cname: pdbPart[1], rnumRange:[pdbPart[2], parseInt(pdbPart[4]) + 1]});
				if (chain) {
					ret.push(chain);
				}
			}
		}

	});
	return ret;

};

Jolecule3DPanel.prototype.alignToPDB = function(accession, start, end) {
	var ret = {};
	var segments = this.attributes.alignment.split(';');
	segments.forEach(function (segment) {
		if (segment.trim().length > 0) {

			var parts = segment.split(',');
			var seqPart = parts[1].split(':');
			if (accession === seqPart[0]) {
				var seqStart = parseInt(seqPart[1]);
				var seqEnd = parseInt(seqPart[2]);
				var pdbPart = parts[0].split(':');
				var pdbStart = parseInt(pdbPart[2]);
				var pdbEnd = parseInt(pdbPart[4]);
				if (start >= seqStart && start <= seqEnd) {
					ret.start = pdbStart + (start - seqStart); 
				}
				else if (start < seqStart && ( typeof ret.start === 'undefined' || seqStart < ret.start)) {
					ret.start = pdbStart;
				}
				if (end >= seqStart && end <= seqEnd) {
					ret.end = pdbStart + (end - seqStart); 
				}
				else if (end > seqEnd && ( typeof ret.end === 'undefined' || seqEnd > ret.end)) {
					ret.end = pdbEnd;
				}
			}
		}
	});
	return ret;

}


Jolecule3DPanel.prototype.addAnnotation = function(id, annotationName, featureColours,
		featureNames, featureDescriptions, featurePositions, featureURLs, featureURLTexts) {

	var that = this;
	that.geom.colorBy(color.uniform('#AAAAAA'));	

	var view = new mol.MolView(structure.full());
	var molviews = this.getChainsForAccession(id);
	var features = [];

	featurePositions.forEach(function (featurePosition, f) {
		var colour = color.uniform(featureColours[f]);
		// map feature onto every available chain
		molviews.forEach(function (molview) {
			molview.chains().forEach(function(chain) {
				var chainView = view.addChain(chain, false);
				var pos = featurePosition.split(':');
				var seqStart = parseInt(pos[0]);
				var seqEnd = pos[1] ? parseInt(pos[1]) : seqStart;
				var ret = that.alignToPDB(id, seqStart, seqEnd);
				var allResidues = chain.residues();
				var pdbStart = allResidues[0].num();
				var pdbEnd = allResidues[allResidues.length - 1].num();
				// check if chain starts or ends with non-aminoacids
				var i = 0;
				for (; i < allResidues.length; ++i) {
					if (allResidues[i].isAminoacid()) break;
				}
				if (i >= allResidues.length) return;
				pdbStart = allResidues[i].num();

				for (i = allResidues.length - 1; i > 0; i--) {
					if (allResidues[i].isAminoacid()) break;
				}
				pdbEnd = allResidues[i].num();

				if (pdbStart <= ret.end && pdbEnd >= ret.start) {
					ret.start = Math.max(ret.start,pdbStart);
					ret.end = Math.min(ret.end,pdbEnd);
					var residues = chain.full().residuesInRnumRange(ret.start, ret.end);
//					var residues = molview.select({rindexRange:[ret.start, ret.end+1]});
					residues.forEach(function (residue) {
						residue["featureName"] = featureNames[f];
						var residueView = chainView.addResidue(residue, true);
					});
					features.push({view:chainView, colour:colour});
				}
			});
//			var chainView = view.addChain(chain, false);
		});
	});
	// now add it to the global features
	this.featureViews[annotationName] = features;
	this.updateFeatureWeights(features);
	// color the new feature
	this.colorFeatures();
//	this.setViewMode(this.viewMode, {
//		 entropyWeight: $('#entropyWeight').val(),
//		 preferredWeight: $('#preferredWeight').val(),
//		 distanceWeight: $('#distanceWeight').val()
//		 });
	pViewer.requestRedraw();
};

Jolecule3DPanel.prototype.colorFeatures = function() {
	
	if (typeof(this.featureViews) === 'undefined') {	
		return;	// no features set
	};
	
	var that = this;
	//FIXME: does not guarantee to reflect the order in which features were added!
	if (Object.keys(this.featureViews).length) {
		that.geom.colorBy(color.uniform('#AAAAAA'));	
	}
	for (var annotation in this.featureViews) {
		if (annotation == 'SS') continue;
		var features = this.featureViews[annotation];
		if (features !== undefined) {
			features.forEach(function(feature) {
				that.geom.colorBy(feature.colour, feature.view);
			});
		}
	}
}

Jolecule3DPanel.prototype.removeAnnotation = function(id, annotationName) {
//	document.applets[0].removeAnnotation(id, annotationName);
}

Jolecule3DPanel.prototype.initFeatureView = function(structure) {
	var that = this;
	this.featureViews = [];
	this.featureWeights = {};
	
//	this.rotationSamples = createRandomRotations(128);
	this.preferredRotations = [];
	
	var atomList = [];
  //var feature = pViewer.renderAs('feature', view, this.type);
  this.geom.eachCentralAtom(function(atom, pos) {
    atomList.push([pos[0], pos[1], pos[2]]);
  });
	var pca = pcaUtils.computePCA(atomList);
	var pc1 = [pca[0], pca[4], pca[8]];
	var rot = mat4.create();
	mat4.rotate(rot, pca, Math.PI, pc1);
	
	this.preferredRotations.push(pca, rot);
	
	var preferred1 = vec3.fromValues(this.preferredRotations[0][2], this.preferredRotations[0][6], this.preferredRotations[0][10]);
	vec3.normalize(preferred1, preferred1);

	var preferred2 = vec3.fromValues(this.preferredRotations[1][2], this.preferredRotations[1][6], this.preferredRotations[1][10]);
	vec3.normalize(preferred2, preferred2);
	
	this.rotationSamples = [preferred1, preferred2];
	
	rotations.sampleRotations(this.rotationSamples, this.preferredRotations[0], 
			pc1, 128);
	
//	this.featureMap = this.computeFeatureMap(this.rotationSamples);

	structure.eachResidue(function(residue) {
		var index = getIndexFromResidue(residue);
		that.featureWeights[index] = 0;
	});
//	this.featureViews["SS"] = [{view:structure, colour:that.colourScheme}];
//	this.updateFeatureWeights(this.featureViews["SS"]);
}

Jolecule3DPanel.prototype.updateFeatureWeights = function(features) {
	var that = this;
	var featureLength = 0;
	features.forEach(function(feature) {
		feature.view.eachResidue(function(residue) {
			featureLength += 1;
		});
	});
	if (featureLength > 0) {

		features.forEach(function(feature) {
			feature.view.eachResidue(function(residue) {
				var index = getIndexFromResidue(residue);
				if (that.featureWeights[index] === undefined) {
					that.featureWeights[index] = 1/featureLength;
				} else {
					that.featureWeights[index] += 1/featureLength;
				}
			});
		});

	}
}

function preset() {
//	var ligand = structure.select({'rnames' : ['SAH', 'RVP']});
//	pv.ballsAndSticks('structure.ligand', ligand, { 
//	showRelated: '1' 
//	});
}

Jolecule3DPanel.prototype.setType = function (newType) {
	if (newType !== this.type) {
		this.type = newType;
//		this.reload();
		this.loadType(newType, structure, this.attributes);
	}
}


Jolecule3DPanel.prototype.load = function (attributes) {
	var that = this;
	this.attributes = attributes;
	$(this.attachPV).width(attributes.width);
	$(this.attachPV).height(attributes.height);

	pViewer = pv.Viewer($(this.attachPV)[0], 
			{ quality : 'high', width: 'auto', height : 'auto',
		antialias : true, outline : true,
		slabMode : 'fixed',
		near: 0.1,
		animateTime: 500,
		far: 10000,
		background: [0.8, 0.8, 0.8]
			});
	pViewer.options('fog', false);
	this.reload(attributes);
}

Jolecule3DPanel.prototype.changeViewerSize = function(w, h) {

	$(this.attachToDiv).width(w);
	$(this.attachToDiv).height(h);
	pViewer.fitParent();
}


Jolecule3DPanel.prototype.reload =  function(attributes) {
	var that = this;
	attributes = attributes || this.attributes;
	this.attributes = attributes;

	$(this.attachToDiv).width(attributes.width);
	$(this.attachToDiv).height(attributes.height);
	pViewer.fitParent();
//	pViewer.resize(attributes.width, attributes.height);

//	var url = "http://rcsb.org:80/pdb/files/" + attributes.pdb_id + ".pdb.gz";
//	if (biounit > 0) {
//	url = "http://rcsb.org:80/pdb/files/" + attributes.pdb_id + ".pdb" + attributes.biounit + ".gz";
//	}
	var beforeSend = function(xhr) {xhr.setRequestHeader('Access-Control-Allow-Origin', '*')};

	$.ajax({ 
	  url : attributes.url, 
	  success : function(data) {
  		structure = io.pdb(data);
  		pViewer.clear();
  		that.setColourScheme(that.colourSchemeName);
  		that.loadType(that.type, structure, attributes);
  		that.initFeatureView(structure);
  		pViewer.autoZoom();
  		that.blankApplet(false);
  		that.setViewMode(that.viewMode);
  		that.initialised = true;
	  }
//	  'beforeSend' : beforeSend,
//	  'headers': { 
//	      'Access-Control-Allow-Origin': '*',
//	      "Access-Control-Allow-Headers": "X-Requested-With"
//	  }
//    crossDomain: true
	});
};

Jolecule3DPanel.prototype.loadType =  function(type, structure, attributes) {
	var that = this;
	that.type = type;
	that.geom = pViewer.renderAs('structure.protein', structure, type, {color: that.colourScheme, strength: 1.0});
	if (typeof that.selector === 'undefined') {
		that.selector =  that.PVSelector(structure, pViewer, that.geom); 
	}
	else {
		that.selector.update(structure, that.geom);
	}
	this.colorFeatures();
//	this.selector.geom = that.geom;
};

Jolecule3DPanel.prototype.setColourScheme =  function(colourScheme) {
	var that = this;
	that.colourSchemeName = colourScheme;
//	pViewer.clear();
	switch (colourScheme) {
	case 'homology' :
		that.colourScheme = that.colorBySSAndHomology(that.attributes.conservations);
		break;
	case 'chains' :
		that.colourScheme = color.byChain();
		break;
	case 'element' :
		that.colourScheme = colourUtils.byElementWithBlack();
		break;
	}
};


Jolecule3DPanel.prototype.mousePressed =  function(atom, e) {
	console.log('obj: ' + atom.residue().num() + ', e: ' + e);
};

var interpolateColour = function (base, other, amount) {
	var i;
	var ret = [];
	for (i = 0; i < base.length; i++) {
		ret[i] = base[i] * amount + other[i] * (1 - amount);
	}
	return ret;
}

var assignColour = function (out, index, colorArray) {
	out[index] = colorArray[0]; 
	out[index+1] = colorArray[1]; 
	out[index+2] = colorArray[2];
	out[index+3] = colorArray[3];
}


Jolecule3DPanel.prototype.colorBySSAndHomology = function(conservations) {
	var that = this;
	this.conservations = conservations;
	this.notConserved = [0/255, 0/255, 0/255, 1];
	this.identicalColourMap = {
			'C': [99/255, 153/255, 65/255, 1], //coil
			'H': [86/255, 138/255, 181/255, 1],   	// helix 
			'E': [255/255, 201/255, 0/255, 1]   	//sheet 
	};
	this.conservedColourMap = {};
	Object.keys(this.identicalColourMap).forEach (function (key) {
		that.conservedColourMap[key] = interpolateColour(that.identicalColourMap[key], that.notConserved, 0.55);
	});

	return new ColorOp(function(atom, out, index) {
		var residue = atom.residue();
		var colour = that.getColourForResidue(residue);
		assignColour(out, index, colour);
	}, null, null);
};

Jolecule3DPanel.prototype.getColourForResidue = function (residue) {
	var chain = residue.chain().name();
	var chainConservation = this.conservations[chain]; 

	var checkAgainst = this.identicalColourMap[residue.ss()];
	if (chainConservation && chainConservation.nonconserved.indexOf(residue.num()) > -1) {
		// non conserved residue
		checkAgainst = this.notConserved;
	}
	else if (chainConservation){
		var map = (chainConservation.conserved.indexOf(residue.num()) > -1) ? this.conservedColourMap : this.identicalColourMap;
		checkAgainst =  map[residue.ss()];
	}
	return checkAgainst;
};


Jolecule3DPanel.prototype.generateAttributes = function(threeDWidth, threeDHeight, pdb_id, pdb_chain, biounit, source_primary_accession, sequences, common_names, pssh_alignment, links, transform, conservations) {
	var instanceId = sequences[0].primary_accession + '-' + pdb_id + '-' + pdb_chain[0];
	return {
		url: getPDBURL(pdb_id, biounit),
		width: threeDWidth,
		height: threeDHeight,
		instanceId: instanceId,
		biounit: biounit,
		pdb_id: pdb_id,
		pdb_chain: pdb_chain,
		transform: transform,
		alignment: pssh_alignment,
		conservations: conservations,
		sequenceAlignments: null,
		interactive: false
	};
};



function getPDBURL(pdbID, biounit) {
	var url = "http://www.rcsb.org/pdb/files/" + pdbID + ".pdb";
	if (biounit > 0) {
		url = "http://www.rcsb.org/pdb/files/" + pdbID + ".pdb" + biounit ;
	}
	return url;
}

Jolecule3DPanel.prototype.blankApplet = function(isOn, message) {
//	changeAppletSize();
	if (isOn ) {
		var appletMessage = $('#waitingFrame').contents().find('#appletMessage');
		if (message) {
			appletMessage.html(message);
		}
		else {
			appletMessage.text("Please wait...");
		}
		if (!$('#waitingFrame').is(":visible")) {

			$('#waitingFrame').hide();
			$('#waitingFrame').fadeIn("fast");
		}
	}
	else {
		$('#waitingFrame').fadeOut("slow");
	}
};

var selectionText = function(isOn, message) {
//	changeAppletSize();
	if (isOn ) {
		var selectionTextMessage = $('#selectionText').contents().find('#selectionTextMessage');
		if (message) {
			selectionTextMessage.html(message);
		}
		if (!$('#selectionText').is(":visible")) {

			$('#selectionText').hide();
			$('#selectionText').fadeIn("fast");
		}
	}
	else {
		$('#selectionText').fadeOut("slow");
	}
};

Jolecule3DPanel.prototype.selectNew = function (oldResidue, newResidue) {
	var that = this;
	if (oldResidue === newResidue ) {
		return;
	}
	var newChain = newResidue ? newResidue.chain().name() : null;
	var oldChain = oldResidue ? oldResidue.chain().name() : null;
	var chainChanged = newChain !== oldChain;
	if (chainChanged && newResidue) {
		pViewer.fitTo(newResidue.chain());
//		pViewer.requestRedraw();

	}

	var view = new mol.MolView(structure.full());
	var chainView = view.addChain(newResidue.chain(), false);
	var residueView = chainView.addResidue(newResidue, true);

	that.existingColour = [];
	that.geom.getColorByAtom(newResidue.atom(0), existingColour);
	that.geom.colorBy(color.uniform('white'), residueView);



	if (oldResidue) {
		var chainView = view.addChain(oldResidue.chain(), false);
		var residueView = chainView.addResidue(oldResidue, true);
		that.geom.colorBy(that.colourScheme, residueView);

	}
//	if (newResidue) {
//	newResidue.colorBy(color.uniform('white'));
//	}


//	oldResidue.eachAtom(function (atom) {
//	that.colourScheme.colorFor(atom)

//	});

//	return new ColorOp(function(atom, out, index) {
//	var residueChanged = true;
//	var residue = atom.residue();
//	var opacity = 1;
////	if (chainChanged) {
//	var residueChain = residue.chain().name();
//	if (residueChain === newChain) {
//	opacity = 1;
//	}
//	else {
//	opacity = 0.15;
//	}
//	residueChanged = true;
////	}
//	if (residue == newResidue) {
////	var colour = that.getColourForResidue(residue);
//	assignColour(out, index, vec4.fromValues(1,1,1,1));
//	}
//	else if (residue == oldResidue || residueChanged) {
//	var colour = that.getColourForResidue(residue);
//	colour[3] = opacity;
//	assignColour(out, index, colour);
//	}

//	}, null, null);

}

Jolecule3DPanel.prototype.getExistingColour = function() {
//	var traces = this._structure.backboneTraces();
//	console.assert(this._perResidueColors, 
//	"per-residue colors must be set for recoloring to work");
//	for (i = 0; i < traces.length; ++i) {
//	// get current residue colors
//	var data = this._perResidueColors[i];
//	console.assert(data, "no per-residue colors. Seriously, man?");
//	var index = 0;
//	var trace = traces[i];
//	for (j = 0; j < trace.length(); ++j) {
//	if (!view.containsResidue(trace.residueAt(j))) {
//	index+=4;
//	continue;
//	}
//	colorOp.colorFor(trace.centralAtomAt(j), data, index);

}


Jolecule3DPanel.prototype.getResidueText = function (residues) {
	var that = this;
	var ret = '';
	if (residues.length === 0) {
		return ret;
	}
	residues.sort(function (a,b) {
		return a.chain().name() === b.chain().name() ? a.num() - b.num() : a.chain().name() < b.chain().name() ? -1 : 1;
	});
	var lastChain = residues[0].chain();
	var chainResidues = [];
	residues.forEach(function (residue) {
		var currentChain = residue.chain();
		if (lastChain.name() !== currentChain.name()) {
			ret += sequenceUtils.getResidueTextForSingleChain(lastChain, chainResidues);
			lastChain = currentChain;
			chainResidues = [];
		}
		chainResidues.push(residue);
	});
	ret += sequenceUtils.getResidueTextForSingleChain(lastChain, chainResidues);

	return ret;
}

Jolecule3DPanel.prototype.PVSelector = function (structure, viewer, geom) {
	var that = this;
	this.lastSelectedAtom = null;
	var selector = new Selector(structure, viewer, geom);
	selector.addSelectionListener(function (residues) {
		selectionText(true, that.getResidueText(residues));
	});
	return selector;

};

Jolecule3DPanel.prototype.gestures = function () {
	var functions = ['triggerPan', 'triggerRotate', 'triggerZoom', 'point', 'reset', 'zoomToSelection', 'selectMouseCursor'];
	var ret = {};
	functions.forEach(function (funcName) {
		ret[funcName] = function () {
			var newArgs = [funcName];
			newArgs.push(Array.prototype.slice.call(arguments));
			if (funcName === 'triggerRotate') {
				console.log('about to call TODO for webgl: ' + newArgs);
			}
//			if (document.applets[0]) {
//			document.applets[0].molecularControlToolkit.apply(document.applets[0], newArgs);
//			}
		}
	})
	return ret;
}



Jolecule3DPanel.prototype.setViewMode = function(mode, options) {
	options = options || {entropyWeight:1,preferredWeight:1,distanceWeight:1}
	var that = this;
	mode = mode || 'locked';

	this.viewMode = mode;

	var rotation = mat4.clone(pViewer._cam.rotation());
	var center = vec3.clone(pViewer._cam.center());
	var zoom = pViewer._cam.zoom();

	var cameraPosition = function(rotation, center, zoom) {
		var currentCameraPosition = vec3.fromValues(rotation[2], rotation[6], rotation[10]);
		vec3.normalize(currentCameraPosition, currentCameraPosition);
		vec3.scaleAndAdd(currentCameraPosition, center, currentCameraPosition, zoom);
		return(currentCameraPosition);
	}

	var currentCameraPosition = cameraPosition(rotation, center, zoom);
	var v1 = vec3.create();
	vec3.subtract(v1, currentCameraPosition, center);
//	pViewer.label('C', 'C', currentCameraPosition);
	vec3.normalize(currentCameraPosition, currentCameraPosition);

//	console.log("finding best view for " + options.type + "s based on " + mode);

	if (mode === 'entropy') {

		var featureMap = this.computeFeatureMap(this.rotationSamples);
		if (featureMap[0].entropy > 0) {
			rotation = featureMap[0].rotation;
			console.log("max entropy:" + featureMap[0].entropy);
		};
		

	} else if (mode === 'pca') {

		var samples = this.preferredRotations;

		// find the shortest distance from the current view
		var shortestDistance = 100000;
		var ccp = vec3.create();
		vec3.normalize(ccp, v1);
		samples.forEach(function(r) {
			var p = vec3.fromValues(r[2], r[6], r[10]);
			vec3.normalize(p,p);
			var d = Math.acos(vec3.dot(p, ccp)) / Math.PI;
			if (d < shortestDistance) {
				shortestDistance = d;
				rotation = r;
			}
		});

//		console.log("entropy for PCA: " + this.computeEntropy(rotation));

	} else if (mode === 'auto') {

		var featureMap = this.computeFeatureMap(this.rotationSamples);

		var dist = normal(0, 1);
		// find the shortest distance from the current view
		var maxScore = -1;
//		var ccp = vec3.create();
		var cam_rotation = mat4.clone(pViewer._cam.rotation());
		var ccp = vec3.fromValues(cam_rotation[2], cam_rotation[6], cam_rotation[10]);
		vec3.normalize(ccp, ccp);
		featureMap.forEach(function(feature) {
			var e = feature.entropy;
			var pr = feature.preferredRegion;
			console.assert(pr <= 1, "spherical distance > 1: " + pr);
			var r = feature.rotation;
//			var s = that.getViewStability(r);
			var p = feature.point;
			vec3.normalize(p, p);
			var d = dist(rotations.sphericalDistance(p, ccp));
//			that.labelPoints([p]);
			var score = options.distanceWeight * d + 
						options.entropyWeight * e + 
						options.preferredWeight * pr;
			if (score > maxScore) {
				maxScore = score;
				// get rotation to p, but maintain current camera orientation
				var q = quat.create();
				quat.rotationTo(q, p, ccp);
				var m = mat4.create();
				mat4.fromQuat(m, q);
				mat4.multiply(rotation, cam_rotation, m);
			}
		});

		console.log("max score: " + maxScore);

	}

//	pViewer.autoZoom();

	
	pViewer.setRotation(rotation, 500);

};

Jolecule3DPanel.prototype.computeFeatureMap = function(samples) {
	var that = this;

	var featureMap = [];

//	var pcaPoint = vec3.fromValues(this.preferredRotation[2], this.preferredRotation[6], this.preferredRotation[10]);
//
//	this.labelPoints([pcaPoint], "P1");
//	this.labelPoints([vec3.scale(pcaPoint, pcaPoint, -1)], "P2");
//	this.labelPoints(samples);

	var maxEntropy = 0;
	// compute feature maps
	samples.forEach(function(point) {

		var rotation = that.createRotation(point);
		var e = that.computeEntropy(rotation);
		if ( e > maxEntropy ) {
			maxEntropy = e;
		}
		var d = that.computePreferredRegion(point);
		console.assert(d <= 1, "distance to pr > 1: " + d);
		featureMap.push(
				{
					'point' : point,
					'rotation' : rotation, 
					'entropy' : e,
					'preferredRegion' : d
				});
	});

	// normalize entropy
	if (maxEntropy > 0) {
		featureMap.forEach(function(feature) {
			feature.entropy /= maxEntropy;
		});
	}

	featureMap.sort(function(a, b) {
		return b.entropy - a.entropy;
	});
	
	return featureMap;

}

Jolecule3DPanel.prototype.labelPoints = function(points, label) {
	label = label || '*';
	var v = vec3.create();
	var r = pViewer._cam.zoom();
	var center = vec3.clone(pViewer._cam.center());
	points.forEach(function(point) {
		vec3.normalize(v, point);
		vec3.scaleAndAdd(v, center, v, r);
		pViewer.label('p', label, v);
	});
	pViewer.requestRedraw();

}


Jolecule3DPanel.prototype.computeTMRotation = function(features) {
	var rotation = mat4.create();

	var extraCellularAtoms = [];
	var intraCellularAtoms = [];

	var center = vec3.clone(pViewer._cam.center());

	features.forEach(function(feature) {
		feature.view.eachResidue(function(res) {
			var pos = res.atom('CA').pos();
			switch (res._residue.featureName) {
			case 'Extracellular':
			case 'Periplasmic':
				extraCellularAtoms.push([pos[0], pos[1], pos[2]]);
				break;
			case 'Cytoplasmic':
				intraCellularAtoms.push([pos[0], pos[1], pos[2]]);
				break;
			}

		});
	});

	var comExtra = rotations.getCenterOfMass(extraCellularAtoms);
	var comIntra = rotations.getCenterOfMass(intraCellularAtoms);

	var up = vec3.create();
	vec3.subtract(up, comExtra, comIntra);

	// construct a 3D coordinate system around the up vector
	var right = vec3.create();
	var view = vec3.create();

	vec3.cross(right, [1,0,0], up);
	if (right[0] === 0 && right[1] === 0 && right[2] === 0) {	// check for parallel vectors
		vec3.cross(right, [0,1,0], up);
	}

	vec3.cross(view, up, right);

//	var tmpVec = vec3.create();
//	pViewer.label('u', 'u', comExtra);
//	pViewer.label('d', 'd', comIntra);
//	pViewer.label('l', 'l', vec3.subtract(tmpVec, center, right));
//	pViewer.label('r', 'r', vec3.add(tmpVec, center, right));
//	pViewer.label('n', 'n', vec3.subtract(tmpVec, center, view));
//	pViewer.label('f', 'f', vec3.add(tmpVec, center, view));

	vec3.normalize(up, up);
	vec3.normalize(view, view);
	vec3.normalize(right, right);
	rotation = mat4.fromValues(
			right[0], up[0], view[0], 0,
			right[1], up[1], view[1], 0,
			right[2], up[2], view[2], 0,
			0,0,0,1);

	var r = mat3.create();
	mat3.fromMat4(r, rotation);
	if (mat3.determinant(r) < 0) {
		rotation = mat4.fromValues(
				-right[0], up[0], view[0], 0,
				-right[1], up[1], view[1], 0,
				-right[2], up[2], view[2], 0,
				0,0,0,1);
	}

	return(rotation);
}



//Jolecule3DPanel.prototype.getMaximumEntropyView = function() {
//	var that = this;
//	var maxI = 0;
//	var npix = {};
//
//	return(this.featureMap[0].rotation);
//
//};

Jolecule3DPanel.prototype.computeEntropy = function(rotation) {
	var npix = {};
	var that = this;

	pViewer.eachVisibleObject(rotation, function(obj) {
		var index = getIndexFromResidue(obj.atom.residue());
		if (npix[index] === undefined) {
			npix[index] = 1;
		} else {
			npix[index]++;
		}
	});

	return this.entropy(npix);

}

Jolecule3DPanel.prototype.entropy = function(npix) {
	var size = pViewer.ENTROPY_BUFFER_WIDTH * pViewer.ENTROPY_BUFFER_HEIGHT;
	var e = 0;
	for (var index in npix) {
		if (npix.hasOwnProperty(index)) {
			var tmp = npix[index]/size;    // > 0 by construction
			var w = this.featureWeights[index];
			var contrib = w * tmp * Math.log(tmp) / Math.log(2);
			e += contrib;
		} 
	}
//	console.log("entropy: " + -e);
	return -e;
}

Jolecule3DPanel.prototype.computePreferredRegion = function(point) {

	// distance from equator, which is defined by the 1st principal component

	var p = vec3.clone(point);
	vec3.normalize(p, p);

	var preferred1 = vec3.fromValues(this.preferredRotations[0][2], this.preferredRotations[0][6], this.preferredRotations[0][10]);
	vec3.normalize(preferred1, preferred1);

	var preferred2 = vec3.fromValues(this.preferredRotations[1][2], this.preferredRotations[1][6], this.preferredRotations[1][10]);
	vec3.normalize(preferred2, preferred2);
//	vec3.scale(preferred2, preferred1, -1);

	var sp1 = rotations.spherical(preferred1);
	var sp2 = rotations.spherical(preferred2);
	var mu1 = sp1[1];
	var mu2 = sp2[1];

//	var phi = sp1[2];

	var sp = rotations.spherical(p);

//	var d = gaussian([mu1, phi], [1, 1]);
	
	var p1 = rotations.mvNormal([0], [[1]]);
	var p2 = rotations.mvNormal([0], [[1]]);
	var dp1 = rotations.sphericalDistance(p, preferred1);
	var dp2 = rotations.sphericalDistance(p, preferred2);
	
	return 0.5 * p1([dp1]) + 0.5 * p2([dp2]); //Math.min(sphericalDistance(p, preferred1), sphericalDistance(p, preferred2));

}



getIndexFromResidue = function(residue) {
	return residue.chain().name() + residue.num();
}




module.exports = Jolecule3DPanel;
