sap.ui.define([
    "sap/ui/core/mvc/Controller",
    "../js/Common",
    "sap/ui/model/json/JSONModel",
    "sap/ui/export/Spreadsheet",
    "../control/DynamicTable",
    "../libs/jszip",
	"../libs/xlsx"
],
    /**
     * @param {typeof sap.ui.core.mvc.Controller} Controller
     */
    function (Controller, Common, JSONModel, Spreadsheet, control, jszip, xlsx, ) {
        "use strict";

        var that;

        return Controller.extend("zui3derp.controller.UploadStyle", {

            onInit: function() {
                that = this;

                //initialize router
                var oComponent = this.getOwnerComponent();
                this._router = oComponent.getRouter();
                this._router.getRoute("RouteUploadStyle").attachPatternMatched(this._routePatternMatched, this);
            },

            _routePatternMatched: function (oEvent) {
                this._sbu = oEvent.getParameter("arguments").sbu;

                this.setChangeStatus(false);

                //get available map ids
                this.getMapId();

                //hide first file uploader and save button
                var oFileUploader = this.getView().byId('FileUploaderId');
                oFileUploader.setVisible(false);
                var oSaveButton = this.getView().byId('SaveButton');
                oSaveButton.setEnabled(false);
            },

            setChangeStatus: function(changed) {
                // sap.ushell.Container.setDirtyFlag(changed);
            },

            getMapId: function() {
                //get Map ids from odata
                var oModel = this.getOwnerComponent().getModel('SearchHelps');
                var oMapIdCB = this.getView().byId('MapIdCB');
                oModel.setHeaders({
                    sbu: this._sbu
                });
                oModel.read("/MapidSet", {
                    success: function (oData, oResponse) {
                        var oJSONModel = new JSONModel();
                        oJSONModel.setData(oData);
                        oMapIdCB.setModel(oJSONModel, "MapIdData");
                    },
                    error: function (err) { 
                        
                    }
                });
            },

            onSelectMapId: function() {
                //set file uploader visible on select map id
                var oFileUploader = this.getView().byId('FileUploaderId');
                oFileUploader.setVisible(true);
            },
    
            onUpload: function(e) {
                //start of upload
                this._import(e.getParameter("files") && e.getParameter("files")[0]);
                this._fileName = e.getParameter('files')[0].name;
            },
    
            _import: function(file) {
                var that = this;

                var me = this;
                var columnData = [];
                var oModel = this.getOwnerComponent().getModel();
                var oTable = this.getView().byId("UploadTable");
                var oMapIdCB = this.getView().byId('MapIdCB');
                var template = oMapIdCB.getSelectedKey();

                // var rowData = {
                //     items: []
                // };

                // var excelData = {};

                //get the file from the file reader
                if (file && window.FileReader) {
                    var reader = new FileReader();
                    reader.onload = function(e) {
                        var data = e.target.result;
                        var workbook = XLSX.read(data, {
                            type: 'binary'
                        });

                        //get the first sheet
                        var sheetName = workbook.SheetNames[0];
                        
                        //get excel data in json format
                        var excelJson = XLSX.utils.make_json(workbook.Sheets[sheetName], {header:1});                        
                        
                        // excelData = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName], {range:1});   
                        // var sheet = workbook.Sheets[sheetName];
                        
                        // var headers = [];
                        // var range = XLSX.utils.decode_range(sheet['!ref']);
                        // var C, R = 0;
                        
                        // for(C = range.s.c; C <= range.e.c; ++C) {
                        //     var cell = sheet[XLSX.utils.encode_cell({c:C, r:R})];
                        //     var hdr = "UNKNOWN";
                        //     if(cell && cell.t) hdr = XLSX.utils.format_cell(cell);
                        //     headers.push(hdr);
                        // }

                        // R = 1;
                        // var headers2 = [];
                        // for(C = range.s.c; C <= range.e.c; ++C) {
                        //     var cell = sheet[XLSX.utils.encode_cell({c:C, r:R})];
                    
                        //     var hdr = "UNKNOWN"; 
                        //     if(cell && cell.t) hdr = XLSX.utils.format_cell(cell);
                    
                        //     headers2.push(hdr);
                        // }

                        // for(var i = 0; i < headers2.length; i++) {
                        //     if(headers2[i] === "UNKNOWN") {
                        //         headers2[i] = headers[i];
                        //     }
                        // }

                        oModel.setHeaders({
                            sbu: that._sbu,
                            mapid: template,
                            module: 'STYLEBOM'
                        });
                
                        //get the template based on Map ID
                        oModel.read("/UploadTemplateSet", {
                            success: function (oData, oResponse) {
                                oData.results.forEach((column) => {
                                    columnData.push({
                                        "Columnname": column.Columnname,
                                        "Desc1": column.Desc1,
                                        "Seqno": column.Seqno
                                    })
                                })

                                //Map the selected template on the uploaded data in json format
                                var rowData = [];
                                for (var i = 3; i < excelJson.length; i++) {
                                    var data = { };
                                    for (var j = 0; j < columnData.length; j++) {
                                        var seqno = columnData[j].Seqno;
                                        var idx = Number(seqno) - 1;
                                        
                                        data[columnData[j].Columnname] = excelJson[i][idx];
                                    }
                                    rowData.push(data);
                                }
        
                                var oJSONModel = new JSONModel();
                                oJSONModel.setData({
                                    results: rowData,
                                    columns: columnData
                                });
        
                                //bind the data on the table
                                oTable.setModel(oJSONModel, "DataModel");
                                oTable.bindColumns("DataModel>/columns", function (sId, oContext) {
                                    var column = oContext.getObject();
                                    return new sap.ui.table.Column({
                                        name: column.Columnname,
                                        label: "{i18n>" + column.Columnname + "}",
                                        template: new sap.m.Text({ text: "{DataModel>" + column.Columnname + "}" }),
                                        sortProperty: column.Columnname,
                                        filterProperty: column.Columnname,
                                        width: "8rem"
                                    });
                                });
        
                                oTable.bindRows("DataModel>/results");

                                var oSaveButton = me.getView().byId('SaveButton');
                                oSaveButton.setEnabled(true);

                                me.setChangeStatus(true);
                            },
                            error: function (err) { 
                            }
                        });
                    };
                    reader.onerror = function(ex) {
                        console.log(ex);
                    };
                    reader.readAsBinaryString(file);
                }
            },

            onSaveUploadStyle: function() {
                //on save of uploaded data
                var me = this;
                var oModel = this.getOwnerComponent().getModel();
                var oTableModel = this.getView().byId("UploadTable").getModel("DataModel");
                var path;

                var columns = this.getView().byId("UploadTable").getColumns();

                var oMsgStrip = this.getView().byId('UploadMessageStrip');
                oMsgStrip.setVisible(false);

                //set headers and payload
                var oData = oTableModel.getData();
                var oEntry = {
                    "FILENAME": this._fileName,
                    UploadToItems: []
                }
                for (var i = 0; i < oData.results.length; i++) {
                    var item = {};
                    var colName;
                    item['FILENAME'] = this._fileName;
                    for (var j = 0; j < columns.length; j++) {
                        colName = columns[j].getName();
                        item[colName] = oData.results[i][colName];
                    }
                    oEntry.UploadToItems.push(item);
                };

                Common.openLoadingDialog(that);

                path = "/UploadStyleSet";

                //call create deep method of uploadstyle
                oModel.create(path, oEntry, {
                    method: "POST",
                    success: function (oData, oResponse) {
                        Common.showMessage("Saved");
                        Common.closeLoadingDialog(that);
                        me.setChangeStatus(false);
                    },
                    error: function (err) {
                        Common.showMessage("Error");
                        Common.closeLoadingDialog(that);
                        var errorMsg = JSON.parse(err.responseText).error.message.value;
                        oMsgStrip.setVisible(true);
                        oMsgStrip.setText(errorMsg);
                    }
                });

            },

            pad: Common.pad
            
        });

    });
