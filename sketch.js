/**
 * Metronizer - Visual Metronome Application
 *
 * A visual metronome that displays tempo changes, time signatures,
 * and comments on a scrolling timeline with a bouncing ball.
 */

// ===========================
// Constants & Configuration
// ===========================

/** Allowed file extensions for input files */
const ALLOWED_EXTENSIONS = [".txt", ".met"];

/** Width of beat indicator lines */
const RECT_WIDTH = 10;

/** Large text size for display */
const BIG_TEXT_SIZE = 80;

/** Canvas dimensions */
const CANVAS_WIDTH = 1920;
const CANVAS_HEIGHT = 1080;

// ===========================
// UI Elements
// ===========================

/** Font for rendering text on canvas */
let font;

/** Section input elements array */
let inputSections = [];

/** Button elements */
let btnAddSection,
  btnAddComment,
  btnReset,
  btnPlayPause,
  btnExport,
  btnSaveFile;

/** Slider elements */
let sliderDensity, sliderPronounciation, sliderBallSize, sliderTime;

/** Toggle elements */
let tglMetronome;

/** Color picker elements */
let pickerBackground, pickerForeground, pickerAccent;

/** Export UI elements */
let exportProgress, renderFrame, renderingWarning;

/** Drag and drop zone */
let dropZone;

// ===========================
// Export Variables
// ===========================

/** JSZip instance for export */
let zip = new JSZip();

/** Counter for exported images */
let imageCount = 0;

/** Frame rate for video export */
let exportFrameRate = 60;

/** High-res canvas for export */
let exportCanvas;

/** Whether currently exporting */
let exporting = false;

/** CCapture instance for video capture */
let capturer;

// ===========================
// Playback State
// ===========================

/** Whether playback is running */
window.play = false;

/** Total duration of all sections in ms */
let totalLength;

/** Timestamp when playback started (ms) */
let startTime;

/** Time tracking variables */
let timeSinceStart = 0;
let lastPause = 0;
let totalPause = 0;
let pauseSinceStart = 0;

/** Previous subdivide for sound triggering */
let previousSubDivide = 1;

/** Whether to play metronome sounds */
let bool_playSound = true;

// ===========================
// Visual Settings
// ===========================

/** Bounce factor for ball animation */
let bounce;

/** Radius of bouncing ball */
let circleRadius = 100;

/** Pixels traveled per second on timeline */
let pixelPerSecond = 200;

/** Extra bounce height on bar start (0-100%) */
let barPronounciation = 0;

/** Background color */
let colorBackground = "#000000";

/** Foreground color */
let colorForeground = "#ffffff";

/** Accent color */
let colorAccent = "#ff0000";

// ===========================
// Canvas Elements
// ===========================

/** Current canvas dimensions */
let canvasHeight;
let canvasWidth;

/** Preview and high-res canvases */
let previewCanvas, highResCanvas;

/** Shorthand for canvas dimensions */
let width = CANVAS_WIDTH;
let height = CANVAS_HEIGHT;

// ===========================
// Sound Variables
// ===========================

let clickSound;
let startSound;

// ===========================
// Example Data
// ===========================

/** Example metronome data for testing */
let example_code =
  "1 110 4/4 x\r\n2 120 4/4\r\n3 130 4/4\r\n4 140 3/4\r\nc 1 1 Test comment";

// ===========================
// Sound Functions
// ===========================

/**
 * Plays a metronome sound if enabled.
 * @param {string} type - Sound type: "click" or "start"
 */
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

// ===========================
// p5.js Lifecycle Functions
// ===========================

/**
 * p5.js preload - loads assets before setup.
 */
function preload() {
  font = loadFont("assets/Roboto-Regular.ttf");
  soundFormats("mp3", "wav");
  clickSound = loadSound("assets/sounds/perc_metronomequartz_hi.wav");
  startSound = loadSound("assets/sounds/perc_metronomequartz_lo.wav");
}

/**
 * p5.js setup - initializes canvas, UI elements, and event handlers.
 */
function setup() {
  frameRate(60);
  textFont(font);

  setupDragAndDrop();
  setupCanvas();
  setupButtons();
  setupSliders();
  setupExportUI();

  // Load example data
  Section.list = parseInput(example_code);

  windowResized();
  reset();
}

/**
 * p5.js draw - main render loop.
 */
function draw() {
  if (!exporting) {
    try {
      parse();
    } catch {}
    drawOnCanvas(highResCanvas, millis());
    image(highResCanvas, 0, 0, previewCanvas.width, previewCanvas.height);
  }
}

// ===========================
// Setup Helper Functions
// ===========================

/**
 * Sets up drag and drop file handling.
 */
function setupDragAndDrop() {
  dropZone = select("#body");
  dropZone.dragOver(highlight);
  dropZone.dragLeave(unhighlight);
  dropZone.drop(gotFile, unhighlight);
}

/**
 * Creates and configures the canvas elements.
 */
function setupCanvas() {
  canvasHeight = max(100, windowHeight / 4);
  canvasWidth = (canvasHeight / 9.0) * 16.0;

  previewCanvas = createCanvas(480, 320);
  highResCanvas = createGraphics(CANVAS_WIDTH, CANVAS_HEIGHT);
  previewCanvas.parent("canvas-parent");
  previewCanvas.class("canvas");
  background(255);
}

/**
 * Initializes all button event handlers.
 */
function setupButtons() {
  btnPlayPause = select("#btnPlayPause");
  btnPlayPause.mouseReleased(buttonPlayPause.bind(this));

  btnReset = select("#btnParse");
  btnReset.mouseReleased(buttonReset);

  btnSaveFile = select("#btnSaveFile");
  btnSaveFile.mouseReleased(buttonSave.bind(this));

  btnAddSection = select("#btnAddSection");
  btnAddSection.mouseReleased(handleAddSection);

  btnAddComment = select("#btnAddComment");
  btnAddComment.mouseReleased(function () {
    new Comment(1, 1, "");
  });
}

/**
 * Handles adding a new section, copying from last or using defaults.
 */
function handleAddSection() {
  if (Section.list.length > 0) {
    let copyFrom = Section.list[Section.list.length - 1];
    new Section(copyFrom.count, copyFrom.bpm, copyFrom.measure);
  } else {
    new Section(1, 60, "4/4");
  }
  reset();
}

/**
 * Initializes all slider controls and their event handlers.
 */
function setupSliders() {
  // Density slider (pixels per second)
  sliderDensity = select("#sizeSlider");
  if (sliderDensity != null) {
    sliderDensity.value(pixelPerSecond);
    select("#sizeValue").html(pixelPerSecond);
    sliderDensity.input(function () {
      pixelPerSecond = sliderDensity.value();
    });
  }

  // Bar pronounciation slider
  sliderPronounciation = select("#barSlider");
  if (sliderPronounciation != null) {
    sliderPronounciation.value(barPronounciation);
    select("#barSliderValue").html(barPronounciation);
    sliderPronounciation.input(function () {
      barPronounciation = sliderPronounciation.value();
    });
  }

  // Ball size slider
  sliderBallSize = select("#ballSizeSlider");
  if (sliderBallSize != null) {
    sliderBallSize.value(circleRadius);
    select("#ballSizeSliderValue").html(circleRadius);
    sliderBallSize.input(function () {
      circleRadius = sliderBallSize.value();
    });
  }

  // Time slider
  sliderTime = select("#timeSlider");
  if (sliderTime != null) {
    sliderTime.input(function () {
      startTime = lastPause + (-sliderTime.value() / 10000.0) * totalLength;
    });
  }

  // Metronome toggle
  tglMetronome = select("#toggleMetronome");
  tglMetronome.input(function () {
    bool_playSound = tglMetronome.checked();
  });

  // Color pickers
  pickerBackground = select("#colorBackground");
  if (pickerBackground != null) {
    pickerBackground.input(function () {
      colorBackground = this.value();
    });
  }

  pickerForeground = select("#colorForeground");
  if (pickerForeground != null) {
    pickerForeground.input(function () {
      colorForeground = this.value();
    });
  }

  pickerAccent = select("#colorAccent");
  if (pickerAccent != null) {
    pickerAccent.input(function () {
      colorAccent = this.value();
    });
  }
}

/**
 * Sets up export-related UI elements.
 */
function setupExportUI() {
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
}

// ===========================
// Main Drawing Function
// ===========================

/**
 * Main drawing function that renders the metronome visualization.
 * @param {p5.Graphics} cnv - Canvas to draw on
 * @param {number} time - Current time in milliseconds
 */
function drawOnCanvas(cnv, time) {
  cnv.textFont(font);
  cnv.textSize(BIG_TEXT_SIZE);

  // Initialize total length if needed
  if (startTime === lastPause) {
    totalLength = calculateTotalLength();
  }

  // Calculate current playback time
  const timeSinceStart = calculateTimeSinceStart(time);
  updateTimeSlider(timeSinceStart);

  // Draw background and playhead
  cnv.background(color(colorBackground));
  cnv.stroke(color(colorForeground));
  cnv.strokeWeight(0);
  drawPlayheadLine(cnv);

  // Get current section
  const currentBlock = getCurrentSection(timeSinceStart);
  if (currentBlock == undefined && Section.list.length > 0) {
    return;
  }

  // Draw comments
  drawComments(cnv, 0, pixelPerSecond, timeSinceStart);

  if (currentBlock != undefined) {
    // Draw info displays
    drawCurrentInfo(cnv, currentBlock, timeSinceStart);

    // Calculate bar and beat
    const { currentTakt, currentSubdivide, currentLength } =
      calculateCurrentBarAndBeat(timeSinceStart, currentBlock);

    // Calculate ball jump
    const jump = calculateBallJump(timeSinceStart, currentLength, currentBlock);

    // Handle sound playback
    handleSoundPlayback(currentSubdivide);

    // Draw bar counter display
    drawBarCounter(
      cnv,
      currentTakt,
      currentSubdivide,
      currentBlock,
      timeSinceStart
    );

    // Draw bouncing ball
    drawCircle(cnv, jump, timeSinceStart, currentSubdivide, currentBlock);
  }

  // Draw all takt lines
  drawTaktLines(cnv, timeSinceStart);

  // Check for end of playback
  if (timeSinceStart > totalLength + 8000) {
    reset();
  }
}

// ===========================
// Drawing Helper Functions
// ===========================

/**
 * Draws the vertical playhead line at the 1/3 position.
 * @param {p5.Graphics} cnv - Canvas to draw on
 */
function drawPlayheadLine(cnv) {
  let amt = map(bounce, 0, height / 8, 0, 0.1);
  cnv.fill(lerpColor(color(colorBackground), color(colorForeground), amt));
  let nowLineWidth = RECT_WIDTH;
  cnv.rect(width / 3 - nowLineWidth / 2, 0, nowLineWidth, height);
}

/**
 * Draws current BPM, time signature, and elapsed time.
 * @param {p5.Graphics} cnv - Canvas to draw on
 * @param {Section} currentBlock - Current section
 * @param {number} timeSinceStart - Elapsed time in ms
 */
function drawCurrentInfo(cnv, currentBlock, timeSinceStart) {
  let amt = map(bounce, 0, height / 8, 0, 1);
  cnv.textAlign(LEFT, TOP);
  cnv.fill(lerpColor(color(colorBackground), color(colorAccent), amt));
  cnv.text(currentBlock.bpm + " BPM", 10, 10);
  cnv.fill(lerpColor(color(colorBackground), color(colorForeground), amt));
  cnv.text(currentBlock.measure, 10, BIG_TEXT_SIZE + 10);
  cnv.textAlign(RIGHT, TOP);
  cnv.text(msToTime(timeSinceStart), width - 10, 10);
  cnv.textAlign(LEFT, TOP);
}

/**
 * Draws the large bar counter display in the center.
 * @param {p5.Graphics} cnv - Canvas to draw on
 * @param {number} currentTakt - Current bar number
 * @param {number} currentSubdivide - Current beat in bar
 * @param {Section} currentBlock - Current section
 * @param {number} timeSinceStart - Elapsed time in ms
 */
function drawBarCounter(
  cnv,
  currentTakt,
  currentSubdivide,
  currentBlock,
  timeSinceStart
) {
  cnv.textSize(BIG_TEXT_SIZE * 1.5);
  cnv.textAlign(CENTER, TOP);

  if (currentSubdivide > 0) {
    cnv.fill(color(colorForeground));
    cnv.text(
      currentTakt + " | " + currentSubdivide + "/" + currentBlock.measure_min,
      width / 2,
      10
    );
  } else {
    let timeToEnd = calculateTimeToEnd(timeSinceStart);
    let amt = map(bounce, 0, height / 8, 0, 1);
    if (timeToEnd > 0) {
      cnv.fill(lerpColor(color(colorBackground), color(colorForeground), amt));
      cnv.text("END", width / 2, 10);
    } else {
      cnv.fill(lerpColor(color(colorBackground), color(colorForeground), amt));
      cnv.text("0 | 0/" + currentBlock.measure_min, width / 2, 10);
    }
  }
}

/**
 * Draws all the vertical takt (bar) lines on the timeline.
 * @param {p5.Graphics} cnv - Canvas to draw on
 * @param {number} timeSinceStart - Elapsed time in ms
 */
function drawTaktLines(cnv, timeSinceStart) {
  let taktCount = 0;
  let index = 0;

  for (let i = 0; i < Section.list.length; i++) {
    let block = Section.list[i];
    let blockX =
      width / 3 +
      (index * pixelPerSecond - (timeSinceStart / 1000) * pixelPerSecond);

    // Draw BPM change indicator
    if (i > 0 && Section.list[i].bpm != Section.list[i - 1].bpm) {
      cnv.textAlign(LEFT, TOP);
      let amt = min(map(blockX, 100, width / 3, 0, 1), 1);
      cnv.fill(lerpColor(color(colorBackground), color(colorForeground), amt));
      cnv.textSize(BIG_TEXT_SIZE);
      cnv.text(block.bpm, blockX, (height / 4) * 3 + BIG_TEXT_SIZE + 10);
    }

    // Draw time signature change indicator
    if (i > 0 && Section.list[i].measure !== Section.list[i - 1].measure) {
      let amt = min(map(blockX, 100, width / 3, 0, 1), 1);
      cnv.fill(lerpColor(color(colorBackground), color(colorAccent), amt));
      cnv.textSize(BIG_TEXT_SIZE);
      cnv.textAlign(LEFT, BOTTOM);
      cnv.text(block.measure, blockX, height - 10);
    }

    // Draw individual bars in this section
    for (let j = 0; j < block.count; j++) {
      let taktBegin =
        (index + (j * block.length()) / 1000) * pixelPerSecond -
        (timeSinceStart / 1000) * pixelPerSecond;

      let x = width / 3 + taktBegin;
      let basecolor = block.doNotCount ? 127 : 255;

      // Draw bar number box for counted bars
      if (!block.doNotCount) {
        drawBarNumberBox(cnv, x, taktCount + 1);
      }

      // Draw beat lines (only if visible)
      if (x >= -width && x <= width) {
        // Main bar line
        let amt = min(
          map(x, 100, width / 3, 0, basecolor / 255),
          basecolor / 255
        );
        cnv.fill(
          lerpColor(color(colorBackground), color(colorForeground), amt)
        );
        cnv.rect(x - RECT_WIDTH / 2, height / 2, RECT_WIDTH * 1.5, height / 4);

        // Subdivision lines
        for (let count_min = 1; count_min < block.measure_min; count_min++) {
          let addOffset =
            (block.length() / 1000 / block.measure_min) *
            count_min *
            pixelPerSecond;
          let subX = width / 3 + taktBegin + addOffset;
          let subAmt = min(
            map(subX, 100, width / 3, 0, basecolor / 255),
            basecolor / 255
          );
          cnv.fill(
            lerpColor(color(colorBackground), color(colorForeground), subAmt)
          );
          cnv.rect(subX - RECT_WIDTH / 2, height / 2, RECT_WIDTH, height / 6);
        }
      }

      if (!block.doNotCount) {
        taktCount++;
      }
    }

    index += block.lengthTotal() / 1000;
  }
}

/**
 * Draws a numbered box for a bar on the timeline.
 * @param {p5.Graphics} cnv - Canvas to draw on
 * @param {number} x - X position
 * @param {number} barNumber - Bar number to display
 */
function drawBarNumberBox(cnv, x, barNumber) {
  let txt = barNumber.toString().trim();
  let bounds = font.textBounds(txt, 0, 0, BIG_TEXT_SIZE);
  let padding = 10;
  let boxWidth = 5;

  // Center position for text and box
  let textY = (height / 4) * 3 + BIG_TEXT_SIZE / 2;
  let boxY = textY + 10; // Box slightly lower than text

  // Box dimensions
  let innerWidth = bounds.w + padding * 2;
  let innerHeight = bounds.h + padding * 2;
  let outerWidth = innerWidth + boxWidth * 2;
  let outerHeight = innerHeight + boxWidth * 2;

  // Calculate color amount based on position
  let amt = min(map(x, 100, width / 3, 0, 1), 1);

  // Draw outer box (left edge aligned with left edge of bar line)
  let boxX = x - RECT_WIDTH / 2;
  cnv.fill(lerpColor(color(colorBackground), color(colorForeground), amt));
  cnv.rect(boxX, boxY - outerHeight / 2, outerWidth, outerHeight);

  // Draw inner box
  cnv.fill(color(colorBackground));
  cnv.rect(boxX + boxWidth, boxY - innerHeight / 2, innerWidth, innerHeight);

  // Draw number (centered in box)
  cnv.fill(lerpColor(color(colorBackground), color(colorForeground), amt));
  cnv.textSize(BIG_TEXT_SIZE);
  cnv.textAlign(CENTER, CENTER);
  cnv.text(txt, boxX + outerWidth / 2, textY);
}

/**
 * Draws the bouncing ball indicator.
 * @param {p5.Graphics} cnv - Canvas to draw on
 * @param {number} jump - Current jump height
 * @param {number} timeSinceStart - Elapsed time in ms
 * @param {number} currentSubdivide - Current beat
 * @param {Section} currentBlock - Current section
 */
function drawCircle(cnv, jump, timeSinceStart, currentSubdivide, currentBlock) {
  let circleY = height / 2 - jump - circleRadius / 2.0;
  let circleX = width / 3;
  cnv.fill(color(colorAccent));

  let timeToEnd = calculateTimeToEnd(timeSinceStart);

  if (play && timeToEnd > 0) {
    // Piece is over - ball falls and rolls away
    bounce *= 0.99;
    circleY = min(height - circleRadius / 2, circleY + timeToEnd / 5);
    circleX += (timeToEnd * timeToEnd) / 20000;
  } else {
    // Normal bounce - emphasize bar start
    if (currentSubdivide == currentBlock.measure_min) {
      bounce = (height / 5) * (1 + barPronounciation / 100);
    } else {
      bounce = height / 5;
    }
  }

  cnv.circle(circleX, circleY, circleRadius);
}

/**
 * Draws comment markers on the timeline.
 * @param {p5.Graphics} cnv - Canvas to draw on
 * @param {number} index - Current index position
 * @param {number} pixelPerSecond - Pixels per second
 * @param {number} timeSinceStart - Elapsed time in ms
 */
function drawComments(cnv, index, pixelPerSecond, timeSinceStart) {
  cnv.textSize(BIG_TEXT_SIZE);

  for (let c of Comment.list) {
    let x = calculateCommentX(c, pixelPerSecond, timeSinceStart);
    let amt = min(map(x, 100, width / 3, 0, 1), 1);
    cnv.fill(lerpColor(color(colorBackground), color(colorForeground), amt));
    cnv.textAlign(LEFT, TOP);
    cnv.text(c.commentMessage, x, height / 4);

    // Draw comment marker line
    let nowLineWidth = RECT_WIDTH / 2;
    cnv.fill(
      lerpColor(color(colorBackground), color(colorForeground), amt * 0.5)
    );
    cnv.rect(x - RECT_WIDTH / 2, height / 4, nowLineWidth, height / 2);
  }
}

// ===========================
// Calculation Functions
// ===========================

/**
 * Calculates total length of all sections.
 * @returns {number} Total length in milliseconds
 */
function calculateTotalLength() {
  let total = 0;
  for (let i = 0; i < Section.list.length; i++) {
    total += Section.list[i].lengthTotal();
  }
  return total;
}

/**
 * Calculates time since playback started, accounting for pauses.
 * @param {number} time - Current time in ms
 * @returns {number} Elapsed playback time in ms
 */
function calculateTimeSinceStart(time) {
  if (!play) {
    pauseSinceStart = time - lastPause + totalPause;
  }
  return time - pauseSinceStart - startTime;
}

/**
 * Updates the time slider position during playback.
 * @param {number} timeSinceStart - Elapsed time in ms
 */
function updateTimeSlider(timeSinceStart) {
  if (sliderTime != null && play) {
    sliderTime.value((timeSinceStart / totalLength) * 10000.0);
  }
}

/**
 * Gets the current section based on elapsed time.
 * @param {number} timeSinceStart - Elapsed time in ms
 * @returns {Section|undefined} Current section or undefined
 */
function getCurrentSection(timeSinceStart) {
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

  return currentBlock;
}

/**
 * Calculates current bar number and beat within the bar.
 * @param {number} timeSinceStart - Elapsed time in ms
 * @param {Section} currentBlock - Current section
 * @returns {{currentTakt: number, currentSubdivide: number, currentLength: number}}
 */
function calculateCurrentBarAndBeat(timeSinceStart, currentBlock) {
  let currentTakt = 0;
  let currentSubdivide = 0;
  let t = 0;
  let currentLength = 0;

  for (let i = 0; i < Section.list.length; i++) {
    let lengthOfMeasureMin =
      Section.list[i].length() / currentBlock.measure_min;
    currentLength += Section.list[i].lengthTotal();

    if (t + Section.list[i].lengthTotal() <= timeSinceStart) {
      t += Section.list[i].lengthTotal();
      if (!Section.list[i].doNotCount) {
        currentTakt += parseInt(Section.list[i].count);
      }
    } else {
      let addedTime = 0;
      while (t + addedTime <= timeSinceStart) {
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

  return { currentTakt, currentSubdivide, currentLength };
}

/**
 * Calculates the ball jump height based on current time.
 * @param {number} timeSinceStart - Elapsed time in ms
 * @param {number} currentLength - Length up to current section
 * @param {Section} currentBlock - Current section
 * @returns {number} Jump height in pixels
 */
function calculateBallJump(timeSinceStart, currentLength, currentBlock) {
  return abs(
    sin(
      ((timeSinceStart - currentLength) / currentBlock.length()) *
        PI *
        currentBlock.measure_min
    ) * bounce
  );
}

/**
 * Calculates time remaining after last beat.
 * @param {number} timeSinceStart - Elapsed time in ms
 * @returns {number} Time after end in ms (negative if not ended)
 */
function calculateTimeToEnd(timeSinceStart) {
  if (Section.list.length === 0) return 0;

  const lastSection = Section.list[Section.list.length - 1];
  return (
    timeSinceStart -
    (totalLength - lastSection.length() / lastSection.measure_min)
  );
}

/**
 * Handles playing click sounds on beat changes.
 * @param {number} currentSubdivide - Current beat number
 */
function handleSoundPlayback(currentSubdivide) {
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
}

/**
 * Calculates X position for a comment on the timeline.
 * @param {Comment} c - Comment object
 * @param {number} pixelPerSecond - Pixels per second
 * @param {number} timeSinceStart - Elapsed time in ms
 * @returns {number} X position in pixels
 */
function calculateCommentX(c, pixelPerSecond, timeSinceStart) {
  let currentBar = 1;
  let currentBlock = 0;
  let x = 0;

  if (Section.list.length <= 0) {
    return 0;
  }

  while (currentBar <= c.bar && currentBlock < Section.list.length) {
    if (Section.list[currentBlock].doNotCount) {
      // doNotCount sections add time but don't increment bar numbers
      x +=
        (Section.list[currentBlock].lengthTotal() / 1000.0) * pixelPerSecond;
      currentBlock++;
    } else if (currentBar + Section.list[currentBlock].count <= c.bar) {
      // Skip entire section - it's before our target bar
      x +=
        (Section.list[currentBlock].lengthTotal() / 1000.0) * pixelPerSecond;
      currentBar += parseInt(Section.list[currentBlock].count);
      currentBlock++;
    } else {
      // Target bar is within this section
      while (currentBar < c.bar) {
        x += (Section.list[currentBlock].length() / 1000.0) * pixelPerSecond;
        currentBar++;
      }
      break;
    }
  }

  // Add sub-bar offset
  if (Section.list[currentBlock] != undefined) {
    let subBarPixels =
      (min(c.sub_bar - 1, Section.list[currentBlock].measure_min - 1) /
        Section.list[currentBlock].measure_min) *
      ((Section.list[currentBlock].length() / 1000.0) * pixelPerSecond);
    x += subBarPixels;
  }

  return x + width / 3 - (timeSinceStart / 1000.0) * pixelPerSecond;
}

// ===========================
// File Handling Functions
// ===========================

/**
 * Highlights drop zone on drag over.
 */
function highlight() {
  dropZone.addClass("dragover");
}

/**
 * Removes highlight from drop zone.
 */
function unhighlight() {
  dropZone.removeClass("dragover");
}

/**
 * Checks if filename has allowed extension.
 * @param {string} fileName - File name to check
 * @returns {boolean} True if extension is allowed
 */
function hasAllowedExtension(fileName) {
  return ALLOWED_EXTENSIONS.some((ext) => fileName.endsWith(ext));
}

/**
 * Handles dropped file.
 * @param {p5.File} file - Dropped file object
 */
function gotFile(file) {
  if (hasAllowedExtension(file.name)) {
    // Clear existing sections and comments
    while (Section.list.length > 0) {
      Section.list[0].remove();
    }
    while (Comment.list.length > 0) {
      Comment.list[0].remove();
    }

    parseInput(file.data);
  }
}

/**
 * Saves current sections and comments to file.
 */
function buttonSave() {
  let contentArray = [getStrings()];
  saveStrings(contentArray, "output.txt");
}

/**
 * Serializes all sections and comments to string format.
 * @returns {string} Serialized data
 */
function getStrings() {
  let result = "";

  for (let i = 0; i < Section.list.length; i++) {
    if (i > 0) {
      result += "\r\n";
    }
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

// ===========================
// Parsing Functions
// ===========================

/**
 * Updates all sections and comments from their current values.
 */
function parse() {
  for (let s of Section.list) {
    s.createString();
  }
  for (let c of Comment.list) {
    c.createString();
  }
}

/**
 * Parses input text into sections and comments.
 * @param {string} input - Raw input text
 * @returns {Section[]} Array of created sections
 */
function parseInput(input) {
  let splits = input.split("\r\n");
  let blocks = [];

  for (let i = 0; i < splits.length; i++) {
    if (splits[i] !== "") {
      if (splits[i].startsWith("c")) {
        // Parse comment
        let s = splits[i].split(" ");
        let message = splits[i]
          .substring(getPosition(splits[i], " ", 3), splits[i].length)
          .trim();
        new Comment(parseInt(s[1]), parseInt(s[2]), message);
      } else {
        // Parse section
        const s = splits[i].split(" ");
        const dnc = s.length > 3 && s[3] === "x";
        const b = new Section(parseInt(s[0]), parseInt(s[1]), s[2], dnc);
        blocks[i] = b;
      }
    }
  }

  reset();
  return blocks;
}

/**
 * Gets the position of the nth occurrence of a substring.
 * @param {string} string - String to search
 * @param {string} subString - Substring to find
 * @param {number} index - Occurrence number
 * @returns {number} Position of nth occurrence
 */
function getPosition(string, subString, index) {
  return string.split(subString, index).join(subString).length;
}

// ===========================
// Playback Control Functions
// ===========================

/**
 * Resets playback to beginning.
 */
function reset() {
  if (sliderTime != null) {
    sliderTime.value(0);
  }

  totalLength = calculateTotalLength();
  lastPause = millis();
  timeSinceStart = 0;
  startTime = lastPause;
  totalPause = 0;
  pauseSinceStart = 0;
  bounce = height / 4;
  window.play = false;
  previousSubDivide = 1;

  // Dispatch event for UI updates
  document.dispatchEvent(
    new CustomEvent("btnPlayPause", {
      detail: { isPlaying: play },
    })
  );
}

/**
 * Handles reset button click.
 */
function buttonReset() {
  parse();
  reset();
}

/**
 * Toggles play/pause state.
 */
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

// ===========================
// Export Functions
// ===========================

/**
 * Resets export state.
 */
function resetExport() {
  imageCount = 0;
}

/**
 * Exports the metronome visualization as MP4 video.
 */
async function exportMP4() {
  if (exporting) {
    exporting = false;
    console.log("Export cancelled by user.");
    return;
  }

  console.log("Starting MP4 render...");

  // Create export canvas
  if (!exportCanvas) {
    exportCanvas = createGraphics(CANVAS_WIDTH, CANVAS_HEIGHT);
  }

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

  window.play = true;
  startTime = millis();

  // Calculate frames needed
  let neededNumberOfFrames = ceil(
    ((totalLength + 8000) / 1000.0) * exportFrameRate
  );
  let currentFrame = 0;

  capturer.start();

  // Render each frame
  while (currentFrame < neededNumberOfFrames && exporting) {
    const frameTime = startTime + (1000.0 / exportFrameRate) * currentFrame;

    drawOnCanvas(exportCanvas, frameTime);
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

    // Allow UI updates
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

// ===========================
// Event Handlers
// ===========================

/**
 * Handles key press events.
 */
function keyPressed() {
  if (key === " ") {
    buttonPlayPause();
  } else if (keyCode === LEFT_ARROW) {
    seekToPreviousBar();
  } else if (keyCode === RIGHT_ARROW) {
    seekToNextBar();
  }
}

/**
 * Seeks to the previous bar.
 */
function seekToPreviousBar() {
  if (Section.list.length === 0) return;

  const currentTime = calculateTimeSinceStart(millis());
  const barTimes = getBarStartTimes();

  // Find the bar before current position
  let targetTime = 0;
  for (let i = barTimes.length - 1; i >= 0; i--) {
    if (barTimes[i] < currentTime - 500) { // 500ms threshold - if close to bar start, go to previous
      targetTime = barTimes[i];
      break;
    }
  }

  seekToTime(targetTime);
}

/**
 * Seeks to the next bar.
 */
function seekToNextBar() {
  if (Section.list.length === 0) return;

  const currentTime = calculateTimeSinceStart(millis());
  const barTimes = getBarStartTimes();

  // Find the bar after current position
  let targetTime = totalLength;
  for (let i = 0; i < barTimes.length; i++) {
    if (barTimes[i] > currentTime + 100) { // 100ms threshold
      targetTime = barTimes[i];
      break;
    }
  }

  seekToTime(targetTime);
}

/**
 * Gets the start times of all bars.
 * @returns {number[]} Array of bar start times in ms
 */
function getBarStartTimes() {
  const times = [0];
  let currentTime = 0;

  for (let block of Section.list) {
    const barLength = block.length();
    for (let bar = 0; bar < block.count; bar++) {
      currentTime += barLength;
      times.push(currentTime);
    }
  }

  return times;
}

/**
 * Seeks to a specific time position.
 * @param {number} targetTime - Target time in ms
 */
function seekToTime(targetTime) {
  const currentTime = calculateTimeSinceStart(millis());
  const delta = targetTime - currentTime;
  startTime -= delta;

  // Update slider
  if (sliderTime != null) {
    sliderTime.value((targetTime / totalLength) * 10000.0);
  }
}

/**
 * Handles window resize events.
 */
function windowResized() {
  let canvasHeight = max(200, windowHeight / 2);
  let canvasWidth = (canvasHeight / 9.0) * 16.0;
  resizeCanvas(canvasWidth, canvasHeight);
}

// ===========================
// Utility Functions
// ===========================

/**
 * Converts milliseconds to time string format.
 * @param {number} milliseconds - Time in milliseconds
 * @returns {string} Formatted time string (MM:SS.ms)
 */
const msToTime = (milliseconds) => {
  const pad = (n, z = 2) => ("00" + n).slice(-z);
  const mm = pad(((milliseconds % 3.6e6) / 6e4) | 0);
  const ss = pad(((milliseconds % 6e4) / 1000) | 0);
  const MS = pad(Math.floor((milliseconds % 1000) / 10));

  return `${mm}:${ss}.${MS}`;
};

/**
 * Async sleep utility.
 * @param {number} ms - Milliseconds to sleep
 * @returns {Promise} Promise that resolves after ms
 */
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
