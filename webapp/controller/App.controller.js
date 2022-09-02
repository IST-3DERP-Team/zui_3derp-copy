sap.ui.define(
    [
        "sap/ui/core/mvc/Controller",
        "sap/ui/model/json/JSONModel"
    ],
    function(BaseController, JSONModel) {
      "use strict";
  
      return BaseController.extend("zui3derp.controller.controller.App", {
        onInit: function () {
            var oModel = new JSONModel({
                "selectedKey": "RouteMain",
                "navigation": [
                    {
                        "title": "Home",
                        "icon": "sap-icon://home",
                        "key": "RouteMain"
                    },
                    {
                        "title": "Manage Styles",
                        "icon": "sap-icon://puzzle",
                        "key": "RouteStyles"
                    }
                ],
                "fixedNavigation": [
                    {
                        "title": "Settings",
                        "icon": "sap-icon://employee"
                    }
                ]
            }, false);

            var oView = this.getView();
            oView.setModel(oModel); 
        },

        onAfterRendering: function() {
            this.onSideNavButtonPress(); //hide the sidebar by default
        },

        navigatePage: function(oRouteName) {
            //route to selected menu item
            var oRouter = sap.ui.core.UIComponent.getRouterFor(this);
            oRouter.navTo(oRouteName); 
        },

        onItemSelect: function (oEvent) {
            var item = oEvent.getParameter('item'); //get the selected key
            this.navigatePage(item.getKey()); //go to selected page based on key target
        },

        onSideNavButtonPress: function () {
            var toolPage = this.byId("toolPage");
            toolPage.setSideExpanded(!toolPage.getSideExpanded());
        }
      });
    }
  );
  