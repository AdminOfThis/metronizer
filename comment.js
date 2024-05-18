class Comment {
  constructor(bar, subBar, commentMessage) {
    this.bar = bar;
    this.sub_bar = subBar;
    this.commentMessage = commentMessage;
    this.index = select("#comments").elt.childElementCount; // Set the instance variable
    loadStrings("comment.html", this.AddComment.bind(this));
  }

  AddComment(data) {
    let str = "";
    for (let i = 1; i < data.length - 1; i++) {
      str += data[i];
    }
    let index = select("#comments").elt.childElementCount;
    str = str.replaceAll(">  <", "><");
    str = str.replaceAll("XXX", this.index + "");
    const newDiv = createDiv(str);
    newDiv.innerHTML = str;
    let removeButton = select("#removeCommentButton" + this.index);
    removeButton.mousePressed(() => {
      newDiv.remove();
    });
    newDiv.child(removeButton);
    newDiv.parent(select("#comments"));

    select("#commentBar" + this.index).value(this.bar);
    select("#commentSubBar" + this.index).value(this.sub_bar);
    select("#commentMessage" + this.index).value(this.commentMessage);
  }

  remove() {
    select("#commentBar" + this.index)
      .parent()
      .remove();
    // let index = sections.indexOf(this);

    // if (index !== -1) {
    //   sections.splice(index, 1);
    // }
  }

  createString() {
    let result = "c ";
    this.bar = select("#commentBar" + this.index).value();
    this.sub_bar = select("#commentSubBar" + this.index).value();
    this.commentMessage = select("#commentMessage" + this.index).value();

    result += this.bar + " " + this.sub_bar + " " + this.commentMessage;

    return result;
  }
}
