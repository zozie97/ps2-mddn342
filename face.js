/*
 * FaceMap class - holds all informaiton about one mapped
 * face and is able to draw itself.
 */  

// other variables can be in here too
// these control the colors used
const bg_color = [225, 206, 187];
const fg_color = [151, 102, 52];
const stroke_color = [95, 52, 8];

function Face() {
  // these are state variables for a face
  // (your variables may be different)
  this.eye_value = 2;
  this.mouth_value = 1;
  this.tilt_value = 0;
  this.bow_value = 1;
  this.face_opacity = 50;

  /*
   * Draw a face with position lists that include:
   *    chin, right_eye, left_eye, right_eyebrow, left_eyebrow
   *    bottom_lip, top_lip, nose_tip, nose_bridge, 
   */  
  this.draw = function(positions) {

    rotate(this.tilt_value);

    //ears
    noStroke();
    fill(0, 0, 0, this.face_opacity);

    ellipse(positions.left_eyebrow[2][1] - 0.5, positions.left_eyebrow[2][1] - 0.7, 1.6, 1.6);
    ellipse(positions.right_eyebrow[2][0] + 0.5, positions.right_eyebrow[0][1] - 0.6, 1.6, 1.6);

    //head
    noStroke();
    fill(0, 0, 0, this.face_opacity);
    beginShape();
    for(var i=0; i<positions.chin.length;i++) {
      vertex(positions.chin[i][0], positions.chin[i][1]);
    }
    for(var i=positions.right_eyebrow.length-1; i>=0;i--) {
      vertex(positions.right_eyebrow[i][0] , positions.right_eyebrow[i][1] - 0.5);
    }
    for(var i=positions.left_eyebrow.length-1; i>=0;i--) {
      vertex(positions.left_eyebrow[i][0] - 0.3, positions.left_eyebrow[i][1] - 0.5);
    }
    endShape(CLOSE);

    fill(255, 255, 255);
    noStroke();
    ellipse(positions.left_eye[0][1] + 0.2, positions.left_eye[2][0], 1.8, 2);
    ellipse(positions.right_eye[1][0] - 0.2, positions.right_eye[0][1] + 0.2, 1.8, 2);
    ellipse(positions.nose_bridge[0][0], positions.nose_tip[0][1], 3.2, 2.5);

    //nose
    fill(0, 0, 0);
    ellipse(positions.nose_bridge[0][0], positions.nose_tip[0][1], 0.8, 0.4);


    //eyes
    let pos_left = average_point(positions.left_eye)
    let pos_right = average_point(positions.right_eye)
    if(this.eye_value == 1 || this.eye_value == 4){
      fill(0, 0, 0);
      ellipse(pos_left[0], pos_left[1], 0.75, 1);
      ellipse(pos_right[0], pos_right[1], 0.75, 1);

      //pupil
      fill(255, 255, 255);
      ellipse(pos_left[0], pos_left[1], 0.2, 0.2);
      ellipse(pos_right[0], pos_right[1], 0.2, 0.2);
    }
    else if (this.eye_value == 2){
      fill(0, 0, 0);
      ellipse(pos_left[0], pos_left[1], 0.75, 0.2);
      ellipse(pos_right[0], pos_right[1], 0.75, 1);
      fill(255, 255, 255);
      ellipse(pos_right[0], pos_right[1], 0.2, 0.2);
    }
    else if(this.eye_value == 3){
      fill(0, 0, 0);
      ellipse(pos_left[0], pos_left[1], 0.75, 1);
      ellipse(pos_right[0], pos_right[1], 0.75, 0.2);
      fill(255, 255, 255);
      ellipse(pos_left[0], pos_left[1], 0.2, 0.2);     
    }
    else if(this.eye_value == 0){
      fill(0, 0, 0);
      ellipse(pos_left[0], pos_left[1], 0.75, 0.1);
      ellipse(pos_right[0], pos_right[1], 0.75, 0.1);
    }
    
    //mouth
    fill(0, 0, 0);
    arc(positions.top_lip[1][1] - 0.5, positions.top_lip[1][1], 1.4, this.mouth_value, 0, 180, CHORD);

    //bow
    if(this.bow_value == 3){      
      fill(255, 100, 100);
      stroke(255, 255, 255);
      triangle(positions.nose_bridge[0][0], -2, 1.5, -2.5, 1.5, -1.5);
      triangle(positions.nose_bridge[0][0], -2, -1.5, -2.5, -1.5, -1.5);
      stroke(255, 255, 255);
      ellipse(positions.nose_bridge[0][0], -2, 0.25, 0.25);
    }
    else if(this.bow_value == 1){
      fill(120, 170, 255);
      stroke(255, 255, 255);
      triangle(positions.nose_bridge[0][0], -2, 1.5, -2.5, 1.5, -1.5);
      triangle(positions.nose_bridge[0][0], -2, -1.5, -2.5, -1.5, -1.5);
      stroke(255, 255, 255);
      ellipse(positions.nose_bridge[0][0], -2, 0.25, 0.25);
    }

  }

  /* set internal properties based on list numbers 0-100 */
  this.setProperties = function(settings) {
    this.eye_value = int(map(settings[0], 0, 100, 0, 4));
    this.mouth_value = map(settings[1], 0, 100, 0.5, 1.4);
    this.tilt_value = map(settings[2], 0, 100, -10, 15);
    this.bow_value = int(map(settings[3], 0, 100, 1, 3));
    this.face_opacity = map(settings[4], 0, 100, 10, 255);
  }

  /* get internal properties as list of numbers 0-100 */
  this.getProperties = function() {
    let settings = new Array(5);
      settings[0] = map(this.eye_value, 0, 4, 0, 100);
      settings[1] = map(this.mouth_value, 0.5, 1.4, 0, 100);
      settings[2] = map(this.tilt_value, -10, 15, 0, 100);
      settings[3] = map(this.bow_value, 1, 3, 0, 100);
      settings[4] = map(this.face_opacity, 10, 255, 0, 100);
    return settings;
  }

  // given an array of [x,y] points, return the average
  function average_point(list) {
    var sum_x = 0;
    var sum_y = 0;
    var num_points = 0;
    for(var i=0; i<list.length; i++) {
      sum_x += list[i][0];
      sum_y += list[i][1];
      num_points += 1; 
    }
    return [sum_x / num_points, sum_y / num_points];
  }
}
