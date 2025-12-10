/**
 * Mock p5.js functions for testing
 */

// Mock DOM elements storage
const mockElements = {};
// Create proper mock containers with DOM methods
function createMockContainer() {
  const children = [];
  return {
    children: children,
    elt: {
      get children() { return children; },
      appendChild: function(child) {
        children.push(child);
      },
      insertBefore: function(newChild, refChild) {
        const index = children.indexOf(refChild);
        if (index === -1) {
          children.push(newChild);
        } else {
          children.splice(index, 0, newChild);
        }
      }
    }
  };
}

const mockContainers = {
  sections: createMockContainer(),
  comments: createMockContainer()
};

// Mock p5 element
function createMockElement(id) {
  const elt = document.createElement('div');
  elt.id = id;
  return {
    elt: elt,
    id: function(newId) {
      if (newId !== undefined) {
        this.elt.id = newId;
      }
      return this.elt.id;
    },
    value: function(val) {
      if (val !== undefined) {
        this._value = val;
      }
      return this._value;
    },
    checked: function(val) {
      if (val !== undefined) {
        this._checked = val;
      }
      return this._checked;
    },
    style: function(prop, val) {
      this.elt.style[prop] = val;
    },
    changed: function(callback) {
      this._changeCallback = callback;
    },
    mouseReleased: function(callback) {
      this._mouseCallback = callback;
    },
    child: function() {},
    parent: function() {
      return {
        remove: function() {}
      };
    },
    _value: '',
    _checked: false
  };
}

// Mock select function
function select(selector) {
  const id = selector.replace('#', '');

  if (id === 'sections') {
    return mockContainers.sections;
  }
  if (id === 'comments') {
    return mockContainers.comments;
  }

  if (!mockElements[id]) {
    mockElements[id] = createMockElement(id);
  }
  return mockElements[id];
}

// Mock createDiv function
function createDiv(html) {
  const div = createMockElement('div');
  div.innerHTML = html;
  div.class = function() {};
  return div;
}

// Mock loadStrings function - calls callback immediately with mock data
function loadStrings(file, callback) {
  // Simulate async loading with mock template data
  setTimeout(() => {
    if (file === 'section.html') {
      callback(['<div>', '<input id="barsXXX"><input id="bpmXXX"><select id="measureXXX"></select><div id="precountParentXXX"><input id="isPreXXX"></div><button id="removeSectionButtonXXX"></button>', '</div>']);
    } else if (file === 'comment.html') {
      callback(['<div>', '<input id="commentBarXXX"><input id="commentSubBarXXX"><input id="commentMessageXXX"><button id="removeCommentButtonXXX"></button>', '</div>']);
    }
  }, 0);
}

// Helper to reset mocks between tests
function resetMocks() {
  Object.keys(mockElements).forEach(key => delete mockElements[key]);
  mockContainers.sections = createMockContainer();
  mockContainers.comments = createMockContainer();
  Section.list = [];
  Section.hasPreCount = false;
  Comment.list = [];
}

// Helper to wait for async operations
function waitForAsync(ms = 10) {
  return new Promise(resolve => setTimeout(resolve, ms));
}
