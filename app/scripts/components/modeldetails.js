/* global fetchModel, fetchLog, deleteModel, startModel */
var exports = (function () {
  "use strict";

  var ModelDetails = Vue.component("model-details", {
    template: "#template-model-details",
    // Show the details of one model
    data: function() {
      var id;

      // if this route is available, use that or use 0
      try {
        id = this.$route.params.id;
      } catch (e) {
        console.log("can't get model id from route parameters, falling back to model 0", e);
        id = 0;
      }


      return {
        // model id
        id: id,
        // Current animation frame:
        currentAnimationIndex: 0,

        // timer id for animation.
        timerAnimation: -1,

        // Which imagelist are we currently watching?
        currentAnimationKey: "",

        isAnimating: false,
        model: {
        }
      };

    },
    ready: function() {
      // enable the tab based menu (only for tabs, keep real links)
      $("#model-details-navigation .nav a[data-toggle='tab']").click(function (e) {
        e.preventDefault();
        $(this).tab("show");
      });

      var clipboard = new Clipboard("#btn-copy-log-output");

      clipboard.on("success", function(e) {
        e.clearSelection();
      });

    },
    computed: {

      // Update whenever selectedModel changes.
      logoutput: {
        cache: false,
        get: function() {
          return this.model.logoutput;
        }
      },
      animationIndex: {
        cache: false,
        get: function() {
          return this.currentAnimationIndex;
        }
      },

      animationFrame: {
        cache: false,
        get: function() {
          var animationKey = this.currentAnimationKey;
          var imgs = this.model.processingtask.state_meta[animationKey];

          if (imgs !== undefined) {
            return this.model.fileurl + imgs.location + imgs.images[this.currentAnimationIndex];
          }

          return "";

        }
      },

      // Returns true if the model is running. We might have to depend on some other variables
      // But for now we say that "processing" means running.
      isModelRunning: {
        cache: false,
        get: function() {

          return this.model && this.model.state === "PROCESSING";
        }
      },

      isAnimating: {
        cache: false,
        get: function() {
          return this.timerAnimation > 0;
        }
      },
      hasFrames: {
        cache: false,
        get: function() {

          var animationKey = this.currentAnimationKey;
          var imgs = this.model.processingtask.state_meta[animationKey];

          if (imgs !== undefined) {
            return imgs.images.length > 0;
          }

          return 0;

        }
      }
    },
    activate: function() {
      console.log("activating details view");

    },

    route: {
      data: function(transition) {
        // get model (from a service or parent)

        console.log("transitioning", transition);
        // somehow params is not parsed to numbers yet
        fetchModel(parseInt(transition.to.params.id))
          .then(
            (json) => {
              console.log("fetched model", json);
              // copy old data and set model
              var data = this.$data;

              data.model = json;
              // transition to this new data;
              transition.next(data);
              // and fetch log afterwards
              fetchLog(data.model.id)
                .then(log => {
                  $("#model-log-output").text(log);
                })
                .catch(e => {
                  $("#model-log-output").text("Failed to get log: " + e);
                });
            }
          );
      }
    },
    methods: {
      downloadFiles: function() {
        // Open download window
        var id = this.model.id;

        window.open("/scene/export?id=" + id);
      },
      // Remove item, based on incoming modelinfo.
      removeModel: function() {



        $("#dialog-remove-name").html(this.model.name);
        // Do we also remove all the additional files? This is based on the checkmark.
        // if deletefiles is true, we will tell the server that we want to remove these files.
        var deletefiles = $("#simulation-control-check-delete-files").is(":checked");


        var options = {
          "deletefiles": deletefiles
        };

        // User accepts deletion:
        $("#dialog-remove-response-accept").on("click", () => {

          console.log("removing", this.model, "with options", options);
          deleteModel(this.model.id, options)
            .then(function() {
              console.log("model deleted from server", this.model);
            })
            .catch(e => {
              console.log("model deletion failed", e);
            });

          // Hide dialog when user presses this accept.:
          $("#dialog-confirm-delete").modal("hide");

        });

        // We also show an extra warning in the dialog, if user chooses to remove additional files.
        $("#dialog-confirm-delete .msg-delete-extra").toggle(deletefiles);

        // Show the dialog:
        $("#dialog-confirm-delete").modal({});
      },
      fetchLog: function() {
        // Working dir is at: modeldata.fileurl + delf3d + delft3d.log
        fetchLog(this.model.id)
          .then(log => {
            // don't do this with jquery, too slow
            document.getElementById("model-log-output").textContent = log;
          })
          .catch(e => {
            console.log(e);
            $("#model-log-output").text("No log available");
          });
      },

      changeMenuItem: function(event) {

        var el = $(event.target);

        // Hide all panels except for the target.
        $(".collapse").hide();

        // Get target:
        var targetSelector = $(el).attr("data-target");
        var target = $(targetSelector);

        target.show();


        // If there is an animation property, we set this:
        var targetAnimation = $(el).attr("data-animation");

        if (targetAnimation !== undefined && targetAnimation.length > 0) {
          this.currentAnimationKey = targetAnimation;
          this.currentAnimationIndex = 0;
          this.stopImageFrame();

        } else {
          this.currentAnimationKey = "";
          this.currentAnimationIndex = 0;
        }



        event.stopPropagation();
      },

      // User wants to start a model. We just do not do anything now, as this needs to be implemented.
      startModel: function() {
        // We use the runmodel for this.
        startModel(this.model.id)
          .then(msg => {
            console.log(msg);
          })
          .catch(e => {
            console.log(e);
          });
      },

      // For animations:
      previousImageFrame: function() {
        // Check if an animation key has been set. If not, we bail out.
        if (this.currentAnimationKey.length === 0) {
          return;
        }

        this.currentAnimationIndex--;

        var imgs = this.model.processingtask.state_meta[this.currentAnimationKey];

        // Probably wrap with active key.
        if (this.currentAnimationIndex < 0) {
          this.currentAnimationIndex = imgs.images.length - 1;
        }
      },

      stopImageFrame: function() {
        // Check if an animation key has been set. If not, we bail out.
        if (this.currentAnimationKey.length === 0) {
          return;
        }


        // Clear interval
        if (this.timerAnimation !== -1) {
          //  this.isAnimating =  false;
          clearInterval(this.timerAnimation);

          this.timerAnimation = -1;
        }

      },

      playImageFrame: function() {
        // Check if an animation key has been set. If not, we bail out.
        if (this.currentAnimationKey.length === 0) {
          return;
        }

        // Stop and start. (We do not want multiiple setintervals)
        this.stopImageFrame();
        this.timerAnimation = setInterval(this.nextImageFrame, 1000);

      },

      nextImageFrame: function() {
        // Check if an animation key has been set. If not, we bail out.
        if (this.currentAnimationKey.length === 0) {
          return;
        }

        this.currentAnimationIndex++;

        var imgs = this.model.processingtask.state_meta[this.currentAnimationKey];

        if (imgs !== undefined) {
          // Probably wrap.
          if (this.currentAnimationIndex >= imgs.images.length) {
            this.currentAnimationIndex = 0;
          }
        }
      },

      downloadOptionsChange: function() {

        //Determine if there is any download option enabled, if not, disable button
        var selectedOptions = $(".downloadoption:checked").length;

        $("#download-submit").prop("disabled", selectedOptions === 0);
      }
    }
  });

  return {
    ModelDetails: ModelDetails
  };

}());


// If we're in node export to models
if (typeof module !== "undefined" && module.exports) {
  module.exports = exports;
} else {
  // make global
  _.assign(window, exports);
}
