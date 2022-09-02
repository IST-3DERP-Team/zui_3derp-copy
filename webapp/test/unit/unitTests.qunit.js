/* global QUnit */
QUnit.config.autostart = false;

sap.ui.getCore().attachInit(function () {
	"use strict";

	sap.ui.require([
		"zui_3derp/test/unit/AllTests"
	], function () {
		QUnit.start();
	});
});
