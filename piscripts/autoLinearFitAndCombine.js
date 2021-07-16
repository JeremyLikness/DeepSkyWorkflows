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

#define TITLE "Auto Linear Fit"
#define VERSION "0.1"

#include "deepSkyCommon.js"

#include <pjsr/StdButton.jsh>
#include <pjsr/DataType.jsh>
#include <pjsr/FrameStyle.jsh>
#include <pjsr/TextAlign.jsh>
#include <pjsr/NumericControl.jsh>

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
   let maxOrMinFn = executionState.config.prefs.useMin ? Math.min : Math.max;

   writeLines(concatenateStr('R: ', medians[0], ' G: ', medians[1], ' B: ', medians[2]),
      concatenateStr('Using ', executionState.config.prefs.useMin ? 'minimum' : 'maximum', ' median channel'));

   // get minimum or maximum channel
   let tgtMedian = maxOrMinFn(medians[0], medians[1], medians[2]);

   let adjusted = [];

   // iterate to pull out reference channel
   let tgtId = 0;
   for (var i = 0; i < medians.length; i++) {
      if (tgtMedian == medians[i]) {
         tgtId = i;
         adjusted.push(executionState.config.prefs.newInstance || false);
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
   lf.rejectLow = executionState.config.prefs.rejectLow;
   lf.rejectHigh = executionState.config.prefs.rejectHigh;

   writeLines(concatenateStr('Executing LinearFit with rejectLow: ', executionState.config.prefs.rejectLow,
      ' rejectHigh: ', executionState.config.prefs.rejectHigh));

   lf.referenceViewId = executionState.channels[executionState.tgtId][1];
   for (var i = 0; i < executionState.channelImgs.length; i++) {
      if (executionState.tgtId != i) {
         lf.executeOn(executionState.channelImgs[i]);
      }
   }
}

// use LRGB to recombine
function lrgbCombine(executionState) {
   writeLines(concatenateStr('Combining with lightness ', executionState.config.prefs.lightness,
      ' and saturation ', executionState.config.prefs.saturation),
      executionState.config.prefs.noiseReduction ? concatenateStr('Applying noise reduction: layersRemoved: ',
         executionState.config.prefs.layersRemoved, ' layersProtected: ', executionState.config.prefs.layersProtected) :
         'No noise reduction');

   console.writeln(executionState.config.prefs.clipHighlights ? 'Clipping highlights' : 'Not clipping highlights');

   // set up combination
   var lrgb = new LRGBCombination;

   lrgb.channels = [ // enabled, id, k
      [executionState.adjusted[0], executionState.channels[0][1], 1.00000],
      [executionState.adjusted[1], executionState.channels[1][1], 1.00000],
      [executionState.adjusted[2], executionState.channels[2][1], 1.00000],
      [false, "", 1.00000]
   ];

   lrgb.mL = executionState.config.prefs.lightness;
   lrgb.mc = executionState.config.prefs.saturation;
   lrgb.clipHighlights = executionState.config.prefs.clipHighlights;
   lrgb.noiseReduction = executionState.config.prefs.noiseReduction;
   lrgb.layersRemoved = executionState.config.prefs.layersRemoved;
   lrgb.layersProtected = executionState.config.prefs.layersProtected;

   if (executionState.config.prefs.newInstance) {
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

   if (executionState.config.prefs.newInstance === false) {
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
   this.useMinCheckbox = createBoundCheckbox(this, 'useMin', executionState.config);

   // new instance
   this.newInstanceCheckbox = new createBoundCheckbox(this, 'newInstance', executionState.config);

   this.mainSettings = createGroupBox(this, 'Main settings', dlg.useMinCheckbox,
      null, dlg.newInstanceCheckbox);

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
      setValue(dlg.execState.config.prefs.rejectLow);
      bindings = function() {
			this.setValue(dlg.execState.config.prefs.rejectLow);
		}
		onValueUpdated = function (value) {
         if (value >= 1.0 || value >= dlg.execState.config.prefs.rejectHigh) {
            value = dlg.execState.config.prefs.rejectHigh * 0.9;
            dlg.rejectLowSlider.setValue(value);
         }
			dlg.execState.config.prefs.rejectLow = value;
		}
		slider.onMousePress = function() {
			dlg.isSliding = true;
		}
		slider.onMouseRelease = function() {
			dlg.isSliding = false;
		}
	}

   bindResetToNumericControl(dlg.rejectLowSlider, 'rejectLow', dlg.execState.config);

   this.rejectHighSlider = new NumericControl(this);
	with (this.rejectHighSlider) {
		label.text = "Reject high:";
		label.minWidth = 130;
		setRange(0, 1);
		slider.setRange(0, 100);
		slider.scaledMinWidth = 60;
		setPrecision(2);
		edit.scaledMinWidth = 60;
      setValue(dlg.execState.config.prefs.rejectHigh);
		bindings = function() {
			this.setValue(dlg.execState.config.prefs.rejectHigh);
		}
		onValueUpdated = function (value) {
         if (value <= 0 || value <= dlg.execState.config.prefs.rejectLow) {
            value = dlg.execState.config.prefs.rejectLow * 1.01;
            dlg.rejectHighSlider.setValue(value);
         }
			dlg.execState.config.prefs.rejectHigh = value;
		}
		slider.onMousePress = function() {
			dlg.isSliding = true;
		}
		slider.onMouseRelease = function() {
			dlg.isSliding = false;
		}
	}

   bindResetToNumericControl(dlg.rejectHighSlider, 'rejectHigh', dlg.execState.config);

   this.lFitSettings = createVerticalGroupBox(this, 'Linear fit', dlg.rejectLowSlider,
      dlg.rejectHighSlider);

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
      setValue(dlg.execState.config.prefs.lightness);
      bindings = function() {
			this.setValue(dlg.execState.config.prefs.lightness);
		}
		onValueUpdated = function (value) {
         if (value < 0.001) {
            value = 0.001;
         }
			dlg.execState.config.prefs.lightness = value;
		}
		slider.onMousePress = function() {
			dlg.isSliding = true;
		}
		slider.onMouseRelease = function() {
			dlg.isSliding = false;
		}
	}

   bindResetToNumericControl(dlg.lightnessSlider, 'lightness', dlg.execState.config);

   this.saturationSlider = new NumericControl(this);
	with (this.saturationSlider) {
		label.text = "Saturation:";
		label.minWidth = 130;
		setRange(0.001, 1);
		slider.setRange(1, 100);
		slider.scaledMinWidth = 60;
		setPrecision(2);
		edit.scaledMinWidth = 60;
      setValue(dlg.execState.config.prefs.saturation);
		bindings = function() {
			this.setValue(dlg.execState.config.prefs.saturation);
		}
		onValueUpdated = function (value) {
         if (value < 0.001) {
            value = 0.001;
         }
			dlg.execState.config.prefs.saturation = value;
		}
		slider.onMousePress = function() {
			dlg.isSliding = true;
		}
		slider.onMouseRelease = function() {
			dlg.isSliding = false;
		}
	}

   bindResetToNumericControl(dlg.saturationSlider, 'saturation', dlg.execState.config);

   this.lbllayersRemoved = new Label(this);
   this.lbllayersRemoved.text = "Smoothed wavelet layers:";

   this.layersRemovedCombo = new ComboBox(this);
   with (this.layersRemovedCombo) {
      enabled = dlg.execState.config.prefs.noiseReduction;
      editEnabled = false;
      bindings = function() {
         this.currentItem = dlg.execState.config.prefs.layersRemoved;
      }
      onItemSelected = function(value) {
         let val = dlg.layersRemovedCombo.itemText(value);
         dlg.execState.config.prefs.layersRemoved = parseInt(val);
         dlg.rebuildLayers();
      }
   }

   dlg.execState.config.funcs.layersRemoved.reset = function () {
      dlg.layersRemovedCombo.currentItem =  dlg.execState.config.prefs.layersRemoved;
      dlg.layersRemovedCombo.update();
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
      enabled = dlg.execState.config.prefs.noiseReduction;
      editEnabled = false;
      bindings = function() {
         this.currentItem = dlg.execState.config.prefs.layersProtected;
      }
      onItemSelected = function(value) {
         let val = dlg.layersProtectedCombo.itemText(value);
         dlg.execState.config.prefs.layersProtected = parseInt(val);
         dlg.rebuildLayers();
      }
   }

   dlg.execState.config.funcs.layersProtected.reset = dlg.rebuildLayers;

   this.rebuildLayers = function () {
      dlg.layersRemovedCombo.clear();
      let idx = 0;
      for (var layers = dlg.execState.config.prefs.layersProtected + 1; layers <= 6; layers += 1) {
         dlg.layersRemovedCombo.addItem('' + layers);
         if (layers === dlg.execState.config.prefs.layersRemoved) {
            dlg.layersRemovedCombo.currentItem = idx;
         }
         idx++;
      }
      dlg.layersProtectedCombo.clear();
      idx = 0;
      let max = dlg.execState.config.prefs.layersRemoved - 1;
      for (var layers = 0; layers <= max; layers += 1) {
         dlg.layersProtectedCombo.addItem('' + layers);
         if (layers === dlg.execState.config.prefs.layersProtected) {
            dlg.layersProtectedCombo.currentItem = idx;
         }
         idx++;
      }
   }

   dlg.execState.config.funcs.layersRemoved.reset = dlg.rebuildLayers;

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
      checked = dlg.execState.config.prefs.noiseReduction;
      onCheck = function(value) {
         dlg.execState.config.prefs.noiseReduction = value;
         dlg.layersRemovedCombo.enabled = value;
         dlg.layersProtectedCombo.enabled = value;
      }
      sizer = new VerticalSizer(dlg.chrominance);
      sizer.margin = 6;
      sizer.spacing = 4;
      sizer.add(dlg.removedControl);
      sizer.add(dlg.protectedControl);
   }

   dlg.execState.config.funcs.noiseReduction.reset = function () {
      dlg.chrominance.checked = dlg.execState.config.prefs.noiseReduction;
      dlg.chrominance.update();
   }


   this.lrgbSettings = createVerticalGroupBox(
      this, 'LRGBCombination', dlg.lightnessSlider, dlg.saturationSlider,
      dlg.chrominance);

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
            dlg.execState.config.saveParameters();
            newInstance();
         }
      };
   }

   // ok and cancel buttons
   this.okButton = new ToolButton (this);
   this.okButton.icon = this.scaledResource( ":/process-interface/apply.png" );
   this.okButton.setScaledFixedSize ( 20, 20 );
   this.okButton.toolTip="<p>Apply current settings to target image and close.</p>"
   this.okButton.onMousePress = function() {
         dlg.okButton.enabled = false;
         doFit(dlg.execState);
         dlg.execState.config.saveSettings();
         dlg.ok();
   };

   this.resetButton = new ToolButton(this);
   with (this.resetButton){
      icon = this.scaledResource( ":/process-interface/reset.png" );
      setScaledFixedSize( 20, 20 );
      toolTip = "Reset";
      onMousePress = function(){
         this.hasFocus = true;
         this.pushed = false;
         with ( this.dialog ) {
            dlg.execState.config.reset();
         }
      };
   }

   this.buttonSizer = new HorizontalSizer(this);
   this.buttonSizer.spacing = 4;
   this.buttonSizer.add (this.newInstanceButton);
   this.buttonSizer.add (this.okButton);
   this.buttonSizer.addStretch();
   this.buttonSizer.add (this.resetButton);

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

function main() {

   let executionState = {
      config: createSettingsManager([

         {  setting: "useMin",
            dataType: DataType_Boolean,
            defaultValue: true,
            label: "Use minimum channel",
            tooltip: "Uses the channel with the minimum median as the source for LinearFit. Otherwise uses the max."},

         {
            setting: "newInstance",
            dataType: DataType_Boolean,
            defaultValue: false,
            tooltip: "Creates a new image instead of applying the normalization to the target image.",
		      label: "Create new instance"
         },
         {
            setting: "lightness",
            dataType: DataType_Double,
            defaultValue: 0.5
		   },
         { setting: "saturation", dataType: DataType_Double, defaultValue: 1.0},
         { setting: "noiseReduction", dataType: DataType_Boolean, defaultValue: false},
         { setting: "layersRemoved", dataType: DataType_Int16, defaultValue: 4},
         { setting: "layersProtected", dataType: DataType_Int16, defaultValue: 2},
         { setting: "rejectLow", dataType: DataType_Double, defaultValue: 0},
         { setting: "rejectHigh", dataType: DataType_Double, defaultValue: 0.92},
         { setting: "clipHighlights", dataType: DataType_Boolean, defaultValue: true}
      ])
   };

   executionState.config.init();

   writeLines(concatenateStr('v', VERSION, ' invoked'));

   if ( Parameters.isGlobalTarget || Parameters.isViewTarget ) {
      executionState.config.loadParameters();
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
