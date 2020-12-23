import { tns } from "tiny-slider/src/tiny-slider";
import { getSizedImageUrl } from "@shopify/theme-images";
let AT = {
  eventContainers: {},
  currency: (function () {
    var moneyFormat = "${{amount}}";

    function formatMoney(cents, format) {
      if (typeof cents === "string") {
        cents = cents.replace(".", "");
      }
      var value = "";
      var placeholderRegex = /\{\{\s*(\w+)\s*\}\}/;
      var formatString = format || moneyFormat;

      function formatWithDelimiters(number, precision, thousands, decimal) {
        thousands = thousands || ",";
        decimal = decimal || ".";

        if (isNaN(number) || number === null) {
          return 0;
        }

        number = (number / 100.0).toFixed(precision);

        var parts = number.split(".");
        var dollarsAmount = parts[0].replace(/(\d)(?=(\d\d\d)+(?!\d))/g, "$1" + thousands);
        var centsAmount = parts[1] ? decimal + parts[1] : "";

        return dollarsAmount + centsAmount;
      }

      switch (formatString.match(placeholderRegex)[1]) {
        case "amount":
          value = formatWithDelimiters(cents, 2);
          break;
        case "amount_no_decimals":
          value = formatWithDelimiters(cents, 0);
          break;
        case "amount_with_comma_separator":
          value = formatWithDelimiters(cents, 2, ".", ",");
          break;
        case "amount_no_decimals_with_comma_separator":
          value = formatWithDelimiters(cents, 0, ".", ",");
          break;
        case "amount_no_decimals_with_space_separator":
          value = formatWithDelimiters(cents, 0, " ");
          break;
        case "amount_with_apostrophe_separator":
          value = formatWithDelimiters(cents, 2, "'");
          break;
      }

      return formatString.replace(placeholderRegex, value);
    }

    return {
      formatMoney: formatMoney,
    };
  })(),
  cart: {},
  debounce: (func, wait) => {
    let timeout;
    return function (...args) {
      const later = () => {
        clearTimeout(timeout);
        func(...args);
      };
      clearTimeout(timeout);
      timeout = setTimeout(later, wait);
    };
  },
  initTNS: function (container) {
    let tnsContainer = container.getElementsByClassName("js-tns")[0];
    let controlsContainer = container.getElementsByClassName("js-tns-controls")[0];
    let configId = tnsContainer.getAttribute("data-config");

    let config = (!!configId && JSON.parse(document.getElementById(configId).innerHTML)) || {};

    if (!!config.controls) {
      config.controlsContainer = controlsContainer;
    }
    if (config.itemClass !== "" && typeof config.itemClass !== "undefined") {
      for (const item of tnsContainer.children) {
        item.className = config.itemClass;
      }
    }
    Object.assign(config, {
      container: tnsContainer,
      onInit: function () {
        tnsContainer.classList.remove("row", "d-grid");
      },
    });

    return tns(config);
  },
  initHandleCollapse: function () {
    let btnCollapse = document.getElementsByClassName("js-btn-collapse");

    for (const btn of btnCollapse) {
      let id = btn.getAttribute("data-target");
      let collapseContainer = document.getElementById(id);
      AT.handleCollapse(btn, collapseContainer);
    }
  },
  handleCollapse: function (btnTrigger, collapseContainer) {
    let first = true,
      isComplete = false;

    btnTrigger.addEventListener("click", function () {
      if (first || isComplete) {
        first = false;
        isComplete = false;

        if (collapseContainer.classList.contains("is-open")) {
          let height = collapseContainer.offsetHeight;
          collapseContainer.style.height = `${height}px`;
          AT.debounce(function () {
            collapseContainer.style.height = "0px";
          }, 1)();
          AT.debounce(() => {
            collapseContainer.style.height = "";
            collapseContainer.classList.remove("is-open");
            this.classList.remove("is-open");
            isComplete = true;
          }, 200)();
        } else {
          collapseContainer.classList.add("is-open");
          collapseContainer.style.height = "0px";
          let height = [...collapseContainer.children].reduce(
            (accu, currentValue) => accu + currentValue.offsetHeight,
            0
          );
          collapseContainer.style.height = `${height}px`;
          AT.debounce(() => {
            collapseContainer.style.height = "";
            this.classList.add("is-open");
            isComplete = true;
          }, 200)();
        }
      }
    });
  },
  initBackToTop: function () {
    let btnToTop = document.getElementById("back-to-top");

    !!btnToTop &&
      btnToTop.addEventListener("click", function (e) {
        window.scroll({
          top: 0,
          left: 0,
          behavior: "smooth",
        });
      });
    window.addEventListener("scroll", function () {
      if (window.pageYOffset > window.innerHeight) {
        btnToTop.classList.add("show");
      } else {
        btnToTop.classList.remove("show");
      }
    });
  },
  initAddToCart: function (form) {
    // let formAddToCart = !!form ? [form] : [...document.getElementsByClassName("js-form-add-to-cart")];

    let btnAddToCart = form.getElementsByClassName("btn-add-to-cart")[0];
    form.addEventListener("submit", function (e) {
      e.preventDefault();
      btnAddToCart.classList.add("pending");
      fetch("/cart/add.js", {
        method: "post",
        headers: new Headers(),
        body: new FormData(form),
      })
        .then((res) => res.json())
        .then((dataProduct) => {
          fetch("/cart.js")
            .then((res) => res.json())
            .then((cart) => {
              AT.cart = cart;
              AT.dispatchEvent("cartChange", cart);
              btnAddToCart.classList.remove("pending");
              AT.dispatchEvent("cartNotify", dataProduct);
            });
        })
        .catch((err) => console.log(err.message));
    });
    // for (const form of formAddToCart) {
    // }
  },
  initProductCard: function (productCart) {
    let form = productCart.querySelector("form");
    AT.initAddToCart(form);
  },
  getCart: function () {
    fetch("/cart.js", {
      method: "get",
      headers: new Headers(),
    })
      .then((res) => res.json())
      .then((res) => {
        if (res.item_count !== 0) {
          AT.cart = res;
        }
      });
  },
  removeCartItem: function (key, callback) {
    fetch("/cart/change.js", { method: "post", body: new URLSearchParams({ id: key, quantity: 0 }) })
      .then((res) => res.json())
      .then((cart) => (AT.dispatchEvent("cartChange", cart), callback()));
  },
  registerEvents: function (eventName, container) {
    if (typeof container !== "undefined") {
      this.eventContainers[eventName] = this.eventContainers[eventName] || [];
      this.eventContainers[eventName] = [...this.eventContainers[eventName], container];
    } else {
      console.error("Event container is not defined");
    }
  },
  dispatchEvent: function (eventName, data) {
    let containers = AT.eventContainers[eventName] || [];
    containers.forEach((container) => {
      !!container && container.dispatchEvent(new CustomEvent(eventName, { detail: data }));
    });
  },
  serialize: function (form) {
    // Setup our serialized data
    var serialized = [];

    // Loop through each field in the form
    for (var i = 0; i < form.elements.length; i++) {
      var field = form.elements[i];

      // Don't serialize fields without a name, submits, buttons, file and reset inputs, and disabled fields
      if (
        !field.name ||
        field.disabled ||
        field.type === "file" ||
        field.type === "reset" ||
        field.type === "submit" ||
        field.type === "button"
      )
        continue;

      // If a multi-select, get all selections
      if (field.type === "select-multiple") {
        for (var n = 0; n < field.options.length; n++) {
          if (!field.options[n].selected) continue;
          serialized.push(encodeURIComponent(field.name) + "=" + encodeURIComponent(field.options[n].value));
        }
      }

      // Convert field data to a query string
      else if ((field.type !== "checkbox" && field.type !== "radio") || field.checked) {
        serialized.push(encodeURIComponent(field.name) + "=" + encodeURIComponent(field.value));
      }
    }

    return serialized.join("&");
  },
  initCountdown: function () {
    let countdownContainers = document.getElementsByClassName("js-countdown");
    setInterval(function () {
      for (const countdown of countdownContainers) {
        let daysElm = countdown.getElementsByClassName("js-countdown-days")[0];
        let hoursElm = countdown.getElementsByClassName("js-countdown-hours")[0];
        let minutesElm = countdown.getElementsByClassName("js-countdown-minutes")[0];
        let secondsElm = countdown.getElementsByClassName("js-countdown-seconds")[0];
        let date = new Date(countdown.getAttribute("data-date")).getTime() - new Date().getTime();
        let timer = new easytimer.Timer();

        timer.start({ countdown: true, startValues: { seconds: date / 1000 } });

        timer.addEventListener("secondsUpdated", function (e) {
          let days = timer.getTimeValues().days;
          let hours = timer.getTimeValues().hours;
          let minutes = timer.getTimeValues().minutes;
          let seconds = timer.getTimeValues().seconds;

          daysElm.innerHTML = days > 9 ? days : `0${days}`;
          hoursElm.innerHTML = hours > 9 ? hours : `0${hours}`;
          minutesElm.innerHTML = minutes > 9 ? minutes : `0${minutes}`;
          secondsElm.innerHTML = seconds > 9 ? seconds : `0${seconds}`;
        });
        countdown.classList.remove("js-countdown");
        countdown.classList.add("js-countdown-loaded");
      }
    }, 500);
  },
  initTabs: function () {
    let tabControls = document.getElementsByClassName("js-tab-control");

    for (const control of tabControls) {
      control.addEventListener("click", function (e) {
        if (this.classList.contains("active")) {
          return;
        }
        let parent = this.closest("[data-tabs-control]");
        for (const child of parent.children) {
          child.classList.remove("active");
        }

        let targetID = this.getAttribute("data-target");
        let tabContent = document.getElementById(targetID);

        let parentTabsContent = tabContent.closest("[data-tabs-content]");

        for (const child of parentTabsContent.children) {
          child.classList.remove("active");
        }

        tabContent.classList.add("active");
        this.parentElement.classList.add("active");
      });
    }
  },
  initModal: function () {
    // add event modal close btn
    let closeBtn = document.getElementsByClassName("js-modal-close");
    for (const button of closeBtn) {
      let modal = button.closest(".modal");
      button.addEventListener("click", function () {
        modal.classList.remove("is-open");
      });
    }

    //init modal cart notify
    let cartNotify = document.getElementById("modal_cart_notify");
    AT.registerEvents("cartNotify", cartNotify);

    cartNotify.addEventListener("cartNotify", function ({ detail }) {
      let image = this.querySelector(".js-image");
      let qty = this.querySelector(".js-qty");
      let name = this.querySelector(".js-name");
      let totalMoney = this.querySelector(".js-item-total-money");
      let cartNumber = this.querySelector(".js-cart-number");
      let cartTotalMoney = this.querySelector(".js-cart-total-money");
      image.style.opacity = 0;
      image.src = getSizedImageUrl(detail.featured_image.url, "120x");
      image.alt = detail.title;
      image.onload = function () {
        this.style.opacity = 1;
      };
      qty.innerHTML = detail.quantity;
      name.innerHTML =
        detail.product_title +
        `<span class="option">${detail.options_with_values
          .map(function (item) {
            return item.value;
          })
          .join("/")}</span>`;
      cartNumber.innerHTML =
        AT.cart.item_count > 1
          ? theme.string.cartNumbers.replace("{{count}}", AT.cart.item_count)
          : theme.string.cartNumber.replace("{{count}}", AT.cart.item_count);

      totalMoney.innerHTML = AT.currency.formatMoney(detail.final_line_price, theme.currency.moneyFormat);
      cartTotalMoney.innerHTML = AT.currency.formatMoney(AT.cart.total_price, theme.currency.formatMoney);
      this.classList.add("is-open");
    });

    //init modal newsletter

    function setCookie(key, value, expiry) {
      var expires = new Date();
      expires.setTime(expires.getTime() + expiry * 24 * 60 * 60 * 1000);
      document.cookie = key + "=" + value + ";expires=" + expires.toUTCString();
    }

    function getCookie(key) {
      var keyValue = document.cookie.match("(^|;) ?" + key + "=([^;]*)(;|$)");
      return keyValue ? keyValue[2] : null;
    }

    function eraseCookie(key) {
      var keyValue = getCookie(key);
      setCookie(key, keyValue, "-1");
    }

    let newsletter = document.getElementById("modal_newsletter");
    !!newsletter &&
      !getCookie("myCookie") &&
      AT.debounce(function () {
        newsletter.classList.add("is-open");
        setCookie("myCookie", true, 3);
      }, 5000)();

    if (getCookie("removeNewsletter")) {
      newsletter.remove();
    }
  },
  initRecentlyView: function () {
    let recentlyView = JSON.parse(localStorage.getItem("recentlyView")) || [];

    !recentlyView.includes(theme.productHandle) && recentlyView.unshift(theme.productHandle);
    recentlyView.length = 10;

    localStorage.setItem("recentlyView", JSON.stringify(recentlyView));
  },
  initToggleSidebar: function () {
    let openSbBtn = [...document.getElementsByClassName("js-drawer-open")];
    let closeSbBtn = [...document.getElementsByClassName("js-drawer-close")];

    openSbBtn.forEach(function (button) {
      let targetID = button.getAttribute("data-target");
      let target = document.getElementById(targetID);
      button.addEventListener("click", function () {
        target.classList.add("is-open");
      });
    });

    closeSbBtn.forEach(function (button) {
      let targetID = button.getAttribute("data-target");
      let target = document.getElementById(targetID);
      button.addEventListener("click", function () {
        target.classList.remove("is-open");
      });
    });
  },
};

window.AT = Object.assign(window.AT | {}, AT);

export default AT;
