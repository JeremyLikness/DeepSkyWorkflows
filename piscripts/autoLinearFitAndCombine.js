/*

autoLinearFitAndCombine.js: Automatic normalization of RGB channels
================================================================================

This script will separate the RGB channels, determine the channel
with the highest median value, apply a LinearFit to the other channels,
then use LRGB to combine them.
================================================================================
 *
 *
 * Copyright Jeremy Likness, 2021
 *
 * Based on source by Ivan Smith
 *
 * mailTo:deepskyworkflows@gmail.com
 */

#feature-id    DeepSkyWorkflows > AutoLinearFit

#include <pjsr/StdButton.jsh>
#include <pjsr/FrameStyle.jsh>
#include <pjsr/TextAlign.jsh>
#include <pjsr/NumericControl.jsh>

#define TITLE "Auto Linear Fit"
#define VERSION "0.1"

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

// separate the channels
function separateChannels(executionState) {

   let sourceViewId = executionState.view.id;

   executionState.channels = [
      [true, getNewName(sourceViewId, '_R')],
      [true, getNewName(sourceViewId, '_G')],
      [true, getNewName(sourceViewId, '_B')]
   ];

   // separate the RGB components
   let ce = new ChannelExtraction;
   ce.channels = executionState.channels;
   ce.colorSpace = ChannelExtraction.prototype.RGB;
   ce.sampleFormat = ChannelExtraction.prototype.SameAsSource;
   ce.executeOn(executionState.view);
}

// compute the channel with the minimum or maximum median
function findMinOrMaxChannel(executionState) {

   // gather extracted channels
   let channelImgs = [];

   for (var c = 0; c < executionState.channels.length; c++) {
      let win = ImageWindow.windowById(executionState.channels[c][1]);
      channelImgs.push(win.mainView);
      win.sendToBack();
   }

   // computed medians
   let medians = [];
   for (var i = 0; i < channelImgs.length; i++) {
      medians.push(channelImgs[i].image.median());
   }

   // base on maximum or minimum?
   let maxOrMinFn = executionState.prefs.useMin ? Math.min : Math.max;

   writeLines(concatenateStr('R: ', medians[0], ' G: ', medians[1], ' B: ', medians[2]),
      concatenateStr('Using ', executionState.prefs.useMin ? 'minimum' : 'maximum', ' median channel'));

   // get minimum or maximum channel
   let tgtMedian = maxOrMinFn(medians[0], medians[1], medians[2]);

   let adjusted = [];

   // iterate to pull out reference channel
   let tgtId = 0;
   for (var i = 0; i < medians.length; i++) {
      if (tgtMedian == medians[i]) {
         tgtId = i;
         adjusted.push(executionState.prefs.newInstance || false);
         writeLines(concatenateStr('Selected channel: ', '<i>', executionState.channels[i][1], '</i>'));
      }
      else {
         adjusted.push(true);
      }
   }

   executionState.tgtId = tgtId;
   executionState.channelImgs = channelImgs;
   executionState.adjusted = adjusted;
}

// apply linear fit to other two channels
function linearFit(executionState) {

   // linear fit using reference channel
   let lf = new LinearFit;
   lf.rejectLow = executionState.prefs.rejectLow;
   lf.rejectHigh = executionState.prefs.rejectHigh;

   writeLines(concatenateStr('Executing LinearFit with rejectLow: ', executionState.prefs.rejectLow,
      ' rejectHigh: ', executionState.prefs.rejectHigh));

   lf.referenceViewId = executionState.channels[executionState.tgtId][1];
   for (var i = 0; i < executionState.channelImgs.length; i++) {
      if (executionState.tgtId != i) {
         lf.executeOn(executionState.channelImgs[i]);
      }
   }
}

// use LRGB to recombine
function lrgbCombine(executionState) {
   writeLines(concatenateStr('Combining with lightness ', executionState.prefs.lightness,
      ' and saturation ', executionState.prefs.saturation),
      executionState.prefs.noiseReduction ? concatenateStr('Applying noise reduction: layersRemoved: ',
         executionState.prefs.layersRemoved, ' layersProtected: ', executionState.prefs.layersProtected) :
         'No noise reduction');

   console.writeln(executionState.prefs.clipHighlights ? 'Clipping highlights' : 'Not clipping highlights');

   // set up combination
   var lrgb = new LRGBCombination;

   lrgb.channels = [ // enabled, id, k
      [executionState.adjusted[0], executionState.channels[0][1], 1.00000],
      [executionState.adjusted[1], executionState.channels[1][1], 1.00000],
      [executionState.adjusted[2], executionState.channels[2][1], 1.00000],
      [false, "", 1.00000]
   ];

   lrgb.mL = executionState.prefs.lightness;
   lrgb.mc = executionState.prefs.saturation;
   lrgb.clipHighlights = executionState.prefs.clipHighlights;
   lrgb.noiseReduction = executionState.prefs.noiseReduction;
   lrgb.layersRemoved = executionState.prefs.layersRemoved;
   lrgb.layersProtected = executionState.prefs.layersProtected;

   if (executionState.prefs.newInstance) {
      console.writeln('Combining to new instance');
      lrgb.executeGlobal();
   }
   else {
      console.writeln(concatenateStr('Applying to view ', executionState.view.id));
      // reapply to the view
      lrgb.executeOn(executionState.view);
   }
}

// main method
function doFit(executionState) {

   let sourceViewId = executionState.view.id;

   writeLines(concatenateStr('processing view ', sourceViewId));

   // make sure we have RGB
   if (executionState.view.image.numberOfChannels !== 3) {
      writeLines('ERROR: view is not RGB');
      return;
   }

   separateChannels(executionState);

   findMinOrMaxChannel(executionState);

   linearFit(executionState);

   lrgbCombine(executionState);

   writeLines('Done');

   if (executionState.prefs.newInstance === false) {
      executionState.view.window.bringToFront();
   }
}

function alfDialog(executionState)
{
   // Add all properties and methods of the core Dialog object to this object.
   this.__base__ = Dialog;
   this.__base__();

   var dlg = this;

   this.execState = executionState;

   // ------------------------------------------------------------------------
   // GUI
   // ------------------------------------------------------------------------

   this.lblHeadLine = new Label(this);
   with (this.lblHeadLine)
   {
      useRichText = true;
      text = concatenateStr('<b>', TITLE, ' v', VERSION, '</b>');
   }

   // my copyright
   this.lblCopyright = new Label(this);
   this.lblCopyright.text = "© 2021, Jeremy Likness";

   // main settings

   // use minimum
   this.useMinCheckbox = new CheckBox(this);
	with (this.useMinCheckbox) {
		toolTip = "Uses the channel with the minimum median as the source for LinearFit. Otherwise uses the max.";
		text = "Use minimum channel";
		enabled = true;
		checked = executionState.prefs.useMin;
		bindings = function() {
			this.checked = dlg.execState.prefs.useMin;
		}
		onCheck = function (value) {
			dlg.execState.prefs.useMin = value;
		}
	}

   // new instance
   this.newInstanceCheckbox = new CheckBox(this);
	with (this.newInstanceCheckbox) {
		toolTip = "Creates a new image instead of applying the normalization to the target image.";
		text = "Create new instance";
		enabled = true;
		checked = executionState.prefs.newInstance;
		bindings = function() {
			this.checked = dlg.execState.prefs.newInstance;
		}
		onCheck = function (value) {
			dlg.execState.prefs.newInstance = value;
		}
	}

   this.mainSettings = new GroupBox(this);
	with (this.mainSettings) {
		title = "Main settings";
		sizer = new HorizontalSizer;
      sizer.margin = 6;
      sizer.spacing = 4;
      sizer.add (dlg.useMinCheckbox);
      sizer.addStretch();
      sizer.add (dlg.newInstanceCheckbox);
	}

   // linear fit settings
   this.rejectLowSlider = new NumericControl(this);
	with (this.rejectLowSlider) {
		label.text = "Reject low:";
		label.minWidth = 130;
		setRange(0, 1);
		slider.setRange(0, 100);
		slider.scaledMinWidth = 60;
		setPrecision(2);
		edit.scaledMinWidth = 60;
      setValue(dlg.execState.prefs.rejectLow);
      bindings = function() {
			this.setValue(dlg.execState.prefs.rejectLow);
		}
		onValueUpdated = function (value) {
         if (value >= 1.0 || value >= dlg.execState.prefs.rejectHigh) {
            value = dlg.execState.prefs.rejectHigh * 0.9;
            dlg.rejectLowSlider.setValue(value);
         }
			dlg.execState.prefs.rejectLow = value;
		}
		slider.onMousePress = function() {
			dlg.isSliding = true;
		}
		slider.onMouseRelease = function() {
			dlg.isSliding = false;
		}
	}

   this.rejectHighSlider = new NumericControl(this);
	with (this.rejectHighSlider) {
		label.text = "Reject high:";
		label.minWidth = 130;
		setRange(0, 1);
		slider.setRange(0, 100);
		slider.scaledMinWidth = 60;
		setPrecision(2);
		edit.scaledMinWidth = 60;
      setValue(dlg.execState.prefs.rejectHigh);
		bindings = function() {
			this.setValue(dlg.execState.prefs.rejectHigh);
		}
		onValueUpdated = function (value) {
         if (value <= 0 || value <= dlg.execState.prefs.rejectLow) {
            value = dlg.execState.prefs.rejectLow * 1.01;
            dlg.rejectHighSlider.setValue(value);
         }
			dlg.execState.prefs.rejectHigh = value;
		}
		slider.onMousePress = function() {
			dlg.isSliding = true;
		}
		slider.onMouseRelease = function() {
			dlg.isSliding = false;
		}
	}

   this.lFitSettings = new GroupBox(this);
	with (this.lFitSettings) {
		title = "Linear fit";
		sizer = new VerticalSizer;
      sizer.margin = 6;
      sizer.spacing = 4;
      sizer.add (dlg.rejectLowSlider);
      sizer.add (dlg.rejectHighSlider);
	}

   // linear fit settings
   this.lightnessSlider = new NumericControl(this);
	with (this.lightnessSlider) {
		label.text = "Lightness:";
		label.minWidth = 130;
      setRange(0.001, 1);
		setPrecision(2);
      slider.setRange(1, 100);
		slider.scaledMinWidth = 60;
		edit.scaledMinWidth = 60;
      setValue(dlg.execState.prefs.lightness);
      bindings = function() {
			this.setValue(dlg.execState.prefs.lightness);
		}
		onValueUpdated = function (value) {
         if (value < 0.001) {
            value = 0.001;
         }
			dlg.execState.prefs.lightness = value;
		}
		slider.onMousePress = function() {
			dlg.isSliding = true;
		}
		slider.onMouseRelease = function() {
			dlg.isSliding = false;
		}
	}

   this.saturationSlider = new NumericControl(this);
	with (this.saturationSlider) {
		label.text = "Saturation:";
		label.minWidth = 130;
		setRange(0.001, 1);
		slider.setRange(1, 100);
		slider.scaledMinWidth = 60;
		setPrecision(2);
		edit.scaledMinWidth = 60;
      setValue(dlg.execState.prefs.saturation);
		bindings = function() {
			this.setValue(dlg.execState.prefs.saturation);
		}
		onValueUpdated = function (value) {
         if (value < 0.001) {
            value = 0.001;
         }
			dlg.execState.prefs.saturation = value;
		}
		slider.onMousePress = function() {
			dlg.isSliding = true;
		}
		slider.onMouseRelease = function() {
			dlg.isSliding = false;
		}
	}

   this.lbllayersRemoved = new Label(this);
   this.lbllayersRemoved.text = "Smoothed wavelet layers:";

   this.layersRemovedCombo = new ComboBox(this);
   with (this.layersRemovedCombo) {
      enabled = dlg.execState.prefs.noiseReduction;
      editEnabled = false;
      bindings = function() {
         this.currentItem = dlg.execState.prefs.layersRemoved;
      }
      onItemSelected = function(value) {
         let val = dlg.layersRemovedCombo.itemText(value);
         dlg.execState.prefs.layersRemoved = parseInt(val);
         dlg.rebuildLayers();
      }
   }

   this.removedControl = new HorizontalSizer(this);
   with (this.removedControl) {
      margin = 6;
      spacing = 4;
      add(dlg.lbllayersRemoved);
      add(dlg.layersRemovedCombo);
   }

   this.lbllayersProtected = new Label(this);
   this.lbllayersProtected.text = "Protected wavelet layers:";

   this.layersProtectedCombo = new ComboBox(this);
   with (this.layersProtectedCombo) {
      enabled = dlg.execState.prefs.noiseReduction;
      editEnabled = false;
      bindings = function() {
         this.currentItem = dlg.execState.prefs.layersProtected;
      }
      onItemSelected = function(value) {
         let val = dlg.layersProtectedCombo.itemText(value);
         dlg.execState.prefs.layersProtected = parseInt(val);
         dlg.rebuildLayers();
      }
   }

   this.rebuildLayers = function () {
      dlg.layersRemovedCombo.clear();
      let idx = 0;
      for (var layers = dlg.execState.prefs.layersProtected + 1; layers <= 6; layers += 1) {
         dlg.layersRemovedCombo.addItem('' + layers);
         if (layers === dlg.execState.prefs.layersRemoved) {
            dlg.layersRemovedCombo.currentItem = idx;
         }
         idx++;
      }
      dlg.layersProtectedCombo.clear();
      idx = 0;
      let max = dlg.execState.prefs.layersRemoved - 1;
      for (var layers = 0; layers <= max; layers += 1) {
         dlg.layersProtectedCombo.addItem('' + layers);
         if (layers === dlg.execState.prefs.layersProtected) {
            dlg.layersProtectedCombo.currentItem = idx;
         }
         idx++;
      }
   }

   this.rebuildLayers();

   this.protectedControl = new HorizontalSizer(this);
   with (this.protectedControl) {
      margin = 6;
      spacing = 4;
      add(dlg.lbllayersProtected);
      add(dlg.layersProtectedCombo);
   }

   this.chrominance = new GroupBox(this);
   with (this.chrominance) {
      title = "Chrominance noise reduction";
      titleCheckBox = true;
      checked = dlg.execState.prefs.noiseReduction;
      onCheck = function(value) {
         dlg.execState.prefs.noiseReduction = value;
         dlg.layersRemovedCombo.enabled = value;
         dlg.layersProtectedCombo.enabled = value;
      }
      sizer = new VerticalSizer(dlg.chrominance);
      sizer.margin = 6;
      sizer.spacing = 4;
      sizer.add(dlg.removedControl);
      sizer.add(dlg.protectedControl);
   }

   this.lrgbSettings = new GroupBox(this);
	with (this.lrgbSettings) {
		title = "LRGBCombination:";
		sizer = new VerticalSizer;
      sizer.margin = 6;
      sizer.spacing = 4;
      sizer.add (dlg.lightnessSlider);
      sizer.add (dlg.saturationSlider);
      sizer.add(dlg.chrominance);
	}


   // save parameters
   this.exportParameters = function() {
      let prefs = dlg.execState.prefs;
      for (var propname in prefs) {
         if (prefs.hasOwnProperty(propname)) {
            Parameters.set(propname, prefs[propname]);
         }
      }
   };

   // New Instance button
   this.newInstanceButton = new ToolButton(this);
   with (this.newInstanceButton){
      icon = this.scaledResource( ":/process-interface/new-instance.png" );
      setScaledFixedSize( 20, 20 );
      toolTip = "New Instance";
      onMousePress = function(){
         this.hasFocus = true;
         this.pushed = false;
         with ( this.dialog ){
            dlg.exportParameters();
            newInstance();
         }
      };
   }

   // ok and cancel buttons
   this.okButton = new PushButton (this);
   this.okButton.text = "OK";
   this.okButton.icon = this.scaledResource( ":/icons/ok.png" );
   this.okButton.toolTip="<p>Apply current settings to target image and close.</p>"
   this.okButton.onClick = function() {
         dlg.okButton.enabled = false;
         doFit(dlg.execState);
         dlg.ok();
   };

   this.cancelButton = new PushButton (this);
   this.cancelButton.text = "Cancel";
   this.cancelButton.icon = this.scaledResource( ":/icons/cancel.png" );
   this.cancelButton.toolTip="<p>Close without applying current settings to target.</p>"
   this.cancelButton.onClick = function() {
      this.dialog.cancel();
   };

   this.buttonSizer = new HorizontalSizer(this);
   this.buttonSizer.spacing = 4;
   this.buttonSizer.add (this.newInstanceButton);
   this.buttonSizer.addStretch();
   this.buttonSizer.add (this.okButton);
   this.buttonSizer.add (this.cancelButton);

   this.sizer = new VerticalSizer(this);
   this.sizer.margin = 6;
   this.sizer.spacing = 6;
   this.sizer.add(this.lblHeadLine);
   this.sizer.add(this.lblCopyright);
   this.sizer.add(this.mainSettings);
   this.sizer.add(this.lFitSettings);
   this.sizer.add(this.lrgbSettings);
   this.sizer.add(this.buttonSizer);
   this.windowTitle = concatenateStr(TITLE, ' v', VERSION);

   this.adjustToContents();
}

alfDialog.prototype = new Dialog;

// checks for a saved value
function importParameter(paramName, fn) {
   if (Parameters.has(paramName)) {
      var val = fn(paramName);
      console.writeln(concatenateStr('Parameter ', paramName, ' = ', val));
      return val;
   }
   return null;
}

function importParametersOfType(prefs, list, fn) {
   for (var idx = 0; idx < list.length; idx++) {
      var prop = list[idx];
      var val = importParameter(prop, fn);
      if (val===null) {
         return;
      }
      prefs[prop] = val;
   }
}

function importParameters(executionState) {
   let numerics = ['lightness', 'saturation', 'rejectLow', 'rejectHigh'];
   let integers = ['layersRemoved', 'layersProtected'];
   let booleans = ['useMin', 'noiseReduction', 'newInstance', 'clipHighlights'];

   importParametersOfType(executionState.prefs, numerics, Parameters.getReal);
   importParametersOfType(executionState.prefs, integers, Parameters.getInteger);
   importParametersOfType(executionState.prefs, booleans, Parameters.getBoolean);
}

function main() {

   let prefs = {
      useMin: true,
      lightness: 0.5,
      saturation: 1.0,
      noiseReduction: false,
      layersRemoved: 4,
      layersProtected: 2,
      newInstance: false,
      rejectLow: 0,
      rejectHigh: 0.92,
      clipHighlights: true
   };

   let executionState = {
      prefs: prefs
   };

   writeLines(concatenateStr('v', VERSION, ' invoked'));

   if ( Parameters.isGlobalTarget || Parameters.isViewTarget ) {
      importParameters(executionState);
   }

   if (Parameters.isViewTarget) {
      executionState.view = Parameters.targetView;
      doFit(executionState);
   }
   else {
      executionState.view = ImageWindow.activeWindow.currentView;
      let dialog = new alfDialog(executionState);
      dialog.execute();
   }
}

main();
