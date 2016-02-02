/*global validator */
	"use strict";

	var Models = function()
	{
console.log(this);
	};

	// Set some configuration options such as model server location.
	Models.prototype.setConfiguration = function(Config)
	{
		this.BaseURL = Config.BaseURL;
	};

	// Test function to see if Mocha works.
	Models.prototype.MochaTest = function(val1, val2)
	{
		return val1 + val2;
	};


	// Enable autorefresh or disable it (interval = 0)
	Models.prototype.toggleAutoUIRefresh = function(callback, interval)
	{
		var _self = this;


		if (interval > 0)
		{
			// Clear existing timer if present.
			clearTimer();
			console.log("Start timer");
			_self.refreshTimerId = setInterval(function() { _self.getModels(callback) }, interval);
		}
		else
		{
			// Stop timer.
			clearTimer();
		}

		// Clear an existing timer.
		function clearTimer()
		{
			if (_self.refreshTimerId !== -1)
			{
				clearInterval(_self.refreshTimerId);
				_self.refreshTimerId = -1;
			}			
		}
	};

	// Get models from URL, call callback upon completion.
	Models.prototype.getModels = function(callback)
	{
		var _self = this;
		

		$.ajax(
		{
			url: _self.BaseURL + "/runs/"
		}).done(function(data)
		{
			$("#alert-connectionfailed").hide();

			if (callback !== undefined)
			{
				callback(data);
			}

		}).error(function()
		{
			$("#alert-connectionfailed").show();
		});

	};


	// Run a model, with given options. Optional callback for return.
	Models.prototype.runModel = function(ScenarioOptions, ModelOptions, callback)
	{
		var _self = this;

		// Validate input of run model.
		// Depends on validator class
		function validateRunModel(so, mo)
		{
			console.log(so);

			var CheckRunId = (validator.isAlphanumeric(so.runid) === true) && (validator.isLength(so.runid, {min: 0, max: 64 }) === true);
			var CheckDt = (validator.isInt(mo.timestep, {min: 1, max: 3600}) === true);

			return CheckRunId && CheckDt;
		}


		if (validateRunModel(ScenarioOptions, ModelOptions) === false)
		{

			return false;
		}


		// [TODO] Validate parameters before sending. (is everything included?)

		// Prepare options for our format.
		// Temporary format.
		var serveroptions = {
			"type": "startrun",
			"name": ScenarioOptions.runid,
			"dt": ModelOptions.timestep
		};

		//serveroptions.parameters = {};
		//serveroptions.scenario = ScenarioOptions;
		//serveroptions.model = ModelOptions;

		$.ajax(
		{
			url: _self.BaseURL + "/createrun/",
			//url: "sampledata/runmodel-ok.json",
			data: serveroptions,
			method: "GET", // Should be a POST later
			done: function(data) { //moved here for Mocha.

				if (callback !== undefined)
				{
					callback(data);
				}
			}

		});

		return true;

	};

	// Run a model, with given options. Optional callback for return.
	// Expects  a UUID in deleteoptions.
	Models.prototype.deleteModel = function(DeleteOptions, callback)
	{
		var _self = this;

		// No options defined:
		if (DeleteOptions === undefined)
		{
			return false;
		}


		// [TODO] Validate parameters before sending. (is everything included?)
		if (DeleteOptions.uuid === undefined || DeleteOptions.uuid.length === 0)
		{
			return false;
		}

		// Prepare options for our format.
		var deleteoptions = {
			"type": "deleterun"
		};

		deleteoptions.parameters = {};
		deleteoptions.uuid = DeleteOptions.uuid;


		$.ajax(
		{
			url: _self.BaseURL + "/deleterun/",
			data: deleteoptions,
			method: "GET" // Should be a POST later


		}).done(function(data)
		{

			if (callback !== undefined)
			{
				callback(data);
			}
		});


	};

	// export the namespace object
	if (typeof module !== "undefined" && module.exports)
	{
		module.exports = Models;
	}
