!function(root, factory) {
  if ("function" == typeof define && define.amd) {
    define(["angular"], factory);
  } else {
    if ("object" == typeof module && module.exports) {
      module.exports = factory(require("angular"));
    } else {
      factory(root.angular);
    }
  }
}(this, function(angular) {
  var currentModule = angular.module("rzModule", []).factory("RzSliderOptions", function() {
    var options = {
      floor : 0,
      ceil : null,
      step : 1,
      precision : 0,
      id : null,
      translate : null,
      stepsArray : null,
      draggableRange : false,
      draggableRangeOnly : false,
      showSelectionBar : false,
      showSelectionBarEnd : false,
      hideLimitLabels : false,
      readOnly : false,
      disabled : false,
      interval : 350,
      showTicks : false,
      showTicksValues : false,
      ticksTooltip : null,
      ticksValuesTooltip : null,
      vertical : false,
      selectionBarColor : null,
      keyboardSupport : true,
      scale : 1,
      enforceRange : false,
      onlyBindHandles : false,
      onStart : null,
      onChange : null,
      onEnd : null
    };
    var expression = {};
    var plot = {};
    return plot.options = function(newOptions) {
      angular.extend(expression, newOptions);
    }, plot.getOptions = function(opts) {
      return angular.extend({}, options, expression, opts);
    }, plot;
  }).factory("rzThrottle", ["$timeout", function($timeout) {
  /**
     * rzThrottle
     *
     * Taken from underscore project
     *
     * @param {Function} func
     * @param {number} wait
     * @param {ThrottleOptions} options
     * @returns {Function}
     */
    return function(func, wait, options) {
      'use strict';
      /* istanbul ignore next */
      var getTime = (Date.now || function() {
        return new Date().getTime();
      });
      var context, args, result;
      var timeout = null;
      var previous = 0;
      options = options || {};
      var later = function() {
        previous = getTime();
        timeout = null;
        result = func.apply(context, args);
        context = args = null;
      };
      return function() {
        var now = getTime();
        var remaining = wait - (now - previous);
        context = this;
        args = arguments;
        if (remaining <= 0) {
          $timeout.cancel(timeout);
          timeout = null;
          previous = now;
          result = func.apply(context, args);
          context = args = null;
        } else if (!timeout && options.trailing !== false) {
          timeout = $timeout(later, remaining);
        }
        return result;
      };
    }
  }])
  .factory("RzSlider", ["$timeout", "$document", "$window", "$compile", "RzSliderOptions", "rzThrottle", function($sanitize, $document, $window, dataAndEvents, plot, makeIterator) {
     /**
     * Slider
     *
     * @param {ngScope} scope            The AngularJS scope
     * @param {Element} sliderElem The slider directive element wrapped in jqLite
     * @constructor
     */
        var Slider = function(scope, sliderElem) {
      /**
       * The slider's scope
       *
       * @type {ngScope}
       */
      this.scope = scope;
  
      /**
       * Slider element wrapped in jqLite
       *
       * @type {jqLite}
       */
      this.sliderElem = sliderElem;

      /**
       * Slider type
       *
       * @type {boolean} Set to true for range slider
       */
      this.range = this.scope.rzSliderModel !== undefined && this.scope.rzSliderHigh !== undefined;

      /**
       * Values recorded when first dragging the bar
       *
       * @type {Object}
       */
      this.dragging = {
        active: false,
        value: 0,
        difference: 0,
        offset: 0,
        lowLimit: 0,
        highLimit: 0
      };

      /**
       * property that handle position (defaults to left for horizontal)
       * @type {string}
       */
      this.positionProperty = 'left';

      /**
       * property that handle dimension (defaults to width for horizontal)
       * @type {string}
       */
      this.dimensionProperty = 'width';

      /**
       * Half of the width or height of the slider handles
       *
       * @type {number}
       */
      this.handleHalfDim = 0;

      /**
       * Maximum position the slider handle can have
       *
       * @type {number}
       */
      this.maxPos = 0;

      /**
       * Precision
       *
       * @type {number}
       */
      this.precision = 0;

      /**
       * Step
       *
       * @type {number}
       */
      this.step = 1;

      /**
       * The name of the handle we are currently tracking
       *
       * @type {string}
       */
      this.tracking = '';

      /**
       * Minimum value (floor) of the model
       *
       * @type {number}
       */
      this.minValue = 0;

      /**
       * Maximum value (ceiling) of the model
       *
       * @type {number}
       */
      this.maxValue = 0;


      /**
       * The delta between min and max value
       *
       * @type {number}
       */
      this.valueRange = 0;

      /**
       * Set to true if init method already executed
       *
       * @type {boolean}
       */
      this.initHasRun = false;

      /**
       * Internal flag to prevent watchers to be called when the sliders value are modified internally.
       * @type {boolean}
       */
      this.internalChange = false;

      // Slider DOM elements wrapped in jqLite
      this.fullBar = null; // The whole slider bar
      this.selBar = null; // Highlight between two handles
      this.minH = null; // Left slider handle
      this.maxH = null; // Right slider handle
      this.flrLab = null; // Floor label
      this.ceilLab = null; // Ceiling label
      this.minLab = null; // Label above the low value
      this.maxLab = null; // Label above the high value
      this.cmbLab = null; // Combined label
      this.ticks = null; // The ticks

      // Initialize slider
      this.init();
    };
    return Slider.prototype = {
      /**
       * @return {undefined}
       */
      init : function() {
        var thumbSource;
        var callback;
        var self = this;
        /**
         * @return {undefined}
         */
        var onComplete = function() {
          self.calcViewDimensions();
        };
        this.applyOptions();
        this.initElemHandles();
        this.manageElementsStyle();
        this.setDisabledState();
        this.calcViewDimensions();
        this.setMinAndMax();
        this.addAccessibility();
        this.updateCeilLab();
        this.updateFloorLab();
        this.initHandles();
        this.manageEventsBindings();
        this.scope.$on("reCalcViewDimensions", onComplete);
        angular.element($window).on("resize", onComplete);
        /** @type {boolean} */
        this.initHasRun = true;
        thumbSource = makeIterator(function() {
          self.onLowHandleChange();
        }, self.options.interval);
        callback = makeIterator(function() {
          self.onHighHandleChange();
        }, self.options.interval);
        this.scope.$on("rzSliderForceRender", function() {
            

            
          self.resetLabelsValue();
          thumbSource();
          if (self.range) {
            callback();
          }
          self.resetSlider();
        });
        this.scope.$watch("rzSliderOptions", function(newValue, oldValue) {
          if (newValue !== oldValue) {
            self.applyOptions();
            self.resetSlider();
          }
        }, true);
        this.scope.$watch("rzSliderModel", function(newValue, oldValue) {
          if (!self.internalChange) {
            if (newValue !== oldValue) {
              thumbSource();
            }
          }
        });
        this.scope.$watch("rzSliderHigh", function(newValue, oldValue) {
          if (!self.internalChange) {
            if (newValue !== oldValue) {
              if (null != newValue) {
                callback();
              }
              if (self.range && null == newValue || !self.range && null != newValue) {
                self.applyOptions();
                self.resetSlider();
              }
            }
          }
        });
        this.scope.$on("$destroy", function() {
          self.unbindEvents();
          angular.element($window).off("resize", onComplete);
        });
      },
      /**
       * @return {undefined}
       */
      onLowHandleChange : function() {

        this.setMinAndMax();
        this.updateLowHandle(this.valueToOffset(this.scope.rzSliderModel));
        this.updateSelectionBar();
        this.updateTicksScale();
        this.updateAriaAttributes();
        if (this.range) {
          this.updateCmbLabel();
        }
      },
      /**
       * @return {undefined}
       */
      onHighHandleChange : function() {
      
        this.setMinAndMax();
        this.updateHighHandle(this.valueToOffset(this.scope.rzSliderHigh));
        this.updateSelectionBar();
        this.updateTicksScale();
        this.updateCmbLabel();
        this.updateAriaAttributes();
      },
      /**
       * @return {undefined}
       */
      applyOptions : function() {
        this.options = plot.getOptions(this.scope.rzSliderOptions);
        if (this.options.step <= 0) {
          /** @type {number} */
          this.options.step = 1;
        }
        /** @type {boolean} */
        this.range = void 0 !== this.scope.rzSliderModel && void 0 !== this.scope.rzSliderHigh;
        this.options.draggableRange = this.range && this.options.draggableRange;
        this.options.draggableRangeOnly = this.range && this.options.draggableRangeOnly;
        if (this.options.draggableRangeOnly) {
          /** @type {boolean} */
          this.options.draggableRange = true;
        }
        this.options.showTicks = this.options.showTicks || this.options.showTicksValues;
        this.scope.showTicks = this.options.showTicks;
        this.options.showSelectionBar = this.options.showSelectionBar || this.options.showSelectionBarEnd;
        if (this.options.stepsArray) {
          /** @type {number} */
          this.options.floor = 0;
          /** @type {number} */
          this.options.ceil = this.options.stepsArray.length - 1;
          /** @type {number} */
          this.options.step = 1;
          /**
           * @param {?} $conditional
           * @return {?}
           */
          this.customTrFn = function($conditional) {
            return this.options.stepsArray[$conditional];
          };
        } else {
          if (this.options.translate) {
            this.customTrFn = this.options.translate;
          } else {
            /**
             * @param {?} values
             * @return {?}
             */
            this.customTrFn = function(values) {
              return String(values);
            };
          }
        }
        if (this.options.vertical) {
          /** @type {string} */
          this.positionProperty = "bottom";
          /** @type {string} */
          this.dimensionProperty = "height";
        }
      },
      /**
       * @return {undefined}
       */
      resetSlider : function() {
        this.manageElementsStyle();
        this.addAccessibility();
        this.setMinAndMax();
        this.updateCeilLab();
        this.updateFloorLab();
        this.unbindEvents();
        this.manageEventsBindings();
        this.setDisabledState();
        this.calcViewDimensions();
      },
      /**
       * @return {undefined}
       */
      initElemHandles : function() {


         // Assign all slider elements to object properties for easy access
        angular.forEach(this.sliderElem.children(), function($window, dataAndEvents) {
          var _elem = angular.element($window);



          switch(dataAndEvents) {
            case 0:
              this.fullBar = _elem;
              break;
            case 1:
              this.selBar = _elem;
              break;
            case 2:
              this.minH = _elem;
              break;
            case 3:
              this.maxH = _elem;
              break;
            case 4:
              this.flrLab = _elem;
              break;
            case 5:
              this.ceilLab = _elem;
              break;
            case 6:
              this.minLab = _elem;
              break;
            case 7:
              this.maxLab = _elem;
              break;
            case 8:
              this.cmbLab = _elem;
              break;
            case 9:
              this.ticks = _elem;
          }
        }, this);
        /** @type {number} */
        this.selBar.rzsp = 0;
        /** @type {number} */
        this.minH.rzsp = 0;
        /** @type {number} */
        this.maxH.rzsp = 0;
        /** @type {number} */
        this.flrLab.rzsp = 0;
        /** @type {number} */
        this.ceilLab.rzsp = 0;
        /** @type {number} */
        this.minLab.rzsp = 0;
        /** @type {number} */
        this.maxLab.rzsp = 0;
        /** @type {number} */
        this.cmbLab.rzsp = 0;
      },
      /**
       * @return {undefined}
       */
      manageElementsStyle : function() {
        if (this.range) {
          this.maxH.css("display", "");
        } else {
          this.maxH.css("display", "none");
        }
        this.alwaysHide(this.flrLab, this.options.showTicksValues || this.options.hideLimitLabels);
        this.alwaysHide(this.ceilLab, this.options.showTicksValues || this.options.hideLimitLabels);
        this.alwaysHide(this.minLab, this.options.showTicksValues);
        this.alwaysHide(this.maxLab, this.options.showTicksValues || !this.range);
        this.alwaysHide(this.cmbLab, this.options.showTicksValues || !this.range);
        this.alwaysHide(this.selBar, !this.range && !this.options.showSelectionBar);
        if (this.options.vertical) {
          this.sliderElem.addClass("vertical");
        }
        if (this.options.draggableRange) {
          this.selBar.addClass("rz-draggable");
        } else {
          this.selBar.removeClass("rz-draggable");
        }
      },
      /**
       * @param {?} ctxt
       * @param {?} a
       * @return {undefined}
       */
      alwaysHide : function(ctxt, a) {
        ctxt.rzAlwaysHide = a;
        if (a) {
          this.hideEl(ctxt);
        } else {
          this.showEl(ctxt);
        }
      },
      /**
       * @return {undefined}
       */
      manageEventsBindings : function() {
        if (this.options.disabled || this.options.readOnly) {
          this.unbindEvents();
        } else {
          this.bindEvents();
        }
      },
      /**
       * @return {undefined}
       */
      setDisabledState : function() {
        if (this.options.disabled) {
          this.sliderElem.attr("disabled", "disabled");
        } else {
          this.sliderElem.attr("disabled", null);
        }
      },
      /**
       * @return {undefined}
       */
      resetLabelsValue : function() {
        this.minLab.rzsv = void 0;
        this.maxLab.rzsv = void 0;
      },
      /**
       * @return {undefined}
       */
      initHandles : function() {
        this.updateLowHandle(this.valueToOffset(this.scope.rzSliderModel));
        if (this.range) {
          this.updateHighHandle(this.valueToOffset(this.scope.rzSliderHigh));
        }
        this.updateSelectionBar();
        if (this.range) {
          this.updateCmbLabel();
        }
        this.updateTicksScale();
      },
   /**
       * Translate value to human readable format
       *
       * @param {number|string} value
       * @param {jqLite} label
       * @param {boolean} [useCustomTr]
       * @returns {undefined}
       */
      translateFn: function(value, label, useCustomTr) {
        useCustomTr = useCustomTr === undefined ? true : useCustomTr;

        var valStr = String((useCustomTr ? this.customTrFn(value, this.options.id) : value)),
          getDimension = false;

        if (label.rzsv === undefined || label.rzsv.length !== valStr.length || (label.rzsv.length > 0 && label.rzsd === 0)) {
          getDimension = true;
          label.rzsv = valStr;
        }

        label.text(valStr);

        // Update width only when length of the label have changed
        if (getDimension) {
          this.getDimension(label);
        }
      },
 /**
       * Set maximum and minimum values for the slider and ensure the model and high
       * value match these limits
       * @returns {undefined}
       */
      setMinAndMax: function() {

        this.step = +this.options.step;
        this.precision = +this.options.precision;

        this.scope.rzSliderModel = this.roundStep(this.scope.rzSliderModel);
        if (this.range)
          this.scope.rzSliderHigh = this.roundStep(this.scope.rzSliderHigh);

        this.minValue = this.roundStep(+this.options.floor);

        if (this.options.ceil != null)
          this.maxValue = this.roundStep(+this.options.ceil);
        else
          this.maxValue = this.options.ceil = this.range ? this.scope.rzSliderHigh : this.scope.rzSliderModel;

        if (this.options.enforceRange) {
          this.scope.rzSliderModel = this.sanitizeValue(this.scope.rzSliderModel);
          if (this.range)
            this.scope.rzSliderHigh = this.sanitizeValue(this.scope.rzSliderHigh);
        }

        this.valueRange = this.maxValue - this.minValue;
      },
      /**
       * @return {undefined}
       */
      addAccessibility : function() {
        this.minH.attr("role", "slider");
        this.updateAriaAttributes();
        if (!this.options.keyboardSupport || (this.options.readOnly || this.options.disabled)) {
          this.minH.attr("tabindex", "");
        } else {
          this.minH.attr("tabindex", "0");
        }
        if (this.options.vertical) {
          this.minH.attr("aria-orientation", "vertical");
        }
        if (this.range) {
          this.maxH.attr("role", "slider");
          if (!this.options.keyboardSupport || (this.options.readOnly || this.options.disabled)) {
            this.maxH.attr("tabindex", "");
          } else {
            this.maxH.attr("tabindex", "0");
          }
          if (this.options.vertical) {
            this.maxH.attr("aria-orientation", "vertical");
          }
        }
      },
      /**
       * @return {undefined}
       */
      updateAriaAttributes : function() {
        this.minH.attr({
          "aria-valuenow" : this.scope.rzSliderModel,
          "aria-valuetext" : this.customTrFn(this.scope.rzSliderModel),
          "aria-valuemin" : this.minValue,
          "aria-valuemax" : this.maxValue
        });
        if (this.range) {
          this.maxH.attr({
            "aria-valuenow" : this.scope.rzSliderHigh,
            "aria-valuetext" : this.customTrFn(this.scope.rzSliderHigh),
            "aria-valuemin" : this.minValue,
            "aria-valuemax" : this.maxValue
          });
        }
      },
          /**
       * Calculate dimensions that are dependent on view port size
       *
       * Run once during initialization and every time view port changes size.
       *
       * @returns {undefined}
       */
      calcViewDimensions: function() {
        var handleWidth = this.getDimension(this.minH);

        this.handleHalfDim = handleWidth / 2;
        this.barDimension = this.getDimension(this.fullBar);

        this.maxPos = this.barDimension - handleWidth;

        this.getDimension(this.sliderElem);
        this.sliderElem.rzsp = this.sliderElem[0].getBoundingClientRect()[this.positionProperty];

        if (this.initHasRun) {
          this.updateFloorLab();
          this.updateCeilLab();
          this.initHandles();
        }
      },
      /**
       * @return {undefined}
       */
      //creates array of tick values
        updateTicksScale: function() {
        if (!this.options.showTicks) return;


        var  ticksCount = Math.round((this.maxValue - this.minValue) / this.step) + 1;
        this.scope.ticks = [];
        var nodeBottom=null;
        var value=null;
        var midTop=null;
        var midBottom=null;
        for (var i = 0; i < ticksCount; i++) {
             value =this.scope.rzTrip[this.roundStep(this.minValue + i * this.step)-1].nodeTop||' ';
             nodeBottom=this.scope.rzTrip[this.roundStep(this.minValue + i * this.step)-1].nodeBottom||' ';
             midTop=this.scope.rzTrip[this.roundStep(this.minValue + i * this.step)-1].midTop||' ';
             midBottom=this.scope.rzTrip[this.roundStep(this.minValue + i * this.step)-1].midBottom||' ';

          var tick =   {
            selected: this.isTickSelected(value)
          };
          if (tick.selected && this.options.getSelectionBarColor) {
     
            tick.style = {
              'background-color': this.getSelectionBarColor()
            };
          }
          if (this.options.ticksTooltip) {
            tick.tooltip = this.options.ticksTooltip(value);
            tick.tooltipPlacement = this.options.vertical ? 'right' : 'top';
          }
          if (this.options.showTicksValues) {
            tick.value = this.getDisplayValue(value);
                 tick.valueBottom=nodeBottom || null;
            if (this.options.ticksValuesTooltip) {
              tick.valueTooltip = this.options.ticksValuesTooltip(value);
              tick.valueTooltipPlacement = this.options.vertical ? 'right' : 'top';
            }
          }
          //check if this is last element
          if(ticksCount!=i+1){

             this.scope.ticks.push(tick);

             if(midTop && midBottom){
                  this.scope.ticks.push({midTop:midTop,midBottom:midBottom});
             }else{
               this.scope.ticks.push(null);
             }

          }else{
                 this.scope.ticks.push(tick);
          }

        }
      },

      /**
       * @param {?} newValue
       * @return {?}
       */
      isTickSelected: function(value) {
        if (!this.range && this.options.showSelectionBar && value <= this.scope.rzSliderModel)
          return true;
        if (this.range && value >= this.scope.rzSliderModel && value <= this.scope.rzSliderHigh)
          return true;
        return false;
      },
       /**
       * Update position of the ceiling label
       *
       * @returns {undefined}
       */
      updateCeilLab: function() {
        this.translateFn(this.maxValue, this.ceilLab);
        this.setPosition(this.ceilLab, this.barDimension - this.ceilLab.rzsd);
        this.getDimension(this.ceilLab);
      },

      /**
       * Update position of the floor label
       *
       * @returns {undefined}
       */
      updateFloorLab: function() {
        this.translateFn(this.minValue, this.flrLab);
        this.getDimension(this.flrLab);
      },

      /**
       * Call the onStart callback if defined
       *
       * @returns {undefined}
       */
      callOnStart: function() {
        if (this.options.onStart) {
          this.options.onStart(this.options.id);
        }
      },

      /**
       * Call the onChange callback if defined
       *
       * @returns {undefined}
       */
      callOnChange: function() {
        if (this.options.onChange) {
          this.options.onChange(this.options.id);
        }
      },

      /**
       * Call the onEnd callback if defined
       *
       * @returns {undefined}
       */
      callOnEnd: function() {
        if (this.options.onEnd) {
          var self = this;
          $timeout(function() {
            self.options.onEnd(self.options.id);
          });
        }
      },
      /**
       * @param {string} which
       * @param {number} newOffset
       * @return {undefined}
       */
      updateHandles : function(which, newOffset) {
        if ("rzSliderModel" === which) {
          this.updateLowHandle(newOffset);
        } else {
          if ("rzSliderHigh" === which) {
            this.updateHighHandle(newOffset);
          }
        }
        this.updateSelectionBar();
        this.updateTicksScale();
        if (this.range) {
          this.updateCmbLabel();
        }
      },
      /**
       * @param {number} left
       * @return {undefined}
       */
      updateLowHandle : function(left) {
        this.setPosition(this.minH, left);
        this.translateFn(this.scope.rzSliderModel, this.minLab);
        /** @type {number} */
        var newY = Math.min(Math.max(left - this.minLab.rzsd / 2 + this.handleHalfDim, 0), this.barDimension - this.ceilLab.rzsd);
        this.setPosition(this.minLab, newY);
        this.shFloorCeil();
      },
      /**
       * @param {number} left
       * @return {undefined}
       */
      updateHighHandle : function(left) {
        this.setPosition(this.maxH, left);
        this.translateFn(this.scope.rzSliderHigh, this.maxLab);
        /** @type {number} */
        var newY = Math.min(left - this.maxLab.rzsd / 2 + this.handleHalfDim, this.barDimension - this.ceilLab.rzsd);
        this.setPosition(this.maxLab, newY);
        this.shFloorCeil();
      },
      /**
       * Show / hide floor / ceiling label
       *
       * @returns {undefined}
       */
      shFloorCeil: function() {
        var flHidden = false,
          clHidden = false;

        if (this.minLab.rzsp <= this.flrLab.rzsp + this.flrLab.rzsd + 5) {
          flHidden = true;
          this.hideEl(this.flrLab);
        } else {
          flHidden = false;
          this.showEl(this.flrLab);
        }

        if (this.minLab.rzsp + this.minLab.rzsd >= this.ceilLab.rzsp - this.handleHalfDim - 10) {
          clHidden = true;
          this.hideEl(this.ceilLab);
        } else {
          clHidden = false;
          this.showEl(this.ceilLab);
        }

        if (this.range) {
          if (this.maxLab.rzsp + this.maxLab.rzsd >= this.ceilLab.rzsp - 10) {
            this.hideEl(this.ceilLab);
          } else if (!clHidden) {
            this.showEl(this.ceilLab);
          }

          // Hide or show floor label
          if (this.maxLab.rzsp <= this.flrLab.rzsp + this.flrLab.rzsd + this.handleHalfDim) {
            this.hideEl(this.flrLab);
          } else if (!flHidden) {
            this.showEl(this.flrLab);
          }
        }
      },
      /**
       * @return {undefined}
       */
      updateSelectionBar : function() {
        /** @type {number} */
        var newY = 0;
        /** @type {number} */
        var udataCur = 0;
        if (this.range || !this.options.showSelectionBarEnd ? (udataCur = Math.abs(this.maxH.rzsp - this.minH.rzsp) + this.handleHalfDim, newY = this.range ? this.minH.rzsp + this.handleHalfDim : 0) : (udataCur = Math.abs(this.maxPos - this.minH.rzsp) + this.handleHalfDim, newY = this.minH.rzsp + this.handleHalfDim), this.setDimension(this.selBar, udataCur), this.setPosition(this.selBar, newY), this.options.getSelectionBarColor) {
          var c = this.getSelectionBarColor();
          this.scope.barStyle = {
            backgroundColor : c
          };
        }
      },
      /**
       * @return {?}
       */
      getSelectionBarColor : function() {
        return this.range ? this.options.getSelectionBarColor(this.scope.rzSliderModel, this.scope.rzSliderHigh) : this.options.getSelectionBarColor(this.scope.rzSliderModel);
      },
      /**
       * @return {undefined}
       */
      updateCmbLabel : function() {
        var type;
        var pageX;
        if (this.minLab.rzsp + this.minLab.rzsd + 10 >= this.maxLab.rzsp) {
          type = this.getDisplayValue(this.scope.rzSliderModel);
          pageX = this.getDisplayValue(this.scope.rzSliderHigh);
          this.translateFn(type + " - " + pageX, this.cmbLab, false);
          /** @type {number} */
          var newY = Math.min(Math.max(this.selBar.rzsp + this.selBar.rzsd / 2 - this.cmbLab.rzsd / 2, 0), this.barDimension - this.cmbLab.rzsd);
          this.setPosition(this.cmbLab, newY);
          this.hideEl(this.minLab);
          this.hideEl(this.maxLab);
          this.showEl(this.cmbLab);
        } else {
          this.showEl(this.maxLab);
          this.showEl(this.minLab);
          this.hideEl(this.cmbLab);
        }
      },
      /**
       * @param {?} value
       * @return {?}
       */
      getDisplayValue : function(value) {
        return this.customTrFn(value, this.options.id);
      },
      /**
       * @param {number} value
       * @return {?}
       */
    //   roundStep : function(value) {
    //     /** @type {string} */
    //     var v = parseFloat(value / this.step).toPrecision(12);
    //     return v = Math.round(v) * this.step, v = v.toFixed(this.precision), +v;
    //   },
        roundStep: function(value) {
        var steppedValue = parseFloat(value / this.step).toPrecision(12)
        steppedValue = Math.round(steppedValue) * this.step;
        steppedValue = steppedValue.toFixed(this.precision);


         return +steppedValue;
      },
      /**
       * @param {?} element
       * @return {?}
       */
      hideEl : function(element) {
        return element.css({
          opacity : 0
        });
      },
      /**
       * @param {?} element
       * @return {?}
       */
      showEl : function(element) {
        return element.rzAlwaysHide ? element : element.css({
          opacity : 1
        });
      },
      /**
       * @param {?} el
       * @param {number} y
       * @return {?}
       */
      setPosition: function(elem, pos) { 
      var isRightPointer=angular.element(elem).hasClass('rz-pointer') && angular.element(elem).hasClass('js-right-pointer');
      var isLeftPointer=angular.element(elem).hasClass('rz-pointer') && angular.element(elem).hasClass('js-left-pointer');
      if(isRightPointer){
                    pos = pos=pos+1.0;
      }else if(isLeftPointer){
      
             pos = pos=pos-1.0;
      }
          
        elem.rzsp = pos;
        var css = {};
        css[this.positionProperty] = pos + 'px';
        elem.css(css);
        return pos;
      },
      /**
       * @param {?} element
       * @return {?}
       */
      getDimension : function(element) {
        var brect = element[0].getBoundingClientRect();
        return  this.options.vertical ? element.rzsd = (brect.bottom - brect.top) * this.options.scale : element.rzsd = (brect.right - brect.left) * this.options.scale, element.rzsd;
      },
      /**
       * @param {Object} element
       * @param {number} value
       * @return {?}
       */
      setDimension : function(element, value) {
        /** @type {number} */
        element.rzsd = value;
        var style = {};
        return style[this.dimensionProperty] = value + "px", element.css(style), value;
      },
      /**
       * @param {?} value
       * @return {?}
       */
      valueToOffset : function(value) {
        return(this.sanitizeValue(value) - this.minValue) * this.maxPos / this.valueRange || 0;
      },
      /**
       * @param {?} value
       * @return {?}
       */
      sanitizeValue : function(value) {
        return Math.min(Math.max(value, this.minValue), this.maxValue);
      },
      /**
       * @param {?} offset
       * @return {?}
       */
      offsetToValue : function(offset) {
        return offset / this.maxPos * this.valueRange + this.minValue;
      },
      /**
       * @param {Object} params
       * @return {?}
       */
      getEventXY : function(params) {
        /** @type {string} */
        var $2 = this.options.vertical ? "clientY" : "clientX";
        return $2 in params ? params[$2] : void 0 === params.originalEvent ? params.touches[0][$2] : params.originalEvent.touches[0][$2];
      },
      /**
       * @param {Object} ast
       * @return {?}
       */
      getEventPosition : function(ast) {
        var options = this.sliderElem.rzsp;
        /** @type {number} */
        var x = 0;
        return x = this.options.vertical ? -this.getEventXY(ast) + options : this.getEventXY(ast) - options, (x - this.handleHalfDim) * this.options.scale;
      },
      /**
       * @param {Object} e
       * @return {?}
       */
      getEventNames : function(e) {
        var support = {
          moveEvent : "",
          endEvent : ""
        };
        return e.touches || void 0 !== e.originalEvent && e.originalEvent.touches ? (support.moveEvent = "touchmove", support.endEvent = "touchend") : (support.moveEvent = "mousemove", support.endEvent = "mouseup"), support;
      },
      /**
       * @param {Object} e
       * @return {?}
       */
      getNearestHandle : function(e) {
        if (!this.range) {
          return this.minH;
        }
        var position = this.getEventPosition(e);
        return Math.abs(position - this.minH.rzsp) < Math.abs(position - this.maxH.rzsp) ? this.minH : this.maxH;
      },
      /**
       * @param {Object} element
       * @return {undefined}
       */
      focusElement : function(element) {
        /** @type {number} */
        var NODE_TYPE = 0;
        element[NODE_TYPE].focus();
      },
      /**
       * @return {undefined}
       */
      bindEvents : function() {
        var opts;
        var handler;
        var i;
        if (this.options.draggableRange) {
          /** @type {string} */
          opts = "rzSliderDrag";
          handler = this.onDragStart;
          i = this.onDragMove;
        } else {
          /** @type {string} */
          opts = "rzSliderModel";
          handler = this.onStart;
          i = this.onMove;
        }
        if (!this.options.onlyBindHandles) {
          this.selBar.on("mousedown", angular.bind(this, handler, null, opts));
          this.selBar.on("mousedown", angular.bind(this, i, this.selBar));
        }
        if (this.options.draggableRangeOnly) {
          this.minH.on("mousedown", angular.bind(this, handler, null, opts));
          this.maxH.on("mousedown", angular.bind(this, handler, null, opts));
        } else {
          this.minH.on("mousedown", angular.bind(this, this.onStart, this.minH, "rzSliderModel"));
          if (this.range) {
            this.maxH.on("mousedown", angular.bind(this, this.onStart, this.maxH, "rzSliderHigh"));
          }
          if (!this.options.onlyBindHandles) {
            this.fullBar.on("mousedown", angular.bind(this, this.onStart, null, null));
            this.fullBar.on("mousedown", angular.bind(this, this.onMove, this.fullBar));
            this.ticks.on("mousedown", angular.bind(this, this.onStart, null, null));
            this.ticks.on("mousedown", angular.bind(this, this.onMove, this.ticks));
          }
        }
        if (!this.options.onlyBindHandles) {
          this.selBar.on("touchstart", angular.bind(this, handler, null, opts));
          this.selBar.on("touchstart", angular.bind(this, i, this.selBar));
        }
        if (this.options.draggableRangeOnly) {
          this.minH.on("touchstart", angular.bind(this, handler, null, opts));
          this.maxH.on("touchstart", angular.bind(this, handler, null, opts));
        } else {
          this.minH.on("touchstart", angular.bind(this, this.onStart, this.minH, "rzSliderModel"));
          if (this.range) {
            this.maxH.on("touchstart", angular.bind(this, this.onStart, this.maxH, "rzSliderHigh"));
          }
          if (!this.options.onlyBindHandles) {
            this.fullBar.on("touchstart", angular.bind(this, this.onStart, null, null));
            this.fullBar.on("touchstart", angular.bind(this, this.onMove, this.fullBar));
            this.ticks.on("touchstart", angular.bind(this, this.onStart, null, null));
            this.ticks.on("touchstart", angular.bind(this, this.onMove, this.ticks));
          }
        }
        if (this.options.keyboardSupport) {
          this.minH.on("focus", angular.bind(this, this.onPointerFocus, this.minH, "rzSliderModel"));
          if (this.range) {
            this.maxH.on("focus", angular.bind(this, this.onPointerFocus, this.maxH, "rzSliderHigh"));
          }
        }
      },
      /**
       * @return {undefined}
       */
      unbindEvents : function() {
        this.minH.off();
        this.maxH.off();
        this.fullBar.off();
        this.selBar.off();
        this.ticks.off();
      },
      /**
       * @param {Element} pointer
       * @param {string} deepDataAndEvents
       * @param {Object} e
       * @return {undefined}
       */
      onStart : function(pointer, deepDataAndEvents, e) {
        var drag;
        var close;
        var o = this.getEventNames(e);
        e.stopPropagation();
        e.preventDefault();
        this.calcViewDimensions();
        if (pointer) {
          /** @type {string} */
          this.tracking = deepDataAndEvents;
        } else {
          pointer = this.getNearestHandle(e);
          /** @type {string} */
          this.tracking = pointer === this.minH ? "rzSliderModel" : "rzSliderHigh";
        }
        pointer.addClass("rz-active");
        if (this.options.keyboardSupport) {
          this.focusElement(pointer);
        }
        drag = angular.bind(this, this.dragging.active ? this.onDragMove : this.onMove, pointer);
        close = angular.bind(this, this.onEnd, drag);
        $document.on(o.moveEvent, drag);
        $document.one(o.endEvent, close);
        this.callOnStart();
      },
      /**
       * @param {?} colStep
       * @param {Object} e
       * @return {undefined}
       */
      onMove : function(colStep, e) {
        var newValue;
        var newOffset = this.getEventPosition(e);
        if (0 >= newOffset) {
          if (0 === colStep.rzsp) {
            return;
          }
          newValue = this.minValue;
          /** @type {number} */
          newOffset = 0;
        } else {
          if (newOffset >= this.maxPos) {
            if (colStep.rzsp === this.maxPos) {
              return;
            }
            newValue = this.maxValue;
            newOffset = this.maxPos;
          } else {
            newValue = this.offsetToValue(newOffset);
            newValue = this.roundStep(newValue);
            newOffset = this.valueToOffset(newValue);
          }
        }
        this.positionTrackingHandle(newValue, newOffset);
      },
      /**
       * @param {?} next
       * @param {Object} e
       * @return {undefined}
       */
      onEnd : function(next, e) {
        var eventNamespace = this.getEventNames(e).moveEvent;
        if (!this.options.keyboardSupport) {
          this.minH.removeClass("rz-active");
          this.maxH.removeClass("rz-active");
          /** @type {string} */
          this.tracking = "";
        }
        /** @type {boolean} */
        this.dragging.active = false;
        $document.off(eventNamespace, next);
        this.scope.$emit("slideEnded");
        this.callOnEnd();
      },
      /**
       * @param {Object} element
       * @param {string} dataAndEvents
       * @return {undefined}
       */
      onPointerFocus : function(element, dataAndEvents) {
        /** @type {string} */
        this.tracking = dataAndEvents;
        element.one("blur", angular.bind(this, this.onPointerBlur, element));
        element.on("keydown", angular.bind(this, this.onKeyboardEvent));
        element.addClass("rz-active");
      },
      /**
       * @param {HTMLElement} elem
       * @return {undefined}
       */
      onPointerBlur : function(elem) {
        elem.off("keydown");
        /** @type {string} */
        this.tracking = "";
        elem.removeClass("rz-active");
      },
      /**
       * @param {Event} e
       * @return {undefined}
       */
      onKeyboardEvent : function(e) {
        var index = this.scope[this.tracking];
        var key = e.keyCode || e.which;
        var str = {
          38 : "UP",
          40 : "DOWN",
          37 : "LEFT",
          39 : "RIGHT",
          33 : "PAGEUP",
          34 : "PAGEDOWN",
          36 : "HOME",
          35 : "END"
        };
        var Keys = {
          UP : index + this.step,
          DOWN : index - this.step,
          LEFT : index - this.step,
          RIGHT : index + this.step,
          PAGEUP : index + this.valueRange / 10,
          PAGEDOWN : index - this.valueRange / 10,
          HOME : this.minValue,
          END : this.maxValue
        };
        var label = str[key];
        var udataCur = Keys[label];
        if (null != udataCur && "" !== this.tracking) {
          e.preventDefault();
          var x = this.roundStep(this.sanitizeValue(udataCur));
          var array = this.valueToOffset(x);
          if (this.options.draggableRangeOnly) {
            var t;
            var ret;
            var pos;
            var value;
            /** @type {number} */
            var delta = this.scope.rzSliderHigh - this.scope.rzSliderModel;
            if ("rzSliderModel" === this.tracking) {
              pos = x;
              t = array;
              value = x + delta;
              if (value > this.maxValue) {
                value = this.maxValue;
                /** @type {number} */
                pos = value - delta;
                t = this.valueToOffset(pos);
              }
              ret = this.valueToOffset(value);
            } else {
              value = x;
              ret = array;
              /** @type {number} */
              pos = x - delta;
              if (pos < this.minValue) {
                pos = this.minValue;
                value = pos + delta;
                ret = this.valueToOffset(value);
              }
              t = this.valueToOffset(pos);
            }
            this.positionTrackingBar(pos, value, t, ret);
          } else {
            this.positionTrackingHandle(x, array);
          }
        }
      },
      /**
       * @param {Element} event
       * @param {string} deepDataAndEvents
       * @param {Object} e
       * @return {undefined}
       */
      onDragStart : function(event, deepDataAndEvents, e) {
        var pos = this.getEventPosition(e);
        this.dragging = {
          active : true,
          value : this.offsetToValue(pos),
          difference : this.scope.rzSliderHigh - this.scope.rzSliderModel,
          lowLimit : pos - this.minH.rzsp,
          highLimit : this.maxH.rzsp - pos
        };
        this.onStart(event, deepDataAndEvents, e);
      },
      /**
       * @param {?} eventInfo
       * @param {Object} e
       * @return {undefined}
       */
      onDragMove : function(eventInfo, e) {
        var oldconfig;
        var originalEvent;
        var newValue;
        var pdataOld;
        var position = this.getEventPosition(e);
        if (position <= this.dragging.lowLimit) {
          if (0 === this.minH.rzsp) {
            return;
          }
          newValue = this.minValue;
          /** @type {number} */
          oldconfig = 0;
          pdataOld = this.minValue + this.dragging.difference;
          originalEvent = this.valueToOffset(pdataOld);
        } else {
          if (position >= this.maxPos - this.dragging.highLimit) {
            if (this.maxH.rzsp === this.maxPos) {
              return;
            }
            pdataOld = this.maxValue;
            originalEvent = this.maxPos;
            /** @type {number} */
            newValue = this.maxValue - this.dragging.difference;
            oldconfig = this.valueToOffset(newValue);
          } else {
            newValue = this.offsetToValue(position - this.dragging.lowLimit);
            newValue = this.roundStep(newValue);
            oldconfig = this.valueToOffset(newValue);
            pdataOld = newValue + this.dragging.difference;
            originalEvent = this.valueToOffset(pdataOld);
          }
        }
        this.positionTrackingBar(newValue, pdataOld, oldconfig, originalEvent);
      },
      /**
       * @param {?} pattern
       * @param {?} value
       * @param {number} b
       * @param {number} elems
       * @return {undefined}
       */
      positionTrackingBar : function(pattern, value, b, elems) {
        this.scope.rzSliderModel = pattern;
        this.scope.rzSliderHigh = value;
        this.updateHandles("rzSliderModel", b);
        this.updateHandles("rzSliderHigh", elems);
        this.applyModel();
      },
      /**
       * @param {?} newValue
       * @param {number} newOffset
       * @return {?}
       */
      positionTrackingHandle : function(newValue, newOffset) {
        /** @type {boolean} */
        var applyModel = false;
        /** @type {boolean} */
        var d = false;
        return this.range && ("rzSliderModel" === this.tracking && newValue >= this.scope.rzSliderHigh ? (d = true, this.scope[this.tracking] = this.scope.rzSliderHigh, this.updateHandles(this.tracking, this.maxH.rzsp), this.updateAriaAttributes(), this.tracking = "rzSliderHigh", this.minH.removeClass("rz-active"), this.maxH.addClass("rz-active"), this.options.keyboardSupport && this.focusElement(this.maxH), applyModel = true) : "rzSliderHigh" === this.tracking && (newValue <= this.scope.rzSliderModel &&
        (d = true, this.scope[this.tracking] = this.scope.rzSliderModel, this.updateHandles(this.tracking, this.minH.rzsp), this.updateAriaAttributes(), this.tracking = "rzSliderModel", this.maxH.removeClass("rz-active"), this.minH.addClass("rz-active"), this.options.keyboardSupport && this.focusElement(this.minH), applyModel = true))), this.scope[this.tracking] !== newValue && (this.scope[this.tracking] = newValue, this.updateHandles(this.tracking, newOffset), this.updateAriaAttributes(), applyModel =
        true), applyModel && this.applyModel(), d;
      },
      /**
       * @return {undefined}
       */
      applyModel : function() {
        /** @type {boolean} */
        this.internalChange = true;
        this.scope.$apply();
        this.callOnChange();
        /** @type {boolean} */
        this.internalChange = false;
      }
    }, Slider;
  }]).directive("rzslider", ["RzSlider", function(Client) {
    return{
      restrict : "E",
      scope : {
        rzSliderModel : "=?",
        rzSliderHigh : "=?",
        rzSliderOptions : "=?",
        rzSliderTplUrl : "@",
        rzTrip : "="
      },
      /**
       * @param {?} $element
       * @param {?} tElement
       * @return {?}
       */
      templateUrl : function($element, tElement) {

        return tElement.rzSliderTplUrl || "rzSliderTpl.html";
      },
      /**
       * @param {?} self
       * @param {?} $scope
       * @return {undefined}
       */
    //   link : function($scope,element) {
    //
    //     element.slider = new Client( $scope,element);
    //
    //   }
       link:{
           pre:function($scope,element){
                 element.slider = new Client( $scope,element);
 
                   
           },
           post:function($scope,element){

               
           }
       }
    };
  }]);
  return currentModule.run(["$templateCache", function($templateCache) {
    $templateCache.put("rzSliderTpl.html", '<span class=rz-bar-wrapper><span class=rz-bar></span></span><span class=rz-bar-wrapper><span class="rz-bar rz-selection" ng-style=barStyle></span></span><span class="rz-pointer js-left-pointer"></span><span class="rz-pointer js-right-pointer js-initial"></span><span class="rz-bubble rz-limit"></span><span class="rz-bubble rz-limit"></span><span class=rz-bubble></span><span class=rz-bubble></span><span class=rz-bubble></span><ul ng-show=showTicks class=rz-ticks><li ng-repeat="t in ticks track by $index" ng-class="{selected: t.selected && t !=null,tick:t.value !=null,between:t.midTop !=null,slider_point:true}" ng-style=t.style ng-attr-uib-tooltip="{{ t.tooltip }}" ng-attr-tooltip-placement={{t.tooltipPlacement}} ng-attr-tooltip-append-to-body="{{ t.tooltip ? true : undefined}}"><span ng-if="t.value != null" class=tick-value id="tick_id_{{$index}}" ng-attr-uib-tooltip="{{ t.valueTooltip }}" ng-attr-tooltip-placement={{t.valueTooltipPlacement}}>{{ t.value }}</span><span ng-if="t.valueBottom != null" class=tick-value-bottom  ng-attr-uib-tooltip="{{ t.valueTooltip }}" ng-attr-tooltip-placement={{t.valueTooltipPlacement}}>{{t.valueBottom}}</span><span ng-if="t.midTop != null" class=tick-value >{{t.midTop}}</span><span ng-if="t.midBottom != null" class=tick-value-bottom >{{t.midBottom}}</span></li></ul>');

  }]), currentModule;
});
