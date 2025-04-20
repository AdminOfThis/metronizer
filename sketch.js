//When I wrote this, only God and I understood what I was doing
//Now, God only knows

const allowedExtensions = [".txt", ".met"]; // Specify allowed file extensions

// ##################### UI ###################

let font;

let inputSections = [];
let btnAddSection, btnAddComment, btnParse, btnPlayPause;

//let inputField;

// ##################### CODE ###################
let example_code = "1 120 4/4\r\n5 180 3/4\r\nc 1 1 TEST";
// let example_code = "4 150 4/4 x\r\nc 2 1 TEST COMMENT";

let play = true;

let totalLength;
let bounce;

let circleRadius = 25;

let pixelPerSecond = 150;
const rect_Width = 5;

let startTime;

function preload() {
  font = loadFont("assets/Roboto-Regular.ttf");
}

function setup() {
  textFont(font);

  dropZone = select("#body");

  // Setup drag and drop event handlers
  dropZone.dragOver(highlight);
  dropZone.dragLeave(unhighlight);
  dropZone.drop(gotFile, unhighlight);

  let canvasHeight = max(200, windowHeight / 2);
  let canvasWidth = (canvasHeight / 9.0) * 16.0;

  var cnv = createCanvas(canvasWidth, canvasHeight);
  cnv.parent("canvas-parent");
  cnv.class("canvas");
  background(255);

  Section.list = parseInput(example_code);

  btnPlayPause = select("#btnPlayPause");
  btnPlayPause.mousePressed(buttonPlayPause.bind(this));

  btnParse = select("#btnParse");
  btnParse.mousePressed(buttonReset);

  btnSaveFile = select("#btnSaveFile");
  btnSaveFile.mousePressed(buttonSave.bind(this));

  // btnSaveClip = select("#btnSaveClip");
  // btnSaveClip.attribute("disabled", '');
  // btnSaveClip.attribute("hidden", '');

  // btnSaveClip.mousePressed(function () {console.log("BAM, WORKS")});

  btnAddSection = select("#btnAddSection");
  btnAddSection.mousePressed(function () {
    new Section(1, 60, "4/4");
    reset();
  });
  btnAddComment = select("#btnAddComment");
  btnAddComment.mousePressed(function () {
    new Comment(1, 1, "");
  });

  windowResized();
  reset();
}

function highlight() {
  dropZone.addClass("dragover");
}

function unhighlight() {
  dropZone.removeClass("dragover");
}

function hasAllowedExtension(fileName) {
  return allowedExtensions.some((ext) => fileName.endsWith(ext));
}

function gotFile(file) {
  //console.log(file);
  if (hasAllowedExtension(file.name)) {
    for (let s of sections) {
      // console.log(s);
      s.remove();
    }

    for (let c of Comment.list) {
      // console.log(s);
      c.remove();
    }

    Section.list = parseInput(file.data);
  }
}

function buttonSave() {
  let contentArray = [getStrings()];

  // Save the contentArray to a text file named 'output.txt'
  saveStrings(contentArray, "output.txt");
}

function getStrings() {
  let result = "";

  for (let i = 0; i < Section.list.length; i++) {
    if (i > 0) {
      result += "\r\n";
    }
    console.log(Section.list[i].createString());
    result += Section.list[i].createString();
  }

  for (let i = 0; i < Comment.list.length; i++) {
    if (result !== "" && Comment.list.length > 0) {
      result += "\r\n";
    }
    result += Comment.list[i].createString();
  }

  return result;
}

function buttonReset() {
  parse();
  reset();
}

function parse() {
  for (let s of Section.list) {
    s.createString();
  }

  for (let c of Comment.list) {
    c.createString();
  }
}

function parseInput(input) {
  let splits = input.split("\r\n");
  let blocks = [];
  for (let i = 0; i < splits.length; i++) {
    if (splits[i] !== "") {
      if (splits[i].startsWith("c")) {
        let s = splits[i].split(" ");

        let message = splits[i]
          .substring(getPosition(splits[i], " ", 3), splits[i].length)
          .trim();
        new Comment(parseInt(s[1]), parseInt(s[2]), message);
      } else {
        const s = splits[i].split(" ");
        const dnc = s.length > 3 && s[3] === "x"; // does not count
        const b = new Section(parseInt(s[0]), parseInt(s[1]), s[2], dnc);
        blocks[i] = b;
      }
    }
  }
  reset();
  return blocks;
}

function getPosition(string, subString, index) {
  return string.split(subString, index).join(subString).length;
}

let timeSinceStart = 0;
let lastPause = 0;
let totalPause = 0;
let pauseSinceStart = 0;

function draw() {
  try {
    parse();
  } catch {}
  textSize(32);
  if (startTime === undefined) {
    startTime = millis();
    totalLength = 0;
    for (let i = 0; i < Section.list.length; i++) {
      totalLength += Section.list[i].lengthTotal();
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

  // Takt Linie
  fill(map(bounce, 0, height / 8, 0, 25));
  let nowLineWidth = rect_Width / 2;
  rect(width / 3 - nowLineWidth / 2, 0, nowLineWidth, height);

  let currentBlock;
  let currentLength = 0;
  for (let i = 0; i < Section.list.length; i++) {
    if (currentLength < timeSinceStart) {
      currentBlock = Section.list[i];
      currentLength += Section.list[i].lengthTotal();
    }
  }
  if (currentBlock == undefined && Section.list.length > 0) {
    currentBlock = Section.list[0];
  }

  // TEMPO
  if (currentBlock != undefined) {
    textAlign(LEFT, TOP);
    fill(map(bounce, 0, height / 8, 0, 255), 0, 0);
    text(currentBlock.bpm + " BPM", 10, 10);
    fill(map(bounce, 0, height / 8, 0, 255));
    text(currentBlock.measure, 10, 50);
    textAlign(LEFT, TOP);
    text(msToTime(timeSinceStart), width - 135, 10);

    // Calculate current bar, subdivide, etc
    // Abandon all hope ye who enter beyond this point
    let currentTakt = 0;
    let currentSubdivide = 0;
    let t = 0;
    for (let i = 0; i < Section.list.length; i++) {
      let lengthOfMeasureMin =
        Section.list[i].length() / currentBlock.measure_min;
      if (t + Section.list[i].lengthTotal() <= timeSinceStart) {
        t += Section.list[i].lengthTotal();
        if (!Section.list[i].doNotCount) {
          // add the finished takt block counts

          currentTakt += parseInt(Section.list[i].count);
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
        if (!Section.list[i].doNotCount) {
          console.log("test");
          currentTakt +=
            floor(
              (addedTime -
                Section.list[i].length() / Section.list[i].measure_min +
                5) /
                Section.list[i].length()
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
      if (currentBlock.index > 0) {
        fill(map(bounce, 0, height / 8, 0, 255));
        text("END", width / 2, 10);
      } else {
        fill(map(bounce, 0, height / 8, 0, 255));
        text("0 | 0/" + currentBlock.measure_min, width / 2, 10);
      }
    }

    //BOUNCE BALL
    let circleY = height / 2 - ju - circleRadius / 2.0;
    let circleX = width / 3;
    fill(255, 0, 0);

    if (
      play &&
      timeSinceStart >
        totalLength -
          Section.list[Section.list.length - 1].length() /
            Section.list[Section.list.length - 1].measure_min
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
      // if (currentSubdivide == currentBlock.measure_min) {
      //   // pronounce the bar opening
      //   // bounce = height / 3;
      // } else {
      //   bounce = height / 5;
      // }
      bounce = height / 5;
    }
    circle(circleX, circleY, circleRadius);
  }

  // TAKT LINES
  let taktCount = 0;
  for (let i = 0; i < Section.list.length; i++) {
    let block = Section.list[i];
    let blockX =
      width / 3 +
      (index * pixelPerSecond - (timeSinceStart / 1000) * pixelPerSecond);
    textAlign(LEFT, BOTTOM);
    if (i > 0 && Section.list[i].bpm != Section.list[i - 1].bpm) {
      fill(min(map(blockX, 100, width / 3, 0, 255), 255));
      textSize(32);
      text(block.bpm, blockX, (height / 8) * 7.5);
    }
    if (i > 0 && Section.list[i].measure !== Section.list[i - 1].measure) {
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

  drawComments(index, pixelPerSecond, timeSinceStart);
  if (timeSinceStart > totalLength + 30000) {
    //console.log("RESET")
    reset();
  }

  //noLoop();
  //frameRate(.5)
  //console.log(index + " " + pixelPerSecond + " " + timeSinceStart);
}

function drawComments(index, pixelPerSecond, timeSinceStart) {
  textSize(32);
  for (let c of Comment.list) {
    let x = calculateX(c, pixelPerSecond, timeSinceStart);
    fill(min(map(x, 100, width / 3, 0, 255), 255));
    textAlign(LEFT, TOP);
    text(c.commentMessage, x, 100);
    // Takt Linie
    // fill(map(bounce, 0, height / 8, 0, 25));
    let nowLineWidth = rect_Width / 2;
    rect(x - rect_Width / 2, 100, 1, 180);
  }
}

function calculateX(c, pixelPerSecond, timeSinceStart) {
  let currentBar = 1;
  let currentBlock = 0;
  let x = 0;

  if (Section.list.length <= 0) {
    return 0;
  }

  // for (let s of Section.list) {
  //   if (s.doNotCount) {
  //     x += (Section.list[currentBlock].lengthTotal() / 1000.0) * pixelPerSecond;
  //     // // currentBar += parseInt(Section.list[currentBlock].count);
  //     currentBlock++;
  //   }
  // }

  while (currentBar <= c.bar) {
    if (Section.list[currentBlock].doNotCount) {
      x += (Section.list[currentBlock].lengthTotal() / 1000.0) * pixelPerSecond;

      currentBlock++;
    } else if (currentBar + Section.list[currentBlock].count <= c.bar) {
      // add total of previous block
      x += (Section.list[currentBlock].lengthTotal() / 1000.0) * pixelPerSecond;
      currentBar += parseInt(Section.list[currentBlock].count);

      currentBlock++;
    } else {
      // add a bar at a time
      if (currentBar < c.bar) {
        x += (Section.list[currentBlock].length() / 1000.0) * pixelPerSecond;
      }
      currentBar++;
    }
  }
  if (Section.list[currentBlock] != undefined) {
    let subBarPixels =
      (min(c.sub_bar - 1, Section.list[currentBlock].measure_min - 1) /
        Section.list[currentBlock].measure_min) *
      ((Section.list[currentBlock].length() / 1000.0) * pixelPerSecond);
    x += subBarPixels;
  }

  return x + width / 3 - (timeSinceStart / 1000.0) * pixelPerSecond;
}

function reset() {
  startTime = undefined;
  timeSinceStart = 0;
  lastPause = millis();
  totalPause = 0;
  pauseSinceStart = 0;
  bounce = height / 4;
  play = false;
  try {
    btnPlayPause.html("&#9654;");
  } catch {}
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
