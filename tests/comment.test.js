describe('Comment', function() {
  beforeEach(function() {
    resetMocks();
  });

  describe('constructor', function() {
    it('should add comment to static list', function() {
      new Comment(1, 1, 'Test');
      expect(Comment.list.length).to.equal(1);
    });

    it('should set correct index', function() {
      const c1 = new Comment(1, 1, 'First');
      const c2 = new Comment(2, 1, 'Second');
      expect(c1.index).to.equal(0);
      expect(c2.index).to.equal(1);
    });

    it('should store bar and sub_bar', function() {
      const c = new Comment(5, 3, 'Test');
      expect(c.bar).to.equal(5);
      expect(c.sub_bar).to.equal(3);
    });

    it('should store comment message', function() {
      const c = new Comment(1, 1, 'Hello World');
      expect(c.commentMessage).to.equal('Hello World');
    });
  });

  describe('createString()', function() {
    it('should serialize basic comment', function() {
      const c = new Comment(1, 1, 'Test');
      expect(c.createString()).to.equal('c 1 1 Test');
    });

    it('should handle multi-word comments', function() {
      const c = new Comment(5, 2, 'This is a long comment');
      expect(c.createString()).to.equal('c 5 2 This is a long comment');
    });

    it('should handle empty message', function() {
      const c = new Comment(1, 1, '');
      expect(c.createString()).to.equal('c 1 1 ');
    });

    it('should use correct bar and sub_bar', function() {
      const c = new Comment(10, 4, 'Note');
      expect(c.createString()).to.equal('c 10 4 Note');
    });
  });

  describe('createUI()', function() {
    it('should create default comment', function() {
      const c = Comment.createUI();
      expect(c.bar).to.equal(2);
      expect(c.sub_bar).to.equal(1);
      expect(c.commentMessage).to.equal('');
    });
  });

  describe('array reordering', function() {
    it('should maintain correct list after multiple additions', function() {
      const c1 = new Comment(1, 1, 'First');
      const c2 = new Comment(2, 1, 'Second');
      const c3 = new Comment(3, 1, 'Third');

      expect(Comment.list.length).to.equal(3);
      expect(Comment.list[0]).to.equal(c1);
      expect(Comment.list[1]).to.equal(c2);
      expect(Comment.list[2]).to.equal(c3);
    });

    it('should correctly splice and insert for reorder', function() {
      const c1 = new Comment(1, 1, 'First');
      const c2 = new Comment(2, 1, 'Second');
      const c3 = new Comment(3, 1, 'Third');

      // Simulate moving c3 to position 0
      const [moved] = Comment.list.splice(2, 1);
      Comment.list.splice(0, 0, moved);

      expect(Comment.list[0]).to.equal(c3);
      expect(Comment.list[1]).to.equal(c1);
      expect(Comment.list[2]).to.equal(c2);
    });
  });

  describe('renumber()', function() {
    it('should update index after reorder', async function() {
      const c1 = new Comment(1, 1, 'First');
      const c2 = new Comment(2, 1, 'Second');
      const c3 = new Comment(3, 1, 'Third');

      await waitForAsync();

      // Simulate reorder: move c3 to front
      const [moved] = Comment.list.splice(2, 1);
      Comment.list.splice(0, 0, moved);

      // Renumber all
      Comment.list.forEach(c => c.renumber());

      expect(c3.index).to.equal(0);
      expect(c1.index).to.equal(1);
      expect(c2.index).to.equal(2);
    });
  });
});
