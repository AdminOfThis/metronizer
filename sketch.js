//When I wrote this, only God and I understood what I was doing
//Now, God only knows

// ##################### UI ###################

let font;

let inputSections = [];
let btnAddSection, btnAddComment, btnParse, btnPlayPause;

//let inputField;

// ##################### CODE ###################
//let example_code = "1 60 4/4 x\r\n1 60 4/4\r\n1 150 4/4\r\n1 30 3/4\r\n1 71 7/4\r\n2 60 4/4"
let example_code = "1 60 4/4 x\r\n2 150 4/4";
//let example_code = "1 60 4/4 x\r\n2 150 4/4\r\n2 120 3/4\r\n2 150 5/4";

let play = true;

var blocks = [];

let totalLength;
let bounce;

let circleRadius = 25;

let pixelPerSecond = 150;
const rect_Width = 5;

let startTime;

let sections = [];
let comments = [];

function preload() {
  font = loadFont("assets/Roboto-Regular.ttf");
}

function setup() {
  textFont(font);

  let canvasHeight = max(200, windowHeight / 2);
  let canvasWidth = (canvasHeight / 9.0) * 16.0;

  var cnv = createCanvas(canvasWidth, canvasHeight);
  cnv.parent("canvas-parent");
  cnv.class("canvas");
  background(255);

  blocks = parseInput(example_code);

  btnPlayPause = select("#btnPlayPause");
  btnPlayPause.mousePressed(buttonPlayPause.bind(this));

  btnParse = select("#btnParse");
  btnParse.mousePressed(buttonParse.bind(this.blocks));

  btnSave = select("#btnSave");
  btnSave.mousePressed(buttonSave.bind(this));

  btnAddSection = select("#btnAddSection");
  btnAddSection.mousePressed(function () {
    sections.push(new Section());
  });
  btnAddComment = select("#btnAddComment");
  btnAddComment.mousePressed(function () {
    comments.push(new Comment());
  });

  windowResized();
  reset();
}

function buttonSave() {
  console.log("NEED TO IMPLEMENT SAVING HERE");
}

function buttonParse() {
  let sectionsString = "";

  let commentsString = "";
  for (let i = 0; i < sections.length; i++) {
    sectionsString += sections[i].parseToString();
    if (sections.length > 0 && i < sections.length - 1) {
      sectionsString += "\r\n";
    }
  }

  for (let i = 0; i < comments.length; i++) {
    commentsString += comments[i].parseToString();
    if (comments.length > 0 && i < comments.length - 1) {
      commentsString += "\r\n";
    }
  }
  let combinedString = (sectionsString += "\r\n" + commentsString);
  console.log(combinedString);
  blocks = parseInput(combinedString);
  reset();
}

function parseInput(input) {
  let splits = input.split("\r\n");
  let blocks = [];
  for (let i = 0; i < splits.length; i++) {
    if (splits[i] !== "") {
      if (splits[i].startsWith("c")) {
        let s = splits[i].split(" ");
        //new Comment();
      } else {
        const s = splits[i].split(" ");
        const dnc = s.length > 3 && s[3] === "x"; // does not count
        const b = new Block(parseInt(s[0]), parseInt(s[1]), s[2], dnc);
        blocks[i] = b;
      }
    }
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
  fill(map(bounce, 0, height / 8, 0, 25));
  let nowLineWidth = rect_Width / 2;
  rect(width / 3 - nowLineWidth / 2, 0, nowLineWidth, height);
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
    textAlign(LEFT, TOP);
    fill(map(bounce, 0, height / 8, 0, 255), 0, 0);
    text(currentBlock.bpm + " BPM", 10, 10);
    fill(map(bounce, 0, height / 8, 0, 255));
    text(currentBlock.measure, 10, 50);
    textAlign(LEFT, TOP);
    text(msToTime(timeSinceStart), width - 125, 10);

    // Calculate current bar, subdivide, etc
    // Abandon all hope ye who enter beyond this point
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
          currentTakt +=
            floor(
              (addedTime - blocks[i].length() / blocks[i].measure_min) /
                blocks[i].length()
            ) + 1;
        }
        break;
      }
    }

    let ju = abs(
      sin(
        ((timeSinceStart - currentLength) / currentBlock.length()) *
          PI *
          currentBlock.measure_min
      ) * bounce
    );

    let circleY = height / 2 - ju - circleRadius / 2.0;
    let circleX = width / 3;
    fill(255, 0, 0);

    if (
      play &&
      timeSinceStart >
        totalLength -
          blocks[blocks.length - 1].length() /
            blocks[blocks.length - 1].measure_min
    ) {
      // Piece is over, having fun
      bounce *= 0.99;
      circleY = min(
        height - circleRadius / 2,
        circleY + (timeSinceStart - totalLength) / 20
      );
      circleX +=
        ((timeSinceStart - totalLength) * (timeSinceStart - totalLength)) /
        100000;
    } else {
      if (currentSubdivide == currentBlock.measure_min) {
        // pronounce the bar opening
        bounce = height / 3;
      } else {
        bounce = height / 5;
      }
    }
    circle(circleX, circleY, circleRadius);

    // DISPLAY BARS, SUBDIVIDE, ETC
    textSize(48);
    textAlign(CENTER, TOP);
    if (currentSubdivide > 0) {
      fill(255);
      text(
        currentTakt + " | " + currentSubdivide + "/" + currentBlock.measure_min,
        width / 2,
        10
      );
    } else {
      fill(map(bounce, 0, height / 8, 0, 255));
      text("END", width / 2, 10);
    }
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
      textSize(32);
      text(block.bpm, blockX, (height / 8) * 7.5);
    }
    if (i > 0 && blocks[i].measure !== blocks[i - 1].measure) {
      fill(min(map(blockX, 100, width / 3, 0, 255), 255), 0, 0);
      textSize(32);
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
        textSize(32);
        let bbox = font.textBounds(
          taktCount + 1 + "",
          x,
          height / 1.35 + 10,
          32
        );
        //fill(127);
        let textMargin = 5;
        let boxWidth = 2;
        rect(
          bbox.x - textMargin - boxWidth,
          bbox.y - textMargin - boxWidth,
          bbox.w + 2 * (textMargin + boxWidth),
          bbox.h + 2 * (textMargin + boxWidth)
        );
        fill(0);
        rect(
          bbox.x - textMargin,
          bbox.y - textMargin,
          bbox.w + 2 * textMargin,
          bbox.h + 2 * textMargin
        );
        fill(min(map(x, 100, width / 3, 0, 255), 255));
        text(taktCount + 1, x, height / 1.35 + 10);

        basecolor = 255;
      } else {
        basecolor = 127;
      }

      //draw only required
      if (x >= -width && x <= width) {
        fill(min(map(x, 100, width / 3, 0, basecolor), basecolor));
        rect(x - rect_Width / 2, height / 2, rect_Width * 1.5, height / 4);

        for (let count_min = 1; count_min < block.measure_min; count_min++) {
          let addOffset =
            (block.length() / 1000 / block.measure_min) *
            count_min *
            pixelPerSecond;
          x = width / 3 + taktBegin + addOffset;
          fill(min(map(x, 100, width / 3, 0, basecolor), basecolor));
          rect(x - rect_Width / 2, height / 2, rect_Width, height / 6);
        }
      }
      if (!block.doNotCount) {
        taktCount++;
      }
    }
    index += block.lengthTotal() / 1000;
    //console.log(index);
  }
  if (timeSinceStart > totalLength + 30000) {
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
  btnPlayPause.html("&#9654;");
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
    buttonPlayPause();
  }
}

function windowResized() {
  let canvasHeight = max(200, windowHeight / 2);
  let canvasWidth = (canvasHeight / 9.0) * 16.0;
  resizeCanvas(canvasWidth, canvasHeight);
  pixelsPerSecond = width / 10;
  circleRadius = width / 25;
}

function buttonPlayPause() {
  play = !play;
  if (play) {
    btnPlayPause.html("&#8214;");
    totalPause += millis() - lastPause;
  } else {
    btnPlayPause.html("&#9654;");
    lastPause = millis();
  }
}

const msToTime = (miliseconds) => {
  const pad = (n, z = 2) => ("00" + n).slice(-z);
  const mm = pad(((miliseconds % 3.6e6) / 6e4) | 0);
  const ss = pad(((miliseconds % 6e4) / 1000) | 0);
  const MM = pad(miliseconds % 1000, 2);

  return `${mm}:${ss}.${MM}`;
};

async function load(file) {
  let fr = new FileReader();
  fr.onload = function () {
    document.getElementById("comments").innerHTML += fr.result;
  };

  fr.readAsText(file);
}

function load_home(file, element) {
  fetch(file /*, options */)
    .then((response) => response.text())
    .then((html) => {
      const index = document.getElementById("sections").children.length / 2;
      console.log("Index " + index);
      html = html.replaceAll("XXX", index + "");
      element;
      element.innerHTML += html;
      let btnRemove = select("#removeButton" + index);
      btnRemove.btnRemove.mousePressed(function () {
        console.log("Trying to remove index " + index);
        const sections = document.getElementById("sections");

        sections.removeChild(sections.children[index * 2]);
        sections.removeChild(sections.children[index * 2]);
      });
    })
    .catch((error) => {
      console.warn(error);
    });
}
