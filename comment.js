class Comment {
  static list = [];

  static createUI() {
    return new Comment(2, 1, "");
  }

  constructor(bar, subBar, commentMessage) {
    Comment.list.push(this);

    this.bar = bar;
    this.sub_bar = subBar;
    this.commentMessage = commentMessage;

    loadStrings("comment.html", this.AddComment.bind(this));
  }

  AddComment(data) {
    let str = "";
    for (let i = 1; i < data.length - 1; i++) {
      str += data[i];
    }
    this.index = select("#comments").elt.childElementCount;
    str = str.replaceAll(">  <", "><");
    str = str.replaceAll("XXX", this.index + "");
    const newDiv = createDiv(str);
    newDiv.innerHTML = str;
    let removeButton = select("#removeCommentButton" + this.index);
    removeButton.mouseReleased(() => {
      this.remove();
    });
    newDiv.child(removeButton);
    newDiv.parent(select("#comments"));

    this.inputBar = select("#commentBar" + this.index);
    this.inputBar.value(this.bar);
    this.inputBar.changed(
      function () {
        this.bar = select("#commentBar" + this.index).value();
      }.bind(this)
    );
    this.inputSubBar = select("#commentSubBar" + this.index);
    this.inputSubBar.value(this.sub_bar);
    this.inputSubBar.changed(
      function () {
        this.sub_bar = select("#commentSubBar" + this.index).value();
      }.bind(this)
    );
    this.inputComment = select("#commentMessage" + this.index);
    this.inputComment.value(this.commentMessage);
    this.inputComment.changed(
      function () {
        this.commentMessage = select("#commentMessage" + this.index).value();
      }.bind(this)
    );
  }

  remove() {
    select("#commentBar" + this.index)
      .parent()
      .remove();

    Comment.list.splice(Comment.list.indexOf(this), 1);
  }

  createString() {
    let result = "c ";

    result += this.bar + " " + this.sub_bar + " " + this.commentMessage;

    return result;
  }
}
