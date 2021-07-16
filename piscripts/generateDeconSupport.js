/*

generateDeconSupport.js: Increase contrast with diverging curves transformations.
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

#feature-id    DeepSkyWorkflows > GenerateDeconSupport

#define TITLE "Generate Decon Support"
#define VERSION "0.1"

#include "deepSkyCommon.js"


// main method
function doGenerate(executionState) {

   let sourceViewId = executionState.view.id;

   writeLines(concatenateStr('processing view ', sourceViewId));
   writeLines('Done');
}

function importParameters(executionState) {
   let numbers = ['saturationLimit'];
   importParametersOfType(executionState.prefs, numbers, Parameters.getReal);
}

function main() {

   let prefs = {
      saturationLimit: 0.8
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
   }
   else {
      executionState.view = ImageWindow.activeWindow.currentView;
   }

   doGenerate(executionState);
}

main();
