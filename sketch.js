// recent work from my @VicUniWgtn 3rd year media design students that combines @nulhom's dlib face library with @p5xjs

var canvasWidth = 960;
var canvasHeight = 500;
var button;
var curRandomSeed;
var mainFace;
var faceImages = [];
var curFaceIndex = 0;
var curTrainIndex = 0;
var curValidIndex = 0;
var main_canvas;
var faceSelector;
var drawFaceCheckbox;
var faceGuideCheckbox;
var facePointsCheckbox;
var sliders = [];
var NUM_SLIDERS = 12;
var sliderTint;

var selfieData = []

var trainData = {}
var trainDataKeys = []
var trainValues = {}
var validData = {}
var validDataKeys = []

var faceMapping = null;

var loadedSelfieData = [];

function preload () {
  loadedSelfieData = loadJSON('sample_images.json');
  trainData = loadJSON('training_images.json');
  trainValues = loadJSON('training_values.json');
  validData = loadJSON('testing_images.json');
}

var allEmbeddingsTree;
var allEmbeddings = [];
var embeddingDimensions;
var curNeighbors = [];

function squaredDistance(a, b) {
  var sum = 0;
  var length = 128;
  for(var i=0; i<128; i++) {
    var diff = a[i] - b[i];
    sum += diff * diff;
  }
  // print(a.length,diff);
  // print(sum, a==b);
  return sum;
}

var haveStarted = false;
function setup () {
  var loadedSelfieDataArray = Object.values(loadedSelfieData);
  Array.prototype.unshift.apply(selfieData, loadedSelfieDataArray);

  // create the drawing canvas, save the canvas element
  main_canvas = createCanvas(canvasWidth, canvasHeight);
  main_canvas.parent('canvasContainer');

  curRandomSeed = int(focusedRandom(0, 100));

  mainFace = new Face();
  littleFace = new Face();

  for(var i=0; i<selfieData.length; i++) {
    var data = selfieData[i];
    data.image = loadImage(data.url);
  }

  trainDataKeys = Object.keys(trainData);
  for(var i=0; i<trainDataKeys.length; i++) {
    var curKey = trainDataKeys[i];
    var data = trainData[curKey];
    var curEmbedding = data.embedding[0];
    if(curEmbedding.length == 128) {
      curEmbedding.push(curKey);
      allEmbeddings.push(curEmbedding);
    }
    else {
      print("rejected embedding ", curEmbedding);
    }
    data.image = loadImage(data.url);
  }

  validDataKeys = Object.keys(validData);
  for(var i=0; i<validDataKeys.length; i++) {
    var curKey = validDataKeys[i];
    var data = validData[curKey];
    data.image = loadImage(data.url);
  }

  // print("Length: ", allEmbeddings.length);
  // setup k-d tree
  var N = allEmbeddings[0].length - 1; 
  embeddingDimensions = Array.apply(null, {length: N}).map(Number.call, Number);  
  // print(embeddingDimensions)
  allEmbeddingsTree = new kdTree(allEmbeddings, squaredDistance, embeddingDimensions);
  // print(allEmbeddingsTree)

  faceSelector = createSelect();
  faceSelector.option('Faces');
  faceSelector.option('Train');
  faceSelector.option('NearestNeighbors');
  faceSelector.option('TrainingQuiz');
  faceSelector.option('InterpolationQuiz');
  faceSelector.value('Faces');
  faceSelector.parent('selector1Container');

  /* create the sliders */
  for(i=1; i<=NUM_SLIDERS; i++) {
    var slider = createSlider(0, 100, 50);
    var parentStr = 'slider' + i + 'Container';
    slider.parent(parentStr);
    sliders.push(slider);
  }

  drawFaceCheckbox = createCheckbox('', true);
  drawFaceCheckbox.parent('checkbox1Container');

  faceGuideCheckbox = createCheckbox('', false);
  faceGuideCheckbox.parent('checkbox2Container');

  facePointsCheckbox = createCheckbox('', false);
  facePointsCheckbox.parent('checkbox3Container');

  sliderTint = createSlider(0, 100, 10);
  sliderTint.parent("sliderTintContainer");

  /* and the buttons */
  var loadButton = createButton('load');
  loadButton.mousePressed(loadCurrentSettings);
  loadButton.parent('button1Container');

  var interpButton = createButton('interpolate');
  interpButton.mousePressed(interpolateCurrent);
  interpButton.parent('button1Container');

  var saveButton = createButton('save');
  saveButton.mousePressed(saveCurrentSettings);
  saveButton.parent('button2Container');

  var getValuesButton = createButton('get values');
  getValuesButton.mousePressed(getSingleJson);
  getValuesButton.parent('button3Container');

  var randButton = createButton('get all values');
  randButton.mousePressed(getAllJson);
  randButton.parent('button4Container');

  updateSlidersForTraining();

  // rotation in degrees
  angleMode(DEGREES);

  haveStarted = true;
}

function saveCurrentSettings() {
  var curKey = trainDataKeys[curTrainIndex];
  obj = mainFace.getProperties();
  trainValues[curKey] = obj;
  // for(var i=0; i<obj.length; i++) {
  //   trainData[curKey][i] = obj[i];
  // }
  var text = select('#output');
  text.html("Storing values for " + curKey);
  // getAllJson();
}

function getSingleJson() {
  obj = mainFace.getProperties();
  var text = select('#output');
  var json = JSON.stringify(obj, null, 2);
  text.html(json)
}

function getAllJson() {
  obj = trainValues;
  var text = select('#output');
  var json = JSON.stringify(obj, null, 2);
  // alert(json);
  text.html(json)
}

// global variables for colors
var bg_color1 = [50, 50, 50];

var lastSwapTime = 0;
var millisPerSwap = 5000;

function changeRandomSeed() {
  curRandomSeed = curRandomSeed + 1;
  lastSwapTime = millis();
}

function mouseClicked() {
  // changeRandomSeed();
}

var quiz_done = false;
var guessed_answer = 0;

function draw () {
  var mode = faceSelector.value();

  if(millis() > lastSwapTime + millisPerSwap) {
    lastSwapTime = millis();
    // changeRandomSeed();
  }

  resetFocusedRandom(curRandomSeed);

  noStroke();
  background(bg_color1);
  var textDisplay = "unknown";

  var params = [];
  for(var i=0; i<NUM_SLIDERS; i++) {
    params.push(sliders[i].value());
  }

  if (mode == 'Faces' || mode == 'FacePair' || mode == 'Train') {
    var do_train = (mode == 'Train');
    var is_face = (mode == 'Faces');
    var show_face_guide = faceGuideCheckbox.checked();
    var show_face_points = facePointsCheckbox.checked();
    var do_draw_face = drawFaceCheckbox.checked();

    if(do_train) {
      // var keys = Object.keys(trainData);
      var curKey = trainDataKeys[curTrainIndex];
      var data = trainData[curKey];      
    }
    else {
      var data = selfieData[curFaceIndex];
    }
    // Displays the image at its actual size at point (0,0)
    var img = data.image
    if (is_face) {
        x2 = 0;
        y1 = 0;
        x1 = 0;
        var im_w = 960;
        var im_h = 500;
        var rect_w = 960;
        var rect_h = 540;
        image(img, x2, y1, im_w, im_h);
        var is_face = true;
    }
    else {
        var x1 = (width/4-400/2);
        var x2 = (3*width/4-400/2);
        var y1 = (height/2-400/2);
        var rect_w = 400;
        var rect_h = 400;
        var im_w = 400;
        var im_h = 400;
        image(img, x1, y1, 400, 400);
        var is_face = false;
    }

    if(do_train) {
      if (curKey in trainValues) {
        fill(0, 200, 0);
      }
      else {
        fill(200, 0, 0);
      }
      ellipse(x1+400/2, y1+400+15, 10, 10);      
    }

    noStroke();
    var curSliderTintValue = sliderTint.value();
    var overlayAlpha = map(curSliderTintValue, 0, 100, 255, 0);
    fill(bg_color1[0], bg_color1[1], bg_color1[2], overlayAlpha);
    rect(x2, y1, rect_w, rect_h);
    stroke(0);
    fill(255);

    for(var i=0; i<data.landmarks.length; i++) {
      // get array of face marker positions [x, y] format
      var positions = data.landmarks[i];
      var shifted_positions = JSON.parse(JSON.stringify(positions))

      var data_mean = [0.0, 0.0];
      var data_scale = 1.0;
      var data_angle = 0.0;
      if ('transform' in positions) {
        data_mean = positions.transform.center;
        data_scale = positions.transform.scale;
        data_angle = positions.transform.angle;
        delete shifted_positions.transform
      }
      var scale_x = im_w / img.width;
      var scale_y = im_h / img.height;

      push();
      translate(x1, y1)
      translate(scale_x*data_mean[0], scale_y*data_mean[1]);
      scale(scale_x*data_scale, scale_y*data_scale);
      rotate(degrees(data_angle));

      stroke(0);
      fill(255);
      strokeWeight(1/data_scale);
      Object.keys(positions).forEach(function(key) {
        if (key=='transform') {
          return;
        }
        var curSection = positions[key];
        var shiftedSection = shifted_positions[key];
        for (var i=0; i<curSection.length; i++) {
          var cur_x = curSection[i][0];
          var cur_y = curSection[i][1];
          if (show_face_points) {
              ellipse(cur_x, cur_y, 5/data_scale, 5/data_scale);
          }
          // get ready for drawing the face
          shiftedSection[i][0] = cur_x;
          shiftedSection[i][1] = cur_y;
        }
      });

      noFill();
      if(show_face_guide) {
          stroke(0, 0, 255);
          ellipse(0, 0, 4, 4);
          line(0, -2, 0, 2);
          line(-2, 0, 2, 0);        
      }
      // ellipse(x1+data_mean[0], y1+data_mean[1], 4*data_scale, 4*data_scale);
      // line(x1+data_mean[0], y1+data_mean[1]-2*data_scale, x1+data_mean[0], y1+data_mean[1]+2*data_scale);
      pop();

      var settings = params;
      // interpolation
      if ((typeof data.embedding !== 'undefined') &&
          (data.embedding != null) &&
          (data.embedding.length > i) &&
          (data.embedding[i] != null) &&
          (typeof data.embedding[i].length !== 'undefined') &&
          (data.embedding[i].length == 128)) {
        var curEmbedding = data.embedding[i];
        results = getAverageSettingsFrom(curEmbedding);
        trySettings = results[0];
        if (typeof trySettings !== 'undefined') {
          settings = trySettings;
          // print("Using embedding ", i, results)
        }
      }

      push();
      translate(x2, y1)
      translate(scale_x*data_mean[0], scale_y*data_mean[1]);
      scale(scale_x*data_scale, scale_y*data_scale);
      rotate(degrees(data_angle));
      strokeWeight(1/data_scale);
      mainFace.setProperties(settings);
      if (do_draw_face) {
          mainFace.draw(shifted_positions);
      }
      pop();
    }
    if(do_train) {
      textDisplay = "Train: " + curKey;
    }
    else {
      textDisplay = "";
    }
  }

  else if (mode == 'NearestNeighbors') {
    // var keys = Object.keys(trainData);
    var curKey = trainDataKeys[curTrainIndex];
    var data = trainData[curKey];

    // Displays the image at its actual size at point (0,0)
    var img = data.image
    var x1 = (width/4-250/2);
    var y1 = (height/3-250/2);
    image(img, x1, y1, 250, 250);
    if (curKey in trainValues) {
      fill(0, 200, 0);
    }
    else {
      fill(200, 0, 0);
    }
    ellipse(x1+250/2, y1+250+15, 10, 10);

    var y2 = (3*height/4-80/2);
    for(var i=0; i<4; i++) {
      // var keys = Object.keys(trainData);
      var curKey = curNeighbors[i];
      var nearData = trainData[curKey];      

      // Displays the image at its actual size at point (0,0)
      var img = nearData.image
      var x2 = (width/4 - 200 + i*100);
      image(img, x2, y2, 80, 80);
    }

    for(var i=0; i<1; i++) {
      // get array of face marker positions [x, y] format
      var positions = data.landmarks[i];
      var shifted_positions = JSON.parse(JSON.stringify(positions))

      var data_mean = [0.0, 0.0];
      var data_scale = 1.0;
      var data_angle = 0.0;
      if ('transform' in positions) {
        data_mean = positions.transform.center;
        data_scale = positions.transform.scale;
        data_angle = positions.transform.angle;
        delete shifted_positions.transform
      }
      var scale_x = 400.0 / img.width;
      var scale_y = 400.0 / img.height;

      Object.keys(positions).forEach(function(key) {
        if (key=='transform') {
          return;
        }
        var curSection = positions[key];
        var shiftedSection = shifted_positions[key];
        for (var i=0; i<curSection.length; i++) {
          var cur_x = curSection[i][0];
          var cur_y = curSection[i][1];
          // get ready for drawing the face
          shiftedSection[i][0] = cur_x;
          shiftedSection[i][1] = cur_y;
        }
      });


      var scale_x = 250.0 / img.width;
      var scale_y = 250.0 / img.height;
      var x2 = (3*width/4-250/2);
      push();
      translate(x2, y1);
      translate(scale_x*data_mean[0], scale_y*data_mean[1]);
      scale(scale_x*data_scale, scale_y*data_scale);
      rotate(degrees(data_angle));
      strokeWeight(1/data_scale);
      mainFace.setProperties(params);
      mainFace.draw(shifted_positions);
      pop();

      var scale_x = 80.0 / img.width;
      var scale_y = 80.0 / img.height;
      for(var j=0; j<4; j++) {
        // var keys = Object.keys(trainData);
        var curKey = curNeighbors[j];
        var x2 = (3*width/4 - 200 + j*100);

        push();
        translate(x2, y2);

        if (curKey in trainValues) {
          var settings = trainValues[curKey]
          translate(scale_x*data_mean[0], scale_y*data_mean[1]);
          scale(scale_x*data_scale, scale_y*data_scale);
          rotate(degrees(data_angle));
          strokeWeight(1/data_scale);
          littleFace.setProperties(settings);
          littleFace.draw(shifted_positions);
        }
        else {
          noFill();
          stroke(100);
          rect(10, 10, 70, 70);
        }
        pop();
      }
    }

    textDisplay = "Neighbors: " + trainDataKeys[curTrainIndex];
  }

  else if (mode == 'TrainingQuiz' || mode == 'InterpolationQuiz') {
    var curKey = trainDataKeys[curTrainIndex];
    var data = trainData[curKey];
    var valid_mode = false;
    if (mode == 'InterpolationQuiz') {
        valid_mode = true;
        curKey = validDataKeys[curValidIndex];
        data = validData[curKey];
    }

    // Displays the image at its actual size at point (0,0)
    var img = data.image
    var x1 = (width/2-200/2);
    var y1 = (height/3-300/2);
    image(img, x1, y1, 200, 200);
    if(valid_mode) {
      fill(0, 0, 200);
    }
    else if (curKey in trainValues) {
      fill(0, 200, 0);
    }
    else {
      fill(200, 0, 0);
    }
    ellipse(x1+200/2, y1+200+15, 10, 10);

    var y2 = (3*height/5-80/2);
    var y3 = (4*height/5-80/2);

/*
    for(var i=0; i<4; i++) {
      // var keys = Object.keys(trainData);
      var curKey = curNeighbors[i];
      var nearData = trainData[curKey];      

      // Displays the image at its actual size at point (0,0)
      var img = nearData.image
      var x2 = (width/4 - 200 + i*100);
      image(img, x2, y2, 80, 80);
    }
*/
    for(var i=0; i<1; i++) {
      // get array of face marker positions [x, y] format
      var positions = data.landmarks[i];
      var shifted_positions = JSON.parse(JSON.stringify(positions))

      var data_mean = [0.0, 0.0];
      var data_scale = 1.0;
      var data_angle = 0.0;
      if ('transform' in positions) {
        data_mean = positions.transform.center;
        data_scale = positions.transform.scale;
        data_angle = positions.transform.angle;
        delete shifted_positions.transform
      }
      var scale_x = 400.0 / img.width;
      var scale_y = 400.0 / img.height;

      Object.keys(positions).forEach(function(key) {
        if (key=='transform') {
          return;
        }
        var curSection = positions[key];
        var shiftedSection = shifted_positions[key];
        for (var i=0; i<curSection.length; i++) {
          var cur_x = curSection[i][0];
          var cur_y = curSection[i][1];
          // get ready for drawing the face
          shiftedSection[i][0] = cur_x;
          shiftedSection[i][1] = cur_y;
        }
      });


/*
      var scale_x = 250.0 / img.width;
      var scale_y = 250.0 / img.height;
      var x2 = (3*width/4-250/2);
      push();
      translate(x2, y1);
      translate(scale_x*data_mean[0], scale_y*data_mean[1]);
      scale(scale_x*data_scale, scale_y*data_scale);
      rotate(degrees(data_angle));
      strokeWeight(1/data_scale);
      mainFace.setProperties(params);
      mainFace.draw(shifted_positions);
      pop();
*/

      var scale_x = 80.0 / img.width;
      var scale_y = 80.0 / img.height;
      var otherKeys = Object.keys(trainValues);
      var index = otherKeys.indexOf(trainDataKeys[curTrainIndex]);
      if(index >= 0) {
        otherKeys.splice(index, 1);
      }
      var answerSlot = int(focusedRandom(0, 4));
      var answerKeys = Array(4);
      for(var j=0; j<4; j++) {
        if(j == answerSlot) {
          curKey = trainDataKeys[curTrainIndex];
        }
        else {
          var guess = int(focusedRandom(0, otherKeys.length));
          // if(otherKeys.length > j+2) {
          //   while(answerKeys.indexOf(guess) == -1) {
          //     guess = int(focusedRandom(0, otherKeys.length));
          //   }            
          // }
          curKey = otherKeys[guess];
        }
        answerKeys[j] = curKey;
        // print("Answer", j, " is ", curKey);
        var x2 = (width/2 - 200 + j*100);

        var settings = params;
        if (valid_mode && j == answerSlot) {
            var curEmbedding = data.embedding[0];
            results = getAverageSettingsFrom(curEmbedding);
            settings = results[0];
            var validTrainKeys = results[1];
        }
        else if (curKey in trainValues) {
            settings = trainValues[curKey];
        }
        push();
        translate(x2, y2);
        translate(scale_x*data_mean[0], scale_y*data_mean[1]);
        scale(scale_x*data_scale, scale_y*data_scale);
        rotate(degrees(data_angle));
        strokeWeight(1/data_scale);
        if (typeof settings !== 'undefined') {
          littleFace.setProperties(settings);
        }
        littleFace.draw(shifted_positions);
        pop();
        if(quiz_done && guessed_answer == (j+1)) {          
          push();
          translate(x2, y2);
          noFill();
          strokeWeight(4);
          if(guessed_answer == (answerSlot+1)) {
            stroke(0, 100, 0);
          }
          else {
            stroke(100, 0, 0);
          }
          rect(-10, -10, 100, 100);
          pop();
        }
      }
      if(quiz_done) {
        for(var j=0; j<4; j++) {
          if (valid_mode && (answerSlot+1) == (j+1)) {
            for(var k=0; k<4; k++) {
              var curKey = validTrainKeys[k];
              var nearData = trainData[curKey];      
              // Displays the image at its actual size at point (0,0)
              var img = nearData.image
              var x2 = (width/2 - 200 + j*100 + (k%2)*40);
              var y4 = y3 + (int(k/2))*40;
              image(img, x2, y4, 40, 40);              
            }
          }
          else {
            var curKey = answerKeys[j];
            var nearData = trainData[curKey];      
            // Displays the image at its actual size at point (0,0)
            if (typeof nearData !== 'undefined') {
              var img = nearData.image
              var x2 = (width/2 - 200 + j*100);
              image(img, x2, y3, 80, 80);            
            }
          }
        }          
      }
    }

    if(valid_mode) {
      if(quiz_done) {
        textDisplay = "InterpolationQuiz: hit spacebar to continue";
      }
      else {
        textDisplay = "InterpolationQuiz: hit 1, 2, 3, or 4 to guess";        
      }
    }
    else {
      if(quiz_done) {
        textDisplay = "TrainingQuiz: hit spacebar to continue";
      }
      else {
        textDisplay = "TrainingQuiz: hit 1, 2, 3, or 4 to guess";        
      }
    }
  }


  fill(255);
  textSize(32);
  textAlign(CENTER);
  text(textDisplay, width/2, height-12);
}

function keyTyped() {
  if(!haveStarted) {
    return;
  }
  var mode = faceSelector.value();
  if (key == 'q' && mode != 'Faces') {
    faceSelector.value('Faces');
  }
  else if (key == 'w' && mode != 'Train') {
    faceSelector.value('Train');
  }
  else if (key == 'e' && mode != 'NearestNeighbors') {
    faceSelector.value('NearestNeighbors');
  }
  else if (key == 'r' && mode != 'TrainingQuiz') {
    faceSelector.value('TrainingQuiz');
  }
  else if (key == 't' && mode != 'InterpolationQuiz') {
    faceSelector.value('InterpolationQuiz');
  }

  if (key == ' ' && 
    (mode == 'TrainingQuiz' || mode == 'InterpolationQuiz') && quiz_done) {
    quiz_done = false;
    if(mode == 'TrainingQuiz') {
        curTrainIndex = (curTrainIndex + 1) % trainDataKeys.length;
    }
    else {
        curValidIndex = (curValidIndex + 1) % validDataKeys.length;
    }
    changeRandomSeed();    
  }
  else if ((mode == 'TrainingQuiz' || mode == 'InterpolationQuiz') && quiz_done == false) {
    if(key >= '1' && key <= '4') {
      guessed_answer = key - '0';
      quiz_done = true;
    }
  }

  if (key == 's') {
    saveCurrentSettings();
  }
  else if (key == 'i') {
    interpolateCurrent();
  }
  else if (key == 'l') {
    loadCurrentSettings();
  }

  if (key == '!') {
    saveBlocksImages();
  }
  else if (key == '@') {
    saveBlocksImages(true);
  }
}

function interpolateCurrent() {
  var curNeighborSettings = [];

  for(var i=0; i<4; i++) {
    neighborKey = curNeighbors[i]
    if(neighborKey in trainValues) {
      curNeighborSettings.push(trainValues[neighborKey]);
    }
  }

  for(var i=0; i<NUM_SLIDERS; i++) {
    sliders[i].value(50);
  }

  if(curNeighborSettings.length > 0) {
    settings = curNeighborSettings[0];
    for(var i=0; i<settings.length; i++) {
      var sum = 0;
      for(j=0; j<curNeighborSettings.length; j++) {
        sum += curNeighborSettings[j][i];
      }
      var avg = int(sum / curNeighborSettings.length)
      sliders[i].value(avg);
    }
  }
}

function loadCurrentSettings() {
  var curKey = trainDataKeys[curTrainIndex];
  for(var i=0; i<NUM_SLIDERS; i++) {
    sliders[i].value(50);
  }    
  if (curKey in trainValues) {
    var settings = trainValues[curKey]
    for(var i=0; i<settings.length; i++) {
      sliders[i].value(settings[i]);
    }
  }
}

function updateSlidersForTraining() {
  var mode = faceSelector.value();
  var curKey = trainDataKeys[curTrainIndex];

  // first find the closest neighbors
  var nearest = allEmbeddingsTree.nearest(trainData[curKey].embedding[0], 5);
  curNeighbors = [];
  curNeighborSettings = [];
  for(var i=0; i<5; i++) {
    if(nearest[i][0][128] != curKey) {
      var neighborKey = nearest[i][0][128];
      curNeighbors.push(neighborKey);
      if(neighborKey in trainValues) {
        curNeighborSettings.push(trainValues[neighborKey]);
      }
    }
  }

  loadCurrentSettings();
  // if(mode == 'NearestNeighbors') {
  //   interpolateCurrent();
  // }
  // else {
  //   loadCurrentSettings();
  // }
}

function getAverageSettingsFrom(e) {
  // first find the closest neighbors
  var nearest = allEmbeddingsTree.nearest(e, 4);
  curNeighbors = [];
  curNeighborSettings = [];
  for(var i=0; i<4; i++) {
    var neighborKey = nearest[i][0][128];
    curNeighbors.push(neighborKey);
    if(neighborKey in trainValues) {
      curNeighborSettings.push(trainValues[neighborKey]);
    }
  }

  for(var i=0; i<4; i++) {
    neighborKey = curNeighbors[i]
    if(neighborKey in trainValues) {
      curNeighborSettings.push(trainValues[neighborKey]);
    }
  }

  var trainValueKeys = Object.keys(trainValues);
  var props = trainValues[trainValueKeys[0]];

  if(curNeighborSettings.length > 0) {
    settings = curNeighborSettings[0];
    for(var i=0; i<settings.length; i++) {
      var sum = 0;
      for(j=0; j<curNeighborSettings.length; j++) {
        sum += curNeighborSettings[j][i];
      }
      var avg = int(sum / curNeighborSettings.length)
      props[i] = avg;
    }
  }
  return [props, curNeighbors];
}

function keyPressed() {
  if(!haveStarted) {
    return;
  }
  var mode = faceSelector.value();
  if (mode == 'Faces') {
    if (keyCode == LEFT_ARROW || keyCode == UP_ARROW) {
      curFaceIndex = (curFaceIndex + selfieData.length - 1) % selfieData.length;
    } else if (keyCode === RIGHT_ARROW || keyCode == DOWN_ARROW) {
      curFaceIndex = (curFaceIndex + 1) % selfieData.length;
    }
  }
  else if (mode == 'Train' || mode == 'NearestNeighbors') {
    if (keyCode == LEFT_ARROW || keyCode == UP_ARROW) {
      curTrainIndex = (curTrainIndex + trainDataKeys.length - 1) % trainDataKeys.length;
      updateSlidersForTraining();
    } else if (keyCode == RIGHT_ARROW || keyCode == DOWN_ARROW) {
      curTrainIndex = (curTrainIndex + 1) % trainDataKeys.length;
      updateSlidersForTraining();
    }
  }
}
