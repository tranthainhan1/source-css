import AT from "./_arn";
import Mustache from "mustache";

let Search = {
  init: function () {
    let searchInputs = document.getElementsByClassName("js-search-input");

    [...searchInputs].forEach((input) => {
      let searchContainer = input.closest(".js-search-container");
      let resultContainer = searchContainer.getElementsByClassName("js-search-results")[0];
      let searchBtn = searchContainer.getElementsByClassName("js-search-btn")[0];
      let searchForm = searchContainer.getElementsByClassName("form-search")[0];
      let template = searchContainer.getElementsByClassName("js-search-template")[0].innerHTML;
      let viewAllBtn = searchContainer.getElementsByClassName("btn-view-all")[0];
      console.log(searchForm);
      input.addEventListener(
        "keyup",
        AT.debounce((e) => {
          let q = e.target.value.trim();

          if (!q) {
            searchContainer.classList.remove("no-results", "has-results");
            return;
          }
          let config = Object.assign(theme.search.config, { q: q });
          searchBtn.classList.add("pending");

          fetch("/search/suggest.json?" + new URLSearchParams(config))
            .then((res) => res.json())
            .then(({ resources }) => {
              let hasResults = Object.keys(resources.results).reduce(function (accu, currentValue) {
                return accu + resources.results[currentValue].length;
              }, 0);
              if (hasResults) {
                this.handleResults(q, resources.results, template, function (renderHTML) {
                  resultContainer.innerHTML = renderHTML;
                  searchContainer.classList.remove("no-results", "has-results");
                  searchBtn.classList.remove("pending");
                  searchContainer.classList.add("has-results");
                });
              } else {
                searchContainer.classList.remove("no-results", "has-results");
                searchContainer.classList.add("no-results");
                searchBtn.classList.remove("pending");
              }
            });
        }, 500)
      );

      input.addEventListener("click", function () {
        searchContainer.classList.add("active");
      });
      viewAllBtn.addEventListener("click", () => {
        searchForm.submit();
      });
      document.addEventListener("click", function (e) {
        if (!searchContainer.contains(e.target)) {
          searchContainer.classList.remove("active");
        }
      });
    });
  },
  handleResults: function (keyword, results, template, cb) {
    Object.keys(results).map((resourceType) => {
      switch (resourceType) {
        case "products":
          console.log(theme);
          results[resourceType] = results[resourceType].map((item) => {
            item.title = item.title.replace(keyword, (a) => `<span class="match">${a}</span>`);
            if (+item.compare_at_price_max > +item.price) {
              item.price = `<span>${theme.currency.symbol}${item.price}</span><del>${theme.currency.symbol}${item.compare_at_price_max}</del>`;
            } else {
              item.price = `<span>${theme.currency.symbol}${item.price}</span>`;
            }
            return item;
          });
          break;
      }
    });
    console.log(results);
    let renderHTML = Mustache.render(template, results);
    cb(renderHTML);
  },
};

export default Search;
