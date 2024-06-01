class Section {
  static list = [];

  static createUI() {
    return new Section(1, 60, "4/4");
  }

  constructor(count, bpm, measure, dnc) {
    Section.list.push(this);

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
      // newDiv.remove();
      this.remove();
    });
    newDiv.child(removeButton);
    newDiv.parent(select("#sections"));

    this.inputBars = select("#bars" + this.index);
    this.inputBars.value(this.count);
    this.inputBars.changed(
      function () {
        this.count = select("#bars" + this.index).value();
      }.bind(this)
    );
    this.inputBPM = select("#bpm" + this.index);
    this.inputBPM.value(this.bpm);
    this.inputBPM.changed(
      function () {
        this.bpm = select("#bpm" + this.index).value();
      }.bind(this)
    );
    this.inputMeasure = select("#measure" + this.index);
    this.inputMeasure.value(this.measure);
    this.inputMeasure.changed(
      function () {
        this.measure = select("#measure" + this.index).value();
        this.measure_min = parseInt(this.measure.split("/")[0]);
        this.measure_maj = parseInt(this.measure.split("/")[1]);
      }.bind(this)
    );
    this.inputIsPre = select("#isPre" + this.index);
    this.inputIsPre.checked(this.doNotCount);
    this.inputIsPre.changed(
      function () {
        this.doNotCount = select("#isPre" + this.index).checked();
      }.bind(this)
    );
  }

  remove() {
    select("#bars" + this.index)
      .parent()
      .remove();

    // removing myself from the list
    Section.list.splice(Section.list.indexOf(this), 1);
  }

  createString() {
    let result = "";

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
