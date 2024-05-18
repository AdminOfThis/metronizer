class Section {
  // lock = false;

  static createUI() {
    return new Section(1, 60, "4/4");
  }

  constructor(count, bpm, measure, dnc = false) {
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
    // while (Section.lock) {
    //   console.log("WATINING");
    // }
    // Section.lock = true;
    try {
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
    } finally {
      // Section.lock = false;
    }
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

  length() {
    return (60.0 / this.bpm) * this.measure_min * 1000.0;
  }

  lengthTotal() {
    return this.count * this.length();
  }
}
