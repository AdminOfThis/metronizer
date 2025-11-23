/**
 * Represents a comment marker at a specific bar position in the metronome.
 * Comments can display messages at particular points during playback.
 */
class Comment {
  /** @type {Comment[]} All active comments in order */
  static list = [];

  /**
   * Creates a default comment with initial values.
   * @returns {Comment} A new comment at bar 2, beat 1 with empty message
   */
  static createUI() {
    return new Comment(2, 1, "");
  }

  /**
   * Creates a new Comment and loads its UI template.
   * @param {number} bar - Bar number where the comment appears
   * @param {number} subBar - Beat within the bar (1-indexed)
   * @param {string} commentMessage - The comment text to display
   */
  constructor(bar, subBar, commentMessage) {
    Comment.list.push(this);
    this.index = Comment.list.length - 1;

    this.bar = bar;
    this.sub_bar = subBar;
    this.commentMessage = commentMessage;

    // Load HTML template and initialize UI (async)
    loadStrings("comment.html", this.addCommentUI.bind(this));
  }

  /**
   * Callback that creates the DOM elements for this comment.
   * Called asynchronously after the HTML template loads.
   * @param {string[]} data - Lines from comment.html template
   * @private
   */
  addCommentUI(data) {
    // Combine template lines into single string
    let str = "";
    for (let i = 1; i < data.length - 1; i++) {
      str += data[i];
    }

    // Clean up and inject index into template placeholders
    str = str.replaceAll(">  <", "><");
    str = str.replaceAll("XXX", this.index + "");

    // Create container div
    const newDiv = createDiv(str);
    newDiv.class("row");
    newDiv.innerHTML = str;

    // Set up remove button
    this.removeButton = select("#removeCommentButton" + this.index);
    this.removeButton.mouseReleased(() => {
      this.remove();
    });
    newDiv.child(this.removeButton);

    // Insert at correct position to maintain order regardless of async timing
    const commentsContainer = select("#comments").elt;
    const existingChildren = commentsContainer.children;
    if (this.index >= existingChildren.length) {
      commentsContainer.appendChild(newDiv.elt);
    } else {
      commentsContainer.insertBefore(newDiv.elt, existingChildren[this.index]);
    }

    // Initialize bar input
    this.inputBar = select("#commentBar" + this.index);
    this.inputBar.value(this.bar);
    this.inputBar.changed(
      function () {
        this.bar = select("#commentBar" + this.index).value();
      }.bind(this)
    );

    // Initialize sub-bar (beat) input
    this.inputSubBar = select("#commentSubBar" + this.index);
    this.inputSubBar.value(this.sub_bar);
    this.inputSubBar.changed(
      function () {
        this.sub_bar = select("#commentSubBar" + this.index).value();
      }.bind(this)
    );

    // Initialize comment message input
    this.inputComment = select("#commentMessage" + this.index);
    this.inputComment.value(this.commentMessage);
    this.inputComment.changed(
      function () {
        this.commentMessage = select("#commentMessage" + this.index).value();
      }.bind(this)
    );

    // Store reference to parent div and set up drag and drop
    this.parentDiv = newDiv;
    this.setupDragAndDrop(newDiv);
  }

  /**
   * Sets up drag and drop functionality for reordering comments.
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
        // Reorder array
        const [movedComment] = Comment.list.splice(fromIndex, 1);
        Comment.list.splice(toIndex, 0, movedComment);

        // Reorder DOM
        const container = select("#comments").elt;
        const children = Array.from(container.children);
        const movedElement = children[fromIndex];

        if (toIndex < fromIndex) {
          container.insertBefore(movedElement, children[toIndex]);
        } else {
          container.insertBefore(movedElement, children[toIndex + 1] || null);
        }

        // Renumber all comments
        for (let c of Comment.list) {
          c.renumber();
        }
      }
    });
  }

  /**
   * Removes this comment from the UI and the static list.
   * Triggers renumbering of remaining comments.
   */
  remove() {
    // Remove DOM element
    select("#commentBar" + this.index)
      .parent()
      .remove();

    // Remove from static list
    Comment.list.splice(Comment.list.indexOf(this), 1);

    // Renumber all remaining comments
    for (let c of Comment.list) {
      c.renumber();
    }
  }

  /**
   * Updates this comment's DOM element IDs to match its new position in the list.
   * Called after a comment is removed to keep indices sequential.
   * @private
   */
  renumber() {
    let newIndex = Comment.list.indexOf(this);

    // Update all element IDs
    this.inputBar.id("commentBar" + newIndex);
    this.inputSubBar.id("commentSubBar" + newIndex);
    this.inputComment.id("commentMessage" + newIndex);
    this.removeButton.id("removeCommentButton" + newIndex);

    this.index = newIndex;
  }

  /**
   * Serializes this comment to a string format for saving.
   * @returns {string} Format: "c bar subBar message"
   */
  createString() {
    return "c " + this.bar + " " + this.sub_bar + " " + this.commentMessage;
  }
}
