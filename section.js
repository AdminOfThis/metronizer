class Section {
  // lock = false;

  static createUI() {
    return new Section(1, 60, "4/4");
  }

  constructor(count, bpm, measure, dnc) {
    //  console.log(count);
    this.count = count;
    this.bpm = bpm;
    this.measure = measure;
    this.doNotCount = dnc;

    this.measure_min = parseInt(measure.split("/")[0]);
    this.measure_maj = parseInt(measure.split("/")[1]);

    loadStrings("section.html", this.AddSection.bind(this));
  }

  AddSection(data) {
    let str = "";
    for (let i = 1; i < data.length - 1; i++) {
      str += data[i];
    }
    this.index = select("#sections").elt.childElementCount; // Set the instance variable

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

    selectAll("#bars")[this.index].value(this.count);
    selectAll("#bpm")[this.index].value(this.bpm);
    selectAll("#measure")[this.index].value(this.measure);
    select("#isPre" + this.index).checked(this.doNotCount);
  }

  createString() {
    let result = "";
    this.count = selectAll("#bars")[this.index].value();
    this.bpm = selectAll("#bpm")[this.index].value();
    this.measure = selectAll("#measure")[this.index].value();
    this.doNotCount = select("#isPre" + this.index).checked();


    result +=
      this.count +
      " " +
      this.bpm +
      " " +
      this.measure +
      (this.doNotCount ? " x" : "");

    return result;
  }

  length() {
    return (60.0 / this.bpm) * this.measure_min * 1000.0;
  }

  lengthTotal() {
    return this.count * this.length();
  }
}
