/* global UI, Models */

(function () {
  "use strict";

  // Main javascript code, initialize components, there shouldn't be much here.
  //http://dl-ng004.xtr.deltares.nl/
  var config = {
    "BaseURL": "http://136.231.10.175:8888"
  };

  // Move these files to an app class later.
  var models = new Models();

  models.setConfiguration(config);

  // Register some event handlers.
  var ui = new UI(models);

  ui.registerHandlers();

  // Get list of models:
  models.getModels($.proxy(ui.UpdateModelList, ui));

  // Enable auto refresh.
  models.toggleAutoUIRefresh($.proxy(ui.UpdateModelList, ui), 20000);

}());
