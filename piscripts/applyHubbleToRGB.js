/*

applyHubbletoRGB.js: Create a Hubble-style palette for an existing RGB image.
================================================================================

This script will apply a Hubble-style palette to your image.
================================================================================
 *
 *
 * Copyright Jeremy Likness, 2021
 *
 *
 * mailTo:deepskyworkflows@gmail.com
 */

#feature-id    DeepSkyWorkflows > ApplyHubbleToRGB

#define TITLE "Apply Hubble to RGB"

#include "deepSkyCommon.js"

// main method
function doApply(executionState) {

   let sourceViewId = executionState.view.id;

   writeLines(concatenateStr('processing view ', sourceViewId));
   writeLines('Done');
}

function importParameters(executionState) {
   let booleans = ['createSyntheticChannel'];
   importParametersOfType(executionState.prefs, booleans, Parameters.getBoolean);
}

function main() {

   let prefs = {
      createSyntheticChannel: true
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
