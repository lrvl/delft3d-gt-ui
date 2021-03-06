/* global Vue, store, getDialog */

var exports = (function () {
  "use strict";

  var ModelControlMenu = Vue.component("model-control-menu", {

    template: "#template-model-control-menu",

    data: function() {

      return {
        collapseShow: true,
        downloadOptions: {
          "export_d3dinput": {
            "active": false,
            "onlyFinished": false,
            "verbose": "Delft3D: input files"
          },
          "export_images": {
            "active": false,
            "onlyFinished": false,
            "verbose": "Media: output images"
          },
          "export_movie": {
            "active": false,
            "onlyFinished": false,
            "verbose": "Media: output movies"
          },
          "export_thirdparty": {
            "active": false,
            "onlyFinished": true,
            "verbose": "Export: RMS / Petrel"
          }
        },
        sharedState: store.state
      };

    },

    computed: {
      anyDownloadsSelected: function () {
        return _.values(this.downloadOptions).some(function(el) {
          return el.active;
        });
      },
      numSelectedModels: function () {
        return store.getSelectedModels().length;
      }
    },

    /*eslint-disable camelcase*/

    watch: {
      "numSelectedModels": function () {
        if (this.numSelectedModels === 0) {
          _.each(this.downloadOptions, function (option) {
            option.active = false;
          });
        }
        if (!this.someSelectedModelsAreFinished) {
          _.each(
            _.filter(this.downloadOptions, function (option) {
              return option.onlyFinished;
            }),
            function (option) {
              option.active = false;
            });
        }
      }
    },

    /*eslint-enable camelcase*/

    methods: {
      expandScenarios: function() {
        if (this.collapseShow) {
          $(".scenario-card .collapse").collapse("show");
        } else {
          $(".scenario-card .collapse").collapse("hide");
        }
        this.collapseShow = !this.collapseShow;
      },

      resetSelectedModels: function() {
        if (this.someSelectedModelsArePublished()) {
          return;
        }

        // Get a confirm dialog
        this.deleteDialog = getDialog(this, "confirm-dialog", "reset-runs");

        this.deleteDialog.onConfirm = () => {
          store.resetSelectedModels();

          this.deleteDialog.hide();
        };
        this.deleteDialog.showAlert(false);

        // Show the dialog:
        this.deleteDialog.show();
      },
      redoSelectedModels: function() {
        if (this.someSelectedModelsArePublished()) {
          return;
        }

        // Get a confirm dialog
        this.redoDialog = getDialog(this, "confirm-dialog", "redo-runs");

        this.redoDialog.onConfirm = () => {
          store.redoSelectedModels();

          this.redoDialog.hide();
        };
        this.redoDialog.showAlert(false);

        // Show the dialog:
        this.redoDialog.show();
      },
      someSelectedModelsAreFinished: function () {
        return _.values(store.getSelectedModels()).some(function(model) {
          return model.data.state === "Finished";
        });
      },
      someSelectedModelsArePublished: function () {
        return _.values(store.getSelectedModels()).some(function(model) {
          return model.data.shared !== "p";
        });
      },
      someSelectedModelsAreAlreadyPublished: function (domain) {
        if (domain === "world") {
          return _.values(store.getSelectedModels()).some(function(model) {
            return model.data.shared === "w";
          });
        }
        if (domain === "company") {
          return _.values(store.getSelectedModels()).some(function(model) {
            return model.data.shared === "c" || model.data.shared === "w";
          });
        }
        return false;
      },
      startSelectedModels: function() {
        if (this.someSelectedModelsArePublished()) {
          return;
        }
        store.startSelectedModels();
      },

      stopSelectedModels: function() {
        if (this.someSelectedModelsArePublished()) {
          return;
        }

        // Get a confirm dialog
        this.deleteDialog = getDialog(this, "confirm-dialog", "stop-runs");

        this.deleteDialog.onConfirm = () => {
          store.stopSelectedModels();

          this.deleteDialog.hide();
        };
        this.deleteDialog.showAlert(false);

        // Show the dialog:
        this.deleteDialog.show();
      },

      deleteSelectedModels: function() {
        if (this.someSelectedModelsArePublished()) {
          return;
        }

        // Get a confirm dialog
        this.deleteDialog = getDialog(this, "confirm-dialog", "delete-runs");

        this.deleteDialog.onConfirm = () => {
          store.deleteSelectedModels();

          this.deleteDialog.hide();

        };
        this.deleteDialog.showAlert(false);

        // Show the dialog:
        this.deleteDialog.show();
      },

      shareSelectedModels: function (domain) {
        if (!this.someSelectedModelsAreFinished || this.someSelectedModelsAreAlreadyPublished(domain)) {
          return;
        }

        // Get a confirm dialog
        this.shareDialog = getDialog(this, "confirm-dialog", "share-runs");

        this.shareDialog.onConfirm = () => {
          store.shareSelectedModels(domain);

          this.shareDialog.hide();
        };
        this.shareDialog.showAlert(false);

        // Show the dialog:
        this.shareDialog.show();
      },

      downloadSelectedModels: function () {
        if (this.numSelectedModels === 0 || !this.anyDownloadsSelected) {
          return;  // nothing to do
        }
        store.downloadSelectedModels(this.downloadOptions);
      },

      toggle: function(id) {
        if (this.downloadOptions[id].onlyFinished && !this.someSelectedModelsAreFinished) {
          return;
        }
        this.downloadOptions[id].active = !this.downloadOptions[id].active;
      }
    }

  });


  return {
    ModelControlMenu: ModelControlMenu
  };

}());

// If we're in node export to models
if (typeof module !== "undefined" && module.exports) {
  module.exports = exports;
} else {
  // make global
  _.assign(window, exports);
}
