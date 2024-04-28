class UISection {

    constructor(index, list, btnPlus, btnParse) {
        this.index = index;
        this.list = list;
        this.btnPlus = btnPlus;
        this.btnParse = btnParse;
        this.list[this.index] = this;

        this.numBars = createInput("2");
        this.numBars.size(100, this.numBars.height - 6);
        this.numBars.position(0, (this.numBars.height + 10) * index);

        this.numBPM = createInput("60");
        this.numBPM.size(30, this.numBars.height);
        this.numBPM.position(this.numBars.width + 10, (this.numBars.height + 10) * index);


        this.numMeasureMin = createInput("4");
        this.numMeasureMin.size(20, this.numBars.height);
        this.numMeasureMin.position(this.numBars.width + 10 + this.numBPM.width + 10 + 25, (this.numBars.height + 10) * index);

        this.numMeasureMaj = createInput("4");
        this.numMeasureMaj.size(20, this.numBars.height);
        this.numMeasureMaj.position(this.numBars.width + 10 + this.numBPM.width + 10 + 25 + this.numMeasureMin.width + 10, (this.numBars.height + 10) * index);

        this.chkIsPrelude = createCheckbox("Pre Count");
        this.chkIsPrelude.position(this.numBars.width + 10 + this.numBPM.width + 10 + 25 + this.numMeasureMin.width + 10 + this.numMeasureMaj.width + 10, (this.numBars.height + 10) * index);

        this.btnRem = createButton("-");
        this.btnRem.position(this.numBars.width + 10 + this.numBPM.width + 10 + 25 + this.numMeasureMin.width + 10 + this.numMeasureMaj.width + 10 + this.chkIsPrelude.width + 100, (this.numBars.height + 10) * index);
        this.btnRem.mousePressed(this.buttonRemove.bind(this));

        this.btnPlus.position(0, this.list.length * (this.numBars.height + 10))
        this.btnParse.show();
        this.btnParse.position(this.btnPlus.width + 10, this.list.length * (this.numBars.height + 10))
    }

    buttonRemove() {
        this.list.splice(this.index, 1);

        this.numBars.remove();
        this.numBPM.remove();
        this.numMeasureMin.remove();
        this.numMeasureMaj.remove();
        this.chkIsPrelude.remove();
        this.btnRem.remove();

        this.btnPlus.position(0, this.list.length * (this.numBars.height + 10))
        if (this.list.length > 0) {
            this.btnParse.position(this.btnPlus.width + 10, this.list.length * (this.numBars.height + 10))
        } else {
            this.btnParse.hide();
        }
    }

    parseSection() {
        try {
            let bars = parseInt(this.numBars.value());
            let bpm = parseInt(this.numBPM.value());
            let measureMin = parseInt(this.numMeasureMin.value());
            let measureMaj = parseInt(this.numMeasureMaj.value());
            let isPrelude = this.chkIsPrelude.checked();

            return bars+" "+ bpm+" "+measureMin+"/"+measureMaj+" "+ (isPrelude?"x":"");
        } catch {
            console.log("FUCK")
        }
    }
}