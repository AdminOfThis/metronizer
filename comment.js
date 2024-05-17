class Comment {
  constructor() {
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
  }

  parseToString() {
    let result = "c ";
    const bar = selectAll("#bar")[this.index];
    const sub_bar = selectAll("#sub_bar")[this.index];
    const commentMessage = selectAll("#commentMessage")[this.index];

    result += bar.value();
    result += " " + sub_bar.value();
    result += " " + commentMessage.value();

    return result;
  }
}
