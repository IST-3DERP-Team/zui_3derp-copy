sap.ui.define([
    "sap/ui/core/mvc/Controller",
    "sap/m/library",
    "sap/ui/model/json/JSONModel"
],
    /**
     * @param {typeof sap.ui.core.mvc.Controller} Controller
     */
    function (Controller, JSONModel) {
        "use strict";

        return Controller.extend("zui3derp.controller.Main", {

            onInit: function () {
                this.getStyleStats();
            },

            goToStyles: function () {
                //on click of Manage Styles tile
                var oRouter = sap.ui.core.UIComponent.getRouterFor(this);
                oRouter.navTo("RouteStyles");
            },

            getStyleStats: function () {
                var oModel = this.getOwnerComponent().getModel();
                var oForecast = this.getView().byId("forecastNumber");
                var oOrder = this.getView().byId("orderNumber");
                var oShipped = this.getView().byId("shippedNumber");

                //get forcast/order/shipped values
                oModel.read("/StyleStatsSet", {
                    success: function (oData) {
                        oForecast.setText(String(oData.results[0].FORECAST));
                        oOrder.setText(String(oData.results[0].ORDER));
                        oShipped.setText(String(oData.results[0].SHIPPED));
                    },
                    error: function (err) { }
                });
            }
        })
    });
