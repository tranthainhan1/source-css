Object.assign(NodeList.prototype, {
  removeClass: function (className) {
    for (const item of this) {
      item.classList.remove(className);
    }
  },
  addClass: function (className) {
    for (const item of this) {
      item.classList.add(className);
    }
  },
});

Object.assign(HTMLCollection.prototype, {
  removeClass: function (className) {
    for (const item of this) {
      item.classList.remove(className);
    }
  },
  addClass: function (className) {
    for (const item of this) {
      item.classList.add(className);
    }
  },
});
