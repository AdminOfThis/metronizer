//When I wrote this, only God and I understood what I was doing
//Now, God only knows

// ===========================
// Constants & Configuration & UI Declarations
// ===========================

// Allowed file extensions for input files (e.g., text or metronome data)
const ALLOWED_EXTENSIONS = [".txt", ".met"];

// ##################### UI ###################

// Font for rendering text on canvas (loaded in preload)
let font;

// Array to hold dynamically added section input elements (if used)
let inputSections = [];

// Button elements for user interactions: adding sections/comments, parsing input, and controlling playback
let btnAddSection, btnAddComment, btnReset, btnPlayPause, btnExport;

let sliderDensity, sliderPronounciation, sliderBallSize, sliderTime;

let tglMetronome;

let exportProgress, renderFrame;

let renderingWarning;

// ##################### EXPORT #################

let zip = new JSZip();
let imageCount = 0;

let exportFrameRate = 60;

let exportCanvas;

let exporting = false;

// ##################### CODE ###################

// Example raw code string for quick testing; uses line breaks
// let example_code = "2 120 4/4 x\r\n3 120 4/4\r\n2 60 4/4\r\n2 120 3/4\r\nc 1 1 TEST";
let example_code =
  "1 110 4/4 x\r\n2 120 4/4\r\n3 130 4/4\r\n4 140 3/4\r\nc 1 1 Test comment";

// Playback state: true when running, false when paused
window.play = false;

// Total duration (ms) of all parsed sections combined
let totalLength;

// Bounce factor for visual animation of the circle
let bounce;

// Visual properties for the bouncing circle
let circleRadius = 100;

// Movement speed: how many pixels the playhead travels per second
let pixelPerSecond = 150;

// How much the ball bounces higher on the measure start, measured in percentage from 1-100
let barPronounciation = 0;

// Width of each visual bar on the timeline
const rect_Width = 10;

// Timestamp when playback started or resumed (ms)
let startTime;

let previousSubDivide = 1;
let bool_playSound = true;

// Sound variables
let clickSound;
let startSound;

let canvasHeight;
let canvasWidth;

let previewCanvas, highResCanvas;

let width = 1920;
let height = 1080;

let bigTextSize = 80;

// Add the playSound function:
function playSound(type) {
  if (!bool_playSound || exporting) return;
  switch (type) {
    case "click":
      if (clickSound.isLoaded()) {
        clickSound.play();
      }
      break;
    case "start":
      if (startSound.isLoaded()) {
        startSound.play();
      }
      break;
    default:
      console.warn("Unknown sound type:", type);
  }
}

function preload() {
  font = loadFont("assets/Roboto-Regular.ttf");

  // Load sound files
  soundFormats("mp3", "wav");
  clickSound = loadSound("assets/sounds/perc_metronomequartz_hi.wav");
  startSound = loadSound("assets/sounds/perc_metronomequartz_lo.wav");
}

function setup() {
  frameRate(60);
  textFont(font);

  dropZone = select("#body");

  // Setup drag and drop event handlers
  dropZone.dragOver(highlight);
  dropZone.dragLeave(unhighlight);
  dropZone.drop(gotFile, unhighlight);

  canvasHeight = max(100, windowHeight / 4);
  canvasWidth = (canvasHeight / 9.0) * 16.0;

  previewCanvas = createCanvas(480, 320); // will be resized later automatically
  highResCanvas = createGraphics(1920, 1080);
  previewCanvas.parent("canvas-parent");
  previewCanvas.class("canvas");
  background(255);

  Section.list = parseInput(example_code);

  btnPlayPause = select("#btnPlayPause");
  btnPlayPause.mouseReleased(buttonPlayPause.bind(this));

  btnReset = select("#btnParse");
  btnReset.mouseReleased(buttonReset);

  btnSaveFile = select("#btnSaveFile");
  btnSaveFile.mouseReleased(buttonSave.bind(this));

  btnAddSection = select("#btnAddSection");
  btnAddSection.mouseReleased(function () {
    if (Section.list.length > 0) {
      let copyFrom = Section.list[Section.list.length - 1];
      new Section(copyFrom.count, copyFrom.bpm, copyFrom.measure);
    } else {
      new Section(1, 60, "4/4");
    }
    reset();
  });
  btnAddComment = select("#btnAddComment");
  btnAddComment.mouseReleased(function () {
    new Comment(1, 1, "");
  });

  sliderDensity = select("#sizeSlider");
  if (sliderDensity != null) {
    //Initial value
    sliderDensity.value(pixelPerSecond);
    select("#sizeValue").html(pixelPerSecond);
    //add listener
    sliderDensity.input(function () {
      pixelPerSecond = sliderDensity.value();
    });
  }
  sliderPronounciation = select("#barSlider");
  if (sliderPronounciation != null) {
    //Initial value
    sliderPronounciation.value(barPronounciation);
    select("#barSliderValue").html(barPronounciation);
    //add listener
    sliderPronounciation.input(function () {
      barPronounciation = sliderPronounciation.value();
    });
  }

  sliderBallSize = select("#ballSizeSlider");
  if (sliderBallSize != null) {
    //Initial value
    sliderBallSize.value(circleRadius);
    select("#ballSizeSliderValue").html(circleRadius);
    //add listener
    sliderBallSize.input(function () {
      circleRadius = sliderBallSize.value();
    });
  }

  sliderTime = select("#timeSlider");
  if (sliderTime != null) {
    sliderTime.input(function () {
      startTime = lastPause + (-sliderTime.value() / 10000.0) * totalLength;
    });
  }

  tglMetronome = select("#toggleMetronome");
  tglMetronome.input(function () {
    bool_playSound = tglMetronome.checked();
  });

  renderingWarning = select("#activeRender");
  renderingWarning.hide();

  exportProgress = select("#progressRender");
  exportProgress.value(0);

  renderFrame = select("#renderFrame");

  btnExport = select("#btnExport");

  if (btnExport != null) {
    btnExport.mouseReleased(function () {
      exportMP4();
    });
  }

  windowResized();
  reset();
}

function draw() {
  if (!exporting) {
    try {
      parse();
    } catch {}
    drawOnCanvas(highResCanvas, millis());
    image(
      highResCanvas,
      0,
      0,
      previewCanvas.width, // scaled-down width
      previewCanvas.height // scaled-down height
    );
  }
}

function resetExport() {
  // 🔥 Clear the zip after download
  imageCount = 0;
}

let capturer;

async function exportMP4() {
  if (exporting) {
    // Cancel export
    exporting = false;
    console.log("🚀 Export cancelled by user.");
    return;
  }
  console.log("🚀 Starting MP4 render...");

  // Create export canvas first
  if (!exportCanvas) {
    exportCanvas = createGraphics(1920, 1080);
  }
  console.log("Canvas created:", exportCanvas.width, "x", exportCanvas.height);

  // Reset state before starting
  reset();

  // Initialize CCapture
  capturer = new CCapture({
    format: "webm",
    framerate: exportFrameRate,
    verbose: false,
    name: "metronizer_capture",
    quality: 100,
  });

  // Set up export state
  exporting = true;
  renderingWarning.show();
  sliderTime.attribute("disabled", "");
  btnPlayPause.attribute("disabled", "");
  btnReset.attribute("disabled", "");
  btnExport.html("Cancel");

  // Set play state
  window.play = true;
  startTime = millis();

  // Calculate total frames needed
  let neededNumberOfFrames = ceil(
    ((totalLength + 8000) / 1000.0) * exportFrameRate
  );
  console.log("Total frames needed:", neededNumberOfFrames);
  let currentFrame = 0;

  console.log("Starting capture with", neededNumberOfFrames, "frames");

  // Start capture
  capturer.start();

  while (currentFrame < neededNumberOfFrames && exporting) {
    // Calculate time for this frame
    const frameTime = startTime + (1000.0 / exportFrameRate) * currentFrame;

    // Draw frame
    drawOnCanvas(exportCanvas, frameTime);

    // Capture frame
    capturer.capture(exportCanvas.canvas);

    // Update progress
    currentFrame++;
    const progress = currentFrame / neededNumberOfFrames;
    exportProgress.value(progress);
    renderFrame.html(
      `${currentFrame}/${neededNumberOfFrames} Frames (${Math.round(
        progress * 100
      )}%)`
    );

    // Give UI time to update
    await new Promise((resolve) => setTimeout(resolve, 0));
  }

  // Finish capture
  capturer.stop();
  if (exporting) {
    capturer.save();
  }

  // Cleanup
  exporting = false;
  renderingWarning.hide();
  sliderTime.removeAttribute("disabled");
  btnPlayPause.removeAttribute("disabled");
  btnReset.removeAttribute("disabled");
  btnExport.html("Export");
  resetExport();
  reset();
}

function highlight() {
  dropZone.addClass("dragover");
}

function unhighlight() {
  dropZone.removeClass("dragover");
}

function hasAllowedExtension(fileName) {
  return ALLOWED_EXTENSIONS.some((ext) => fileName.endsWith(ext));
}

function gotFile(file) {
  //console.log(file);
  if (hasAllowedExtension(file.name)) {
    while (Section.list.length > 0) {
      Section.list[0].remove();
    }

    while (Comment.list.length > 0) {
      Comment.list[0].remove();
    }

    // Section.list = parseInput(file.data);
    parseInput(file.data);
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
        console.log("New Section at index ", i, b);
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

function drawOnCanvas(cnv, time) {
  cnv.textFont(font);
  cnv.textSize(bigTextSize);
  if (startTime === lastPause) {
    // startTime = millis();
    totalLength = 0;
    for (let i = 0; i < Section.list.length; i++) {
      totalLength += Section.list[i].lengthTotal();
    }
  }

  if (!play) {
    //ongoing Pause + past pauses
    pauseSinceStart = time - lastPause + totalPause;
  }
  let timeSinceStart = time - pauseSinceStart - startTime;
  if (sliderTime != null && play) {
    sliderTime.value((timeSinceStart / totalLength) * 10000.0);
  }
  //console.log(timeSinceStart/1000);

  cnv.background(0);
  cnv.stroke(255);
  cnv.strokeWeight(0);
  let index = 0;

  // Takt Linie
  cnv.fill(map(bounce, 0, height / 8, 0, 25));
  let nowLineWidth = rect_Width;
  cnv.rect(width / 3 - nowLineWidth / 2, 0, nowLineWidth, height);

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

  drawComments(cnv, index, pixelPerSecond, timeSinceStart);

  // TEMPO
  if (currentBlock != undefined) {
    cnv.textAlign(LEFT, TOP);
    cnv.fill(map(bounce, 0, height / 8, 0, 255), 0, 0);
    cnv.text(currentBlock.bpm + " BPM", 10, 10);
    cnv.fill(map(bounce, 0, height / 8, 0, 255));
    cnv.text(currentBlock.measure, 10, bigTextSize + 10);
    cnv.textAlign(RIGHT, TOP);
    cnv.text(msToTime(timeSinceStart), width - 10, 10);
    cnv.textAlign(LEFT, TOP);

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

    let jump = abs(
      sin(
        ((timeSinceStart - currentLength) / currentBlock.length()) *
          PI *
          currentBlock.measure_min
      ) * bounce
    );

    // Play click sound
    if (
      (play && currentSubdivide > previousSubDivide) ||
      (currentSubdivide == 1 && previousSubDivide > currentSubdivide)
    ) {
      if (currentSubdivide == 1) {
        playSound("start");
      } else {
        playSound("click");
      }
      previousSubDivide = currentSubdivide;
    }

    // DISPLAY BARS, SUBDIVIDE, ETC
    cnv.textSize(bigTextSize * 1.5);
    cnv.textAlign(CENTER, TOP);
    if (currentSubdivide > 0) {
      cnv.fill(255);
      cnv.text(
        currentTakt + " | " + currentSubdivide + "/" + currentBlock.measure_min,
        width / 2,
        10
      );
    } else {
      let timeToEnd =
        timeSinceStart -
        (totalLength -
          Section.list[Section.list.length - 1].length() /
            Section.list[Section.list.length - 1].measure_min);
      if (timeToEnd > 0) {
        cnv.fill(map(bounce, 0, height / 8, 0, 255));
        cnv.text("END", width / 2, 10);
      } else {
        cnv.fill(map(bounce, 0, height / 8, 0, 255));
        cnv.text("0 | 0/" + currentBlock.measure_min, width / 2, 10);
      }
    }

    //BOUNCE BALL
    drawCircle(cnv, jump, timeSinceStart, currentSubdivide, currentBlock);
  }

  // TAKT LINES
  let taktCount = 0;
  for (let i = 0; i < Section.list.length; i++) {
    let block = Section.list[i];
    let blockX =
      width / 3 +
      (index * pixelPerSecond - (timeSinceStart / 1000) * pixelPerSecond);
    cnv.textAlign(LEFT, TOP);
    if (i > 0 && Section.list[i].bpm != Section.list[i - 1].bpm) {
      cnv.fill(min(map(blockX, 100, width / 3, 0, 255), 255));
      cnv.textSize(bigTextSize);
      cnv.text(block.bpm, blockX, (height / 4) * 3 + bigTextSize + 10);
    }
    if (i > 0 && Section.list[i].measure !== Section.list[i - 1].measure) {
      cnv.fill(min(map(blockX, 100, width / 3, 0, 255), 255), 0, 0);
      cnv.textSize(bigTextSize);
      cnv.textAlign(LEFT, BOTTOM);
      cnv.text(block.measure, blockX, height - 10);
    }
    for (let j = 0; j < block.count; j++) {
      let taktBegin =
        (index + (j * block.length()) / 1000) * pixelPerSecond -
        (timeSinceStart / 1000) * pixelPerSecond;
      //console.log("TAKT: " + taktBegin);

      // First get text dimensions
      let txt = (taktCount + 1).toString().trim();
      let textWidth = font.textBounds(txt, 0, 0, bigTextSize).w; // More accurate width
      let textHeight = bigTextSize; // Use font size as height
      let padding = 10; // Padding around text
      let boxWidth = 5;

      let x = width / 3 + taktBegin;
      let y = (height / 4) * 3 + boxWidth + 10 + bigTextSize;
      cnv.fill(255);
      let basecolor;
      if (!block.doNotCount) {
        cnv.textAlign(LEFT, BOTTOM);

        cnv.fill(min(map(x, 100, width / 3, 0, 255), 255));
        //TAKTZAHL
        cnv.textSize(bigTextSize);

        let bbox = font.textBounds(txt, x, y, bigTextSize);
        cnv.fill(255, 0, 0);

        // Calculate positions
        let rectX = x - rect_Width / 2;
        let rectY = y - textHeight - padding; // Move up by text height plus padding
        let rectWidth = textWidth + padding * 2;
        let rectHeight = textHeight + padding * 2;

        // Draw background rectangle
        cnv.fill(min(map(x, 100, width / 3, 0, 255), 255));
        cnv.rect(
          rectX,
          rectY + textDescent(),
          rectWidth + boxWidth * 2,
          rectHeight - 2 * textAscent() - textDescent() + boxWidth * 2
        );
        cnv.fill(0);
        cnv.rect(
          rectX + boxWidth,
          rectY + textDescent() + boxWidth,
          rectWidth,
          rectHeight - 2 * textAscent() - textDescent()
        );
        cnv.fill(min(map(x, 100, width / 3, 0, 255), 255));
        cnv.textSize(bigTextSize);
        cnv.text(txt, x - boxWidth + padding, y + textDescent() - boxWidth);

        basecolor = 255;
      } else {
        basecolor = 127;
      }

      // DEBUG
      // cnv.fill(255, 0, 0, 50);
      // cnv.rect(width - 50, height / 2, width, height / 4);
      // cnv.fill(0, 255, 0, 50);
      // cnv.rect(width -50, height / 2, width, -height / 4);

      //draw only required
      if (x >= -width && x <= width) {
        cnv.fill(min(map(x, 100, width / 3, 0, basecolor), basecolor));
        cnv.rect(x - rect_Width / 2, height / 2, rect_Width * 1.5, height / 4);

        for (let count_min = 1; count_min < block.measure_min; count_min++) {
          let addOffset =
            (block.length() / 1000 / block.measure_min) *
            count_min *
            pixelPerSecond;
          x = width / 3 + taktBegin + addOffset;
          cnv.fill(min(map(x, 100, width / 3, 0, basecolor), basecolor));
          cnv.rect(x - rect_Width / 2, height / 2, rect_Width, height / 6);
        }
      }
      if (!block.doNotCount) {
        taktCount++;
      }
    }
    index += block.lengthTotal() / 1000;
    //console.log(index);
  }

  if (timeSinceStart > totalLength + 8000) {
    //console.log("RESET")
    reset();
  }

  //noLoop();
  //frameRate(.5)
  //console.log(index + " " + pixelPerSecond + " " + timeSinceStart);
}

function drawCircle(cnv, ju, timeSinceStart, currentSubdivide, currentBlock) {
  let circleY = height / 2 - ju - circleRadius / 2.0;
  let circleX = width / 3;
  cnv.fill(255, 0, 0);

  let timeToEnd =
    timeSinceStart -
    (totalLength -
      Section.list[Section.list.length - 1].length() /
        Section.list[Section.list.length - 1].measure_min);
  // console.log(timeToEnd);
  if (play && timeToEnd > 0) {
    // Piece is over, having fun
    bounce *= 0.99;
    circleY = min(height - circleRadius / 2, circleY + timeToEnd / 5);
    circleX += (timeToEnd * timeToEnd) / 20000;
  } else {
    if (currentSubdivide == currentBlock.measure_min) {
      // pronounce the bar opening
      bounce = (height / 5) * (1 + barPronounciation / 100);
    } else {
      bounce = height / 5;
    }
  }
  cnv.circle(circleX, circleY, circleRadius);
}

function drawComments(cnv, index, pixelPerSecond, timeSinceStart) {
  cnv.textSize(bigTextSize);
  for (let c of Comment.list) {
    let x = calculateX(c, pixelPerSecond, timeSinceStart);
    cnv.fill(min(map(x, 100, width / 3, 0, 255), 255));
    cnv.textAlign(LEFT, TOP);
    cnv.text(c.commentMessage, x, height / 4);
    // Takt Linie
    // fill(map(bounce, 0, height / 8, 0, 25));
    let nowLineWidth = rect_Width / 2;
    cnv.fill(min(map(x, 100, width / 3, 0, 255), 127));
    cnv.rect(x - rect_Width / 2, height / 4, nowLineWidth, height / 2);
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
    if (Section.list[currentBlock] != null) {
      if (Section.list[currentBlock].doNotCount) {
        x +=
          (Section.list[currentBlock].lengthTotal() / 1000.0) * pixelPerSecond;

        currentBlock++;
      } else if (currentBar + Section.list[currentBlock].count <= c.bar) {
        // add total of previous block
        x +=
          (Section.list[currentBlock].lengthTotal() / 1000.0) * pixelPerSecond;
        currentBar += parseInt(Section.list[currentBlock].count);

        currentBlock++;
      } else {
        // add a bar at a time
        if (currentBar < c.bar) {
          x += (Section.list[currentBlock].length() / 1000.0) * pixelPerSecond;
        }
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
  if (sliderTime != null) {
    sliderTime.value(0);
  }
  totalLength = 0;
  for (let i = 0; i < Section.list.length; i++) {
    totalLength += Section.list[i].lengthTotal();
  }

  lastPause = millis();
  timeSinceStart = 0;
  startTime = lastPause;

  totalPause = 0;
  pauseSinceStart = 0;
  bounce = height / 4;
  window.play = false;
  previousSubDivide = 1;
  // Dispatch a CustomEvent that carries the new state
  document.dispatchEvent(
    new CustomEvent("btnPlayPause", {
      detail: { isPlaying: play },
    })
  );
}

// // If the mouse is pressed,
// // toggle full-screen mode.
// function mouseReleased() {
//   if (mouseX > 0 && mouseX < width && mouseY > 0 && mouseY < height) {
//     let fs = fullscreen();
//     fullscreen(!fs);
//     pixelsPerSecond = width / 10;
//     if (fs) {
//       resizeCanvas(800, 400);
//     } else {
//       resizeCanvas(1920, 1080);
//     }
//   }
// }

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
  // circleRadius = width / 25;
}

function buttonPlayPause() {
  window.play = !window.play;
  if (play) {
    totalPause += millis() - lastPause;
  } else {
    lastPause = millis();
  }
  document.dispatchEvent(
    new CustomEvent("btnPlayPause", {
      detail: { isPlaying: play },
    })
  );
}

const msToTime = (milliseconds) => {
  const pad = (n, z = 2) => ("00" + n).slice(-z);
  const mm = pad(((milliseconds % 3.6e6) / 6e4) | 0);
  const ss = pad(((milliseconds % 6e4) / 1000) | 0);
  const MS = pad(Math.floor((milliseconds % 1000) / 10)); // get 2-digit ms

  return `${mm}:${ss}.${MS}`;
};

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
