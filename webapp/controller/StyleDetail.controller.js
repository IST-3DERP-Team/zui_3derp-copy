sap.ui.define([
    "sap/ui/core/mvc/Controller",
    'sap/ui/model/Filter',
    "../js/Common",
    "../js/Utils",
    "sap/ui/model/json/JSONModel",
    'jquery.sap.global',
    'sap/ui/core/routing/HashChanger'
],
    /**
     * @param {typeof sap.ui.core.mvc.Controller} Controller
     */
    function (Controller, Filter, Common, Utils, JSONModel, jQuery, HashChanger) {
        "use strict";

        var that;

        return Controller.extend("zui3derp.controller.StyleDetail", {

            onInit: function () {
                that = this;
                
                //Initialize router
                var oComponent = this.getOwnerComponent();
                this._router = oComponent.getRouter();
                this._router.getRoute("RouteStyleDetail").attachPatternMatched(this._routePatternMatched, this);
                
                //Add the attachments to screen
                this.appendUploadCollection();

                //Set the file data model
                var oModel = this.getOwnerComponent().getModel("FileModel"); 
                this.getView().setModel(oModel, "FileModel");

                this._headerChanged = false; //Set change flag

                //Initialize translations
                this._i18n = this.getOwnerComponent().getModel("i18n").getResourceBundle();
            },

            _routePatternMatched: function (oEvent) {
                this._styleNo = oEvent.getParameter("arguments").styleno; //get Style from route pattern
                this._sbu = oEvent.getParameter("arguments").sbu; //get SBU from route pattern
                
                //set all as no changes at first load
                this._headerChanged = false;
                this._generalAttrChanged = false;
                this._colorChanged = false;
                this._sizeChanged = false;
                this._processChanged = false;
                this._versionChanged = false;
                
                this.setChangeStatus(false);
                
                if (this._styleNo === "NEW") { 
                    //create new - only header is editable at first
                    this.setHeaderEditMode(); 
                    this.setDetailVisible(false);
                } else {
                    //existing style, get the style data
                    this.cancelHeaderEdit(); 
                    this.setDetailVisible(true); //make detail section visible
                    this.getGeneralTable(); //get general attributes
                    this.getSizesTable(); //get sizes
                    this.getProcessesTable(); //get process
                    this.getVersionsTable(); //get versions
                }
                
                //close all edit modes
                this.closeEditModes();

                //Load header
                this.getHeaderConfig(); //get visible header fields
                this.getHeaderData(); //get header data

                this.getColorsTable();

                //Load value helps
                Utils.getStyleSearchHelps(this);
                Utils.getAttributesSearchHelps(this);
                Utils.getProcessAttributes(this);

                //Attachments
                this.bindUploadCollection();
                this.getView().getModel("FileModel").refresh();
            },

            closeEditModes: function() {
                this.cancelGeneralAttrEdit();
                this.cancelColorsEdit();
                this.cancelSizeEdit();
                this.cancelProcessEdit();
                this.cancelVersionEdit();
                this.cancelFilesEdit();
            },

            setChangeStatus: function(changed) {
                //controls the edited warning message
                try {
                    sap.ushell.Container.setDirtyFlag(changed);
                } catch(err) {}
            },

            setDetailVisible: function(bool) {
                var detailPanel = this.getView().byId('detailPanel'); //show detail section if there is header info
                detailPanel.setVisible(bool);
            },

            //******************************************* */
            // Style Header
            //******************************************* */

            getHeaderData: function () {
                var me = this;
                var styleNo = this._styleNo;
                var oModel = this.getOwnerComponent().getModel();
                var oJSONModel = new JSONModel();
                var oView = this.getView();

                Common.openLoadingDialog(that);

                //read Style header data
                var entitySet = "/StyleDetailSet('" + styleNo + "')"
                oModel.read(entitySet, {
                    success: function (oData, oResponse) {
                        // var oldData = oData;
                        // me._headerData = JSON.parse(JSON.stringify(oData));
                        oJSONModel.setData(oData);
                        oView.setModel(oJSONModel, "headerData");
                        Common.closeLoadingDialog(that);
                        me.setChangeStatus(false);
                    },
                    error: function () {
                        Common.closeLoadingDialog(that);
                    }
                })
            },

            getHeaderConfig: function () {
                var me = this;
                var oView = this.getView();
                var oModel = this.getOwnerComponent().getModel();
                var oJSONModel = new sap.ui.model.json.JSONModel();

                //get header fields
                oModel.setHeaders({
                    sbu: this._sbu,
                    type: 'STYLHDR'
                });
                oModel.read("/DynamicColumnsSet", {
                    success: function (oData, oResponse) {
                        var visibleFields = new JSONModel();
                        var visibleFields = {};
                        //get only visible fields
                        for (var i = 0; i < oData.results.length; i++) {
                            visibleFields[oData.results[i].ColumnName] = oData.results[i].Visible;
                        }
                        var JSONdata = JSON.stringify(visibleFields);
                        var JSONparse = JSON.parse(JSONdata);
                        oJSONModel.setData(JSONparse);
                        oView.setModel(oJSONModel, "VisibleFieldsData");
                    },
                    error: function (err) { }
                });
            },

            setHeaderEditMode: function () {
                //unlock editable fields of style header
                var oJSONModel = new JSONModel();
                var data = {};
                this._headerChanged = false;
                data.editMode = true;
                oJSONModel.setData(data);
                this.getView().setModel(oJSONModel, "HeaderEditModeModel");
            },

            cancelHeaderEdit: function () {
                //confirm cancel edit of style header
                if (this._headerChanged) {
                    if (!this._DiscardHeaderChangesDialog) {
                        this._DiscardHeaderChangesDialog = sap.ui.xmlfragment("zui3derp.view.fragments.dialog.DiscardHeaderChanges", this);
                        this.getView().addDependent(this._DiscardHeaderChangesDialog);
                    }
                    jQuery.sap.syncStyleClass("sapUiSizeCompact", this.getView(), this._LoadingDialog);
                    this._DiscardHeaderChangesDialog.addStyleClass("sapUiSizeCompact");
                    this._DiscardHeaderChangesDialog.open();
                } else {
                    this.closeHeaderEdit();
                }
            },

            closeHeaderEdit: function () {
                //on cancel confirmed - close edit mode and reselect backend data
                var oJSONModel = new JSONModel();
                var data = {};
                that._headerChanged = false;
                that.setChangeStatus(false);
                data.editMode = false;
                oJSONModel.setData(data);
                that.getView().setModel(oJSONModel, "HeaderEditModeModel");
                if (that._DiscardHeaderChangesDialog) {
                    that._DiscardHeaderChangesDialog.close();
                    that.getHeaderData();
                }
                var oMsgStrip = that.getView().byId('HeaderMessageStrip');
                oMsgStrip.setVisible(false);
            },

            onHeaderChange: function () {
                //set change flag for header
                this._headerChanged = true;
                this.setChangeStatus(true);
            },

            onSaveHeader: function () {
                //save style header button clicked
                var oModel = this.getOwnerComponent().getModel();
                var me = this;
                var path;
                var oHeaderModel = this.getView().getModel("headerData");
                var oEntry = oHeaderModel.getData();

                //initialize message strip
                var oMsgStrip = this.getView().byId('HeaderMessageStrip');
                oMsgStrip.setVisible(false);

                //check if there are changes
                if (!this._headerChanged) {
                // if (oEntry === me._headerData) {
                    Common.showMessage(this._i18n.getText('t7')); //no changes made
                } else {

                    //set http header data
                    oEntry.Styleno = this._styleNo;
                    oEntry.Sbu = this._sbu;

                    if (this._styleNo === "NEW") { //creating a new style

                        //set default style info for NEW
                        oEntry.Statuscd = 'CRT';
                        oEntry.Createdby = "$";
                        oEntry.Createddt = "$";
                        oEntry.Verno = "1";

                        path = "/StyleDetailSet";

                        oModel.setHeaders({
                            sbu: this._sbu
                        });

                        //call create new style
                        oModel.create(path, oEntry, {
                            method: "POST",
                            success: function (oData, oResponse) {
                                
                                var oJSONModel = new JSONModel();
                                me._styleNo = oData.Styleno;
                                oJSONModel.setData(oData);

                                //on successful create, select data related to style
                                me.getHeaderData();
                                me.getGeneralTable();
                                me.getSizesTable();
                                me.getVersionsTable();
                                me.getProcessesTable();
                                me._headerChanged = false;
                                me.setChangeStatus(false);
                                me.setDetailVisible(true);
                                Common.showMessage(me._i18n.getText('t4'));

                                //change the url hash to the new style no
                                var oHashChanger = HashChanger.getInstance();
                                var currHash = oHashChanger.getHash();
                                var newHash = currHash.replace("NEW", me._styleNo);
                                oHashChanger.replaceHash(newHash);
                            },
                            error: function (err) {
                                //show message strip on error
                                var errorMsg;
                                try {
                                    errorMsg = JSON.parse(err.responseText).error.message.value;
                                } catch (err) {
                                    errorMsg = err.responseText;
                                }
                                oMsgStrip.setVisible(true);
                                oMsgStrip.setText(errorMsg);
                            }
                        });

                    } else {
                        //style already existing, call update method
                        path = "/StyleDetailSet('" + this._styleNo + "')";
                        oModel.setHeaders({
                            sbu: this._sbu
                        });
                        oModel.update(path, oEntry, {
                            method: "PUT",
                            success: function (data, oResponse) {
                                //reselect the data to ensure consistency
                                me.getHeaderData();
                                me.getSizesTable();
                                me._headerChanged = false;
                                me.setChangeStatus(false);
                                Common.showMessage(me._i18n.getText('t4'));
                            },
                            error: function (err, oMessage) {
                                //show message strip on error
                                var errorMsg;
                                try {
                                    errorMsg = JSON.parse(err.responseText).error.message.value;
                                } catch (err) {
                                    errorMsg = err.responseText;
                                }
                                oMsgStrip.setVisible(true);
                                oMsgStrip.setText(errorMsg);
                            }
                        });
                    }
                }
            },

            onDeleteStyle: function () {
                //show confirmation to delete style
                if (!this._ConfirmDeleteDialog) {
                    this._ConfirmDeleteDialog = sap.ui.xmlfragment("zui3derp.view.fragments.dialog.ConfirmDeleteStyle", this);
                    this.getView().addDependent(this._ConfirmDeleteDialog);
                }
                jQuery.sap.syncStyleClass("sapUiSizeCompact", this.getView(), this._LoadingDialog);
                this._ConfirmDeleteDialog.addStyleClass("sapUiSizeCompact");
                this._ConfirmDeleteDialog.open();
            },

            onConfirmDeleteStyle: function () {
                var me = this;
                var oModel = this.getOwnerComponent().getModel();

                if (this._styleNo === "NEW") { //deleted without style no, return to style screen
                    this.setChangeStatus(false);
                    that._router.navTo("RouteStyles");
                } else {
                    //existing style, call style delete method
                    var entitySet = "/StyleSet(STYLENO='" + that._styleNo + "')";

                    Common.openLoadingDialog(that);
                    this._ConfirmDeleteDialog.close();

                    oModel.remove(entitySet, {
                        method: "DELETE",
                        success: function (data, oResponse) {
                            me.setChangeStatus(false);
                            me._router.navTo("RouteStyles"); //return to styles screen
                            Common.closeLoadingDialog(me);
                            Common.showMessage(me._i18n.getText('t4'));
                        },
                        error: function () {
                            Common.closeLoadingDialog(me);
                            Common.showMessage(me._i18n.getText('t5'));
                        }
                    });
                }
            },

            //******************************************* */
            // General Attributes
            //******************************************* */

            getGeneralTable: function () {
                //Get general attributes data
                var oTable = this.getView().byId("generalTable");
                var oModel = this.getOwnerComponent().getModel();
                var oJSONModel = new JSONModel();
                var oTable = this.getView().byId("generalTable");

                Common.openLoadingDialog(that);

                var entitySet = "/StyleAttributesGeneralSet";
                oModel.setHeaders({
                    styleno: this._styleNo,
                    sbu: this._sbu
                });
                oModel.read(entitySet, {
                    success: function (oData, oResponse) {
                        oJSONModel.setData(oData);
                        oTable.setModel(oJSONModel, "DataModel");
                        oTable.setVisibleRowCount(oData.results.length); //updating visible rows
                        // oTable.onAttachPaste(); //for copy-paste
                        Common.closeLoadingDialog(that);
                    },
                    error: function () {
                        Common.closeLoadingDialog(that);
                    }
                })
            },

            setGeneralAttrEditMode: function () {
                //set general attributes table edit mode
                var oJSONModel = new JSONModel();
                var data = {};
                this._generalAttrChanged = false;
                data.editMode = true;
                oJSONModel.setData(data);
                this.getView().setModel(oJSONModel, "GenAttrEditModeModel");
            },

            cancelGeneralAttrEdit: function () {
                //cancel edit mode of general attributes
                if (this._generalAttrChanged) {
                    if (!this._DiscardGeneralAttrChangesDialog) {
                        this._DiscardGeneralAttrChangesDialog = sap.ui.xmlfragment("zui3derp.view.fragments.dialog.DiscardGeneralAttrChanges", this);
                        this.getView().addDependent(this._DiscardGeneralAttrChangesDialog);
                    }
                    jQuery.sap.syncStyleClass("sapUiSizeCompact", this.getView(), this._LoadingDialog);
                    this._DiscardGeneralAttrChangesDialog.addStyleClass("sapUiSizeCompact");
                    this._DiscardGeneralAttrChangesDialog.open();
                } else {
                    this.closeGeneralAttrEdit();
                }
            },

            closeGeneralAttrEdit: function () {
                //on confirm cancel, reselect general attributes from backend
                var oJSONModel = new JSONModel();
                var data = {};
                that._generalAttrChanged = false;
                that.setChangeStatus(false);
                data.editMode = false;
                oJSONModel.setData(data);
                that.getView().setModel(oJSONModel, "GenAttrEditModeModel");
                if (that._DiscardGeneralAttrChangesDialog) {
                    that._DiscardGeneralAttrChangesDialog.close();
                    that.getGeneralTable();
                }
                var oMsgStrip = that.getView().byId('GeneralAttrMessageStrip');
                oMsgStrip.setVisible(false);
            },

            onGeneralAttrChange: function () {
                this._generalAttrChanged = true;
                this.setChangeStatus(true);
            },

            onSaveGeneralTable: function () {
                //save general attributes table changes
                var me = this;
                var oModel = this.getOwnerComponent().getModel();
                var oTableModel = this.getView().byId("generalTable").getModel("DataModel");
                var path;

                //initialize message strip
                var oMsgStrip = this.getView().byId('GeneralAttrMessageStrip');
                oMsgStrip.setVisible(false);

                if (!this._generalAttrChanged) { //check if data is changed
                    Common.showMessage(this._i18n.getText('t7'));
                } else {
                    //get table data and build the payload
                    var oData = oTableModel.getData();
                    var oEntry = {
                        Styleno: this._styleNo,
                        Type: "GENERAL",
                        AttributesToItems: []
                    }
                    for (var i = 0; i < oData.results.length; i++) {
                        var item = {
                            "Styleno": this._styleNo,
                            "Attribtyp": oData.results[i].Attribtyp,
                            "Attribcd": oData.results[i].Attribcd,
                            "Baseind": false,
                            "Desc1": oData.results[i].Desc1,
                            "Valuetyp": "STRVAL",
                            "Attribval": oData.results[i].Attribval
                        };

                        oEntry.AttributesToItems.push(item);
                    };

                    Common.openLoadingDialog(that);

                    //call deep entity create method 
                    path = "/AttributesGeneralSet";
                    oModel.setHeaders({
                        sbu: this._sbu
                    });
                    oModel.create(path, oEntry, {
                        method: "POST",
                        success: function (oData, oResponse) {
                            Common.closeLoadingDialog(that);
                            me._generalAttrChanged = false;
                            me.setChangeStatus(false);
                            Common.showMessage(me._i18n.getText('t4'));
                            Utils.getProcessAttributes(me); //need to reload available attribute types for process tables
                        },
                        error: function (err) {
                            //show error messages
                            Common.closeLoadingDialog(that);
                            var errorMsg = JSON.parse(err.responseText).error.message.value;
                            oMsgStrip.setVisible(true);
                            oMsgStrip.setText(errorMsg);
                            Common.showMessage(me._i18n.getText('t5'));
                        }
                    });

                }
            },

            onDeleteGeneralAttr: function () {
                //confirmation to delete selected general attribute lines
                this.onDeleteTableItems('generalTable', 'ConfirmDeleteGeneralAttr', this._ConfirmDeleteGeneralAttr);
            },
            
            onConfirmDeleteGeneralAttr: function(oEvent) {
                //start of delete of selected lines
            	var me = this;
                var oModel = this.getOwnerComponent().getModel();

                //get selected lines to delete
                var oTable = this.getView().byId("generalTable");
                var oTableModel = oTable.getModel("DataModel");
                var oData = oTableModel.getData();
                var selected = oTable.getSelectedIndices();
                
                oModel.setUseBatch(true);
                oModel.setDeferredGroups(["group1"]);
                
                // this._ConfirmDeleteGeneralAttr.close();
                oEvent.getSource().getParent().close();
                
                if(selected.length > 0) {
                    //call delete method for each selected line
	                for (var i = 0; i < selected.length; i++) {
	                	
	                	var attrtype = oData.results[selected[i]].Attribtyp;
	                	var attrcd = oData.results[selected[i]].Attribcd;
	
		                var entitySet = "/StyleAttributesGeneralSet(Styleno='" + that._styleNo + "',Attribtyp='" + attrtype + "',Attribcd='" + attrcd + "')";
		
		                oModel.remove(entitySet, {
		                	groupId: "group1", 
    						changeSetId: "changeSetId1",
		                    method: "DELETE",
		                    success: function (data, oResponse) {
		                    },
		                    error: function () {
		                    }
		                });
		                
		                oModel.submitChanges({
						    groupId: "group1"
						});
						oModel.setRefreshAfterChange(true);
	                }
	                
                    //remove the deleted lines from the table
	                oData.results = oData.results.filter(function (value, index) {
                    	return selected.indexOf(index) == -1;
	                })
	                oTableModel.setData(oData);
	                oTable.clearSelection();
                }
            },

            //******************************************* */
            // Colors Attribute
            //******************************************* */

            getColorsTable: function () {
                //selection of color attributes table
                var oTable = this.getView().byId("colorsTable");
                var oModel = this.getOwnerComponent().getModel();
                var oJSONModel = new JSONModel();
                var oTable = this.getView().byId("colorsTable");

                Common.openLoadingDialog(that);

                var entitySet = "/StyleAttributesColorSet"
                oModel.setHeaders({
                    styleno: this._styleNo
                });
                oModel.read(entitySet, {
                    success: function (oData, oResponse) {
                        oJSONModel.setData(oData);
                        oTable.setModel(oJSONModel, "DataModel");
                        oTable.setVisibleRowCount(oData.results.length); //updating visible rows
                        // oTable.attachPaste(); //for copy-paste
                        Common.closeLoadingDialog(that);
                    },
                    error: function () {
                        Common.closeLoadingDialog(that);
                    }
                })
            },

            setColorEditMode: function () {
                //set colors table editable
                var oJSONModel = new JSONModel();
                var data = {};
                this._colorChanged = false;
                data.editMode = true;
                oJSONModel.setData(data);
                this.getView().setModel(oJSONModel, "ColorEditModeModel");
            },

            cancelColorsEdit: function () {
                //cancel edit of colors table
                if (this._colorChanged) {
                    if (!this._DiscardColorsChangesDialog) {
                        this._DiscardColorsChangesDialog = sap.ui.xmlfragment("zui3derp.view.fragments.dialog.DiscardColorsChanges", this);
                        this.getView().addDependent(this._DiscardColorsChangesDialog);
                    }
                    jQuery.sap.syncStyleClass("sapUiSizeCompact", this.getView(), this._LoadingDialog);
                    this._DiscardColorsChangesDialog.addStyleClass("sapUiSizeCompact");
                    this._DiscardColorsChangesDialog.open();
                } else {
                    this.closeColorsEdit();
                }
            },

            closeColorsEdit: function () {
                //edit cancelled, reselect backend data, close edit mode
                var oJSONModel = new JSONModel();
                var data = {};
                that._colorChanged = false;
                that.setChangeStatus(false);
                data.editMode = false;
                oJSONModel.setData(data);
                that.getView().setModel(oJSONModel, "ColorEditModeModel");
                if (that._DiscardColorsChangesDialog) {
                    that._DiscardColorsChangesDialog.close();
                    that.getColorsTable();
                }
                var oMsgStrip = that.getView().byId('ColorsMessageStrip');
                oMsgStrip.setVisible(false);
            },

            onColorChange: function () {
                //set colors table edit flag
                this._colorChanged = true;
                this.setChangeStatus(true);
            },

            onSaveColorTable: function () {
                //save changes to colors table
                var me = this;
                var oModel = this.getOwnerComponent().getModel();
                var oTableModel = this.getView().byId("colorsTable").getModel("DataModel");
                var path;
                var oData = oTableModel.getData();

                //initialize message strip
                var oMsgStrip = this.getView().byId('ColorsMessageStrip');
                oMsgStrip.setVisible(false);

                if (!this._colorChanged) { //check if there are changes to colors table
                    Common.showMessage(this._i18n.getText('t7'));
                } else {

                    //build the headers and payload
                    var oEntry = {
                        Styleno: this._styleNo,
                        Type: "COLOR",
                        AttributesToItems: []
                    }

                    for (var i = 0; i < oData.results.length; i++) {
                        var item = {
                            "Styleno": this._styleNo,
                            "Attribtyp": "COLOR",
                            "Attribcd": oData.results[i].Attribcd,
                            "Baseind": false,
                            "Desc1": oData.results[i].Desc1,
                            "Valuetyp": "STRVAL"
                        };
                        oEntry.AttributesToItems.push(item);
                    };
                    Common.openLoadingDialog(that);

                    //call the create deep of general attributes
                    path = "/AttributesGeneralSet";
                    oModel.setHeaders({
                        sbu: this._sbu
                    });
                    oModel.create(path, oEntry, {
                        method: "POST",
                        success: function (oData, oResponse) {
                            Common.closeLoadingDialog(me);
                            me._colorChanged = false;
                            me.setChangeStatus(false);
                            Common.showMessage(me._i18n.getText('t4'));
                            Utils.getProcessAttributes(me);
                        },
                        error: function (err) {
                            Common.closeLoadingDialog(me);
                            Common.showMessage(me._i18n.getText('t5'));
                            var errorMsg = JSON.parse(err.responseText).error.message.value;
                            oMsgStrip.setVisible(true);
                            oMsgStrip.setText(errorMsg);
                        }
                    });

                }
            },

            onDeleteColor: function () {
                //get selected lines to delete
                this.onDeleteTableItems('colorsTable', 'ConfirmDeleteColor', this._ConfirmDeleteColor);
            },
            
            onConfirmDeleteColor: function(oEvent) {
                //confirm delete selected colors

                //get selected lines to delete
                var oModel = this.getOwnerComponent().getModel();
                var oTable = this.getView().byId("colorsTable");
                var oTableModel = oTable.getModel("DataModel");
                var oData = oTableModel.getData();
                var selected = oTable.getSelectedIndices();
                
                oModel.setUseBatch(true);
                oModel.setDeferredGroups(["group1"]);
                
                oEvent.getSource().getParent().close();
                // this._ConfirmDeleteColor.close();
                
                if(selected.length > 0) {
                    //call delete method for each selected lines
	                for (var i = 0; i < selected.length; i++) {
	                	
	                	var attrtype = "COLOR";
	                	var attrcd = oData.results[selected[i]].Attribcd;
	
		                var entitySet = "/StyleAttributesColorSet(Styleno='" + that._styleNo + "',Attribtype='" + attrtype + "',Attribcd='" + attrcd + "')";
		
		                oModel.remove(entitySet, {
		                	groupId: "group1", 
    						changeSetId: "changeSetId1",
		                    method: "DELETE",
		                    success: function (data, oResponse) {
		                    },
		                    error: function () {
		                    }
		                });
		                oModel.submitChanges({
						    groupId: "group1"
						});
						oModel.setRefreshAfterChange(true);
	                }

	                //remove deleted lines from the table
	                oData.results = oData.results.filter(function (value, index) {
                    	return selected.indexOf(index) == -1;
	                })
	                oTableModel.setData(oData);
	                oTable.clearSelection();
                }
            },

            //******************************************* */
            // Sizes Attribute
            //******************************************* */

            getSizesTable: function () {
                //select size attributes
                var oTable = this.getView().byId("sizesTable");
                var oModel = this.getOwnerComponent().getModel();
                var oJSONModel = new JSONModel();
                var oTable = this.getView().byId("sizesTable");
                var oSizeGrp = "G235";

                Common.openLoadingDialog(that);

                var entitySet = "/StyleAttributesSizeSet"
                oModel.setHeaders({
                    styleno: this._styleNo,
                    attribgrp: oSizeGrp
                });
                oModel.read(entitySet, {
                    success: function (oData, oResponse) {
                        oJSONModel.setData(oData);
                        oTable.setModel(oJSONModel, "DataModel");
                        Common.closeLoadingDialog(that);
                    },
                    error: function () {
                        Common.closeLoadingDialog(that);
                    }
                })
            },

            setSizeEditMode: function () {
                //set size table editable
                var oJSONModel = new JSONModel();
                var data = {};
                this._sizeChanged = false;
                data.editMode = true;
                oJSONModel.setData(data);
                this.getView().setModel(oJSONModel, "SizeEditModeModel");
            },

            cancelSizeEdit: function () {
                //confirm size edit cancel
                if (this._sizeChanged) {
                    if (!this._DiscardSizesChangesDialog) {
                        this._DiscardSizesChangesDialog = sap.ui.xmlfragment("zui3derp.view.fragments.dialog.DiscardSizesChanges", this);
                        this.getView().addDependent(this._DiscardSizesChangesDialog);
                    }
                    jQuery.sap.syncStyleClass("sapUiSizeCompact", this.getView(), this._LoadingDialog);
                    this._DiscardSizesChangesDialog.addStyleClass("sapUiSizeCompact");
                    this._DiscardSizesChangesDialog.open();
                } else {
                    this.closeSizeEdit();
                }
            },

            closeSizeEdit: function () {
                //editing cancelled, reselect sizes from backend, close table edit mode
                var oJSONModel = new JSONModel();
                var data = {};
                that._sizeChanged = false;
                that.setChangeStatus(false);
                data.editMode = false;
                oJSONModel.setData(data);
                that.getView().setModel(oJSONModel, "SizeEditModeModel");
                if (that._DiscardSizesChangesDialog) {
                    that._DiscardSizesChangesDialog.close();
                    that.getSizesTable();
                }
                var oMsgStrip = that.getView().byId('SizesMessageStrip');
                oMsgStrip.setVisible(false);
            },

            onSizeChange: function () {
                //set size attributes change flag
                this._sizeChanged = true;
                this.setChangeStatus(true);
            },

            onSaveSizeTable: function () {
                //save changes of size table
                var me = this;
                var oModel = this.getOwnerComponent().getModel();
                var oTableModel = this.getView().byId("sizesTable").getModel("DataModel");
                var path;
                var lv_baseindctr = 0;

                //initiliaze message strip
                var oMsgStrip = this.getView().byId('SizesMessageStrip');
                oMsgStrip.setVisible(false);

                if (!this._sizeChanged) { //check if there are changes 
                    Common.showMessage(this._i18n.getText('t7'));
                } else {
                    //build header and payload
                    var oData = oTableModel.getData();
                    var oEntry = {
                        Styleno: this._styleNo,
                        Type: "SIZE",
                        AttributesToItems: []
                    }                    
                    for (var i = 0; i < oData.results.length; i++) {
                        if (oData.results[i].Baseind === true) { //for checking if multiple base ind selected
                            lv_baseindctr++;
                        }
                        var item = {
                            "Styleno": this._styleNo,
                            "Attribtyp": "SIZE",
                            "Attribcd": oData.results[i].Attribcd,
                            "Attribgrp": oData.results[i].Attribgrp,
                            "Baseind": oData.results[i].Baseind,
                            "Desc1": oData.results[i].Desc1,
                            "Valuetyp": "STRVAL"
                        };
                        oEntry.AttributesToItems.push(item);
                    };

                    if (lv_baseindctr > 1) { //do not allow multiple base indicator
                        Common.showMessage(this._i18n.getText('t9'));
                    } else {
                        Common.openLoadingDialog(that);
                        //call create deep method of size attirbutes
                        path = "/AttributesGeneralSet";
                        oModel.setHeaders({
                            sbu: this._sbu
                        });
                        oModel.create(path, oEntry, {
                            method: "POST",
                            success: function (oData, oResponse) {
                                me._sizeChanged = false;
                                me.setChangeStatus(false);
                                Common.closeLoadingDialog(me);
                                Common.showMessage(me._i18n.getText('t4'));
                                Utils.getProcessAttributes(me);
                            },
                            error: function (err) {
                                Common.closeLoadingDialog(me);
                                Common.showMessage(me._i18n.getText('t5'));
                                var errorMsg = JSON.parse(err.responseText).error.message.value;
                                oMsgStrip.setVisible(true);
                                oMsgStrip.setText(errorMsg);
                            }
                        });
                    }
                }
            },

            //******************************************* */
            // Process Attributes
            //******************************************* */

            getProcessesTable: function () {
                //get processes data
                var oTable = this.getView().byId("processesTable");
                var oModel = this.getOwnerComponent().getModel();
                var oJSONModel = new JSONModel();
                var oTable = this.getView().byId("processesTable");

                Common.openLoadingDialog(that);

                var entitySet = "/StyleAttributesProcessSet"
                oModel.setHeaders({
                    styleno: this._styleNo,
                    sbu: this._sbu
                });
                oModel.read(entitySet, {
                    success: function (oData, oResponse) {
                        oJSONModel.setData(oData);
                        oTable.setModel(oJSONModel, "DataModel");
                        oTable.setVisibleRowCount(oData.results.length);
                        // oTable.attachPaste();
                        Common.closeLoadingDialog(that);
                    },
                    error: function () {
                        Common.closeLoadingDialog(that);
                    }
                })
            },

            setProcessEditMode: function () {
                //set edit mode processes table
                var oJSONModel = new JSONModel();
                var data = {};
                this._processChanged = false;
                data.editMode = true;
                oJSONModel.setData(data);
                this.getView().setModel(oJSONModel, "ProcessEditModeModel");
            },

            cancelProcessEdit: function () {
                //confirm cancel editing of process table
                if (this._processChanged) {
                    if (!this._DiscardProcessChangesDialog) {
                        this._DiscardProcessChangesDialog = sap.ui.xmlfragment("zui3derp.view.fragments.dialog.DiscardProcessChanges", this);
                        this.getView().addDependent(this._DiscardProcessChangesDialog);
                    }
                    jQuery.sap.syncStyleClass("sapUiSizeCompact", this.getView(), this._LoadingDialog);
                    this._DiscardProcessChangesDialog.addStyleClass("sapUiSizeCompact");
                    this._DiscardProcessChangesDialog.open();
                } else {
                    this.closeProcessEdit();
                }
            },

            closeProcessEdit: function () {
                //editing process tbale cancelled, reselect backend data, close edit mode
                var oJSONModel = new JSONModel();
                var data = {};
                that._processChanged = false;
                that.setChangeStatus(false);
                data.editMode = false;
                oJSONModel.setData(data);
                that.getView().setModel(oJSONModel, "ProcessEditModeModel");
                if (that._DiscardProcessChangesDialog) {
                    that._DiscardProcessChangesDialog.close();
                    that.getProcessesTable();
                }
                var oMsgStrip = that.getView().byId('ProcessesMessageStrip');
                oMsgStrip.setVisible(false);
            },

            onProcessChange: function () {
                this._processChanged = true;
                this.setChangeStatus(true);
            },

            onSaveProcessTable: function () {
                //save process table
                var me = this;
                var oModel = this.getOwnerComponent().getModel();
                var oTableModel = this.getView().byId("processesTable").getModel("DataModel");
                var path;

                //initialize message strip
                var oMsgStrip = this.getView().byId('ProcessesMessageStrip');
                oMsgStrip.setVisible(false);

                if (!this._processChanged) { //check changed data
                    Common.showMessage(this._i18n.getText('t7'));
                } else {
                    //build header and payload
                    var oData = oTableModel.getData();
                    var oEntry = {
                        Styleno: this._styleNo,
                        ProcessToItems: []
                    }

                    for (var i = 0; i < oData.results.length; i++) {
                        var item = {
                            "Styleno": this._styleNo,
                            "Seqno": oData.results[i].Seqno,
                            "Processcd": oData.results[i].Processcd,
                            "Leadtime": oData.results[i].Leadtime,
                            "Attribtyp": oData.results[i].Attribtyp,
                            "Attribcd": oData.results[i].Attribcd,
                            "Vastyp": oData.results[i].Vastyp
                        }
                        oEntry.ProcessToItems.push(item);
                    };
                    //call create deep method of process attributes
                    Common.openLoadingDialog(that);
                    path = "/AttributesProcessSet";
                    oModel.setHeaders({
                        sbu: this._sbu
                    });
                    oModel.create(path, oEntry, {
                        method: "POST",
                        success: function (oData, oResponse) {
                            Common.closeLoadingDialog(me);
                            me._processChanged = false;
                            me.setChangeStatus(false);
                            Common.showMessage(me._i18n.getText('t4'));
                        },
                        error: function (err) {
                            Common.closeLoadingDialog(me);
                            Common.showMessage(me._i18n.getText('t5'));
                            var errorMsg = JSON.parse(err.responseText).error.message.value;
                            oMsgStrip.setVisible(true);
                            oMsgStrip.setText(errorMsg);
                        }
                    });
                }
            },

            onDeleteProcess: function () {
                //confirm delete selected process items
                this.onDeleteTableItems('processesTable', 'ConfirmDeleteProcess', this._ConfirmDeleteProcess);
            },
            
            onConfirmDeleteProcess: function(oEvent) {
                //start delete process of selected items
            	//get selected items to delete
                var oModel = this.getOwnerComponent().getModel();
                var oTable = this.getView().byId("processesTable");
                var oTableModel = oTable.getModel("DataModel");
                var oData = oTableModel.getData();
                var selected = oTable.getSelectedIndices();
                
                oModel.setUseBatch(true);
                oModel.setDeferredGroups(["group1"]);
                
                // this._ConfirmDeleteProcess.close();
                oEvent.getSource().getParent().close();
                
                if(selected.length > 0) { 
                    //call delete method for each selected item
                    for (var i = 0; i < selected.length; i++) {
	                	var seqno = oData.results[selected[i]].Seqno;
	                	seqno = this.pad(seqno, 3);
	
		                var entitySet = "/StyleAttributesProcessSet(Styleno='" + that._styleNo + "',Seqno='" + seqno + "')";
		                oModel.remove(entitySet, {
		                	groupId: "group1", 
    						changeSetId: "changeSetId1",
		                    method: "DELETE",
		                    success: function (data, oResponse) {
		                    },
		                    error: function () {
		                    }
		                });
		                
		                oModel.submitChanges({
						    groupId: "group1"
						});
						oModel.setRefreshAfterChange(true);
	                }
	                
	                oData.results = oData.results.filter(function (value, index) {
                    	return selected.indexOf(index) == -1;
	                })
	
	                oTableModel.setData(oData);
	                oTable.clearSelection();
                }
            },

            //******************************************* */
            // Style Versions
            //******************************************* */

            getVersionsTable: function () {
                //get versions data of style
                var oTable = this.getView().byId("versionsTable");
                var oModel = this.getOwnerComponent().getModel();
                var oJSONModel = new JSONModel();

                Common.openLoadingDialog(that);

                var entitySet = "/StyleVersionSet"
                oModel.setHeaders({
                    styleno: this._styleNo
                });
                oModel.read(entitySet, {
                    success: function (oData, oResponse) {
                        oJSONModel.setData(oData);
                        oTable.setModel(oJSONModel, "DataModel");
                        oTable.setVisibleRowCount(oData.results.length);
                        // oTable.attachPaste();
                        Common.closeLoadingDialog(that);
                    },
                    error: function () {
                        Common.closeLoadingDialog(that);
                    }
                })
            },

            onSelectVersion: function (oEvent) {
                //selecting version to view
                var oData = oEvent.getSource().getParent().getBindingContext('DataModel');
                var version = oData.getProperty('Verno');
                that._router.navTo("RouteVersion", {
                    styleno: that._styleNo,
                    sbu: that._sbu,
                    version: version
                });
            },

            onCreateNewVersion: function () {
                //open create new version dialog
                if (!that._NewVerionDialog) {
                    that._NewVerionDialog = sap.ui.xmlfragment("zui3derp.view.fragments.CreateNewVersion", that);
                    that.getView().addDependent(that._NewVerionDialog);
                }
                jQuery.sap.syncStyleClass("sapUiSizeCompact", that.getView(), that._LoadingDialog);
                that._NewVerionDialog.addStyleClass("sapUiSizeCompact");
                that._NewVerionDialog.open();
            },

            onSaveNewVersion: function () {
                //save info of new versions
                var oModel = this.getOwnerComponent().getModel();
                var me = this;
                var path;

                //get data from new version dialog
                var oDesc1 = sap.ui.getCore().byId("newVersionDesc1").getValue();
                var oDesc2 = sap.ui.getCore().byId("newVersionDesc2").getValue();
                var oCurrent = sap.ui.getCore().byId("newVersionCurrent").getSelected();

                Common.openLoadingDialog(that);

                //build header and payload
                path = "/StyleVersionSet";                
                var oEntry = {
                    "Styleno": this._styleNo,
                    "Verno": "",
                    "Desc1": oDesc1,
                    "Desc2": oDesc2,
                    "Currentver": oCurrent
                };
                oModel.setHeaders({
                    sbu: this._sbu
                });
                //call create method of style version
                oModel.create(path, oEntry, {
                    method: "POST",
                    success: function (oData, oResponse) {
                        me.getVersionsTable();
                        me._NewVerionDialog.close();
                        Common.closeLoadingDialog(that);
                        Common.showMessage(me._i18n.getText('t4'));
                    },
                    error: function (err) {
                        Common.closeLoadingDialog(that);
                        Common.showMessage(me._i18n.getText('t5'));
                    }
                });
            },

            setVersionEditMode: function () {
                //set edit mode of versions table
                var oJSONModel = new JSONModel();
                var data = {};
                this._versionChanged = false;
                data.editMode = true;
                oJSONModel.setData(data);
                this.getView().setModel(oJSONModel, "VersionEditModeModel");
            },

            cancelVersionEdit: function () {
                //confirm cancel of edit versions
                if (this._versionChanged) {
                    if (!this._DiscardVersionChangesDialog) {
                        this._DiscardVersionChangesDialog = sap.ui.xmlfragment("zui3derp.view.fragments.dialog.DiscardVersionChanges", this);
                        this.getView().addDependent(this._DiscardVersionChangesDialog);
                    }
                    jQuery.sap.syncStyleClass("sapUiSizeCompact", this.getView(), this._LoadingDialog);
                    this._DiscardVersionChangesDialog.addStyleClass("sapUiSizeCompact");
                    this._DiscardVersionChangesDialog.open();
                } else {
                    this.closeVersionEdit();
                }
            },

            closeVersionEdit: function () {
                //cancel edit mode, reselect versions data
                var oJSONModel = new JSONModel();
                var data = {};
                that._versionChanged = false;
                that.setChangeStatus(false);
                data.editMode = false;
                oJSONModel.setData(data);
                that.getView().setModel(oJSONModel, "VersionEditModeModel");
                if (that._DiscardVersionChangesDialog) {
                    that._DiscardVersionChangesDialog.close();
                    that.getVersionsTable();
                }
                var oMsgStrip = that.getView().byId('VersionsMessageStrip');
                oMsgStrip.setVisible(false);
            },

            onVersionChange: function () {
                //versions change flag
                this._versionChanged = true;
                this.setChangeStatus(true);
            },

            onSaveVersions: function () {
                //save changes to versions table
                var me = this;
                var oModel = this.getOwnerComponent().getModel();
                var oTableModel = this.getView().byId("versionsTable").getModel("DataModel");
                var path;

                //initialize message strip
                var oMsgStrip = this.getView().byId('VersionsMessageStrip');
                oMsgStrip.setVisible(false);

                if (!this._versionChanged) { //check if there changes
                    Common.showMessage(this._i18n.getText('t7'));
                } else {
                    Common.openLoadingDialog(that);

                    //build header and payload
                    var oData = oTableModel.getData();
                    var oEntry = {
                        Styleno: this._styleNo,
                        VerToItems: []
                    }                    
                    for (var i = 0; i < oData.results.length; i++) {
                        var verno = this.pad(oData.results[i].Verno);
                        var item = {
                            "Styleno": this._styleNo,
                            "Currentver": oData.results[i].Currentver,
                            "Verno": verno,
                            "Desc1": oData.results[i].Desc1,
                            "Desc2": oData.results[i].Desc2
                        }
                        oEntry.VerToItems.push(item);
                    };
                    path = "/VersionSet";
                    oModel.setHeaders({
                        sbu: this._sbu
                    });
                    //call create deep method of style versions
                    oModel.create(path, oEntry, {
                        method: "POST",
                        success: function (oData, oResponse) {
                            me.getVersionsTable();
                            Common.closeLoadingDialog(that);
                            me._versionChanged = false;
                            me.setChangeStatus(false);
                            Common.showMessage(me._i18n.getText('t4'));
                        },
                        error: function (err) {
                            Common.closeLoadingDialog(that);
                            Common.showMessage(me._i18n.getText('t5'));
                            var errorMsg = JSON.parse(err.responseText).error.message.value;
                            oMsgStrip.setVisible(true);
                            oMsgStrip.setText(errorMsg);
                        }
                    });
                }
            },

            setVersionCurrent: function (oEvent) {
                //clicking the set version as current during edit mode
                var me = this;
                var oData = oEvent.getSource().getParent().getBindingContext('DataModel');
                var version = oData.getProperty('Verno');
                version = this.pad(version, 3);
                var oModel = this.getOwnerComponent().getModel();

                Common.openLoadingDialog(that);

                //set header and payload
                var entitySet = "/StyleVersionSet(Styleno='" + this._styleNo + "',Verno='" + version + "')";
                var oEntry = {
                    Styleno: this._styleNo,
                    Verno: version
                };
                oModel.setHeaders({
                    sbu: this._sbu
                });
                //call the update method of style version
                oModel.update(entitySet, oEntry, {
                    method: "PUT",
                    success: function (data, oResponse) {
                        me.getHeaderData();
                        me.getVersionsTable();
                        Common.closeLoadingDialog(that);
                        Common.showMessage(me._i18n.getText('t4'));
                    },
                    error: function () {
                        Common.closeLoadingDialog(that);
                        Common.showMessage(me._i18n.getText('t5'));
                    }
                });
            },

            onDeleteVersion: function () {
                //confirm delete of selected version items
                this.onDeleteTableItems('versionsTable', 'ConfirmDeleteVersion', this._ConfirmDeleteVersionDialog);
            },
            
            onConfirmDeleteVersion: function(oEvent) {
                //confirm deletion of version
                var oModel = this.getOwnerComponent().getModel();

                //get selected items to delete
                var oTable = this.getView().byId("versionsTable");
                var oTableModel = oTable.getModel("DataModel");
                var oData = oTableModel.getData();
                var selected = oTable.getSelectedIndices();
                
                oModel.setUseBatch(true);
                oModel.setDeferredGroups(["group1"]);
                
				// this._ConfirmDeleteVersionDialog.close();
                oEvent.getSource().getParent().close();
                
                if(selected.length > 0) {
                    //call delete method for each item selected
	                for (var i = 0; i < selected.length; i++) {
	                	var verno = oData.results[selected[i]].Verno;
	                	verno = this.pad(verno, 3);
	
		                var entitySet = "/StyleVersionSet(Styleno='" + that._styleNo + "',Verno='" + verno + "')";
		                oModel.remove(entitySet, {
		                	groupId: "group1", 
    						changeSetId: "changeSetId1",
		                    method: "DELETE",
		                    success: function (data, oResponse) { },
		                    error: function () { }
		                });
		                
		                oModel.submitChanges({
						    groupId: "group1"
						});
						oModel.setRefreshAfterChange(true);
	                }
	                
	                oData.results = oData.results.filter(function (value, index) {
                    	return selected.indexOf(index) == -1;
	                })
	
	                oTableModel.setData(oData);
	                oTable.clearSelection();
                }
            },

            //******************************************* */
            // Attachments
            //******************************************* */

            appendUploadCollection: function () {
                //set properties and adding the attachments component to the screen
                var oUploadCollection = this.getView().byId('UploadCollection');
                oUploadCollection.attachChange(that.onFileSelected);
                oUploadCollection.setMode(sap.m.ListMode.SingleSelectLeft);
                oUploadCollection.attachBeforeUploadStarts(that.onBeforeUploadStarts);
                oUploadCollection.setMultiple(true);
                //set the odata path of the upload collection
                oUploadCollection.setUploadUrl("/sap/opu/odata/sap/ZGW_3DERP_FILES_SRV/FileSet");
                //attach function when an upload is completed
                oUploadCollection.attachUploadComplete(that.onUploadComplete);
            },

            bindUploadCollection: function () {
                var oUploadCollection = this.getView().byId('UploadCollection');
                //setting the properties of the upload collection and binding
                oUploadCollection.bindItems({
                    path: 'FileModel>/FileSet',
                    filters: [
                        new sap.ui.model.Filter("Styleno", sap.ui.model.FilterOperator.EQ, that._styleNo)
                    ],
                    template: new sap.m.UploadCollectionItem({
                        documentId: "{FileModel>ID}",
                        fileName: "{FileModel>FileName}",
                        url: "/sap/opu/odata/sap/ZGW_3DERP_FILES_SRV/FileSet(guid'{FileModel>ID}')/$value",
                        mimeType: "{FileModel>MIMEType}",
                        enableEdit: false,
                        enableDelete: false,
                        visibleDelete: false,
                        visibleEdit: false,
                        attributes: [
                            new sap.m.ObjectAttribute({ text: "{path: 'FileModel>Date', type: 'sap.ui.model.type.Date', formatOptions: { pattern: 'yyyy/MM/dd' }}" }),
                            new sap.m.ObjectAttribute({ text: "{FileModel>Desc1}" }),
                            new sap.m.ObjectAttribute({ text: "{FileModel>Desc2}" }),
                            new sap.m.ObjectAttribute({ text: "{FileModel>Remarks}" })
                        ]
                    })
                });
            },

            setFilesEditMode: function() {
                //set edit mode to the upload collection
                var oJSONModel = new JSONModel();
                var data = {};
                data.editMode = true;
                oJSONModel.setData(data);
                this.getView().setModel(oJSONModel, "FilesEditModeModel");

                var oUploadCollection = this.getView().byId('UploadCollection');
                oUploadCollection.setUploadButtonInvisible(false);
                oUploadCollection.setMode(sap.m.ListMode.SingleSelectLeft);
            },

            cancelFilesEdit: function() {
                var oJSONModel = new JSONModel();
                var data = {};
                data.editMode = false;
                oJSONModel.setData(data);
                this.getView().setModel(oJSONModel, "FilesEditModeModel");
                //make upload button visible
                var oUploadCollection = this.getView().byId('UploadCollection');
                oUploadCollection.setUploadButtonInvisible(true);
                oUploadCollection.setMode(sap.m.ListMode.None);
            },

            onAddFile: function() {
                //open the file select dialog
                var oUploadCollection = this.getView().byId('UploadCollection');
                oUploadCollection.openFileDialog();
            },

            onFileSelected: function() {
                //triggered when file selected
                that.uploadFile();
            },

            uploadFile: function () {
                //open the new file dialog
                if (!this._UploadFileDialog) {
                    this._UploadFileDialog = sap.ui.xmlfragment("zui3derp.view.fragments.UploadFile", this);
                    this.getView().addDependent(this._UploadFileDialog);
                }
                jQuery.sap.syncStyleClass("sapUiSizeCompact", this.getView(), this._LoadingDialog);
                this._UploadFileDialog.addStyleClass("sapUiSizeCompact");
                this._UploadFileDialog.open();
            },

            onStartUploadFile: function () {
                //on confirm of upload dialog, start upload of file
                this._UploadFileDialog.close();
                var oUploadCollection = this.getView().byId('UploadCollection');
                var cFiles = oUploadCollection.getItems().length;
                if (cFiles > 0) {
                    oUploadCollection.upload();
                }
            },

            onBeforeUploadStarts: function (oEvent) {
                //setting the HTTP headers for additional information

                //SBU
                var oStylenoParam = new sap.m.UploadCollectionParameter({
                    name: "sbu",
                    value: that._sbu
                });
                oEvent.getParameters().addHeaderParameter(oStylenoParam);

                //style no
                var oStylenoParam = new sap.m.UploadCollectionParameter({
                    name: "styleno",
                    value: that._styleNo
                });
                oEvent.getParameters().addHeaderParameter(oStylenoParam);

                //file description 1
                var fileDesc1 = sap.ui.getCore().byId("FileDesc1");
                var oFileDesc1Param = new sap.m.UploadCollectionParameter({
                    name: "desc1",
                    value: fileDesc1.getValue()
                });
                oEvent.getParameters().addHeaderParameter(oFileDesc1Param);
                fileDesc1.setValue('');

                //file description 2
                var fileDesc2 = sap.ui.getCore().byId("FileDesc2");
                var oFileDesc2Param = new sap.m.UploadCollectionParameter({
                    name: "desc2",
                    value: fileDesc2.getValue()
                });
                oEvent.getParameters().addHeaderParameter(oFileDesc2Param);
                fileDesc2.setValue('');

                //remarks
                var fileRemarks = sap.ui.getCore().byId("FileRemarks");
                var oFileRemarksParam = new sap.m.UploadCollectionParameter({
                    name: "remarks",
                    value: fileRemarks.getValue()
                });
                oEvent.getParameters().addHeaderParameter(oFileRemarksParam);
                fileRemarks.setValue('');

                //filename selected
                var oCustomerHeaderSlug = new sap.m.UploadCollectionParameter({
                    name: "slug",
                    value: oEvent.getParameter("fileName")
                });
                oEvent.getParameters().addHeaderParameter(oCustomerHeaderSlug);

                var oModel = that.getView().getModel("FileModel");
                oModel.refreshSecurityToken();

                //add the HTTP headers
                var oHeaders = oModel.oHeaders;
                var sToken = oHeaders['x-csrf-token'];

                var oCustomerHeaderToken = new sap.m.UploadCollectionParameter({
                    name: "x-csrf-token",
                    value: sToken
                });
                oEvent.getParameters().addHeaderParameter(oCustomerHeaderToken);
            },

            onUploadComplete: function () {
                //on upload complete refresh the list
                that.getView().getModel("FileModel").refresh();
                var oUploadCollection = that.getView().byId('UploadCollection');
                oUploadCollection.removeAllItems();
            },

            onDeleteFile: function () {
                //confirm delete selected file dialog
                var oUploadCollection = this.getView().byId('UploadCollection');
                var selected = oUploadCollection.getSelectedItems();

                if(selected.length > 0) {
                    if (!this._ConfirmDeleteFileDialog) {
                        this._ConfirmDeleteFileDialog = sap.ui.xmlfragment("zui3derp.view.fragments.dialog.ConfirmDeleteFile", this);
                        this.getView().addDependent(this._ConfirmDeleteFileDialog);
                    }
                    jQuery.sap.syncStyleClass("sapUiSizeCompact", this.getView(), this._LoadingDialog);
                    this._ConfirmDeleteFileDialog.addStyleClass("sapUiSizeCompact");
                    this._ConfirmDeleteFileDialog.open();
                } else {
                    Common.showMessage(this._i18n.getText('t10'));
                }
            },

            onConfirmDeleteFile: function() {
                //delete selected file, call delete method of file odata service
                that._ConfirmDeleteFileDialog.close();
                var oUploadCollection = this.getView().byId('UploadCollection');
                var sPath = oUploadCollection.getSelectedItems()[0].getBindingContext('FileModel').sPath;
                var oModel = that.getView().getModel("FileModel");
                oModel.remove(sPath, {
                    success: function (oData, oResponse) {
                        that.getView().getModel("FileModel").refresh();
                    },
                    error: function (err) {
                    }
                });
            },

            onCancelUploadFile: function() {
                //close edit mode, refresh the file list
                that._UploadFileDialog.close();
                var oUploadCollection = this.getView().byId('UploadCollection');
                that.getView().getModel("FileModel").refresh();
                oUploadCollection.removeAllItems();
            },

            // cancelEdit(ochangeIndicator, oFunction) {
            //     if (ochangeIndicator === true) {
            //         if (!this._ConfirmDiscardChangesDialog) {
            //             this._ConfirmDiscardChangesDialog = sap.ui.xmlfragment("zui3derp.view.fragments.ConfirmDiscardChanges", this);
            //             this.getView().addDependent(this._ConfirmDiscardChangesDialog);
            //         }
            //         jQuery.sap.syncStyleClass("sapUiSizeCompact", this.getView(), this._LoadingDialog);
            //         this._ConfirmDiscardChangesDialog.addStyleClass("sapUiSizeCompact");
            //         this._ConfirmDiscardChangesDialog.open();
            //         var oConfirmButton = sap.ui.getCore().byId('ConfirmDiscardButton');
            //         oConfirmButton.attachPress(oFunction);
            //     } else {
            //         oFunction();
            //     }
            // },

            //******************************************* */
            // Search Helps
            //******************************************* */

            onSeasonsValueHelp: function (oEvent) {
                //open seaons value help
                var sInputValue = oEvent.getSource().getValue();
                this.inputId = oEvent.getSource().getId(); //get input field id
                if (!this._seasonsHelpDialog) {
                    this._seasonsHelpDialog = sap.ui.xmlfragment("zui3derp.view.fragments.searchhelps.Seasons", this);
                    this._seasonsHelpDialog.attachSearch(this._seasonsGroupValueHelpSearch);                    
                    this.getView().addDependent(this._seasonsHelpDialog);
                }
                this._seasonsHelpDialog.open(sInputValue);
            },

            _seasonsGroupValueHelpSearch: function (evt) {
                //search seasons
                var sValue = evt.getParameter("value");
                var andFilter = [], orFilter = [];
                orFilter.push(new sap.ui.model.Filter("Seasoncd", sap.ui.model.FilterOperator.Contains, sValue));
                orFilter.push(new sap.ui.model.Filter("Desc1", sap.ui.model.FilterOperator.Contains, sValue));
                andFilter.push(new sap.ui.model.Filter(orFilter, false));
                evt.getSource().getBinding("items").filter(new sap.ui.model.Filter(andFilter, true));
            },

            _seasonsGroupValueHelpClose: function (evt) {
                //on select season
                var oSelectedItem = evt.getParameter("selectedItem");
                if (oSelectedItem) {
                    var input = this.byId(this.inputId);
                    input.setValue(oSelectedItem.getTitle()); //set input field selected value
                    this.onHeaderChange();
                }
                evt.getSource().getBinding("items").filter([]);
            },

            onStyleCatValueHelp: function (oEvent) {
                //open style category value help
                var sInputValue = oEvent.getSource().getValue();
                this.inputId = oEvent.getSource().getId(); //get input field id
                if (!this._styleCatHelpDialog) {
                    this._styleCatHelpDialog = sap.ui.xmlfragment("zui3derp.view.fragments.searchhelps.StyleCat", this);
                    this.getView().addDependent(this._styleCatHelpDialog);
                }
                this._styleCatHelpDialog.open(sInputValue);
            },

            _styleCatValueHelpSearch: function (evt) {
                //search style categories
                var sValue = evt.getParameter("value");
                var andFilter = [], orFilter = [];
                orFilter.push(new sap.ui.model.Filter("Stylcat", sap.ui.model.FilterOperator.Contains, sValue));
                orFilter.push(new sap.ui.model.Filter("Desc1", sap.ui.model.FilterOperator.Contains, sValue));
                andFilter.push(new sap.ui.model.Filter(orFilter, false));
                evt.getSource().getBinding("items").filter(new sap.ui.model.Filter(andFilter, true));
            },

            _styleCatValueHelpClose: function (evt) {
                //on select style category
                var oSelectedItem = evt.getParameter("selectedItem");
                if (oSelectedItem) {
                    var input = this.byId(this.inputId);
                    input.setValue(oSelectedItem.getTitle()); //set input field selected value
                    this.onHeaderChange();
                }
                evt.getSource().getBinding("items").filter([]);
            },

            onProdTypeValueHelp: function (oEvent) {
                //open product type value help
                var sInputValue = oEvent.getSource().getValue();
                this.inputId = oEvent.getSource().getId(); //get input field id
                if (!this._prodTypeHelpDialog) {
                    this._prodTypeHelpDialog = sap.ui.xmlfragment("zui3derp.view.fragments.searchhelps.ProdTypes", this);
                    this.getView().addDependent(this._prodTypeHelpDialog);
                }
                this._prodTypeHelpDialog.open(sInputValue);
            },

            _prodTypeValueHelpSearch: function (evt) {
                //search product types
                var sValue = evt.getParameter("value");
                var andFilter = [], orFilter = [];
                orFilter.push(new sap.ui.model.Filter("ProdTyp", sap.ui.model.FilterOperator.Contains, sValue));
                orFilter.push(new sap.ui.model.Filter("Desc1", sap.ui.model.FilterOperator.Contains, sValue));
                andFilter.push(new sap.ui.model.Filter(orFilter, false));
                evt.getSource().getBinding("items").filter(new sap.ui.model.Filter(andFilter, true));
            },

            _prodTypeValueHelpClose: function (evt) {
                //on select product type
                var oSelectedItem = evt.getParameter("selectedItem");
                if (oSelectedItem) {
                    var input = this.byId(this.inputId);
                    input.setValue(oSelectedItem.getTitle()); //set input field selected value
                    this.onHeaderChange();
                }
                evt.getSource().getBinding("items").filter([]);
            },

            onSalesGroupValueHelp: function (oEvent) {
                //open sales group value help
                var sInputValue = oEvent.getSource().getValue();
                this.inputId = oEvent.getSource().getId(); //get input field id
                if (!this._salesGroupHelpDialog) {
                    this._salesGroupHelpDialog = sap.ui.xmlfragment("zui3derp.view.fragments.searchhelps.SalesGroups", this);
                    this.getView().addDependent(this._salesGroupHelpDialog);
                }
                this._salesGroupHelpDialog.open(sInputValue);
            },

            _salesGroupValueHelpSearch: function (evt) {
                //search sales groups
                var sValue = evt.getParameter("value");
                var andFilter = [], orFilter = [];
                orFilter.push(new sap.ui.model.Filter("SalesGrp", sap.ui.model.FilterOperator.Contains, sValue));
                orFilter.push(new sap.ui.model.Filter("Desc1", sap.ui.model.FilterOperator.Contains, sValue));
                andFilter.push(new sap.ui.model.Filter(orFilter, false));
                evt.getSource().getBinding("items").filter(new sap.ui.model.Filter(andFilter, true));
            },

            _salesGroupValueHelpClose: function (evt) {
                //on select sales group
                var oSelectedItem = evt.getParameter("selectedItem");
                if (oSelectedItem) {
                    var input = this.byId(this.inputId);
                    input.setValue(oSelectedItem.getTitle()); //set input field selected value
                    this.onHeaderChange();
                }
                evt.getSource().getBinding("items").filter([]);
            },

            onCustGroupValueHelp: function (oEvent) {
                //open customer group value help
                var sInputValue = oEvent.getSource().getValue();
                this.inputId = oEvent.getSource().getId(); //get input field id
                if (!this._custGroupHelpDialog) {
                    this._custGroupHelpDialog = sap.ui.xmlfragment("zui3derp.view.fragments.searchhelps.CustGroups", this);
                    this.getView().addDependent(this._custGroupHelpDialog);
                }
                this._custGroupHelpDialog.open(sInputValue);
            },

            _custGroupValueHelpSearch: function (evt) {
                //search customer groups
                var sValue = evt.getParameter("value");
                var andFilter = [], orFilter = [];
                orFilter.push(new sap.ui.model.Filter("CustGrp", sap.ui.model.FilterOperator.Contains, sValue));
                orFilter.push(new sap.ui.model.Filter("Desc1", sap.ui.model.FilterOperator.Contains, sValue));
                andFilter.push(new sap.ui.model.Filter(orFilter, false));
                evt.getSource().getBinding("items").filter(new sap.ui.model.Filter(andFilter, true));
            },

            _custGroupValueHelpClose: function (evt) {
                //on select customer group
                var oSelectedItem = evt.getParameter("selectedItem");
                if (oSelectedItem) {
                    var input = this.byId(this.inputId);
                    input.setValue(oSelectedItem.getTitle()); //set input field selected value
                    this.onHeaderChange();
                }
                evt.getSource().getBinding("items").filter([]);
            },

            onCustomersValueHelp: function (oEvent) {
                //open customers value help
                var sInputValue = oEvent.getSource().getValue();
                var custGrp = this.getView().byId("CUSTGRP").getValue(); //get customer group value
                this.inputId = oEvent.getSource().getId(); //get input field id
                if (!this._customersHelpDialog) {
                    this._customersHelpDialog = sap.ui.xmlfragment("zui3derp.view.fragments.searchhelps.Customers", this);
                    this.getView().addDependent(this._customersHelpDialog);
                }
                //filter customers by customer group
                this._customersHelpDialog.getBinding("items").filter([new Filter(
                    "Custgrp",
                    sap.ui.model.FilterOperator.EQ, custGrp
                )]);
                this._customersHelpDialog.open(sInputValue);
            },

            _customersValueHelpSearch: function (evt) {
                //search customers
                var sValue = evt.getParameter("value");
                var andFilter = [], orFilter = [];
                orFilter.push(new sap.ui.model.Filter("Custno", sap.ui.model.FilterOperator.Contains, sValue));
                orFilter.push(new sap.ui.model.Filter("Desc1", sap.ui.model.FilterOperator.Contains, sValue));
                andFilter.push(new sap.ui.model.Filter(orFilter, false));
                evt.getSource().getBinding("items").filter(new sap.ui.model.Filter(andFilter, true));
            },

            _customersValueHelpClose: function (evt) {
                //on select customer
                var oSelectedItem = evt.getParameter("selectedItem");
                if (oSelectedItem) {
                    var input = this.byId(this.inputId);
                    input.setValue(oSelectedItem.getTitle()); //set input field selected customer
                    this.onHeaderChange();
                }
                evt.getSource().getBinding("items").filter([]);
            },

            onSizeGroupValueHelp: function (oEvent) {
                //open size group value help
                var me = this;
                var sInputValue = oEvent.getSource().getValue();
                this.inputId = oEvent.getSource().getId();
                var oSHModel = this.getOwnerComponent().getModel("SearchHelps");
                var oView = this.getView();

                //get size groups entityset
                var oJSONModel = new JSONModel();
                oSHModel.read("/SizeGrpSet", {
                    success: function (oData, oResponse) {
                        oJSONModel.setData(oData);
                        oView.setModel(oJSONModel, "SizeGroupModel");
                        //open size group value help
                        if (!me._sizeGroupHelpDialog) {
                            me._sizeGroupHelpDialog = sap.ui.xmlfragment("zui3derp.view.fragments.searchhelps.SizeGroups", me);
                            me.getView().addDependent(me._sizeGroupHelpDialog);
                        }
                        me._sizeGroupHelpDialog.open(sInputValue);
                    },
                    error: function (err) { }
                });
            },

            _sizeGroupValueHelpSearch: function (evt) {
                //search size group value help
                var sValue = evt.getParameter("value");
                var andFilter = [], orFilter = [];
                orFilter.push(new sap.ui.model.Filter("AttribGrp", sap.ui.model.FilterOperator.Contains, sValue));
                andFilter.push(new sap.ui.model.Filter(orFilter, false));
                evt.getSource().getBinding("items").filter(new sap.ui.model.Filter(andFilter, true));
            },

            _sizeGroupValueHelpClose: function (evt) {
                //on select size group
                var oSelectedItem = evt.getParameter("selectedItem");
                if (oSelectedItem) {
                    var input = this.byId(this.inputId);
                    input.setValue(oSelectedItem.getTitle()); //set input field selected size group
                    this.onHeaderChange();
                }
                evt.getSource().getBinding("items").filter([]);
            },

            onUomValueHelp: function () {
                //open uom value help
                if (!this._uomValueHelpDialog) {
                    this._uomValueHelpDialog = sap.ui.xmlfragment("zui3derp.view.fragments.searchhelps.UoM", this);
                    this.getView().addDependent(this._uomValueHelpDialog);
                }
                this._uomValueHelpDialog.open();
            },

            _uomValueHelpSearch: function (evt) {
                //search uom
                var sValue = evt.getParameter("value");
                var andFilter = [], orFilter = [];
                orFilter.push(new sap.ui.model.Filter("Valunit", sap.ui.model.FilterOperator.Contains, sValue));
                orFilter.push(new sap.ui.model.Filter("Desc1", sap.ui.model.FilterOperator.Contains, sValue));
                andFilter.push(new sap.ui.model.Filter(orFilter, false));
                evt.getSource().getBinding("items").filter(new sap.ui.model.Filter(andFilter, true));
            },

            _uomValueHelpClose: function (evt) {
                //on select uom
                var oSelectedItem = evt.getParameter("selectedItem");
                if (oSelectedItem) {
                    var input = this.byId("UOM");
                    input.setValue(oSelectedItem.getTitle()); //set input field selected uom
                    this.onHeaderChange();
                }
                evt.getSource().getBinding("items").filter([]);
            },

            onAttrTypesValueHelp: function (oEvent) {
                //open Attribute Types search help dialog
                var sInputValue = oEvent.getSource().getValue();
                this.inputId = oEvent.getSource().getId(); //get the id of the input field
                if (!this._attrTypesValueHelpDialog) {
                    this._attrTypesValueHelpDialog = sap.ui.xmlfragment("zui3derp.view.fragments.searchhelps.AttributeTypes", this);
                    this.getView().addDependent(this._attrTypesValueHelpDialog);
                }
                this._attrTypesValueHelpDialog.open(sInputValue);
            },

            _attrTypesValueHelpSearch: function (evt) {
                //search Attribute Types
                var sValue = evt.getParameter("value");
                var andFilter = [], orFilter = [];
                orFilter.push(new sap.ui.model.Filter("Attribtyp", sap.ui.model.FilterOperator.Contains, sValue));
                orFilter.push(new sap.ui.model.Filter("Desc1", sap.ui.model.FilterOperator.Contains, sValue));
                andFilter.push(new sap.ui.model.Filter(orFilter, false));
                evt.getSource().getBinding("items").filter(new sap.ui.model.Filter(andFilter, true));
            },

            _attrTypesValueHelpClose: function (evt) {
                //on select Attribute Types
                var oSelectedItem = evt.getParameter("selectedItem");
                if (oSelectedItem) {
                    var input = this.byId(this.inputId);
                    input.setValue(oSelectedItem.getTitle()); //set value of input field
                    this.onGeneralAttrChange();
                }
                evt.getSource().getBinding("items").filter([]);
            },

            onAttrCodesValueHelp: function (oEvent) {
                //open Attribute Codes search help dialog
                var sInputValue = oEvent.getSource().getValue();
                var oData = oEvent.getSource().getParent().getBindingContext('DataModel');
                var attrTyp = oData.getProperty('Attribtyp');
                this.inputId = oEvent.getSource().getId(); //get the id of the input field

                //get the id of input field of description and uom
                var oTable = that.getView().byId("generalTable");
                var oColumns = oTable.getColumns();
                for(var i = 0; i < oColumns.length; i++) {
                    var name = oColumns[i].getName();
                    if(name === 'DESC1') {
                        this.descId = oEvent.getSource().getParent().mAggregations.cells[i].getId();
                    }
                    if(name === 'UOM') {
                        this.attribUom = oEvent.getSource().getParent().mAggregations.cells[i].getId();
                    }
                }
                //open dialog
                if (!this._attrCodesValueHelpDialog) {
                    this._attrCodesValueHelpDialog = sap.ui.xmlfragment("zui3derp.view.fragments.searchhelps.AttributeCodes", this);
                    this.getView().addDependent(this._attrCodesValueHelpDialog);
                }
                //filter the attribute codes based on the value of attribute type
                this._attrCodesValueHelpDialog.getBinding("items").filter([new Filter(
                    "Attribtyp",
                    sap.ui.model.FilterOperator.EQ, attrTyp
                )]);
                this._attrCodesValueHelpDialog.open(sInputValue);
            },

            _attrCodesValueHelpSearch: function (evt) {
                //attribute codes search
                var sValue = evt.getParameter("value");
                var andFilter = [], orFilter = [];
                orFilter.push(new sap.ui.model.Filter("Attribcd", sap.ui.model.FilterOperator.Contains, sValue));
                orFilter.push(new sap.ui.model.Filter("Desc1", sap.ui.model.FilterOperator.Contains, sValue));
                andFilter.push(new sap.ui.model.Filter(orFilter, false));
                evt.getSource().getBinding("items").filter(new sap.ui.model.Filter(andFilter, true));
            },

            _attrCodesValueHelpClose: function (evt) {
                //on select of attribute code
                var oSelectedItem = evt.getParameter("selectedItem");
                if (oSelectedItem) {
                    var input = this.byId(this.inputId);
                    input.setValue(oSelectedItem.getTitle()); //set the value to selected attribute code
                    this.onGeneralAttrChange();
                    var descText = this.byId(this.descId);
                    descText.setText(oSelectedItem.getDescription()); //set the description
                    var uom = oSelectedItem.data('Uom');
                    var attribUom = this.byId(this.attribUom);
                    attribUom.setText(uom); //set the uom
                }
                evt.getSource().getBinding("items").filter([]);
            },

            onProcessesValueHelp: function (oEvent) {
                //open process code value help
                var sInputValue = oEvent.getSource().getValue();
                this.inputId = oEvent.getSource().getId(); //get the input field id
                if (!this._processesValueHelpDialog) {
                    this._processesValueHelpDialog = sap.ui.xmlfragment("zui3derp.view.fragments.searchhelps.Processes", this);
                    this.getView().addDependent(this._processesValueHelpDialog);
                }
                this._processesValueHelpDialog.open(sInputValue);
            },

            _processesValueHelpSearch: function (evt) {
                //search process code
                var sValue = evt.getParameter("value");
                var andFilter = [], orFilter = [];
                orFilter.push(new sap.ui.model.Filter("ProcessCd", sap.ui.model.FilterOperator.Contains, sValue));
                orFilter.push(new sap.ui.model.Filter("Desc1", sap.ui.model.FilterOperator.Contains, sValue));
                andFilter.push(new sap.ui.model.Filter(orFilter, false));
                evt.getSource().getBinding("items").filter(new sap.ui.model.Filter(andFilter, true));
            },

            _processesValueHelpClose: function (evt) {
                //on select process code
                var oSelectedItem = evt.getParameter("selectedItem");
                if (oSelectedItem) {
                    var input = this.byId(this.inputId);
                    input.setValue(oSelectedItem.getTitle()); //set selected value of input field
                    this.onProcessChange();
                }
                evt.getSource().getBinding("items").filter([]);
            },

            onVASTypeValueHelp: function (oEvent) {
                //open VAS types value help
                var sInputValue = oEvent.getSource().getValue();
                this.inputId = oEvent.getSource().getId(); //get the input field id
                var oData = oEvent.getSource().getParent().getBindingContext('DataModel');
                var ProcessCd = oData.getProperty('Processcd'); //get the selected process code
                
                if (!this._VASTypeValueHelpDialog) {
                    this._VASTypeValueHelpDialog = sap.ui.xmlfragment("zui3derp.view.fragments.searchhelps.VASTypes", this);
                    this.getView().addDependent(this._VASTypeValueHelpDialog);
                }
                //filter the items by process code selected
                this._VASTypeValueHelpDialog.getBinding("items").filter([new Filter(
                    "Vasproc",
                    sap.ui.model.FilterOperator.EQ, ProcessCd
                )]);
                this._VASTypeValueHelpDialog.open(sInputValue);
            },

            _VASTypesValueHelpSearch: function (evt) {
                //search VAS types
                var sValue = evt.getParameter("value");
                var andFilter = [], orFilter = [];
                orFilter.push(new sap.ui.model.Filter("Processcd", sap.ui.model.FilterOperator.Contains, sValue));
                orFilter.push(new sap.ui.model.Filter("Desc1", sap.ui.model.FilterOperator.Contains, sValue));
                andFilter.push(new sap.ui.model.Filter(orFilter, false));
                evt.getSource().getBinding("items").filter(new sap.ui.model.Filter(andFilter, true));
            },

            _VASTypesValueHelpClose: function (evt) {
                //on select VAS types
                var oSelectedItem = evt.getParameter("selectedItem");
                if (oSelectedItem) {
                    var input = this.byId(this.inputId); 
                    input.setValue(oSelectedItem.getTitle()); //set input field selected value
                    this.onProcessChange();
                }
                evt.getSource().getBinding("items").filter([]);
            },

            onProcessAttrTypesValueHelp: function (oEvent) {
                //open process attributes value help
                var sInputValue = oEvent.getSource().getValue();
                this.inputId = oEvent.getSource().getId(); //get input field id
                if (!this._processAttrTypesValueHelpDialog) {
                    this._processAttrTypesValueHelpDialog = sap.ui.xmlfragment("zui3derp.view.fragments.searchhelps.ProcessAttributeTypes", this);
                    this.getView().addDependent(this._processAttrTypesValueHelpDialog);
                }
                this._processAttrTypesValueHelpDialog.open(sInputValue);
            },

            _processAttrTypesValueHelpSearch: function (evt) {
                //search process attribute types
                var sValue = evt.getParameter("value");
                var andFilter = [], orFilter = [];
                orFilter.push(new sap.ui.model.Filter("Attribtyp", sap.ui.model.FilterOperator.Contains, sValue));
                orFilter.push(new sap.ui.model.Filter("Desc1", sap.ui.model.FilterOperator.Contains, sValue));
                andFilter.push(new sap.ui.model.Filter(orFilter, false));
                evt.getSource().getBinding("items").filter(new sap.ui.model.Filter(andFilter, true));
            },

            _processAttrTypesValueHelpClose: function (evt) {
                //on select process attribute type
                var oSelectedItem = evt.getParameter("selectedItem");
                if (oSelectedItem) {
                    var input = this.byId(this.inputId);
                    input.setValue(oSelectedItem.getTitle()); //set input field selected value
                    this.onProcessChange();
                }
                evt.getSource().getBinding("items").filter([]);
            },

            onProcessAttrCodesValueHelp: function (oEvent) {
                //open process attribute codes value help
                var sInputValue = oEvent.getSource().getValue();
                var oData = oEvent.getSource().getParent().getBindingContext('DataModel');
                var attrTyp = oData.getProperty('Attribtyp'); //get select attribute type
                this.inputId = oEvent.getSource().getId(); //get input field id
                if (!this._processAttrCodesValueHelpDialog) {
                    this._processAttrCodesValueHelpDialog = sap.ui.xmlfragment("zui3derp.view.fragments.searchhelps.ProcessAttributeCodes", this);
                    this.getView().addDependent(this._processAttrCodesValueHelpDialog);
                }
                //filter attribute codes by attribute type
                this._processAttrCodesValueHelpDialog.getBinding("items").filter([new Filter(
                    "Attribtype",
                    sap.ui.model.FilterOperator.EQ, attrTyp
                )]);
                this._processAttrCodesValueHelpDialog.open(sInputValue);
            },

            _processAttrCodesValueHelpSearch: function (evt) {
                //search process attribute codes
                var sValue = evt.getParameter("value");
                var andFilter = [], orFilter = [];
                orFilter.push(new sap.ui.model.Filter("Attribcd", sap.ui.model.FilterOperator.Contains, sValue));
                orFilter.push(new sap.ui.model.Filter("Desc1", sap.ui.model.FilterOperator.Contains, sValue));
                andFilter.push(new sap.ui.model.Filter(orFilter, false));
                evt.getSource().getBinding("items").filter(new sap.ui.model.Filter(andFilter, true));
            },

            _processAttrCodesValueHelpClose: function (evt) {
                //on select attribute code
                var oSelectedItem = evt.getParameter("selectedItem");
                if (oSelectedItem) {
                    var input = this.byId(this.inputId);
                    input.setValue(oSelectedItem.getTitle()); //set input field selected value
                    this.onProcessChange();
                }
                evt.getSource().getBinding("items").filter([]);
            },

            //******************************************* */
            // Common Functions
            //******************************************* */

            addLine: function (oEvent) {
                //adding lines to tables via model
                var oButton = oEvent.getSource();
                var tabName = oButton.data('TableName')
                var oTable = this.getView().byId(tabName);
                var oModel = this.getView().byId(tabName).getModel("DataModel");
                var oData = oModel.getProperty('/results');
                oData.push({});
                oTable.getBinding("rows").refresh();
                oTable.setVisibleRowCount(oData.length);

                if(tabName === "generalTable") {
                    this.onGeneralAttrChange();
                } else if(tabName === "colorsTable") {
                    this.onColorChange();
                } 
            },

            addProcessLine: function (oEvent) {
                //adding lines to process table via model, with sequence increment logic
                var oButton = oEvent.getSource();
                var tabName = oButton.data('TableName')
                var oTable = this.getView().byId(tabName);
                var oModel = this.getView().byId(tabName).getModel("DataModel");
                var oData = oModel.getProperty('/results');
                var length = oData.length;
                var lastSeqno = 0;
                if (length > 0) {
                    lastSeqno = parseInt(oData[length - 1].Seqno);
                }
                lastSeqno++;
                var seqno = lastSeqno.toString();
                oData.push({
                    "Seqno": seqno
                });
                oTable.getBinding("rows").refresh();
                oTable.setVisibleRowCount(oData.length);
                this.onProcessChange();
            },

            onDeleteTableItems: function(oTableName, oFragmentName, oDialog) {
                var oTable = this.getView().byId(oTableName);
                var selected = oTable.getSelectedIndices();
                if(selected.length > 0) {
                    if (!oDialog) {
                        oDialog = sap.ui.xmlfragment("zui3derp.view.fragments.dialog." + oFragmentName, this);
                        this.getView().addDependent(oDialog);
                    }
                    jQuery.sap.syncStyleClass("sapUiSizeCompact", this.getView(), this._LoadingDialog);
                    oDialog.addStyleClass("sapUiSizeCompact");
                    oDialog.open();
                } else {
                    Common.showMessage(this._i18n.getText('t8'))
                }
            },

            onCloseDialog: function(oEvent) {
                oEvent.getSource().getParent().close();
            },

            pad: Common.pad
        });
    });
