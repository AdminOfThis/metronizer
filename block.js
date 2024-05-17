class Block {
  constructor(count, bpm, measure, dnc) {
    //  console.log(count);
    this.count = count;
    this.bpm = bpm;
    this.measure = measure;
    this.doNotCount = dnc;

    this.measure_min = parseInt(measure.split("/")[0]);
    this.measure_maj = parseInt(measure.split("/")[1]);
  }

  print() {
    console.log(
      "COUNT: " +
        this.count +
        " , BPM: " +
        this.bpm +
        " , Measure: " +
        this.measure
    );
  }

  length() {
    return (60.0 / this.bpm) * this.measure_min * 1000.0;
  }

  lengthTotal() {
    return this.count * this.length();
  }
}
