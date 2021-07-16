/*

nonLinearStretch.js: Increase contrast with diverging curves transformations.
================================================================================

This script will progressively brighten the foreground and darken the background
using luminance masks and curves transformations.
================================================================================
 *
 *
 * Copyright Jeremy Likness, 2021
 *
 *
 * mailTo:deepskyworkflows@gmail.com
 */

#feature-id    DeepSkyWorkflows > NonLinearStretch

#define TITLE "Non-Linear Stretch"
#define VERSION "0.1"

#include "deepSkyCommon.js"

// generate the curves
function getCurvesTransformation(executionState, up) {

   if (up && executionState.config.prefs.foregroundFactor === 0) {
      return null;
   }

   if (up === false && executionState.config.prefs.backgroundFactor === 0) {
      return null;
   }

   let aggressiveness = up ? executionState.config.prefs.foregroundFactor :
      executionState.config.prefs.backgroundFactor;
   let pctAggressive = aggressiveness/100;
   let offset = 0.25 * pctAggressive;
   let min = up ? (0.5-offset) : (0.5 + offset);
   let max = up ? (0.5+offset) : (0.5 - offset);

   var P = new CurvesTransformation;
   P.R = [ // x, y
      [0.00000, 0.00000],
      [1.00000, 1.00000]
   ];
   P.Rt = CurvesTransformation.prototype.AkimaSubsplines;
   P.G = [ // x, y
      [0.00000, 0.00000],
      [1.00000, 1.00000]
   ];
   P.Gt = CurvesTransformation.prototype.AkimaSubsplines;
   P.B = [ // x, y
      [0.00000, 0.00000],
      [1.00000, 1.00000]
   ];
   P.Bt = CurvesTransformation.prototype.AkimaSubsplines;
   P.K = [ // x, y
      [0.00000, 0.00000],
      [min, max],
      [1.00000, 1.00000]
   ];
   P.Kt = CurvesTransformation.prototype.AkimaSubsplines;
   P.A = [ // x, y
      [0.00000, 0.00000],
      [1.00000, 1.00000]
   ];
   P.At = CurvesTransformation.prototype.AkimaSubsplines;
   P.L = [ // x, y
      [0.00000, 0.00000],
      [1.00000, 1.00000]
   ];
   P.Lt = CurvesTransformation.prototype.AkimaSubsplines;
   P.a = [ // x, y
      [0.00000, 0.00000],
      [1.00000, 1.00000]
   ];
   P.at = CurvesTransformation.prototype.AkimaSubsplines;
   P.b = [ // x, y
      [0.00000, 0.00000],
      [1.00000, 1.00000]
   ];
   P.bt = CurvesTransformation.prototype.AkimaSubsplines;
   P.c = [ // x, y
      [0.00000, 0.00000],
      [1.00000, 1.00000]
   ];
   P.ct = CurvesTransformation.prototype.AkimaSubsplines;
   P.H = [ // x, y
      [0.00000, 0.00000],
      [1.00000, 1.00000]
   ];
   P.Ht = CurvesTransformation.prototype.AkimaSubsplines;
   P.S = [ // x, y
      [0.00000, 0.00000],
      [1.00000, 1.00000]
   ];
   P.St = CurvesTransformation.prototype.AkimaSubsplines;
   return P;
}

function createMask(executionState) {
   extractLuminance(executionState, '_stretch');
   var mask = ImageWindow.windowById(executionState.channels[0][1]).mainView;
   return mask;
}

function iteration(executionState) {
   console.writeln('Generating mask for iteration...');
   var start = getImageSnapshotStr(imageSnapshot(executionState.view.image));
   var mask = createMask(executionState);
   writeLines(concatenateStr('Generated mask ', mask.id));

   console.writeln('Increasing foreground...');

   executionState.view.window.mask = mask.window;
   executionState.view.window.maskEnabled = true;
   executionState.view.window.maskInverted = false;

   var curves = getCurvesTransformation(executionState, true);

   if (curves !== null) {
      curves.executeOn(executionState.view, true);
   }

   console.writeln('Decreasing background...');

   executionState.view.window.maskInverted = true;
   curves = getCurvesTransformation(executionState, false);

   if (curves !== null) {
      curves.executeOn(executionState.view, true);
   }

   mask.window.forceClose();

   var end = getImageSnapshotStr(imageSnapshot(executionState.view.image));
   writeLines('Iteration results:', concatenateStr('Before: ', start),
      concatenateStr('After: ', end));
}

// main method
function doStretch(executionState) {

   let sourceViewId = executionState.view.id;

   writeLines(concatenateStr('processing view ', sourceViewId));

   // make sure we have RGB
   if (executionState.view.image.numberOfChannels !== 3) {
      writeLines('ERROR: view is not RGB');
      return;
   }

   var start = getImageSnapshotStr(imageSnapshot(executionState.view.image));

   for (var i = 0; i < executionState.config.prefs.iterations; i++) {
      writeLines(concatenateStr('Starting iteration ', i+1));
      iteration(executionState);
   }

   var end = getImageSnapshotStr(imageSnapshot(executionState.view.image));
   writeLines('Final results:', concatenateStr('Before: ', start),
      concatenateStr('After: ', end));

   writeLines('Done');

   executionState.view.window.bringToFront();
}

function nlsDialog(executionState)
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
   this.foregroundSlider = new NumericControl(this);
	with (this.foregroundSlider) {
		label.text = "Foreground Factor:";
		label.minWidth = 130;
		setRange(0, 100);
		slider.setRange(0, 100);
		slider.scaledMinWidth = 60;
		setPrecision(2);
		edit.scaledMinWidth = 60;
      setValue(dlg.execState.config.prefs.foregroundFactor);
      bindings = function() {
			this.setValue(dlg.execState.config.prefs.foregroundFactor);
		}
		onValueUpdated = function (value) {
         dlg.execState.config.prefs.foregroundFactor = value;
		}
		slider.onMousePress = function() {
			dlg.isSliding = true;
		}
		slider.onMouseRelease = function() {
			dlg.isSliding = false;
		}
	}

   bindResetToNumericControl(dlg.foregroundSlider, 'foregroundFactor', dlg.execState.config);

   this.backgroundSlider = new NumericControl(this);
	with (this.backgroundSlider) {
		label.text = "Background Factor:";
		label.minWidth = 130;
		setRange(0, 100);
		slider.setRange(0, 100);
		slider.scaledMinWidth = 60;
		setPrecision(2);
		edit.scaledMinWidth = 60;
      setValue(dlg.execState.config.prefs.backgroundFactor);
      bindings = function() {
			this.setValue(dlg.execState.config.prefs.backgroundFactor);
		}
		onValueUpdated = function (value) {
         dlg.execState.config.prefs.backgroundFactor = value;
		}
		slider.onMousePress = function() {
			dlg.isSliding = true;
		}
		slider.onMouseRelease = function() {
			dlg.isSliding = false;
		}
	}

   bindResetToNumericControl(dlg.backgroundSlider, 'backgroundFactor', dlg.execState.config);

   this.iterationsSlider = new NumericControl(this);
	with (this.iterationsSlider) {
		label.text = "Iterations:";
		label.minWidth = 130;
		setRange(1, 1000);
		slider.setRange(1, 1000);
		slider.scaledMinWidth = 60;
		setPrecision(2);
		edit.scaledMinWidth = 60;
      setValue(dlg.execState.config.prefs.iterations);
      bindings = function() {
			this.setValue(dlg.execState.config.prefs.iterations);
		}
		onValueUpdated = function (value) {
         dlg.execState.config.prefs.iterations = value;
		}
		slider.onMousePress = function() {
			dlg.isSliding = true;
		}
		slider.onMouseRelease = function() {
			dlg.isSliding = false;
		}
	}

   bindResetToNumericControl(dlg.iterationsSlider, 'iterations', dlg.execState.config);

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
         doStretch(dlg.execState);
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
   with (this.sizer) {
      margin = 6;
      spacing = 4;
      add(dlg.lblHeadLine);
      add(dlg.lblCopyright);
      add(dlg.foregroundSlider);
      add(dlg.backgroundSlider);
      add(dlg.iterationsSlider);
      add(dlg.buttonSizer);
   }
}

nlsDialog.prototype = new Dialog;

function main() {

   let executionState = {
      config: createSettingsManager([

         {  setting: "foregroundFactor",
            dataType: DataType_Int16,
            defaultValue: 2,
            label: "Foreground Factor",
            tooltip: "Scale from 1 to 100 for how intense each stretch is for the foreground."},

         {
            setting: "backgroundFactor",
            dataType: DataType_Int16,
            defaultValue: 10,
            label: "Background Factor",
            tooltip: "Scale from 1 to 100 for how intense each stretch is for the background."},
         {
            setting: "iterations",
            dataType: DataType_Int16,
            defaultValue: 10,
            label: "Iterations",
            tooltip: "Iterations to apply (1 - 1000)."}
      ])
   };

   executionState.config.init();

   writeLines(concatenateStr('v', VERSION, ' invoked'));

   if ( Parameters.isGlobalTarget || Parameters.isViewTarget ) {
      executionState.config.loadParameters();
   }

   if (Parameters.isViewTarget) {
      executionState.view = Parameters.targetView;
      doStretch(executionState);
   }
   else {
      executionState.view = ImageWindow.activeWindow.currentView;
      let dialog = new nlsDialog(executionState);
      dialog.execute();
   }
}

main();
