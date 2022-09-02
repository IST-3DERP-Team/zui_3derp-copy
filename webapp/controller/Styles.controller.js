sap.ui.define([
    "sap/ui/core/mvc/Controller",
    "../js/Common",
    "../js/Utils",
    "sap/ui/model/json/JSONModel",
    "sap/ui/export/Spreadsheet",
    "../control/DynamicTable"
],
    /**
     * @param {typeof sap.ui.core.mvc.Controller} Controller
     */
    function (Controller, Common, Utils, JSONModel, Spreadsheet, control) {
        "use strict";

        var that;

        return Controller.extend("zui3derp.controller.Styles", {

            onInit: function () {
                that = this;
                
                //Initialize router
                var oComponent = this.getOwnerComponent();
                this._router = oComponent.getRouter();
                this._router.getRoute("RouteStyles").attachPatternMatched(this._routePatternMatched, this);

                //Set model of smartfilterbar
                this._Model = this.getOwnerComponent().getModel();
                this.setSmartFilterModel();

                //Initialize translations
                this._i18n = this.getOwnerComponent().getModel("i18n").getResourceBundle();
            },

            setChangeStatus: function(changed) {
                //Set change flag 
                try {
                    sap.ushell.Container.setDirtyFlag(changed);
                } catch (err) {}
            },

            setSmartFilterModel: function () {
                //Model StyleHeaderFilters is for the smartfilterbar
                var oModel = this.getOwnerComponent().getModel("StyleHeaderFilters");
                var oSmartFilter = this.getView().byId("SmartFilterBar");
                oSmartFilter.setModel(oModel);
            },

            onSearch: function () {
                //trigger search, reselect styles
                this.getDynamicTableColumns(); //styles table
                this.getStyleStats(); //style statistics
            },

            //******************************************* */
            // Styles Table
            //******************************************* */

            getDynamicTableColumns: function () {
                var me = this;

                //get dynamic columns based on saved layout or ZERP_CHECK
                var oJSONColumnsModel = new JSONModel();
                this.oJSONModel = new JSONModel();

                this._sbu = this.getView().byId("SmartFilterBar").getFilterData().SBU; //get selected SBU
                this._Model.setHeaders({
                    sbu: this._sbu,
                    type: 'STYLINIT'
                });
                this._Model.read("/DynamicColumnsSet", {
                    success: function (oData, oResponse) {
                        oJSONColumnsModel.setData(oData);
                        me.oJSONModel.setData(oData);
                        me.getView().setModel(oJSONColumnsModel, "DynColumns"); //set the view model
                        me.getDynamicTableData(oData.results);
                    },
                    error: function (err) { }
                });
            },

            getDynamicTableData: function (columns) {
                var me = this;
                var oModel = this.getOwnerComponent().getModel();

                //get styles data for the table
                var oJSONDataModel = new JSONModel();
                var aFilters = this.getView().byId("SmartFilterBar").getFilters();
                var oText = this.getView().byId("StylesCount"); //for the count of selected styles
                this.addDateFilters(aFilters); //date not automatically added to filters

                oModel.read("/StyleSet", {
                    filters: aFilters,
                    success: function (oData, oResponse) {
                        oText.setText(oData.results.length + "");
                        oJSONDataModel.setData(oData);
                        me.getView().setModel(oJSONDataModel, "DataModel");
                        me.setTableData();
                        me.setChangeStatus(false);
                    },
                    error: function (err) { }
                });
            },

            addDateFilters: function(aFilters) {
                //get the date filter of created date
                var createdDate = this.getView().byId("CreatedDatePicker").getValue();
                    if(createdDate !== undefined && createdDate !== '') {
                        createdDate = createdDate.replace(/\s/g, '').toString(); //properly format the date for ABAP
                        var createDateStr = createdDate.split('–');
                        var createdDate1 = createDateStr[0];
                        var createdDate2 = createDateStr[1];
                        if(createdDate2 === undefined) {
                            createdDate2 = createdDate1;
                        }
                        var lv_createdDateFilter = new sap.ui.model.Filter({
                            path: "CREATEDDT",
                            operator: sap.ui.model.FilterOperator.BT,
                            value1: createdDate1,
                            value2: createdDate2
                    });
                    
                    aFilters.push(lv_createdDateFilter);
                }

                //get the date filter of updated date
                var updatedDate = this.getView().byId("UpdatedDatePicker").getValue();
                    if(updatedDate !== undefined && updatedDate !== '') {
                        updatedDate = updatedDate.replace(/\s/g, '').toString(); //properly format the date for ABAP
                        var createDateStr = updatedDate.split('–');
                        var updatedDate1 = createDateStr[0];
                        var updatedDate2 = createDateStr[1];
                        if(updatedDate2 === undefined) {
                            updatedDate2 = updatedDate1;
                        }
                        var lv_updatedDateFilter = new sap.ui.model.Filter({
                            path: "UPDATEDDT",
                            operator: sap.ui.model.FilterOperator.BT,
                            value1: updatedDate1,
                            value2: updatedDate2
                    });
                    aFilters.push(lv_updatedDateFilter); //add to the odata filter
                }
            },

            setTableData: function () {
                var me = this;

                //the selected dynamic columns
                var oColumnsModel = this.getView().getModel("DynColumns");
                var oDataModel = this.getView().getModel("DataModel");

                //the selected styles data
                var oColumnsData = oColumnsModel.getProperty('/results');
                var oData = oDataModel.getProperty('/results');

                //add column for copy button
                oColumnsData.unshift({
                    "ColumnName": "Copy",
                    "ColumnType": "COPY",
                    "Visible": false
                });

                //add column for manage button
                oColumnsData.unshift({
                    "ColumnName": "Manage",
                    "ColumnType": "SEL"
                });

                //set the column and data model
                var oModel = new JSONModel();
                oModel.setData({
                    columns: oColumnsData,
                    rows: oData
                });

                var oTable = this.getView().byId("styleDynTable");
                oTable.setModel(oModel);

                //bind the dynamic column to the table
                oTable.bindColumns("/columns", function (index, context) {
                    var sColumnId = context.getObject().ColumnName;
                    var sColumnType = context.getObject().ColumnType;
                    var sColumnVisible = context.getObject().Visible;
                    var sColumnSorted = context.getObject().Sorted;
                    var sColumnSortOrder = context.getObject().SortOrder;
                    var sColumnToolTip = context.getObject().Tooltip;
                    //alert(sColumnId.);
                    return new sap.ui.table.Column({
                        id: sColumnId,
                        label: "{i18n>" + sColumnId + "}",
                        template: me.columnTemplate(sColumnId, sColumnType),
                        width: me.getColumnSize(sColumnId, sColumnType),
                        sortProperty: sColumnId,
                        filterProperty: sColumnId,
                        autoResizable: true,
                        visible: sColumnVisible,
                        sorted: sColumnSorted,
                        sortOrder: ((sColumnSorted === true) ? sColumnSortOrder : "Ascending" )
                    });
                });

                //bind the data to the table
                oTable.bindRows("/rows");
            },

            columnTemplate: function (sColumnId, sColumnType) {
                var oColumnTemplate;

                //different component based on field
                if (sColumnId === "STATUSCD") { //display infolabel for Status Code
                    oColumnTemplate = new sap.tnt.InfoLabel({
                        text: "{" + sColumnId + "}",
                        colorScheme: "{= ${" + sColumnId + "} === 'CMP' ? 8 : ${" + sColumnId + "} === 'CRT' ? 3 : 1}"
                    })
                } else if (sColumnType === "SEL") { //Manage button
                    oColumnTemplate = new sap.m.Button({
                        text: "",
                        icon: "sap-icon://detail-view",
                        type: "Ghost",
                        press: this.goToDetail,
                        tooltip: "Manage this style"
                    });
                    oColumnTemplate.data("StyleNo", "{}"); //custom data to hold style number
                } else if (sColumnType === "COPY") { //Copy button
                    oColumnTemplate = new sap.m.Button({
                        text: "",
                        icon: "sap-icon://copy",
                        type: "Ghost",
                        press: this.onCopyStyle,
                        tooltip: "Copy this style"
                    });
                    oColumnTemplate.data("StyleNo", "{}"); //custom data to hold style number
                } else {
                    oColumnTemplate = new sap.m.Text({ text: "{" + sColumnId + "}" }); //default text
                }

                return oColumnTemplate;
            },

            

            //******************************************* */
            // Navigation
            //******************************************* */

            goToDetail: function (oEvent) {
                var oButton = oEvent.getSource();
                var styleNo = oButton.data("StyleNo").STYLENO; //get the styleno binded to manage button
                that.setChangeStatus(false); //remove change flag
                that.navToDetail(styleNo); //navigate to detail page
            },

            navToDetail: function (styleNo, sbu) {
                //route to detail page
                that._router.navTo("RouteStyleDetail", {
                    styleno: styleNo,
                    sbu: that._sbu
                });
            },

            //******************************************* */
            // Create New Style
            //******************************************* */

            onCreateNewStyle: function () {
                //create new button clicked
                this._sbu = this.getView().byId("SmartFilterBar").getFilterData().SBU; //get selected SBU
                this.setChangeStatus(false); //remove change flag

                //confirmation to create new style
                if (!this._ConfirmNewDialog) {
                    this._ConfirmNewDialog = sap.ui.xmlfragment("zui3derp.view.fragments.dialog.ConfirmCreateStyle", this);
                    this.getView().addDependent(this._ConfirmNewDialog);
                }
                jQuery.sap.syncStyleClass("sapUiSizeCompact", this.getView(), this._LoadingDialog);
                this._ConfirmNewDialog.addStyleClass("sapUiSizeCompact");
                this._ConfirmNewDialog.open();
            },

            onConfirmNewStyle: function() {
                //confirm create new style, navigate to detail as NEW
                this.navToDetail("NEW");
            },

            //******************************************* */
            // Copy Style
            //******************************************* */

            onCopyMode: function() {
                //show copy buttons
                var oTable = this.getView().byId("styleDynTable");
                var oCopyColumn = oTable.getColumns()[1];
                var visible = oCopyColumn.getVisible();
                var newVisible = ((visible === true) ? false : true);
                oCopyColumn.setVisible(newVisible);
            },

            onCopyStyle: function (oEvent) {
                //copy button clicked
                var oButton = oEvent.getSource();
                var styleNo = oButton.data("StyleNo").STYLENO; //get styleno binded on copy button
                that._styleNo = styleNo; //set the style selected

                var oData = oEvent.getSource().getParent().getBindingContext();
                //get info of selected style to copy
                var styleCode = oData.getProperty('STYLECD'); 
                var seasonCode = oData.getProperty('SEASONCD');
                var desc1 = oData.getProperty('DESC1');

                var oModel = new JSONModel();
                oModel.setData({
                    "STYLENO": styleNo,
                    "STYLECD": styleCode,
                    "SEASONCD": seasonCode,
                    "DESC1": desc1,
                    versions: []
                });

                that.getFiltersData(); //load the search help
                that.getVersionsTable(styleNo); //get versions of selected styleno

                var oView = that.getView();
                oView.setModel(oModel, "CopyModel") //set the copy model

                //open the copy style dialog
                if (!that._CopyStyleDialog) {
                    that._CopyStyleDialog = sap.ui.xmlfragment("zui3derp.view.fragments.CopyStyle", that);
                    that.getView().addDependent(that._CopyStyleDialog);
                }
                jQuery.sap.syncStyleClass("sapUiSizeCompact", that.getView(), that._LoadingDialog);
                that._CopyStyleDialog.addStyleClass("sapUiSizeCompact");
                that._CopyStyleDialog.open();
            },

            getVersionsTable: function (styleNo) {
                //get versions of selected styleno
                var oView = this.getView();
                var oModel = this.getOwnerComponent().getModel();
                var oJSONModel = new JSONModel();
                var entitySet = "/StyleVersionSet"
                oModel.setHeaders({
                    styleno: styleNo
                });
                oModel.read(entitySet, {
                    success: function (oData, oResponse) {
                        oJSONModel.setData(oData);
                        oView.setModel(oJSONModel, "VersionsDataModel");
                    },
                    error: function () { }
                })
            },

            onSaveCopyStyle: function () {
                //on confirmation of copy style
                var me = this;
                var oModel = this.getOwnerComponent().getModel();

                //get the selected versions to copy
                var oTable = sap.ui.getCore().byId("versionsTableMain");
                var oTableModel = oTable.getModel("VersionsDataModel");
                var oData = oTableModel.getData(); 
                var selected = oTable.getSelectedIndices();

                //get the input data
                var newStyleCode = sap.ui.getCore().byId("newStyleCode").getValue();
                var newSeason = sap.ui.getCore().byId("SEASONCD2").getValue();
                var colorCheck = sap.ui.getCore().byId("ColorCB").getSelected();
                var bomCheck = sap.ui.getCore().byId("bomCB").getSelected();
                var versions = [];

                if(newStyleCode === "") {
                    Common.showMessage(this._i18n.getText('t1'));
                } else if(newSeason === "") {
                    Common.showMessage(this._i18n.getText('t2'))
                } else {

                    if(bomCheck === true && colorCheck === false) {
                        Common.showMessage(this._i18n.getText('t3'));
                    } else {
                        //add versions to copy to the payload
                        for (var i = 0; i < selected.length; i++) {
                            versions.push(oData.results[selected[i]].Verno);
                        }

                        var entitySet = "/StyleSet(STYLENO='" + that._styleNo +  "')";

                        var versionStr = versions.join();
                        //set the http headers
                        oModel.setHeaders({
                            styleno: that._styleNo,
                            sbu: that._sbu,
                            stylecd: newStyleCode,
                            season: newSeason,
                            color: colorCheck,
                            bom: bomCheck,
                            versions: versionStr
                        });

                        var oEntry = { 
                            STYLENO: that._styleNo
                        };
                        //call the update method of styles
                        oModel.update(entitySet, oEntry, {
                            method: "PUT",
                            success: function(data, oResponse) {
                                me._CopyStyleDialog.close();
                                me.onSearch();
                                Common.showMessage(me._i18n.getText('t4'));
                            },
                            error: function() {
                                me._CopyStyleDialog.close();
                                Common.showMessage(me._i18n.getText('t5'));
                            }
                        });
                    }
                }
            },

            getFiltersData: function () {
                var oSHModel = this.getOwnerComponent().getModel("SearchHelps");

                //get Seasons
                var oJSONModel = new JSONModel();
                var oView = this.getView();
                oSHModel.setHeaders({
                    sbu: that._sbu
                });
                oSHModel.read("/SeasonSet", {
                    success: function (oData, oResponse) {
                        oJSONModel.setData(oData);
                        oView.setModel(oJSONModel, "SeasonsModel");
                    },
                    error: function (err) { }
                });
            },

            onSeasonsValueHelp: function (oEvent) {
                //load the seasons search help
                var sInputValue = oEvent.getSource().getValue();
                that.inputId = oEvent.getSource().getId();
                if (!that._seasonsHelpDialog) {
                    that._seasonsHelpDialog = sap.ui.xmlfragment("zui3derp.view.fragments.Seasons", that);
                    that._seasonsHelpDialog.attachSearch(that._seasonsGroupValueHelpSearch);                    
                    that.getView().addDependent(that._seasonsHelpDialog);
                }
                that._seasonsHelpDialog.open(sInputValue);
            },

            _seasonsGroupValueHelpSearch: function (evt) {
                //search the list of seasons
                var sValue = evt.getParameter("value");
                var andFilter = [], orFilter = [];
                orFilter.push(new sap.ui.model.Filter("Seasoncd", sap.ui.model.FilterOperator.Contains, sValue));
                orFilter.push(new sap.ui.model.Filter("Desc1", sap.ui.model.FilterOperator.Contains, sValue));
                andFilter.push(new sap.ui.model.Filter(orFilter, false));
                evt.getSource().getBinding("items").filter(new sap.ui.model.Filter(andFilter, true));
            },

            _seasonsGroupValueHelpClose: function (evt) {
                //season selected from the list
                var oSelectedItem = evt.getParameter("selectedItem");
                if (oSelectedItem) {
                    var input = sap.ui.getCore().byId(that.inputId);
                    input.setValue(oSelectedItem.getTitle());
                    that.onHeaderChange();
                }
                evt.getSource().getBinding("items").filter([]);
            },

            //******************************************* */
            // Save Table Layout
            //******************************************* */

            onSaveLayoutSettings: function () {
                //saving of the layout of table
                var me = this;
                var oTable = this.getView().byId("styleDynTable");
                var oColumns = oTable.getColumns();
                var oEntry = {
                    "TableName": "STYLINIT",
                    "Sbu": that._sbu,
                    "LayoutToItems": []
                };
                var ctr = 1;
                //get information of columns, add to payload
                oColumns.forEach((column) => {
                    if(column.sId !== "Manage" && column.sId !== "Copy") {
                        oEntry.LayoutToItems.push({
                            ColumnName: column.sId,
                            Order: ctr.toString(),
                            Sorted: column.mProperties.sorted,
                            SortOrder: column.mProperties.sortOrder,
                            SortSeq: "1",
                            Visible: column.mProperties.visible
                        });
                        ctr++;
                    }
                });
                //call the layout save
                var oModel = this.getOwnerComponent().getModel();
                oModel.create("/LayoutVariantSet", oEntry, {
                    method: "POST",
                    success: function(data, oResponse) {
                        Common.showMessage(me._i18n.getText('t6'));
                    },
                    error: function() {
                        alert("Error");
                    }
                });                
            },

            //******************************************* */
            // Style Stats
            //******************************************* */

            getStyleStats: function () {
                //select the style statistics
                var oModel = this.getOwnerComponent().getModel();
                var oForecast = this.getView().byId("forecastNumber");
                var oOrder = this.getView().byId("orderNumber");
                var oShipped = this.getView().byId("shippedNumber");

                //get the smartfilterbar filters for odata filter
                var aFilters = this.getView().byId("SmartFilterBar").getFilters();
                this.addDateFilters(aFilters);

                oModel.read("/StyleStatsSet", {
                    filters: aFilters,
                    success: function (oData) {
                        oForecast.setNumber(oData.results[0].FORECAST);
                        oOrder.setNumber(oData.results[0].ORDER);
                        oShipped.setNumber(oData.results[0].SHIPPED);
                    },
                    error: function (err) { }
                });
            },

            //******************************************* */
            // Upload Style
            //******************************************* */

            onUploadStyle: function() {
                //navigate to upload style on click of upload button
                var sbu = this.getView().byId("SmartFilterBar").getFilterData().SBU;
                that._router.navTo("RouteUploadStyle", {
                    sbu: sbu
                });
            },

            //******************************************* */
            // Common Functions
            //******************************************* */

            getColumnSize: function (sColumnId, sColumnType) {
                //column width of fields
                var mSize = '7rem';
                if (sColumnType === "SEL") {
                    mSize = '5rem';
                } else if (sColumnType === "COPY") {
                    mSize = '4rem';
                } else if (sColumnId === "STYLECD") {
                    mSize = '25rem';
                } else if (sColumnId === "DESC1" || sColumnId === "PRODTYP") {
                    mSize = '15rem';
                }
                return mSize;
            },

            onCloseDialog: function(oEvent) {
                oEvent.getSource().getParent().close();
            },

            //padding zeroes for formatting
            pad: Common.pad,

            //export to spreadsheet utility
            onExport: Utils.onExport
        });

    });
