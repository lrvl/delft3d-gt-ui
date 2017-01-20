/* global _, Vue, fetchSearchTemplate, fetchUsers, fetchVersions, store  */
var exports = (function () {
  "use strict";
  var SearchDetails = Vue.component("search-details", {

    // not much in here.
    template: "#template-search-details",
    data: function() {
      return {

        // all the user input that is not in a template parameter
        searchText: "",
        selectedParameters: {},
        selectedTemplates: [],
        selectedDomains: [],

        createdAfter: "",
        createdBefore: "",
        startedAfter: "",
        startedBefore: "",

        activatedPostProc: {},
        selectedPostProc: {},

        users: [],
        selectedUsers: [],

        selectedDelft3dversions: [],
        selectedPPVersions: [],

        // Template used for searching (probably always one)
        searchTemplate: null,

        versions: {
          "delft3dversions": [],
          "ppversions": []
        }
      };
    },

    ready: function() {

      // should be initialised with values: it needs values when post processing search is activated
      this.selectedPostProc = {
        "ProDeltaD50": "0;1",
        "DeltaFrontD50": "0;1",
        "DeltaTopD50": "0;1",
        "ProDeltaD50sand": "0;1",
        "DeltaFrontD50sand": "0;1",
        "DeltaTopD50sand": "0;1",
        "ProDeltasorting": "0;10",
        "DeltaFrontsorting": "0;10",
        "DeltaTopsorting": "0;10"
      };

      // get search templates
      Promise.all([fetchUsers(), fetchSearchTemplate(), fetchVersions()])
        .then((jsons) => {
          var users = jsons[0];
          var template = jsons[1];
          var versions = jsons[2];

          // store them
          this.users = _.sortBy(users, ["last_name", "first_name"]);
          this.searchTemplate = template;
          this.versions = versions;

          // after we"re done loading the templates in the dom, start searching.
          this.$nextTick(
            () => {
              // update ui
              this.initializeForm();

              // update the search results
              this.search();

              store.state.failedUpdate = function() {

                // This is not practical, but the only way in vue? (using $parent)
                this.$root.$broadcast("show-alert", { message: "Cannot connect to server...", showTime: 1000, type: "warning"});

              }.bind(this);

              // as soon as this component is loaded we can start to sync models
              // startSyncModels();
            }
          );

        });
    },
    computed: {
      modelEngines: {
        get: function () {
          // flatten variables
          var variables = _.flatMap(_.flatMap(this.templates, "sections"), "variables");

          // lookup all variables with id engine (convention)
          var engines = _.filter(variables, ["id", "engine"]);

          // lookup default values (filter on model/scenarios later)
          var defaultEngines = _.uniq(_.map(engines, "default"));

          return defaultEngines;

        }
      },
      parameters: {
        get: function() {
          var parameters = {};
          var variables = _.flatMap(
            _.flatMap(this.templates, "sections"),
            "variables"
          );

          variables.forEach(function(variable) {
            if (_.has(variable, "validators.min") && _.has(variable, "validators.max")) {
              // create parameter info for forms
              var obj = {
                id: variable.id,
                min: _.get(variable, "validators.min"),
                max: _.get(variable, "validators.max")
              };

              parameters[variable.id] = obj;
            }
          });
          return parameters;
        }
      }
    },

    methods: {
      initializeForm: function() {
        // once the dom is updated, update the select pickers by hand
        // template data is computed into modelEngine
        var that = this;
        var pickers = $(".select-picker");

        if (pickers.selectpicker !== undefined) {
          pickers.selectpicker("refresh");
        }

        // Domain selection boxes - enable all.
        $(".domain-selection-box input[type='checkbox']").prop("checked", "checked");

        /*eslint-disable camelcase*/
        if ($(".ion-range").ionRangeSlider !== undefined) {
          $(".ion-range").ionRangeSlider({
            force_edges: true,
            onFinish: () => {
              // args: data, not used
              this.search();
            }
          });
        }
        /*eslint-enable camelcase*/

        // Add event handler that allows one to use the X next to inputs to clear the input.
        $(".button-empty-input-field").on("click", function() {
          var input = $(this).closest(".input-group").find("input");

          // Force update selected parameters.
          // Quick fix for selected parameter, should be a parameter later.
          var id = input.attr("id");

          if (id === "search") {
            that.searchText = "";
          } else {
            that.selectedParameters[id] = "";
          }
          // Search up to the div, and then find the input child. This is the actual input field.
          that.search();

        });


        // Set event handlers for search collapsibles.
        $(".panel-search").on("show.bs.collapse", function() {
          $(this).find(".glyphicon-triangle-right").removeClass("glyphicon-triangle-right").addClass("glyphicon-triangle-bottom");
        });

        $(".panel-search").on("hide.bs.collapse", function() {

          $(this).find(".glyphicon-triangle-bottom").removeClass("glyphicon-triangle-bottom").addClass("glyphicon-triangle-right");

        });


      },
      buildParams: function() {
        // for now we just copy everything

        /*eslint-disable camelcase*/
        var params = {
          created_after: this.createdAfter,
          created_before: this.createdBefore,
          search: this.searchText,
          shared: this.selectedDomains,
          started_after: this.startedAfter,
          started_before: this.startedBefore,
          template: this.selectedTemplates,
          users: this.selectedUsers,
          delft3dversions: this.selectedDelft3dversions,
          ppversions: this.selectedPPVersions
        };
        /*eslint-enable camelcase*/

        // serialize parameters corresponding to https://publicwiki.deltares.nl/display/Delft3DGT/Search
        var paramArray = _.map(
          this.selectedParameters,
          (value, key) => {
            var result = "";

            if (_.isString(value) && _.includes(value, ";")) {
              // replace ; by , =>  key,min,max
              // Breaks if someone uses ; in values (these originate from tags)
              result = key + "," + _.replace(value, ";", ",");
            } else {
              // replace ; by , =>  key,value
              result = key + "," + value;
            }

            return result;
          }
        );

        // serialize post-processing corresponding to https://publicwiki.deltares.nl/display/Delft3DGT/Search
        var postProcArray = _.map(
          this.selectedPostProc,
          (value, key) => {
            if (this.activatedPostProc[key]) {
              return key + "," + _.replace(value, ";", ",");
            }
            return "";
          }
        );

        _.pullAll(postProcArray, [""]);

        params.parameter = _.merge(paramArray, postProcArray);

        return params;
      },
      search: function() {
        var params = this.buildParams();

        store.updateParams(params);
        store.update();
      }
    },

    // If the clear button event is fired, perform search automatic.
    events: {
      "clearSearch": function () {
        this.createdAfter = "";
        this.createdBefore = "";
        this.startedAfter = "";
        this.startedBefore = "";
        this.searchText = "";
        this.selectedDomains = [];
        this.selectedParameters = {};
        this.selectedTemplates = [];
        this.selectedUsers = [];
        this.selectedDelft3dversions = [];
        this.selectedPPVersions = [];

        this.activatedPostProc = {
          "ProDeltaD50": false,
          "DeltaFrontD50": false,
          "DeltaTopD50": false,
          "ProDeltaD50sand": false,
          "DeltaFrontD50sand": false,
          "DeltaTopD50sand": false,
          "ProDeltasorting": false,
          "DeltaFrontsorting": false,
          "DeltaTopsorting": false
        };

        this.selectedPostProc = {
          "ProDeltaD50": "0;1",
          "DeltaFrontD50": "0;1",
          "DeltaTopD50": "0;1",
          "ProDeltaD50sand": "0;1",
          "DeltaFrontD50sand": "0;1",
          "DeltaTopD50sand": "0;1",
          "ProDeltasorting": "0;10",
          "DeltaFrontsorting": "0;10",
          "DeltaTopsorting": "0;10"
        };

        this.search();
      }
    }

  });

  return {
    SearchDetails: SearchDetails
  };
}());

// If we're in node export to models
if (typeof module !== "undefined" && module.exports) {
  module.exports = exports;
} else {
  // make global
  _.assign(window, exports);
}
