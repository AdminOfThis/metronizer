class UISection {

    constructor(index, list, btnPlus, btnParse) {
        this.index = index;
        this.list = list;
        this.btnPlus = btnPlus;
        this.btnParse = btnParse;
        this.list[this.index] = this;

        let div = createDiv();
        div.parent("ui-parent");
        div.class("ui-section");
        //div.position(0, 30* index);
        div.id("section"+ index);
        this.div = div;

        this.numBars = createInput("2");
        this.numBars.parent("section"+ index);
        this.numBars.class("ui-section-element");
        this.numBars.size(100, this.numBars.height - 6);
        this.numBars.position(0, 0, "relative");

        this.numBPM = createInput("60");
        this.numBPM.parent("section"+ index);
        this.numBPM.size(30, this.numBars.height);
        this.numBPM.position(0, 0, "static");

        this.numMeasureMin = createInput("4");
        this.numMeasureMin.parent("section"+ index);
        this.numMeasureMin.size(20, this.numBars.height);
        this.numMeasureMin.position(0, 0, "static");

        let divider = createDiv("/");
        divider.parent("section"+ index);
        divider.size(5, this.numBars.height);
        divider.position(0, 0, "static");


        this.numMeasureMaj = createInput("4");
        this.numMeasureMaj.parent("section"+ index);
        this.numMeasureMaj.size(20, this.numBars.height);
        this.numMeasureMaj.position(0, 0, "static");

        this.chkIsPrelude = createCheckbox("Pre Count");
        this.chkIsPrelude.parent("section"+ index);
        this.chkIsPrelude.size(100, this.numBars.height);
        this.chkIsPrelude.position(0, 0, "static");

        this.btnRem = createButton("-");
        this.btnRem.parent("section"+ index);
        this.btnRem.position(0, 0, "static");
        this.btnRem.mousePressed(this.buttonRemove.bind(this));

        
         this.btnPlus.parent(undefined);
         this.btnPlus.parent("ui-parent");
         this.btnParse.parent(undefined);
         this.btnParse.parent("ui-parent");

         this.btnPlus.position(0, this.list.length * 30,"static");
         this.btnParse.position(100, this.list.length * 30,"static");
         this.btnParse.show();

        //repositionButtons(this.list.length);
        
    }

    repositionButtons(length) {

        this.btnPlus.parent(undefined);
         this.btnPlus.parent("ui-parent");
         this.btnParse.parent(undefined);
         this.btnParse.parent("ui-parent");

        this.btnPlus.position(0, length * 30,"static");
        this.btnParse.position(100, length * 30,"static");
        if (length > 0) {
            this.btnParse.show();
        } else {
            this.btnParse.hide();
        }
    }

    buttonRemove() {
        this.list.splice(this.index, 1);

        this.numBars.remove();
        this.numBPM.remove();
        this.numMeasureMin.remove();
        this.numMeasureMaj.remove();
        this.chkIsPrelude.remove();
        this.btnRem.remove();

        

        this.div.remove();
        
        this.btnPlus.position(0, this.index * 30);
        this.btnParse.position(100, this.index * 30);
        if (this.index > 0) {
            this.btnParse.show();
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