class Section {
  constructor() {
    this.index = select("#sections").elt.childElementCount; // Set the instance variable
    loadStrings("section.html", this.AddSection.bind(this));
  }

  AddSection(data) {
    let str = "";
    for (let i = 1; i < data.length - 1; i++) {
      str += data[i];
    }
    str = str.replaceAll(">  <", "><");
    str = str.replaceAll("XXX", this.index + ""); // Use the instance variable
    const newDiv = createDiv(str);
    newDiv.innerHTML = str;

    let removeButton = select("#removeSectionButton" + this.index); // Use the instance variable
    removeButton.mousePressed(() => {
      newDiv.remove();
    });
    newDiv.child(removeButton);
    newDiv.parent(select("#sections"));
  }

  parseToString() {
    let result = "";
    const bars = selectAll("#bars")[this.index];
    const bpm = selectAll("#bpm")[this.index];
    const measure = selectAll("#measure")[this.index];
    const isPre = select("#isPre" + this.index);

    result += bars.value();
    result += " " + bpm.value();
    result += " " + measure.value();
    result += isPre.checked() ? " x" : "";

    return result;
  }
}
