describe('Section', function() {
  beforeEach(function() {
    resetMocks();
  });

  describe('constructor', function() {
    it('should add section to static list', function() {
      new Section(4, 120, '4/4');
      expect(Section.list.length).to.equal(1);
    });

    it('should set correct index', function() {
      const s1 = new Section(4, 120, '4/4');
      const s2 = new Section(2, 100, '3/4');
      expect(s1.index).to.equal(0);
      expect(s2.index).to.equal(1);
    });

    it('should parse time signature correctly', function() {
      const s = new Section(4, 120, '3/4');
      expect(s.measure_min).to.equal(3);
      expect(s.measure_maj).to.equal(4);
    });

    it('should default doNotCount to false', function() {
      const s = new Section(4, 120, '4/4');
      expect(s.doNotCount).to.equal(false);
    });

    it('should set doNotCount when provided', function() {
      const s = new Section(4, 120, '4/4', true);
      expect(s.doNotCount).to.equal(true);
    });
  });

  describe('length()', function() {
    it('should calculate bar length for 4/4 at 120 BPM', function() {
      const s = new Section(4, 120, '4/4');
      // 60/120 * 4 * 1000 = 2000ms
      expect(s.length()).to.equal(2000);
    });

    it('should calculate bar length for 3/4 at 60 BPM', function() {
      const s = new Section(4, 60, '3/4');
      // 60/60 * 3 * 1000 = 3000ms
      expect(s.length()).to.equal(3000);
    });

    it('should calculate bar length for 6/8 at 90 BPM', function() {
      const s = new Section(4, 90, '6/8');
      // 60/90 * 6 * 1000 = 4000ms
      expect(s.length()).to.equal(4000);
    });
  });

  describe('lengthTotal()', function() {
    it('should calculate total section length', function() {
      const s = new Section(4, 120, '4/4');
      // 4 bars * 2000ms = 8000ms
      expect(s.lengthTotal()).to.equal(8000);
    });

    it('should handle single bar', function() {
      const s = new Section(1, 60, '4/4');
      // 1 bar * 4000ms = 4000ms
      expect(s.lengthTotal()).to.equal(4000);
    });
  });

  describe('createString()', function() {
    it('should serialize basic section', function() {
      const s = new Section(4, 120, '4/4');
      expect(s.createString()).to.equal('4 120 4/4');
    });

    it('should include x for precount section', function() {
      const s = new Section(1, 60, '4/4', true);
      expect(s.createString()).to.equal('1 60 4/4 x');
    });

    it('should handle different time signatures', function() {
      const s = new Section(2, 90, '6/8');
      expect(s.createString()).to.equal('2 90 6/8');
    });
  });

  describe('static hasPreCount', function() {
    it('should default to false', function() {
      expect(Section.hasPreCount).to.equal(false);
    });
  });

  describe('createUI()', function() {
    it('should create default section', function() {
      const s = Section.createUI();
      expect(s.count).to.equal(1);
      expect(s.bpm).to.equal(60);
      expect(s.measure).to.equal('4/4');
    });
  });

  describe('array reordering', function() {
    it('should maintain correct list after multiple additions', function() {
      const s1 = new Section(1, 100, '4/4');
      const s2 = new Section(2, 110, '4/4');
      const s3 = new Section(3, 120, '4/4');

      expect(Section.list.length).to.equal(3);
      expect(Section.list[0]).to.equal(s1);
      expect(Section.list[1]).to.equal(s2);
      expect(Section.list[2]).to.equal(s3);
    });

    it('should correctly splice and insert for reorder', function() {
      const s1 = new Section(1, 100, '4/4');
      const s2 = new Section(2, 110, '4/4');
      const s3 = new Section(3, 120, '4/4');

      // Simulate moving s3 to position 0
      const [moved] = Section.list.splice(2, 1);
      Section.list.splice(0, 0, moved);

      expect(Section.list[0]).to.equal(s3);
      expect(Section.list[1]).to.equal(s1);
      expect(Section.list[2]).to.equal(s2);
    });
  });

  describe('renumber()', function() {
    it('should update index after reorder', async function() {
      const s1 = new Section(1, 100, '4/4');
      const s2 = new Section(2, 110, '4/4');
      const s3 = new Section(3, 120, '4/4');

      await waitForAsync();

      // Simulate reorder: move s3 to front
      const [moved] = Section.list.splice(2, 1);
      Section.list.splice(0, 0, moved);

      // Renumber all
      Section.list.forEach(s => s.renumber());

      expect(s3.index).to.equal(0);
      expect(s1.index).to.equal(1);
      expect(s2.index).to.equal(2);
    });
  });
});
