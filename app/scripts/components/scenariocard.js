/* global store, getDialog  */
var exports = (function () {
  "use strict";

  var ScenarioCard = Vue.component("scenario-card", {
    template: "#template-scenario-card",
    props: {
      scenario: {
        type: Object,
        required: true
      }
    },
    computed: {
      hasModels: function () {
        return this.scenario.models.length > 0;
      },
      someModelsSelected: {
        cache: false,
        get: function() {
          var someSelected = _.some(this.scenario.models, ["selected", true]);

          if (someSelected) {
            // set input to indeterminate
          } else {
            // set input to determinate
          }
          return someSelected;
        }
      },
      allModelsSelected: {
        cache: false,
        get: function() {
          return _.every(_.filter(this.scenario.models, ["data.shared", "p"]), ["selected", true]);
        }
      },
      modelStatuses: function () {
        var array = _.map(this.scenario.models, function (model) {
          return {state: model.data.state};
        });

        _.each(array, function (status) {
          status.width = 100 / array.length;
        });
        array = _.sortBy(array, function(status) {
          if (status.state === "Finished") {
            return 0;
          }
          if (status.state === "Running simulation...") {
            return 1;
          }
          if (status.state === "Queued") {
            return 2;
          }
          if (status.state === "Idle: waiting for user input") {
            return 3;
          }
          return 2;
        });
        return array;
      }
    },
    methods: {
      clone: function(e) {
        e.stopPropagation();
      },
      collapse: function(e) {
        e.stopPropagation();
        $("#collapse-" + this.scenario.id).collapse("toggle");
      },
      delete: function(e) {
        e.stopPropagation();

        // Get a confirm dialog
        this.deleteDialog = getDialog(this, "confirm-dialog", "delete-scenario-" + this.scenario.id);


        console.log(this.deleteDialog);

        this.deleteDialog.onConfirm = function() {
          store.deleteScenario(this.scenario);

          this.deleteDialog.hide();

        }.bind(this);

        // Show the dialog:
        this.deleteDialog.show();

      },
      selectAll: function(e) {
        e.stopPropagation();
        $("#collapse-" + this.scenario.id).collapse("show");

        if (this.allModelsSelected) {
          this.$broadcast("unselect-all");
        } else {
          this.$broadcast("select-all");
        }
      }
    }
  });

  return {
    ScenarioCard: ScenarioCard
  };

}());

// If we're in node export to models
if (typeof module !== "undefined" && module.exports) {
  module.exports = exports;
} else {
  // make global
  _.assign(window, exports);
}
