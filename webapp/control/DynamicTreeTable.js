var currentRowIndex;
sap.ui.define([
	"sap/ui/table/TreeTable"
], function(Table) {
	return Table.extend("Table_Binding.DynamicTreeTable", {
		onInit: function() {

		},
		insertRows: function(value, table, model, startRowIndex, startProperty, pathRow) {

			var oTableLength = table.getModel(model).getData().results.items.length;

			var rows = value.split(/\n/);
		
			var sNewCopiedData;
			// if (currentRowIndex !== 0) {
			// 	sNewCopiedData = rows.slice(0, currentRowIndex-1);
			// } else {
				sNewCopiedData = rows.slice(0, oTableLength+1);
			// }
            var cells = table.getRows()[0].getCells()
			// var cells = table.getBindingInfo('rows').template.getCells();
			var templateItem = [];
			var itemsPath = table.getBindingPath('rows');
			var itemsArray = table.getModel(model).getProperty("/results/items");
			var startPropertyIndex = 0;
			var model2 = table.getModel(model);
			var fData = model2.oData.results;

			if (startPropertyIndex === 2) {

				for (var i = 0; i < fData.length; i++) {

					for (var int = 0; int < sNewCopiedData.length - 1; int++) {
						var rows_element = sNewCopiedData[int];
						fData[i].Number = rows_element;
					
					}

				}
			} else if (startPropertyIndex === 3) {
				for (var q = 0; q < fData.length; q++) {

					for (var w = 0; w < sNewCopiedData.length - 1; w++) {
						var row = sNewCopiedData[w];
						fData[q].Email = row;
					
					}

				}
			}

			if (startRowIndex === undefined) {
				startRowIndex = 0;
			}
			for (var int = 0; int < cells.length; int++) {
				var cell_element = cells[int];
				var path = cell_element.getBindingPath('value');
				templateItem.push(path);
				if (path === startProperty) {
					startPropertyIndex = int;
				}

			}

            var index = pathRow.lastIndexOf("/");
            pathRow = pathRow.substring(0, index);

			// for (var int = 0; int < sNewCopiedData.length - 1; int++) {
            for (var int = 0; int < sNewCopiedData.length; int++) {
                var rows_element = sNewCopiedData[int];
				var cells = rows_element.split(/\t/);

				// var originalObject = model2.getProperty(itemsPath + "/items/items/" + startRowIndex++);
                var originalObject = model2.getProperty(pathRow + "/" + startRowIndex++);
				if (originalObject === undefined) {
					originalObject = {};
					for (var k = 0; k < templateItem.length; k++) {
						originalObject[templateItem[k]] = undefined;
					}
					// itemsArray.push(originalObject);
				}

				var lesserLength = Math.min(templateItem.length, (cells.length + startPropertyIndex));
				for (int2 = startPropertyIndex, intValue = 0; int2 < lesserLength; int2++, intValue++) {
					var name = templateItem[int2];
					originalObject[name] = cells[intValue];

				}

			}
			model2.refresh();

		},
		onAfterRendering: function() {
			var that = this;
			// sap.m.Table.prototype.onAfterRendering.apply(this, arguments);
			sap.ui.table.Table.prototype.onAfterRendering.apply(this, arguments);
            this.attachBrowserEvent('paste', function(e) {
				e.preventDefault();
				var text = (e.originalEvent || e).clipboardData.getData('text/plain');

				that.insertRows(text, this, undefined);
			});
            try {
                this.getAggregation('rows').forEach(function(row) {
                    row.getCells().forEach(function(cell) {
                        cell.attachBrowserEvent('paste', function(e) {
                            e.stopPropagation();

                            e.preventDefault();
                            var text = (e.originalEvent || e).clipboardData.getData('text/plain');
                            var domCell = jQuery.sap.domById(e.currentTarget.id);
                            var insertCell = jQuery('#' + domCell.id).control()[0];
                            var itemsPath = that.getBindingPath('rows');
                            var pathRow = insertCell.getBindingContext('DataModel').sPath;

                            currentRowIndex = parseInt(pathRow.substring(pathRow.lastIndexOf('/') + 1)); //Selected row index

                            // var startRowIndex = pathRow.split(itemsPath + "/items/items/")[1];
                            var startRowIndex = pathRow.split("/").pop();
                            var startProperty = insertCell.getBindingPath('value');
                            that.insertRows(text, that, 'DataModel', startRowIndex, startProperty, pathRow);
                        });
                    });
                });
            } catch(err) { }
		},
		// renderer: sap.m.Table.prototype.getRenderer()
        renderer: sap.ui.table.TreeTable.prototype.getRenderer()
	});
});