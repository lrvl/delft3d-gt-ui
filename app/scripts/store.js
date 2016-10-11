var exports = (function() {
  "use strict";

  var store = {

    state: {
      modelContainers: [],
      models: [],
      modelsFetched: false,
      scenarioContainers: [],
      scenarios: [],
      scenariosFetched: false,
      selectedModelContainer: undefined,
      updateInterval: 2000,
      user: {id: -1}
    },

    startSync: function () {
      this.update(this)
      this.interval = setInterval(this.update.bind(this), this.state.updateInterval);
    },
    stopSync: function () {
      clearInterval(this.interval);
      this.interval = null;
    },

    update: function () {
      this.fetchModels().then(function (json) {
        this.state.models = json;
        this.updateContainers();
      }.bind(this)).catch(function(reason) {
        console.error('Promise rejected: ' + reason);
      });
      this.fetchScenarios().then(function (json) {
        this.state.scenarios = json;
        this.updateContainers();
      }.bind(this)).catch(function(reason) {
        console.error('Promise rejected: ' + reason);
      });
    },

    fetchModels: function () {
      this.state.modelsFetched = false;
      return new Promise(function(resolve, reject) {
        $.ajax({url: "/api/v1/scenes/", data: [], traditional: true, dataType: "json"})
          .done(function(json) {
            this.state.modelsFetched = true;
            resolve(json);
          }.bind(this))
          .fail(function(error) {
            reject(error);
          });
      }.bind(this));
    },
    fetchScenarios: function () {
      this.state.scenariosFetched = false;
      return new Promise(function(resolve, reject) {
        $.ajax({url: "/api/v1/scenarios/", data: [], traditional: true, dataType: "json"})
          .done(function(json) {
            this.state.scenariosFetched = true;
            resolve(json);
          }.bind(this))
          .fail(function(error) {
            reject(error);
          });
      }.bind(this));
    },

    updateContainers: function () {
      if(!this.state.scenariosFetched || !this.state.modelsFetched) {
        return;
      }
      this.updateModelContainers();
      this.updateScenarioContainers();
    },
    updateModelContainers: function () {
      _.each(this.state.models, function (model) {
        var container = _.find(this.state.modelContainers, ['id', model.id]);
        if(container === undefined) {
          // create new container
          container = {'id': model.id, active: false, selected: false, data:model};
          this.state.modelContainers.push(container);
        } else {
          // update model in container
          container.data = model;
        }
      }.bind(this));

      // TODO: remove containers for which there are no models
    },
    updateScenarioContainers: function () {
      _.each(this.state.scenarios, function (scenario, index) {
        var scenarioContainer = _.find(this.state.scenarioContainers, ['id', scenario.id]);
        var modelContainerSet = _.filter(this.state.modelContainers, function (o) {
          return _.includes(scenario.scene_set, o.id)
        });
        if(scenarioContainer === undefined) {
          // create new scenarioContainer
          scenarioContainer = {'id': scenario.id, data:scenario, models: modelContainerSet};
          this.state.scenarioContainers.push(scenarioContainer);
        } else {
          // update scenario in scenarioContainer
          scenarioContainer.data = scenario;
          scenarioContainer.models = modelContainerSet;
        }
      }.bind(this));


      // TODO: remove containers for which there are no scenarios
    },

    startModel: function (modelContainer) {
      modelContainer.data.state = 'Queued';
      $.ajax({url: "/api/v1/scenes/" + modelContainer.id + "/start/", method: "PUT", data: [], traditional: true, dataType: "json"})
        .done(function() {}.bind(this))
        .fail(function(error) {
          console.log(error);
        });
    },
    stopModel: function (modelContainer) {
      modelContainer.data.state = 'Stopping simulation...';
      $.ajax({url: "/api/v1/scenes/" + modelContainer.id + "/stop/", method: "PUT", data: [], traditional: true, dataType: "json"})
        .done(function() {}.bind(this))
        .fail(function(error) {
          console.log(error);
        });
    }

  };

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
