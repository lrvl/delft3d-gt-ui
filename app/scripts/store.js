/* global Vue */
var exports = (function() {
  "use strict";

  var store = {

    state: {
      activeModelContainer: undefined,
      failedUpdate: null, // If promise of updates failed, this callback will be called.
      modelContainers: [],
      models: [],
      params: [],
      reqModel: undefined,
      reqScenario: undefined,
      reqUser: undefined,
      scenarioContainers: [],
      scenarios: [],
      updateInterval: 2000,
      updating: false,
      user: {id: -1,
        /*eslint-disable camelcase*/
        first_name: "Anonymous", last_name: "User"}
        /*eslint-ensable camelcase*/
    },

    // ================================ SYNCHRONISATION

    startSync: function () {
      this.update(this);
      this.interval = setInterval(this.update.bind(this), this.state.updateInterval);
    },
    stopSync: function () {
      clearInterval(this.interval);
      this.interval = null;
    },

    update: function () {
      if(this.state.updating) {
        return;
      }

      this.state.updating = true;
      Promise.all([
        this.fetchModels(),
        this.fetchScenarios()
      ])
      .then((jsons) => {
        this.state.models = jsons[0];
        this.state.scenarios = jsons[1];
        this.updateContainers();
        this.state.updating = false;
      })
      .catch(() => {
        if (this.state.failedUpdate !== null) {
          this.state.failedUpdate();
        }
        this.state.updating = false;
      });
    },

    updateUser: function () {
      this.fetchUser().then((json) => {
        this.state.user = json;
      }).catch(function (reason) {
        console.error("Promise rejected: " + reason);
      });
    },

    // ================================ API FETCH CALLS

    fetchModels: function () {
      if (this.state.reqModel !== undefined) {
        this.state.reqModel.abort();
      }
      return new Promise((resolve, reject) => {
        this.state.reqModel = $.ajax({url: "/api/v1/scenes/", data: this.state.params, traditional: true, dataType: "json"})
          .done(function(json) {
            resolve(json);
          })
          .fail(function(error) {
            reject(error);
          });
      });
    },
    fetchScenarios: function () {
      if (this.state.reqScenario !== undefined) {
        this.state.reqScenario.abort();
      }
      return new Promise((resolve, reject) => {
        this.state.reqScenario = $.ajax({url: "/api/v1/scenarios/", data: this.state.params, traditional: true, dataType: "json"})
          .done(function(json) {
            resolve(json);
          })
          .fail(function(error) {
            reject(error);
          });
      });
    },
    fetchUser: function () {
      if (this.state.reqUser !== undefined) {
        this.state.reqUser.abort();
      }
      return new Promise((resolve, reject) => {
        this.state.reqUser = $.ajax({url: "/api/v1/users/me/", data: this.state.params, traditional: true, dataType: "json"})
          .done(function(json) {
            resolve(json[0]);
          })
          .fail(function(error) {
            reject(error);
          });
      });
    },

    // ================================ CONTAINER UPDATES

    updateContainers: function () {
      this.updateModelContainers();
      this.updateScenarioContainers();
    },
    updateModelContainers: function () {
      _.each(this.state.models, (model) => {
        var container = _.find(this.state.modelContainers, ["id", model.id]);

        if(container === undefined) {
          // create new container
          container = {
            id: model.id,
            active: false,
            selected: false,
            data: model,
            colorClass: this.colorClass
          };
          this.state.modelContainers.push(container);
        } else {
          // update model in container
          container.data = model;
        }
      });

      // remove containers that have no associated model
      var modelIds = _.map(this.state.models, (model) => {
        return model.id;
      });

      _.remove(this.state.modelContainers, (container) => {
        // check if should be removed
        if (_.indexOf(modelIds, container.id) === -1) {
          // if yes, check if activeModelContainer should be removed
          if(this.state.activeModelContainer !== undefined && this.state.activeModelContainer.id === container.id) {
            this.state.activeModelContainer = undefined;
          }
          return true;
        }
        return false;
      });
    },
    updateScenarioContainers: function () {
      _.each(this.state.scenarios, (scenario) => {
        var scenarioContainer = _.find(this.state.scenarioContainers, ["id", scenario.id]);

        var modelContainerSet = _.filter(this.state.modelContainers, function (o) {
          return _.includes(scenario.scene_set, o.id);
        });

        if(scenarioContainer === undefined) {
          // create new scenarioContainer
          scenarioContainer = {"id": scenario.id, data: scenario, models: modelContainerSet};
          this.state.scenarioContainers.push(scenarioContainer);
        } else {
          // update scenario in scenarioContainer
          scenarioContainer.data = scenario;
          scenarioContainer.models = modelContainerSet;
        }
      });

      // remove containers that have no associated scenario
      var scenarioIds = _.map(this.state.scenarios, (scenario) => {
        return scenario.id;
      });

      _.remove(this.state.scenarioContainers, (container) => {
        return _.indexOf(scenarioIds, container.id) === -1;
      });
    },

    // ================================ API MODELS UPDATE CALLS

    deleteModel: function (modelContainer) {
      return new Promise((resolve, reject) => {
        // snappyness: remove modelContainer from store
        if(this.state.activeModelContainer === modelContainer) {
          this.state.activeModelContainer = undefined;
        }
        this.state.modelContainers = _.without(this.state.modelContainers, modelContainer);
        _.each(this.state.scenariosContainers, function (container) {
          container.models = _.without(container.models, modelContainer);
        });

        // update backend
        $.ajax({url: "/api/v1/scenes/" + modelContainer.id + "/", method: "DELETE", traditional: true, dataType: "json"})
          .done(function(data) {
            resolve(data);
          })
          .fail(function(error) {
            reject(error);
          });
      });
    },

    publishModel: function (modelContainer, target) {
      return new Promise((resolve, reject) => {
        if (modelContainer === undefined || modelContainer.id === undefined) {
          reject("No model id to delete");
        }
        if (target === undefined) {
          reject("No publication level to publish to");
        }
        modelContainer.data.shared = "u";
        $.ajax({url: "/api/v1/scenes/" + modelContainer.id + "/publish_" + target + "/", method: "POST"})
          .done(function (data) {
            resolve(data);
          })
          .fail(function(error) {
            reject(error);
          });
      });
    },

    resetModel: function (modelContainer) {
      return new Promise((resolve, reject) => {
        if (modelContainer === undefined || modelContainer.id === undefined) {
          reject("No model id to reset");
        }
        modelContainer.data.state = "New";
        $.ajax({url: "/api/v1/scenes/" + modelContainer.id + "/reset/", method: "PUT", traditional: true, dataType: "json"})
          .done(function(data) {
            resolve(data);
          })
          .fail(function(error) {
            reject(error);
          });
      });
    },

    startModel: function (modelContainer) {
      return new Promise((resolve, reject) => {
        if (modelContainer === undefined || modelContainer.id === undefined) {
          reject("No model id to start");
        }
        modelContainer.data.state = "Queued";
        $.ajax({url: "/api/v1/scenes/" + modelContainer.id + "/start/", method: "PUT", traditional: true, dataType: "json"})
          .done(function(data) {
            resolve(data);
          })
          .fail(function(error) {
            reject(error);
          });
      });
    },

    stopModel: function (modelContainer) {
      return new Promise((resolve, reject) => {
        console.log("stopping model", modelContainer.id);
        if (modelContainer === undefined || modelContainer.id === undefined) {
          reject("No model id to start");
        }
        modelContainer.data.state = "Stopping simulation";
        var request = {
          url: "/api/v1/scenes/" + modelContainer.id + "/stop/",
          method: "PUT",
          traditional: true,
          dataType: "json"
        };

        $.ajax(request)
          .done(function(data) {
            resolve(data);
          })
          .fail(function(error) {
            reject(error);
          });
      });
    },

    // ================================ API SCENARIOS UPDATE CALLS

    deleteScenario: function (scenarioContainer) {
      return new Promise((resolve, reject) => {
        if (scenarioContainer === undefined || scenarioContainer.id === undefined) {
          reject("No scenario id to delete");
        }

        // snappyness: remove scenarioContainer from store
        this.state.scenarioContainers = _.without(this.state.scenarioContainers, scenarioContainer);
        if (_.indexOf(scenarioContainer.models, this.state.activeModelContainer) > -1) {
          this.state.activeModelContainer = undefined;
        }

        $.ajax({url: "/api/v1/scenarios/" + scenarioContainer.id + "/", method: "DELETE", traditional: true, dataType: "json"})
          .done(function(json) {
            resolve(json);
          })
          .fail(function(error) {
            reject(error);
          });
      });
    },

    createScenario: function (postdata) {

      return new Promise(function(resolve, reject) {
        $.ajax({
          url: "/api/v1/scenarios/",
          data: postdata,
          method: "POST"
        })
        .done(function() {
          resolve();
        })
        .fail(function(error) {
          reject(error);
        });
      });

    },


    // ================================ OTHER SUPPORT METHODS

    fetchLog: function (modelContainer) {
      return new Promise(function(resolve, reject) {
        if (modelContainer === undefined || modelContainer.data === undefined) {
          reject("No model to fetch log of.");
        }

        var model = modelContainer.data;

        // Working dir is at: modeldata.fileurl + delf3d + delft3d.log
        var url = model.fileurl + model.info.logfile.location + model.info.logfile.file;

        // Without a filename, we just give back a custom string.
        if (model.info.logfile.file.length === 0) {

          resolve("No log output available yet");
          return;
        }

        $.ajax(url)
          .done(function(text) {
            resolve(text);
          })
          .fail(function(error) {
            console.log("Failed to get log", error);
            reject(error);
          });

      });
    },

    colorClass: function () {
      if (this.data.state === "Finished") {
        return "success";
      }
      if (this.data.state === "Idle: waiting for user input") {
        return "warning";
      }
      return "info";
    },

    // ================================ MULTISELECTED MODEL UPDATE METHODS

    getSelectedModels: function () {
      return _.filter(this.state.modelContainers, ["selected", true]);
    },

    resetSelectedModels: function () {
      return Promise.all(
        _.map(this.getSelectedModels(), this.resetModel.bind(this))
      );
    },

    startSelectedModels: function () {
      return Promise.all(
        _.map(this.getSelectedModels(), this.startModel.bind(this))
      );
    },

    stopSelectedModels: function () {
      return Promise.all(
        _.map(this.getSelectedModels(), this.stopModel.bind(this))
      );
    },

    deleteSelectedModels: function () {
      return Promise.all(
        _.map(this.getSelectedModels(), this.deleteModel.bind(this))
      );

    },

    // ================================ SEARCH METHODS

    updateParams: function (params) {
      this.state.params = params;
    }

  };

  // get this baby up and running:
  store.updateUser();
  store.startSync();

  return {
    store: store
  };

}());

// If we're in node export to models
if (typeof module !== "undefined" && module.exports) {
  module.exports = exports;
} else {
  // make global
  _.assign(window, exports);
}
