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

// ===========================
// UI Elements
// ===========================

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

/** Time slider update function reference */
let updateTimeSlider;

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
let bool_playSound = false;

// ===========================
// Sound Variables
// ===========================

let clickSound;
let startSound;

// ===========================
// Example Data
// ===========================

/** Example metronome data loaded from file */
let example_code;
let exampleLines;

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

  // Load example data
  exampleLines = loadStrings("assets/example.met");
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
  example_code = exampleLines.join("\n");
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
 * Initializes all button event handlers.
 */
function setupButtons() {
  btnPlayPause = select("#btnPlayPause");
  btnPlayPause.mouseReleased(buttonPlayPause.bind(this));

  btnReset = select("#btnParse");
  btnReset.mouseReleased(buttonReset);

  btnSaveFile = select("#btnSaveFile");
  btnSaveFile.mouseReleased(buttonSave.bind(this));

  // Load button
  let btnLoadFile = select("#btnLoadFile");
  let fileInput = select("#fileInput");
  if (btnLoadFile && fileInput) {
    btnLoadFile.mouseReleased(function () {
      fileInput.elt.click();
    });
    fileInput.elt.addEventListener("change", function (e) {
      if (e.target.files.length > 0) {
        let file = e.target.files[0];
        if (hasAllowedExtension(file.name)) {
          // Clear existing sections and comments
          while (Section.list.length > 0) {
            Section.list[0].remove();
          }
          while (Comment.list.length > 0) {
            Comment.list[0].remove();
          }
          // Read file
          const reader = new FileReader();
          reader.onload = function (event) {
            parseInput(event.target.result);
          };
          reader.readAsText(file);
        }
        // Reset input so same file can be loaded again
        e.target.value = "";
      }
    });
  }

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
  tglMetronome.checked(bool_playSound);
  tglMetronome.input(function () {
    bool_playSound = tglMetronome.checked();
  });

  // Animation type dropdown
  let animationSelect = select("#animationType");
  if (animationSelect != null) {
    animationType = animationSelect.value();
    animationSelect.input(function () {
      animationType = animationSelect.value();
    });
  }

  // Time remaining toggle
  let tglTimeRemaining = select("#toggleTimeRemaining");
  if (tglTimeRemaining != null) {
    showTimeRemaining = tglTimeRemaining.checked();
    tglTimeRemaining.input(function () {
      showTimeRemaining = tglTimeRemaining.checked();
    });
  }

  // Header boxes toggle
  let tglHeaderBoxes = select("#toggleHeaderBoxes");
  if (tglHeaderBoxes != null) {
    showHeaderBoxes = tglHeaderBoxes.checked();
    tglHeaderBoxes.input(function () {
      showHeaderBoxes = tglHeaderBoxes.checked();
    });
  }

  // Title input
  let titleInput = select("#titleInput");
  if (titleInput != null) {
    displayTitle = titleInput.value();
    titleInput.input(function () {
      displayTitle = titleInput.value();
    });
  }

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
// Helper Functions for Canvas
// ===========================

/**
 * Updates the time slider position during playback.
 * @param {number} timeSinceStart - Elapsed time in ms
 */
updateTimeSlider = function (timeSinceStart) {
  if (sliderTime != null && play) {
    sliderTime.value((timeSinceStart / totalLength) * 10000.0);
  }
};

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

    // Always use FileReader for consistent text reading
    if (file.file) {
      const reader = new FileReader();
      reader.onload = function (e) {
        parseInput(e.target.result);
      };
      reader.readAsText(file.file);
    } else if (file.data && typeof file.data === "string") {
      parseInput(file.data);
    }
  }
}

/**
 * Saves current sections and comments to file.
 */
function buttonSave() {
  let contentArray = [getStrings()];
  let filename = displayTitle.trim() || "output";
  saveStrings(contentArray, filename, "met");
}

/**
 * Serializes all sections and comments to string format.
 * @returns {string} Serialized data
 */
function getStrings() {
  let result = "";

  // Add settings as first line
  let settings = {
    title: displayTitle,
    speed: pixelPerSecond,
    beatEmphasis: barPronounciation,
    ballSize: circleRadius,
    showTimeRemaining: showTimeRemaining,
    showHeaderBoxes: showHeaderBoxes,
    colorForeground: colorForeground,
    colorBackground: colorBackground,
    colorAccent: colorAccent,
    playSound: bool_playSound,
    animationType: animationType,
  };
  result += "settings " + JSON.stringify(settings);

  for (let i = 0; i < Section.list.length; i++) {
    result += "\r\n";
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
  // Normalize line endings to handle both \r\n and \n
  let normalized = input.replace(/\r\n/g, "\n").replace(/\r/g, "\n");
  let splits = normalized.split("\n");
  let blocks = [];

  for (let i = 0; i < splits.length; i++) {
    if (splits[i] !== "") {
      if (splits[i].startsWith("settings ")) {
        // Parse settings
        let jsonStr = splits[i].substring(9);
        try {
          let settings = JSON.parse(jsonStr);
          applySettings(settings);
        } catch (e) {
          console.error("Failed to parse settings:", e);
        }
      } else if (splits[i].startsWith("c")) {
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
        blocks.push(b);
      }
    }
  }

  reset();
  return blocks;
}

/**
 * Applies loaded settings to variables and UI elements.
 * @param {Object} settings - Settings object from file
 */
function applySettings(settings) {
  // Apply to variables
  if (settings.title !== undefined) {
    displayTitle = settings.title;
    let titleInput = select("#titleInput");
    if (titleInput) titleInput.value(displayTitle);
  }
  if (settings.speed !== undefined) {
    pixelPerSecond = settings.speed;
    let sizeSlider = select("#sizeSlider");
    if (sizeSlider) {
      sizeSlider.value(pixelPerSecond);
      select("#sizeValue").html(pixelPerSecond);
    }
  }
  if (settings.beatEmphasis !== undefined) {
    barPronounciation = settings.beatEmphasis;
    let barSlider = select("#barSlider");
    if (barSlider) {
      barSlider.value(barPronounciation);
      select("#barSliderValue").html(barPronounciation);
    }
  }
  if (settings.ballSize !== undefined) {
    circleRadius = settings.ballSize;
    let ballSizeSlider = select("#ballSizeSlider");
    if (ballSizeSlider) {
      ballSizeSlider.value(circleRadius);
      select("#ballSizeSliderValue").html(circleRadius);
    }
  }
  if (settings.showTimeRemaining !== undefined) {
    showTimeRemaining = settings.showTimeRemaining;
    let toggle = select("#toggleTimeRemaining");
    if (toggle) toggle.checked(showTimeRemaining);
  }
  if (settings.showHeaderBoxes !== undefined) {
    showHeaderBoxes = settings.showHeaderBoxes;
    let toggle = select("#toggleHeaderBoxes");
    if (toggle) toggle.checked(showHeaderBoxes);
  }
  if (settings.colorForeground !== undefined) {
    colorForeground = settings.colorForeground;
    let picker = select("#colorForeground");
    if (picker) picker.value(colorForeground);
  }
  if (settings.colorBackground !== undefined) {
    colorBackground = settings.colorBackground;
    let picker = select("#colorBackground");
    if (picker) picker.value(colorBackground);
  }
  if (settings.colorAccent !== undefined) {
    colorAccent = settings.colorAccent;
    let picker = select("#colorAccent");
    if (picker) picker.value(colorAccent);
  }
  if (settings.playSound !== undefined) {
    bool_playSound = settings.playSound;
    let toggle = select("#toggleMetronome");
    if (toggle) toggle.checked(bool_playSound);
  }
  if (settings.animationType !== undefined) {
    animationType = settings.animationType;
    let animationSelect = select("#animationType");
    if (animationSelect) animationSelect.value(animationType);
  }
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
    }),
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
    }),
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
    ((totalLength + 8000) / 1000.0) * exportFrameRate,
  );
  let currentFrame = 0;

  capturer.start();

  // Render frames in batches for better performance
  const BATCH_SIZE = 10; // Process multiple frames before yielding to UI
  const startRenderTime = performance.now();

  while (currentFrame < neededNumberOfFrames && exporting) {
    // Process a batch of frames
    for (
      let i = 0;
      i < BATCH_SIZE && currentFrame < neededNumberOfFrames && exporting;
      i++
    ) {
      const frameTime = startTime + (1000.0 / exportFrameRate) * currentFrame;
      drawOnCanvas(exportCanvas, frameTime);
      capturer.capture(exportCanvas.canvas);
      currentFrame++;
    }

    // Update progress after each batch
    const progress = currentFrame / neededNumberOfFrames;
    const elapsed = (performance.now() - startRenderTime) / 1000;
    const remaining = (currentFrame / neededNumberOfFrames) * 100;

    exportProgress.value(progress);
    renderFrame.html(
      `${currentFrame} / ${neededNumberOfFrames} (${remaining.toFixed(2)}%)`,
    );

    // Use requestAnimationFrame for smoother UI updates
    await new Promise((resolve) => requestAnimationFrame(resolve));
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
function keyPressed(e) {
  // Handle Ctrl+S to save file
  if ((e.ctrlKey || e.metaKey) && key === "s") {
    e.preventDefault();
    buttonSave();
    return false;
  }

  // Ignore other shortcuts when typing in input fields
  let activeTag = document.activeElement.tagName.toLowerCase();
  if (activeTag === "input" || activeTag === "textarea") {
    return;
  }

  if (key === " ") {
    buttonPlayPause();
  } else if (keyCode === LEFT_ARROW) {
    seekToPreviousSection();
  } else if (keyCode === RIGHT_ARROW) {
    seekToNextSection();
  } else if (keyCode === DOWN_ARROW) {
    seekToPreviousBar();
  } else if (keyCode === UP_ARROW) {
    seekToNextBar();
  }
}

/**
 * Seeks to the previous section.
 */
function seekToPreviousSection() {
  if (Section.list.length === 0) return;

  const currentTime = calculateTimeSinceStart(millis());
  const sectionTimes = getSectionStartTimes();

  // Find the section before current position
  let targetTime = 0;
  for (let i = sectionTimes.length - 1; i >= 0; i--) {
    if (sectionTimes[i] < currentTime - 500) {
      // 500ms threshold
      targetTime = sectionTimes[i];
      break;
    }
  }

  seekToTime(targetTime);
}

/**
 * Seeks to the next section.
 */
function seekToNextSection() {
  if (Section.list.length === 0) return;

  const currentTime = calculateTimeSinceStart(millis());
  const sectionTimes = getSectionStartTimes();

  // Find the section after current position
  let targetTime = totalLength;
  for (let i = 0; i < sectionTimes.length; i++) {
    if (sectionTimes[i] > currentTime + 100) {
      // 100ms threshold
      targetTime = sectionTimes[i];
      break;
    }
  }

  seekToTime(targetTime);
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
    if (barTimes[i] < currentTime - 500) {
      // 500ms threshold
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
    if (barTimes[i] > currentTime + 100) {
      // 100ms threshold
      targetTime = barTimes[i];
      break;
    }
  }

  seekToTime(targetTime);
}

/**
 * Gets the start times of all sections.
 * @returns {number[]} Array of section start times in ms
 */
function getSectionStartTimes() {
  const times = [0];
  let currentTime = 0;

  for (let block of Section.list) {
    currentTime += block.lengthTotal();
    times.push(currentTime);
  }

  return times;
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

// ===========================
// Utility Functions
// ===========================

/**
 * Async sleep utility.
 * @param {number} ms - Milliseconds to sleep
 * @returns {Promise} Promise that resolves after ms
 */
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
