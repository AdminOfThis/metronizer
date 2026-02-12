/**
 * Represents a metronome section with configurable bars, BPM, and time signature.
 * Each section can be displayed in the UI and edited by the user.
 */
class Section {
  /** @type {Section[]} All active sections in order */
  static list = [];

  /** @type {boolean} Whether first section has precount enabled */
  static hasPreCount = false;

  /**
   * Creates a default section with initial values.
   * @returns {Section} A new section with 1 bar at 60 BPM in 4/4 time
   */
  static createUI() {
    return new Section(1, 60, "4/4");
  }

  /**
   * Creates a new Section and loads its UI template.
   * @param {number} count - Number of bars in this section
   * @param {number} bpm - Beats per minute
   * @param {string} measure - Time signature (e.g., "4/4", "3/4")
   * @param {boolean} [dnc=false] - Do not count (precount bar)
   */
  constructor(count, bpm, measure, dnc) {
    Section.list.push(this);
    this.index = Section.list.length - 1;

    this.count = count;
    this.bpm = bpm;
    this.measure = measure;
    this.doNotCount = dnc || false;

    this.measure_min = parseInt(measure.split("/")[0]);
    this.measure_maj = parseInt(measure.split("/")[1]);

    // Load HTML template and initialize UI (async)
    loadStrings("section.html", this.addSectionUI.bind(this));
  }

  /**
   * Callback that creates the DOM elements for this section.
   * Called asynchronously after the HTML template loads.
   * @param {string[]} data - Lines from section.html template
   * @private
   */
  addSectionUI(data) {
    // Combine template lines into single string
    let str = "";
    for (let i = 1; i < data.length - 1; i++) {
      str += data[i];
    }
    // Clean up and inject index into template placeholders
    str = str.replaceAll(">  <", "><");
    str = str.replaceAll("XXX", this.index + "");

    // Create container div
    const newDiv = createDiv(""); // ← Create empty div first
    newDiv.class("row");
    newDiv.elt.innerHTML = str; // ← Set innerHTML on the element, not the p5 object

    // Store reference to the parent div
    this.parentDiv = newDiv;

    // Set up remove button
    this.removeButton = select("#removeSectionButton" + this.index);
    this.removeButton.mouseReleased(() => {
      this.remove();
    });

    // Insert at correct position by counting how many lower-indexed sections are already loaded
    let insertPosition = 0;
    for (let i = 0; i < this.index; i++) {
      if (Section.list[i].parentDiv) {
        insertPosition++;
      }
    }
    const sectionsContainer = select("#sections").elt;
    const existingChildren = sectionsContainer.children;
    if (insertPosition >= existingChildren.length) {
      sectionsContainer.appendChild(newDiv.elt);
    } else {
      sectionsContainer.insertBefore(
        newDiv.elt,
        existingChildren[insertPosition],
      );
    }

    // Initialize bars input
    this.inputBars = select("#bars" + this.index);
    this.inputBars.value(this.count);
    this.inputBars.changed(
      function () {
        this.count = select("#bars" + this.index).value();
      }.bind(this),
    );

    // Initialize BPM input
    this.inputBPM = select("#bpm" + this.index);
    this.inputBPM.value(this.bpm);
    this.inputBPM.changed(
      function () {
        this.bpm = select("#bpm" + this.index).value();
      }.bind(this),
    );

    // Initialize time signature input
    this.inputMeasure = select("#measure" + this.index);
    this.inputMeasure.value(this.measure);
    this.inputMeasure.changed(
      function () {
        this.measure = select("#measure" + this.index).value();
        this.measure_min = parseInt(this.measure.split("/")[0]);
        this.measure_maj = parseInt(this.measure.split("/")[1]);
      }.bind(this),
    );

    // Initialize precount checkbox (only visible for first section)
    this.inputIsPre = select("#isPre" + this.index);
    this.inputIsPre.checked(this.doNotCount);
    this.inputIsPre.changed(
      function () {
        this.doNotCount = select("#isPre" + this.index).checked();
        // Update static hasPreCount if this is the first section
        if (this.index === 0) {
          Section.hasPreCount = this.doNotCount;
        }
      }.bind(this),
    );
    this.precountParent = select("#precountParent" + this.index);

    // Store reference to parent div and set up drag and drop
    this.parentDiv = newDiv;
    this.setupDragAndDrop(newDiv);

    this.updatePreCount(this.index);
  }

  /**
   * Sets up drag and drop functionality for reordering sections.
   * @param {p5.Element} div - The container div element
   * @private
   */
  setupDragAndDrop(div) {
    const elt = div.elt;
    elt.draggable = true;
    elt.style.cursor = "grab";

    elt.addEventListener("dragstart", (e) => {
      e.dataTransfer.setData("text/plain", this.index);
      elt.style.opacity = "0.5";
    });

    elt.addEventListener("dragend", () => {
      elt.style.opacity = "1";
    });

    elt.addEventListener("dragover", (e) => {
      e.preventDefault();
      elt.style.borderTop = "2px solid var(--color-primary)";
    });

    elt.addEventListener("dragleave", () => {
      elt.style.borderTop = "";
    });

    elt.addEventListener("drop", (e) => {
      e.preventDefault();
      elt.style.borderTop = "";

      const fromIndex = parseInt(e.dataTransfer.getData("text/plain"));
      const toIndex = this.index;

      if (fromIndex !== toIndex) {
        // Save precount state of old first section
        const oldFirstHadPreCount = Section.hasPreCount;

        // Reorder array
        const [movedSection] = Section.list.splice(fromIndex, 1);
        Section.list.splice(toIndex, 0, movedSection);

        // Reorder DOM
        const container = select("#sections").elt;
        const children = Array.from(container.children);
        const movedElement = children[fromIndex];

        if (toIndex < fromIndex) {
          container.insertBefore(movedElement, children[toIndex]);
        } else {
          container.insertBefore(movedElement, children[toIndex + 1] || null);
        }

        // Renumber all sections
        for (let s of Section.list) {
          s.renumber();
        }

        // Transfer precount to new first section if old first had it
        if (oldFirstHadPreCount && Section.list.length > 0) {
          const newFirst = Section.list[0];
          newFirst.doNotCount = true;
          newFirst.inputIsPre.checked(true);
          Section.hasPreCount = true;
        }
      }
    });
  }

  /**
   * Removes this section from the UI and the static list.
   * Triggers renumbering of remaining sections.
   */
  remove() {
    // Remove DOM element
    select("#bars" + this.index)
      .parent()
      .remove();

    // Remove from static list
    Section.list.splice(Section.list.indexOf(this), 1);

    // Renumber all remaining sections
    for (let s of Section.list) {
      s.renumber();
    }
  }

  /**
   * Updates this section's DOM element IDs to match its new position in the list.
   * Called after a section is removed to keep indices sequential.
   * @private
   */
  renumber() {
    let newIndex = Section.list.indexOf(this);

    // Update all element IDs
    this.inputBars.elt.id = "bars" + newIndex;
    this.inputBPM.elt.id = "bpm" + newIndex;
    this.inputMeasure.elt.id = "measure" + newIndex;
    this.inputIsPre.elt.id = "isPre" + newIndex;
    this.precountParent.elt.id = "precountParent" + newIndex;
    this.removeButton.elt.id = "removeSectionButton" + newIndex;

    // Update precount visibility and reset value if not first
    this.updatePreCount(newIndex);

    this.index = newIndex;
  }

  updatePreCount(newIndex) {
    if (newIndex === 0) {
      this.precountParent.style("visibility", "visible");
      // Update static hasPreCount
      Section.hasPreCount = this.doNotCount;
    } else {
      this.precountParent.style("visibility", "hidden");
      this.doNotCount = false;
      this.inputIsPre.checked(false);
    }
  }

  /**
   * Serializes this section to a string format for saving.
   * @returns {string} Format: "count bpm measure [x]" (x if precount)
   */
  createString() {
    let result = this.count + " " + this.bpm + " " + this.measure;
    if (this.doNotCount) {
      result += " x";
    }
    return result;
  }

  /**
   * Calculates the duration of a single bar in milliseconds.
   * @returns {number} Duration in ms
   */
  length() {
    return (60.0 / this.bpm) * this.measure_min * 1000.0;
  }

  /**
   * Calculates the total duration of this section in milliseconds.
   * @returns {number} Total duration in ms
   */
  lengthTotal() {
    return this.count * this.length();
  }
}
