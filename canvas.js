/**
 * Canvas - P5.js Canvas Rendering Module
 *
 * Handles all visual rendering for the Metronizer canvas,
 * including the bouncing ball, timeline, and tempo indicators.
 */

// ===========================
// Canvas Constants
// ===========================

/** Width of beat indicator lines */
const RECT_WIDTH = 10;

/** Large text size for display */
const BIG_TEXT_SIZE = 80;

/** Canvas dimensions */
const CANVAS_WIDTH = 1920;
const CANVAS_HEIGHT = 1080;

// ===========================
// Canvas Variables
// ===========================

/** Font for rendering text on canvas */
let font;

/** Current canvas dimensions */
let canvasHeight;
let canvasWidth;

/** Preview and high-res canvases */
let previewCanvas, highResCanvas;

/** Shorthand for canvas dimensions */
let width = CANVAS_WIDTH;
let height = CANVAS_HEIGHT;

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

/** Whether to show time remaining */
let showTimeRemaining = false;

/** Whether to show header boxes */
let showHeaderBoxes = false;

/** Display title */
let displayTitle = "";

/** Animation type enum */
const AnimationType = {
  BOUNCE: "bounce",
  TRIANGLE: "triangle",
  SAWTOOTH: "sawtooth",
  SAWTOOTH_INV: "sawtooth_inv"
};

/** Ball animation type */
let animationType = AnimationType.BOUNCE;

/** Background color */
let colorBackground = "#000000";

/** Foreground color */
let colorForeground = "#ffffff";

/** Accent color */
let colorAccent = "#ff0000";

// ===========================
// Canvas Setup Functions
// ===========================

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
 * Handles window resize events.
 */
function windowResized() {
  let canvasHeight = max(200, windowHeight / 2);
  let canvasWidth = (canvasHeight / 9.0) * 16.0;
  resizeCanvas(canvasWidth, canvasHeight);
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
  if (!exporting) {
    updateTimeSlider(timeSinceStart);
  }

  // Get current section
  const currentBlock = getCurrentSection(timeSinceStart);

  // Draw background
  cnv.background(color(colorBackground));
  cnv.stroke(color(colorForeground));
  cnv.strokeWeight(0);
  drawPlayheadLine(cnv);
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
      calculateCurrentBarAndBeat(timeSinceStart);

    // Calculate ball jump
    const jump = calculateBallJump(timeSinceStart, currentLength, currentBlock);

    // Handle sound playback (skip during export)
    if (!exporting) {
      handleSoundPlayback(currentSubdivide);
    }

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

  // Start below header boxes if enabled
  let startY = 0;
  if (showHeaderBoxes) {
    let padding = 12;
    let boxHeight = BIG_TEXT_SIZE * 0.8 + BIG_TEXT_SIZE * 1.5 + padding * 2 ;
    startY = boxHeight ; // Add some margin
  }

  cnv.rect(width / 3 - nowLineWidth / 2, startY, nowLineWidth, height - startY);
}

/**
 * Draws current BPM, time signature, and elapsed time.
 * @param {p5.Graphics} cnv - Canvas to draw on
 * @param {Section} currentBlock - Current section
 * @param {number} timeSinceStart - Elapsed time in ms
 */
function drawCurrentInfo(cnv, currentBlock, timeSinceStart) {
  let amt = map(bounce, 0, height / 8, 0, 1);
  let padding = 12;
  let strokeW = 10;
  // Height fits title + counter (or two lines for sides)
  let boxHeight = BIG_TEXT_SIZE * 0.8 + BIG_TEXT_SIZE * 1.5 + padding * 2 ;

  // Draw header boxes if enabled
  if (showHeaderBoxes) {
    cnv.noFill();
    cnv.stroke(lerpColor(color(colorBackground), color(colorForeground), amt * 0.5));
    cnv.strokeWeight(strokeW);

    // Calculate left box dimensions
    let leftText1 = currentBlock.bpm + " BPM";
    let leftText2 = currentBlock.measure;
    let leftBounds1 = font.textBounds(leftText1, 0, 0, BIG_TEXT_SIZE);
    let leftBounds2 = font.textBounds(leftText2, 0, 0, BIG_TEXT_SIZE);
    let leftContentWidth = max(leftBounds1.w, leftBounds2.w);

    // Calculate right box dimensions using fixed reference for consistent width
    let timeFormat = totalLength >= 3600000 ? "00:00:00" : "00:00";
    let rightBounds = font.textBounds("-" + timeFormat, 0, 0, BIG_TEXT_SIZE);
    let rightContentWidth = rightBounds.w;

    // Use same width for both boxes (max of left and right)
    let sideBoxWidth = max(leftContentWidth, rightContentWidth) + padding * 3+10;

    // Position boxes with offset for stroke width
    let boxY = strokeW / 2;
    let leftX = strokeW / 2;
    let rightX = width - strokeW / 2 - sideBoxWidth;

    // Draw left box
    cnv.rect(leftX, boxY, sideBoxWidth, boxHeight);

    // Draw middle box (stretches between left and right)
    let middleX = leftX + sideBoxWidth;
    let middleWidth = rightX - middleX;
    cnv.rect(middleX, boxY, middleWidth, boxHeight);

    // Draw right box
    cnv.rect(rightX, boxY, sideBoxWidth, boxHeight);

    cnv.strokeWeight(0);
  }

  // Draw text
  let textMargin = 20;
  cnv.textAlign(LEFT, TOP);
  cnv.fill(lerpColor(color(colorBackground), color(colorAccent), amt));
  cnv.text(currentBlock.bpm + " BPM", textMargin, 10);
  cnv.fill(lerpColor(color(colorBackground), color(colorForeground), amt));
  cnv.text(currentBlock.measure, textMargin, BIG_TEXT_SIZE + 10);
  cnv.textAlign(RIGHT, TOP);
  cnv.text(msToTime(timeSinceStart), width - textMargin, 10);

  // Show time remaining if enabled
  if (showTimeRemaining) {
    let timeRemaining = max(0, totalLength - timeSinceStart);
    cnv.text("-" + msToTime(timeRemaining), width - textMargin, BIG_TEXT_SIZE + 10);
  }

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
  cnv.textAlign(CENTER, TOP);

  let counterText;
  if (currentSubdivide > 0) {
    counterText = currentTakt + " | " + currentSubdivide + "/" + currentBlock.measure_min;
  } else {
    let timeToEnd = calculateTimeToEnd(timeSinceStart);
    if (timeToEnd > 0) {
      counterText = "END";
    } else {
      counterText = "0 | 0/" + currentBlock.measure_min;
    }
  }

  // Draw title if set
  let counterY = 10;
  if (displayTitle && displayTitle.trim() !== "") {
    cnv.textSize(BIG_TEXT_SIZE * 0.8);
    let amt = map(bounce, 0, height / 8, 0, 1);
    cnv.fill(lerpColor(color(colorBackground), color(colorForeground), amt));
    cnv.text(displayTitle, width / 2, 10);
    counterY = 10 + BIG_TEXT_SIZE * 0.8 + 5;
  }

  // Draw counter text
  cnv.textSize(BIG_TEXT_SIZE * 1.5);
  if (currentSubdivide > 0) {
    cnv.fill(color(colorForeground));
  } else {
    let amt = map(bounce, 0, height / 8, 0, 1);
    cnv.fill(lerpColor(color(colorBackground), color(colorForeground), amt));
  }
  cnv.text(counterText, width / 2, counterY);
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
      cnv.fill(lerpColor(color(colorBackground), color(colorAccent), amt));
      cnv.textSize(BIG_TEXT_SIZE);
      cnv.text(block.bpm, blockX, (height / 4) * 3 + BIG_TEXT_SIZE + 10);
    }

    // Draw time signature change indicator
    if (i > 0 && Section.list[i].measure !== Section.list[i - 1].measure) {
      let amt = min(map(blockX, 100, width / 3, 0, 1), 1);
      cnv.fill(lerpColor(color(colorBackground), color(colorForeground), amt));
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
    cnv.rect(x - RECT_WIDTH / 2, height / 4, nowLineWidth, height / 4);
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
 * @returns {{currentTakt: number, currentSubdivide: number, currentLength: number}}
 */
function calculateCurrentBarAndBeat(timeSinceStart) {
  let currentTakt = 0;
  let currentSubdivide = 0;
  let t = 0;
  let currentLength = 0;

  for (let i = 0; i < Section.list.length; i++) {
    let lengthOfMeasureMin =
      Section.list[i].length() / Section.list[i].measure_min;

    if (t + Section.list[i].lengthTotal() <= timeSinceStart) {
      t += Section.list[i].lengthTotal();
      currentLength = t; // Track cumulative time up to current section
      if (!Section.list[i].doNotCount) {
        currentTakt += parseInt(Section.list[i].count);
      }
    } else {
      let addedTime = 0;
      while (t + addedTime <= timeSinceStart) {
        addedTime += lengthOfMeasureMin;
        currentSubdivide++;
        if (currentSubdivide > Section.list[i].measure_min) {
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
  const progress = ((timeSinceStart - currentLength) / currentBlock.length()) * currentBlock.measure_min;
  const phase = progress % 1;

  switch (animationType) {
    case AnimationType.TRIANGLE:
      // Triangle wave - linear up and down
      return (phase < 0.5 ? phase * 2 : 2 - phase * 2) * bounce;
    case AnimationType.SAWTOOTH:
      // Sawtooth wave - instant rise, gradual fall
      return (1 - phase) * bounce;
    case AnimationType.SAWTOOTH_INV:
      // Inverted sawtooth wave - gradual rise, instant drop
      return phase * bounce;
    default:
      // Bounce - sine wave
      return abs(sin(progress * PI) * bounce);
  }
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
