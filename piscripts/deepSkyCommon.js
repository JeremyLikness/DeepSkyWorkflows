/*

deepSkyCommon.js: Common routines
================================================================================

Common routines used across various scripts.
================================================================================
 *
 *
 * Copyright Jeremy Likness, 2021
 *
 * mailTo:deepskyworkflows@gmail.com
 */

#include <pjsr/DataType.jsh>

// concatenate parts into a string
function concatenateStr() {
   let str = '';
   for (var arg = 0; arg < arguments.length; ++arg) {
      str += arguments[arg];
   }
   return str;
}

// write lines with title prefix
function writeLines() {
   for (var arg = 0; arg < arguments.length; ++arg) {
      var val = arguments[arg];
      if (arg === 0) {
         console.writeln(concatenateStr('<b>', TITLE, '</b>: ', val));
      }
      else {
         console.writeln(val);
      }
   }
   console.flush();
}

// get a unique name that doesn't conflict with existing
function getNewName(name, suffix)
{
   let viewName = name + suffix;
   let n = 1;
   while (!ImageWindow.windowById(viewName).isNull)
   {
      ++n;
      viewName = name + suffix + n;
   }
   return viewName;
}

function saveSetting(key, type, value) {
   Settings.write(key, type, value);
}

function saveSettingsOfType(settingsObj, type) {
   for (var propname in settingsObj) {
      if (settingsObj.hasOwnProperty(propname)) {
         saveSetting(propname, prefs[propname], value);
      }
   }
}

function readSetting(key, type) {
   var val = Settings.read(key, type);
   if (Settings.lastReadOK) {
      return val;
   }
   return null;
}

function readSettings(keys, type) {
   let result = [];
   for (var idx = 0; idx < keys.length; idx++) {
      result.push(readSetting(keys[idx], type));
   }
   return result;
}

function applySettings(settingsObj, keys, type) {
   var results = readSettings(keys, type);
   for (var idx = 0; idx < keys.length; idx++) {
      if (results[idx] !== null) {
         settingsObj[keys[idx]] = results[idx];
      }
   }
}

function createVerticalGroupBox() {
   let groupBox = new GroupBox(arguments[0]);

	with (groupBox) {
		sizer = new VerticalSizer;
      sizer.margin = 6;
      sizer.spacing = 4;
   }

   groupBox.title = arguments[1];

   for (var arg = 2; arg < arguments.length; ++arg) {
      var val = arguments[arg];
      if (val === null) {
         groupBox.sizer.addStretch();
      }
      else {
         groupBox.sizer.add(val);
      }
   }

   return groupBox;
}

function createGroupBox() {
   let groupBox = new GroupBox(arguments[0]);

	with (groupBox) {
		sizer = new HorizontalSizer;
      sizer.margin = 6;
      sizer.spacing = 4;
   }

   groupBox.title = arguments[1];

   for (var arg = 2; arg < arguments.length; ++arg) {
      var val = arguments[arg];
      if (val === null) {
         groupBox.sizer.addStretch();
      }
      else {
         groupBox.sizer.add(val);
      }
   }

   return groupBox;
}

function bindResetToNumericControl(ctrl, setting, config) {
   config.funcs[setting].reset = function () {
      ctrl.setValue(config.prefs[setting]);
      ctrl.update();
   }
}

function createBoundCheckbox(parent, setting, config, existingCheckbox) {
   let checkbox = existingCheckbox || new CheckBox(parent);
	with (checkbox) {
		toolTip = config.funcs[setting].tooltip;
		text = config.funcs[setting].label;
		enabled = true;
      checked = config.prefs[setting];
      bindings = function () {
		   this.checked = config.prefs[setting];
      };
      onCheck = function (value) {
         config.prefs[setting] = value;
		};
	}
   config.funcs[setting].reset = function () {
      checkbox.checked = config.prefs[setting];
      checkbox.update();
   }
   return checkbox;
}

// pass in an array
// each element should be:
// name, data type, default value, label, tooltip, range
function createSettingsManager(config) {

   let mappings = [];

   mappings[DataType_Boolean] = Parameters.getBoolean;
   mappings[DataType_Int16] = Parameters.getInteger;
   mappings[DataType_Int32] = Parameters.getInteger;
   mappings[DataType_Int64] = Parameters.getInteger;
   mappings[DataType_Double] = Parameters.getReal;
   mappings[DataType_Float] = Parameters.getReal;
   mappings[DataType_String] = Parameters.getString;

   let defaults = {};
   let prefs = {};
   let funcs = {};

   for (var idx = 0; idx < config.length; idx++) {
        let configValue = config[idx];
        let setting = configValue.setting;
        let dataType = configValue.dataType;
        let defaultValue = configValue.defaultValue;
        let label = configValue.label;
        let tooltip = configValue.tooltip;
        let range = configValue.range;
        defaults[setting] = defaultValue;
        prefs[setting] = defaultValue;
        funcs[setting] = {
           dataType: dataType,
           label: label,
           tooltip: tooltip,
           range: range,
           reset: function () { },
           saveSetting: function () {
              Settings.write(setting, dataType, prefs[setting]);
           },
           readSetting: function () {
              let result = Settings.read(setting, dataType);
              if (Settings.lastReadOK) {
                 prefs[setting] = result;
              }
           },
           saveParameter: function () {
              Parameters.set(setting, prefs[setting]);
           },
           readParameter: function () {
              if (Parameters.has(setting)) {
                 prefs[setting] = mappings[dataType](setting);
              }
           }
        }
   }

   let newConfig = {
      defaults: defaults,
      prefs: prefs,
      funcs: funcs
   };

   newConfig.init = function () {
         for (var setting in funcs) {
            if (funcs.hasOwnProperty(setting)) {
               funcs[setting].readSetting();
            }
         }
      };

   newConfig.loadParameters = function () {
         for (var setting in funcs) {
            if (funcs.hasOwnProperty(setting)) {
               funcs[setting].readParameter();
            }
         }
      };

   newConfig.saveParameters = function () {
         for (var setting in prefs) {
            if (prefs.hasOwnProperty(setting)) {
               funcs[setting].saveParameter();
            }
         }
      };

   newConfig.saveSettings = function () {
         for (var setting in prefs) {
            if (prefs.hasOwnProperty(setting)) {
               funcs[setting].saveSetting();
            }
         }
      };

   newConfig.reset = function () {
         for (var setting in defaults) {
            if (defaults.hasOwnProperty(setting)) {
               prefs[setting] = defaults[setting];
               funcs[setting].reset();
            }
         }
         newConfig.saveSettings();
      };

   return newConfig;
}

function extractLuminance(executionState, suffix) {

   let sourceViewId = executionState.view.id;

   if (suffix === undefined) {
      suffix = '_L';
   }

   executionState.channels = [
      [true, getNewName(sourceViewId, suffix)],
      [false, ''],
      [false, '']
   ];

   // separate the RGB components
   let ce = new ChannelExtraction;
   ce.colorSpace = ChannelExtraction.prototype.CIELab;
   ce.channels = executionState.channels;
   ce.sampleFormat = ChannelExtraction.prototype.SameAsSource;
   ce.executeOn(executionState.view);
}

function applySTF(view) {

   var transformation = [
		[0, 1, 0.5, 0, 1],
		[0, 1, 0.5, 0, 1],
		[0, 1, 0.5, 0, 1],
		[0, 1, 0.5, 0, 1]];

   var median = view.computeOrFetchProperty("Median");
   var mad = view.computeOrFetchProperty("MAD");

   //set variables
   let targetBackground = 0.25;
   let shadowsClipping = -2.8;

   // calculate STF settings based on DeLinear Script
   var clipping = (1 + mad.at(0) != 1) ?
      Math.range(median.at(0) + shadowsClipping * mad.at(0), 0.0, 1.0) : 0.0;
   var targetMedian = Math.mtf(targetBackground, median.at(0) - clipping);

   transformation[0] = [clipping, 1, targetMedian, 0, 1];
   if(!view.image.isGrayscale) {
      transformation[1] = [clipping, 1, targetMedian, 0, 1];
      transformation[2] = [clipping, 1, targetMedian, 0, 1];
   }

   var STFunction = new ScreenTransferFunction();
   STFunction.STF = transformation;
	STFunction.executeOn(view);
	return transformation;
}

function imageSnapshot(img) {
   return {
      mean: img.mean(),
      median: img.median(),
      min: img.minimum(),
      max: img.maximum()
   };
}

function getImageSnapshotStr(snapshot) {
   return concatenateStr('Mean: ', snapshot.mean, ' Median: ', snapshot.median,
       ' Min: ', snapshot.min, ' Max: ', snapshot.max);
}

function applyHistogramTransformation(view) {
	var HT = new HistogramTransformation;

	if (view.image.isGrayscale) {

      //get values from STF
		var clipping = view.stf[0][1];
		var median = view.stf[0][0];
		HT.H = [[0, 0.5, 1.0, 0, 1.0],
		[0, 0.5, 1.0, 0, 1.0],
		[0, 0.5, 1.0, 0, 1.0],
		[clipping, median, 1.0, 0, 1.0],
		[0, 0.5, 1.0, 0, 1.0]];
	} else {
		HT.H = [[view.stf[0][1], view.stf[0][0], 1.0, 0, 1.0],
		[view.stf[1][1], view.stf[1][0], 1.0, 0, 1.0],
		[view.stf[2][1], view.stf[2][0], 1.0, 0, 1.0],
		[0, 0.5, 1.0, 0, 1.0],
		[0, 0.5, 1.0, 0, 1.0]];
	}

	view.beginProcess();
	HT.executeOn(view.image);
	view.endProcess();
}

function pixMathClone(view) {
   var P = new PixelMath;
   P.expression = "$T";
   P.expression1 = "";
   P.expression2 = "";
   P.expression3 = "";
   P.useSingleExpression = true;
   P.symbols = "";
   P.clearImageCacheAndExit = false;
   P.cacheGeneratedImages = false;
   P.generateOutput = true;
   P.singleThreaded = false;
   P.optimization = true;
   P.use64BitWorkingImage = false;
   P.rescale = false;
   P.rescaleLower = 0;
   P.rescaleUpper = 1;
   P.truncate = true;
   P.truncateLower = 0;
   P.truncateUpper = 1;
   P.createNewImage = true;
   P.showNewImage = true;
   P.newImageId = getNewName(view.id, '_clone');
   P.newImageWidth = 0;
   P.newImageHeight = 0;
   P.newImageAlpha = false;
   P.newImageColorSpace = PixelMath.prototype.SameAsTarget;
   P.newImageSampleFormat = PixelMath.prototype.SameAsTarget;
   P.executeOn(view);
   return P.newImageId;
}

