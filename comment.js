class Comment {
  constructor() {
    loadStrings("comment.html", this.AddComment);
  }

  AddComment(data) {
    let str = "";
    for (let i = 1; i < data.length - 1; i++) {
      str += data[i];
    }
    let index = select("#comments").elt.childElementCount;
    str = str.replaceAll(">  <", "><");
    str = str.replaceAll("XXX", index + "");
    const newDiv = createDiv(str);
    newDiv.innerHTML = str;
    let removeButton = select("#removeCommentButton" + index);
    removeButton.mousePressed(() => {
      newDiv.remove();
    });
    newDiv.child(removeButton);
    newDiv.parent(select("#comments"));
  }
}
