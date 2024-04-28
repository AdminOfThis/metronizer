//import controlP5.*;

//ControlP5 cp5;
// ##################### UI ###################
let inputSections = [];
let btnPlus, btnParse;

//let inputField;

// ##################### CODE ###################
//let example_code = "1 60 4/4 x\r\n1 60 4/4\r\n1 150 4/4\r\n1 30 3/4\r\n1 71 7/4\r\n2 60 4/4"
let example_code = "1 60 4/4 x\r\n2 150 4/4"
//let example_code = "1 60 4/4 x\r\n2 150 4/4\r\n2 120 3/4\r\n2 150 5/4";

let play = true;

var blocks = [];

let totalLength;
let bounce;

let pixelPerSecond = 150;
const rect_Width = 5;

let startTime;

function setup() {
  blocks = parseInput(example_code);

  btnPlus = createButton("Add Section");
  btnPlus.position(0, inputSections.length * 30);
  btnPlus.mousePressed(buttonPlus);

  btnParse = createButton("Parse");
  btnParse.mousePressed(buttonParse.bind(this.blocks));

  //inputField = createWriter("Test");
  //inputField.position(100,100);


  var cnv = createCanvas(max(400, windowWidth), max(400, windowHeight / 2));
  cnv.style("display", "block");
  background(255);

  reset();
}

function buttonPlus() {

  new UISection(inputSections.length, inputSections, btnPlus, btnParse);
}

function buttonParse() {
  let tempString = "";
  for (let i = 0; i < inputSections.length; i++) {

    let sectionValue = inputSections[i].parseSection();
    console.log(sectionValue);
    if (i > 0) {
      tempString += "\r\n";
    }
    tempString += sectionValue;
  }

  console.log(tempString);

  blocks = parseInput(tempString);
  reset();
}

function parseInput(input) {
  let splits = input.split("\r\n");
  let blocks = [];
  for (let i = 0; i < splits.length; i++) {
    let s = splits[i].split(" ");
    let dnc = s.length > 3 && s[3] === "x";
    let b = new Block(parseInt(s[0]), parseInt(s[1]), s[2], dnc);
    //b.print();
    blocks[i] = b;
    //console.log(b.length());
  }
  return blocks;
}

let timeSinceStart = 0;
let lastPause = 0;
let totalPause = 0;
let pauseSinceStart = 0;

function draw() {
  textSize(32);
  if (startTime === undefined) {
    startTime = millis();
    totalLength = 0;
    for (let i = 0; i < blocks.length; i++) {
      totalLength += blocks[i].lengthTotal();
    }
  }

  if (!play) {
    //ongoing Pause + past pauses
    pauseSinceStart = millis() - lastPause + totalPause;
  }
  let timeSinceStart = millis() - pauseSinceStart - startTime;
  //console.log(timeSinceStart/1000);

  background(0);
  stroke(255);
  strokeWeight(0);
  let index = 0;

  // Gestrichelte Linie
  //for(let i=0;i<10;i++) {
  fill(65);
  rect(width / 3, 0, rect_Width / 2, height);
  //}

  let currentBlock;
  let currentLength = 0;
  for (let i = 0; i < blocks.length; i++) {
    if (currentLength < timeSinceStart) {
      currentBlock = blocks[i];
      currentLength += blocks[i].lengthTotal();
    }
  }

  // TEMPO
  if (currentBlock != undefined) {
    //let ju = abs(sin(timeSinceStart/(currentBlock.length())*PI*currentBlock.measure_min )*height/4);
    let ju = abs(
      sin(
        ((timeSinceStart - currentLength) / currentBlock.length()) *
        PI *
        currentBlock.measure_min
      ) * bounce
    );
    if (
      timeSinceStart >
      totalLength -
      blocks[blocks.length - 1].length() /
      blocks[blocks.length - 1].measure_min
    ) {
      bounce *= 0.99;
    } else {
      bounce = height / 4;
    }
    fill(255, 0, 0);
    circle(width / 3, height / 2.25 - ju, 25);
    textAlign(LEFT, TOP);
    text(currentBlock.bpm + " BPM", 10, 10);
    fill(255);
    text(currentBlock.measure, 10, 50);
    textAlign(LEFT, TOP);
    text(msToTime(timeSinceStart), width - 125, 10);

    let br = 0;
    let currentTakt = 0;
    let currentSubdivide = 0;
    let t = 0;
    for (let i = 0; i < blocks.length; i++) {
      let lengthOfMeasureMin = blocks[i].length() / currentBlock.measure_min;
      if (t + blocks[i].lengthTotal() <= timeSinceStart) {
        t += blocks[i].lengthTotal();
        if (!blocks[i].doNotCount) {
          // add the finished takt block counts
          currentTakt += blocks[i].count;
        }
      } else {
        let addedTime = 0;
        while (t + addedTime <= timeSinceStart) {
          //console.log(addedTime);
          addedTime += lengthOfMeasureMin;
          currentSubdivide++;
          if (currentSubdivide > currentBlock.measure_min) {
            currentSubdivide = 1;
          }
        }
        if (!blocks[i].doNotCount) {
          let temp =
            blocks[i].length() + blocks[i].length() / blocks[i].measure_min;
          currentTakt += floor(addedTime / temp) + 1;
        }
        break;
      }
    }
    textAlign(CENTER, TOP);
    text(
      currentTakt + " | " + currentSubdivide + "/" + currentBlock.measure_min,
      width / 2,
      10
    );
  }

  // TAKT LINES
  let taktCount = 0;
  for (let i = 0; i < blocks.length; i++) {
    let block = blocks[i];
    let blockX =
      width / 3 +
      (index * pixelPerSecond - (timeSinceStart / 1000) * pixelPerSecond);
    textAlign(LEFT, BOTTOM);
    if (i > 0 && blocks[i].bpm != blocks[i - 1].bpm) {
      fill(min(map(blockX, 100, width / 3, 0, 255), 255));
      text(block.bpm, blockX, height - 38);
    }
    if (i > 0 && blocks[i].measure !== blocks[i - 1].measure) {
      fill(min(map(blockX, 100, width / 3, 0, 255), 255), 0, 0);
      text(block.measure, blockX, height - 10);
    }
    for (let j = 0; j < block.count; j++) {
      let taktBegin =
        (index + (j * block.length()) / 1000) * pixelPerSecond -
        (timeSinceStart / 1000) * pixelPerSecond;
      //console.log("TAKT: " + taktBegin);
      let x = width / 3 + taktBegin;
      fill(255);
      let basecolor;
      if (!block.doNotCount) {
        textAlign(LEFT, TOP);

        fill(min(map(x, 100, width / 3, 0, 255), 255));
        //TAKTZAHL
        text(taktCount + 1, x, height / 1.35 + 10);
        basecolor = 255;
      } else {
        basecolor = 127;
      }

      //draw only required
      if (x >= -width && x <= width) {
        fill(min(map(x, 100, width / 3, 0, basecolor), basecolor));
        rect(x, height / 2, rect_Width * 1.5, height / 4);

        for (let count_min = 1; count_min < block.measure_min; count_min++) {
          let addOffset =
            (block.length() / 1000 / block.measure_min) *
            count_min *
            pixelPerSecond;
          x = width / 3 + taktBegin + addOffset;
          fill(min(map(x, 100, width / 3, 0, basecolor), basecolor));
          rect(x, height / 2, rect_Width, height / 6);
        }
      }
      if (!block.doNotCount) {
        taktCount++;
      }
    }
    index += block.lengthTotal() / 1000;
    //console.log(index);
  }
  if (timeSinceStart > totalLength + 5000) {
    //console.log("RESET")
    reset();
  }

  //noLoop();
  //frameRate(.5)
}

function reset() {
  startTime = undefined;
  timeSinceStart = 0;
  lastPause = millis();
  totalPause = 0;
  pauseSinceStart = 0;
  bounce = height / 4;
  play = false;
}

// If the mouse is pressed,
// toggle full-screen mode.
function mousePressed() {
  if (mouseX > 0 && mouseX < width && mouseY > 0 && mouseY < height) {
    let fs = fullscreen();
    fullscreen(!fs);
    pixelsPerSecond = width / 10;
    if (fs) {
      createCanvas(800, 400);
    } else {
      createCanvas(1920, 1080);
    }
  }
}

// If the mouse is pressed,
// toggle full-screen mode.
function keyPressed() {
  if (keyCode === ESCAPE) {
    fullscreen(false);
  } else if (keyCode === ENTER) {
    play = !play;
    if (play) {
      totalPause += millis() - lastPause;
    } else {
      lastPause = millis();
    }
  }
}

function windowResized() {
  console.log("resize");
  resizeCanvas(max(400, windowWidth), max(400, windowHeight / 2));
  pixelsPerSecond = width / 10;
}

const msToTime = (miliseconds) => {
  const pad = (n, z = 2) => ("00" + n).slice(-z);
  const mm = pad(((miliseconds % 3.6e6) / 6e4) | 0);
  const ss = pad(((miliseconds % 6e4) / 1000) | 0);
  const MM = pad(miliseconds % 1000, 2);

  return `${mm}:${ss}.${MM}`;
};
